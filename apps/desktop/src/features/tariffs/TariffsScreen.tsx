import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  Plus,
  Save,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch, FilterSelect } from "@/components/filters";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterChip } from "@/components/shared/FilterChip";
import { MultiSelectBulkDeleteBar } from "@/components/shared/MultiSelectBulkDeleteBar";
import { MultiSelectToggle } from "@/components/shared/MultiSelectControls";
import { Panel } from "@/components/shared/Panel";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useToast } from "@/components/shared/ToastProvider";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import { useMultiSelectDelete } from "@/hooks/use-multi-select-delete";
import { useActionHandler } from "@/hooks/useAction";

import {
  createDesktopTariffBook,
  type DesktopContract,
  type DesktopDataResult,
  type DesktopTariffBook,
  type DesktopTariffVoice,
  deleteDesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoiceCounts,
  listDesktopTariffVoices,
  selectMultipleTariffPdfMetadatas,
  type TariffPdfMetadata,
  updateDesktopContract,
  updateDesktopTariffBook,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { readJsonFromStorage, writeJsonToStorage } from "@/persistence/json-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

import { type PendingWorkflowAction, useAppStore } from "@/store/app-store";

import { AddVoiceDialog } from "./components/AddVoiceDialog";
import { QuickAction } from "./components/QuickAction";
import { TariffImportLoadingModal } from "./components/TariffImportLoadingModal";
import type { TariffImportPreviewResult } from "./components/TariffImportPreviewModal";
import { TariffBookPreviewCard, TariffImportPreviewPanel } from "./components/TariffScreenPanels";
import { TariffVoicesExplorerModal } from "./components/TariffVoicesExplorerModal";
import {
  areNumberSetsEqual,
  getScrollableAncestor,
  importMetaReducer,
  initialImportMeta,
  isStringArray,
} from "./state/import-meta";
import {
  fallbackContracts,
  fallbackTariffBook,
  fallbackTariffBooks,
  fallbackTariffVoices,
} from "./tariffs-data";
import type { EditTariffBookForm, TariffMetrics } from "./tariffs-types";
import { groupTariffVoices } from "./utils/tariff-grouping";
import {
  buildImportPreviewToolbarSummary,
  buildLinkedProjectCountByTariffBookId,
  buildTariffMetrics,
  filterTariffBooks,
  getMetadataKey,
  getProjectTariffBookIds,
} from "./utils/tariffs-screen-model";
import { createTariffBookId, sanitizeIdentifier } from "./utils/tariffs-validation";

function keepLatestImportPerMetadataKey(
  metadatas: readonly TariffImportPreviewResult[],
): TariffImportPreviewResult[] {
  const latestByKey = new Map<string, TariffImportPreviewResult>();
  for (const metadata of metadatas) {
    latestByKey.set(getMetadataKey(metadata), metadata);
  }
  return [...latestByKey.values()];
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

const TARIFF_PAGE_SIZE = 12;

function formatImportError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const stackLine = error.stack
    ?.split("\n")
    .slice(1)
    .map((line) => line.trim())
    .find(Boolean);

  return stackLine ? `${error.message} (${stackLine})` : error.message;
}

function TariffHeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-11px font-medium text-[var(--text-secondary)]">{label}</span>
        <Icon className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-1 text-17px font-semibold leading-none tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

export function TariffsScreen() {
  const FAVORITES_STORAGE_KEY = STORAGE_KEYS.tariffFavoriteBookIds;
  const { notify } = useToast();
  const [contractsState, setContractsState] = useState<DesktopDataResult<DesktopContract[]>>({
    data: fallbackContracts,
    message: "Runtime browser: dati dimostrativi.",
    source: "fallback",
  });
  const [projectFilter, setProjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedTariffBookId, setSelectedTariffBookId] = useState(fallbackTariffBook.id);
  const [statusFilter, setStatusFilter] = useState("all");
  const editPreviewBookIdMap = useRef<Map<string, string>>(new Map());
  const [importMeta, dispatchImport] = useReducer(importMetaReducer, initialImportMeta);
  const { phase: importPhase, previews: importPreviews, files: importFiles } = importMeta;
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditTariffBookForm>({
    name: "",
    sourceName: "",
    status: "active",
    year: String(new Date().getFullYear()),
  });
  const [tariffBooksState, setTariffBooksState] = useState<DesktopDataResult<DesktopTariffBook[]>>({
    data: fallbackTariffBooks,
    message: "Caricamento tariffari locali.",
    source: "fallback",
  });
  const [voicesState, setVoicesState] = useState<DesktopDataResult<DesktopTariffVoice[]>>({
    data: fallbackTariffVoices,
    message: "Runtime browser: voci dimostrative.",
    source: "fallback",
  });
  const [favoriteBookIds, setFavoriteBookIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return readJsonFromStorage<string[]>(
        window.localStorage,
        FAVORITES_STORAGE_KEY,
        [],
        isStringArray,
      );
    } catch {
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    }
    return [];
  });
  const [activeCatalogTab, setActiveCatalogTab] = useState<"all" | "favorites">("all");
  const [visibleTariffLimit, setVisibleTariffLimit] = useState(TARIFF_PAGE_SIZE);
  const [voiceCountByBookId, setVoiceCountByBookId] = useState<Record<string, number>>({});
  const [isVoicesExplorerOpen, setIsVoicesExplorerOpen] = useState(false);
  const [isAddVoiceOpen, setIsAddVoiceOpen] = useState(false);
  const { previewIndex: importPreviewIndex } = importMeta;
  const previewValidationCanConfirm = useRef(false);
  const [reviewedFiles, setReviewedFiles] = useState<Set<number>>(() => new Set());
  const [draftedImportFiles, setDraftedImportFiles] = useState<Set<number>>(() => new Set());
  const [yearFilter, setYearFilter] = useState("all");
  const savedVoiceMap = useRef<Map<string, DesktopTariffVoice[]>>(new Map());
  const catalogRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLElement>(null);

  function getExistingBookIds() {
    return importPreviews
      .map((m) => editPreviewBookIdMap.current.get(getMetadataKey(m)))
      .filter(Boolean) as string[];
  }
  const updateReviewedFiles = useCallback((next: Set<number>) => {
    setReviewedFiles((current) => (areNumberSetsEqual(current, next) ? current : next));
  }, []);
  const updateDraftedImportFiles = useCallback((next: Set<number>) => {
    setDraftedImportFiles((current) => (areNumberSetsEqual(current, next) ? current : next));
  }, []);
  const setTariffImportToolbar = useAppStore((state) => state.setTariffImportToolbar);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeJsonToStorage(window.localStorage, FAVORITES_STORAGE_KEY, favoriteBookIds);
  }, [favoriteBookIds]);

  const loadTariffsData = useCallback(async () => {
    const [tariffBooks, contracts] = await Promise.all([
      listDesktopTariffBooks(fallbackTariffBooks),
      listDesktopContracts(fallbackContracts),
    ]);

    setTariffBooksState(tariffBooks);
    setContractsState(contracts);
    setSelectedTariffBookId(
      (current) => current || tariffBooks.data[0]?.id || fallbackTariffBook.id,
    );

    try {
      const voiceCountResult = await listDesktopTariffVoiceCounts(
        tariffBooks.data,
        fallbackTariffVoices,
      );
      const counts = new Map(
        voiceCountResult.data.map((entry) => [entry.tariffBookId, entry.count]),
      );
      const entries = tariffBooks.data.map((book) => [book.id, counts.get(book.id) ?? 0] as const);
      setVoiceCountByBookId(Object.fromEntries(entries));
    } catch {
      /* voice count failure is non-critical */
    }
  }, []);

  useEffect(() => {
    loadTariffsData().catch(() => {
      notify({
        message: "Impossibile caricare tariffari e contratti.",
        title: "Caricamento fallito",
        tone: "danger",
      });
    });
  }, [loadTariffsData, notify]);

  useDataChangedListener(() => {
    void loadTariffsData();
  });

  const tariffMetrics = useMemo<TariffMetrics>(
    () => buildTariffMetrics(tariffBooksState.data),
    [tariffBooksState.data],
  );

  const realContracts = useMemo(
    () => (contractsState.source === "desktop" ? contractsState.data : []),
    [contractsState.data, contractsState.source],
  );

  useEffect(() => {
    if (
      projectFilter !== "all" &&
      !realContracts.some((contract) => contract.id === projectFilter)
    ) {
      setProjectFilter("all");
    }
  }, [projectFilter, realContracts]);

  const linkedProjectCountByTariffBookId = useMemo(
    () => buildLinkedProjectCountByTariffBookId(realContracts),
    [realContracts],
  );

  const projectTariffBookIds = useMemo(
    () => getProjectTariffBookIds(projectFilter, realContracts),
    [projectFilter, realContracts],
  );

  const availableYears = tariffMetrics.years;

  const statusOptions = useMemo(() => {
    const set = new Set(tariffBooksState.data.map((b) => b.status));
    return ["all", ...set];
  }, [tariffBooksState.data]);

  const statusDisplayMap = useMemo(
    () =>
      new Map<string, string>([
        ["all", "Tutti gli stati"],
        ["active", "Attivo"],
        ["draft", "Bozza"],
        ["validated", "Validato"],
      ]),
    [],
  );

  const projectDisplayMap = useMemo(
    () => new Map(realContracts.map((c) => [c.id, c.title])),
    [realContracts],
  );

  const baseFilteredTariffBooks = useMemo(
    () =>
      filterTariffBooks({
        projectTariffBookIds,
        query,
        statusFilter,
        tariffBooks: tariffBooksState.data,
        yearFilter,
      }),
    [projectTariffBookIds, query, statusFilter, tariffBooksState.data, yearFilter],
  );

  const favoriteBookIdSet = useMemo(() => new Set(favoriteBookIds), [favoriteBookIds]);
  const favoriteCount = useMemo(
    () => baseFilteredTariffBooks.filter((book) => favoriteBookIdSet.has(book.id)).length,
    [baseFilteredTariffBooks, favoriteBookIdSet],
  );

  const visibleTariffBooks = useMemo(
    () =>
      activeCatalogTab === "favorites"
        ? baseFilteredTariffBooks.filter((book) => favoriteBookIdSet.has(book.id))
        : baseFilteredTariffBooks,
    [activeCatalogTab, baseFilteredTariffBooks, favoriteBookIdSet],
  );
  const displayedTariffBooks = useMemo(
    () => visibleTariffBooks.slice(0, visibleTariffLimit),
    [visibleTariffBooks, visibleTariffLimit],
  );
  const remainingTariffCount = Math.max(visibleTariffBooks.length - displayedTariffBooks.length, 0);
  const resetVisibleTariffs = useCallback(() => {
    setVisibleTariffLimit(TARIFF_PAGE_SIZE);
  }, []);

  const deleteSelect = useMultiSelectDelete(visibleTariffBooks);

  const selectedTariffBook =
    tariffBooksState.data.find((book) => book.id === selectedTariffBookId) ??
    visibleTariffBooks[0] ??
    fallbackTariffBook;

  useEffect(() => {
    let active = true;

    const saved = savedVoiceMap.current.get(selectedTariffBook.id);
    if (saved) {
      setVoicesState({ data: saved, source: "desktop" });
      return;
    }

    listDesktopTariffVoices(selectedTariffBook.id, fallbackTariffVoices)
      .then((result) => {
        if (active) {
          setVoicesState(result);
        }
      })
      .catch(() => {
        if (!active) return;
        notify({
          message: "Impossibile caricare le voci del tariffario selezionato.",
          title: "Caricamento voci fallito",
          tone: "danger",
        });
      });

    return () => {
      active = false;
    };
  }, [selectedTariffBook.id, notify]);

  useEffect(() => {
    let active = true;
    const books = tariffBooksState.data;

    listDesktopTariffVoiceCounts(books, fallbackTariffVoices)
      .then((result) => {
        if (!active) {
          return;
        }

        const counts = new Map(result.data.map((entry) => [entry.tariffBookId, entry.count]));
        const entries = books.map((book) => [book.id, counts.get(book.id) ?? 0] as const);
        setVoiceCountByBookId(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, [tariffBooksState.data]);

  const groupedVoices = useMemo(() => groupTariffVoices(voicesState.data), [voicesState.data]);

  const importPreviewToolbarSummary = useMemo(
    () => buildImportPreviewToolbarSummary(importPreviews, reviewedFiles),
    [importPreviews, reviewedFiles],
  );

  const handlePdfImport = useCallback(async () => {
    dispatchImport({ type: "START_LOADING" });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    try {
      const results = await selectMultipleTariffPdfMetadatas((progress) => {
        dispatchImport({ type: "UPDATE_FILE", file: progress });
      });

      dispatchImport({ type: "SET_PHASE", phase: "idle" });

      if (results.length === 0) {
        notify({
          message: "Nessun file selezionato o selezione annullata.",
          title: "Import tariffario",
          tone: "warning",
        });
        return;
      }

      const withVoices = results.filter((m) => m.voices.length > 0);
      if (withVoices.length > 0) {
        dispatchImport({ type: "SET_PREVIEWS", previews: results });
        editPreviewBookIdMap.current = new Map();
        dispatchImport({ type: "SET_PHASE", phase: "preview" });
        notify({
          message: `${withVoices.length} file pronti per la preview.`,
          title: "Importazione completata",
          tone: "success",
        });
      } else {
        notify({
          message: "Nessuna voce tariffaria rilevata nei file selezionati.",
          title: "Importazione",
          tone: "warning",
        });
      }
    } catch (error) {
      dispatchImport({ type: "SET_PHASE", phase: "idle" });
      notify({
        message: formatImportError(error),
        title: "Import tariffario non riuscito",
        tone: "danger",
      });
    }
  }, [notify]);

  async function handleEditVoices(book: DesktopTariffBook) {
    try {
      const saved = savedVoiceMap.current.get(book.id);
      const voiceData =
        saved ?? (await listDesktopTariffVoices(book.id, fallbackTariffVoices)).data;
      const metadata: TariffPdfMetadata = {
        name: book.name,
        sourceName: book.sourceName,
        year: book.year,
        voices: voiceData,
      };
      const key = getMetadataKey(metadata);
      editPreviewBookIdMap.current = new Map([[key, book.id]]);
      setReviewedFiles(new Set());
      setDraftedImportFiles(new Set());
      previewValidationCanConfirm.current = false;
      dispatchImport({ type: "SHOW_PREVIEW", previews: [metadata] });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Impossibile caricare le voci",
        tone: "danger",
      });
    }
  }

  async function handleReviewAllDrafts() {
    try {
      const draftBooks = tariffBooksState.data.filter((b) => b.status === "draft");
      if (draftBooks.length === 0) {
        notify({ message: "Nessun tariffario in bozza da revisionare.", tone: "info" });
        return;
      }

      const results = await Promise.all(
        draftBooks.map(async (book) => {
          const saved = savedVoiceMap.current.get(book.id);
          const voiceData =
            saved ?? (await listDesktopTariffVoices(book.id, fallbackTariffVoices)).data;
          return { book, voiceData };
        }),
      );

      const map = new Map<string, string>();
      const metadatas: TariffPdfMetadata[] = results.map(({ book, voiceData }) => {
        const metadata: TariffPdfMetadata = {
          name: book.name,
          sourceName: book.sourceName,
          year: book.year,
          voices: voiceData,
        };
        map.set(getMetadataKey(metadata), book.id);
        return metadata;
      });

      editPreviewBookIdMap.current = map;
      setReviewedFiles(new Set());
      setDraftedImportFiles(new Set());
      previewValidationCanConfirm.current = false;
      dispatchImport({ type: "SHOW_PREVIEW", previews: metadatas });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Impossibile caricare le bozze",
        tone: "danger",
      });
    }
  }

  async function handleAddVoiceSave(result: import("./components/AddVoiceDialog").AddVoiceResult) {
    const updatedBookIds = new Set<string>();
    let newTariffBookId: string | null = null;

    try {
      // 1. Create new book if requested
      if (result.newBook) {
        const tariffBookId = createTariffBookId({
          name: result.newBook.name,
          year: result.newBook.year,
        });
        const fullVoice: DesktopTariffVoice = {
          ...result.voiceData,
          id: `voice_${tariffBookId}_${sanitizeIdentifier(result.voiceData.officialCode)}`,
          tariffBookId,
        };
        const savedBook = await createDesktopTariffBook({
          id: tariffBookId,
          name: result.newBook.name,
          sourceName: result.newBook.sourceName,
          status: "active",
          year: result.newBook.year,
          voices: [fullVoice],
        });

        savedVoiceMap.current.set(tariffBookId, [fullVoice]);
        setTariffBooksState((current) => ({
          data: [savedBook, ...current.data],
          ...(current.source === "fallback"
            ? { message: "Runtime browser: nuovo tariffario creato.", source: "fallback" }
            : { source: "desktop" }),
        }));
        setVoiceCountByBookId((current) => ({
          ...current,
          [tariffBookId]: 1,
        }));
        updatedBookIds.add(tariffBookId);
        newTariffBookId = tariffBookId;
      }

      // 2. Add voice to existing books
      for (const bookId of result.existingBookIds) {
        const existingResult = await listDesktopTariffVoices(bookId, fallbackTariffVoices);
        const fullVoice: DesktopTariffVoice = {
          ...result.voiceData,
          id: `voice_${bookId}_${sanitizeIdentifier(result.voiceData.officialCode)}`,
          tariffBookId: bookId,
        };
        const allVoices = [...existingResult.data, fullVoice];
        const existingBook = tariffBooksState.data.find((b) => b.id === bookId);
        if (!existingBook) continue;

        await updateDesktopTariffBook(bookId, {
          name: existingBook.name,
          sourceName: existingBook.sourceName,
          status: existingBook.status,
          year: existingBook.year,
          voices: allVoices,
        });

        savedVoiceMap.current.set(bookId, allVoices);
        setVoiceCountByBookId((current) => ({
          ...current,
          [bookId]: (current[bookId] ?? 0) + 1,
        }));

        if (selectedTariffBookId === bookId) {
          setVoicesState({ data: allVoices, source: "desktop" });
        }
        updatedBookIds.add(bookId);
      }

      dispatchDataChanged();
      setIsAddVoiceOpen(false);

      const targetLabel =
        updatedBookIds.size === 1
          ? updatedBookIds.has(newTariffBookId ?? "")
            ? "nuovo tariffario"
            : "1 tariffario"
          : `${updatedBookIds.size} tariffari`;

      notify({
        message: `Voce ${result.voiceData.officialCode} aggiunta a ${targetLabel}.`,
        title: "Voce salvata",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Salvataggio voce non riuscito",
        tone: "danger",
      });
    }
  }

  useEffect(() => {
    const isPreview = importPhase === "preview" && importPreviews.length > 0;
    const canConfirmPreview =
      isPreview &&
      previewValidationCanConfirm.current &&
      importPreviews.every((_, index) => reviewedFiles.has(index) || draftedImportFiles.has(index));

    setTariffImportToolbar({
      activeIndex: isPreview ? importPreviewIndex : 0,
      activeDrafted: isPreview ? draftedImportFiles.has(importPreviewIndex) : false,
      activeReviewed: isPreview ? reviewedFiles.has(importPreviewIndex) : false,
      canConfirm: canConfirmPreview,
      draftedCount: isPreview ? draftedImportFiles.size : 0,
      fileLabels: isPreview ? importPreviewToolbarSummary.fileLabels : [],
      phase: isPreview ? "preview" : "idle",
      reviewedCount: isPreview ? reviewedFiles.size : 0,
      reviewedVoiceCount: isPreview ? importPreviewToolbarSummary.reviewedVoiceCount : 0,
      totalVoices: isPreview ? importPreviewToolbarSummary.totalVoices : 0,
    });
  }, [
    importPhase,
    importPreviewIndex,
    importPreviews,
    importPreviewToolbarSummary,
    draftedImportFiles,
    reviewedFiles,
    setTariffImportToolbar,
  ]);

  useEffect(() => {
    if (importPhase !== "preview" || importPreviews.length === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      const host = getScrollableAncestor(screenRef.current);
      if (host) {
        host.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      window.scrollTo({ top: 0, behavior: "auto" });
      document.documentElement.scrollTo?.({ top: 0, behavior: "auto" });
    });
  }, [importPhase, importPreviews.length]);

  useEffect(
    () => () => {
      editPreviewBookIdMap.current = new Map();
      setTariffImportToolbar({
        activeIndex: 0,
        activeDrafted: false,
        activeReviewed: false,
        canConfirm: false,
        draftedCount: 0,
        fileLabels: [],
        phase: "idle",
        reviewedCount: 0,
        reviewedVoiceCount: 0,
        totalVoices: 0,
      });
    },
    [setTariffImportToolbar],
  );

  async function handleConfirmImport(metadatas: TariffImportPreviewResult[]) {
    if (metadatas.length === 0) return;

    let importedCount = 0;
    let totalVoices = 0;
    const savedBooks: DesktopTariffBook[] = [];
    let lastSavedResult: { tariffBookId: string; voices: DesktopTariffVoice[] } | null = null;
    const savedVoiceEntries: Array<[string, DesktopTariffVoice[]]> = [];
    const duplicateBookIdsToDelete = new Set<string>();
    const existingBookIdsByMetadataKey = new Map<string, string[]>();

    for (const book of tariffBooksState.data) {
      const key = getMetadataKey({
        name: book.name,
        sourceName: book.sourceName,
        voices: [],
        year: book.year,
      });
      existingBookIdsByMetadataKey.set(key, [
        ...(existingBookIdsByMetadataKey.get(key) ?? []),
        book.id,
      ]);
    }

    const latestMetadatas = keepLatestImportPerMetadataKey(
      metadatas.filter((metadata) => metadata.voices.length > 0),
    );

    for (const metadata of latestMetadatas) {
      const existingBookIds = existingBookIdsByMetadataKey.get(getMetadataKey(metadata)) ?? [];
      const existingBookId = metadata.existingBookId ?? existingBookIds[0];
      const tariffBookId = existingBookId ?? createTariffBookId(metadata);
      const voices = metadata.voices.map((voice) => ({
        ...voice,
        id: `voice_${tariffBookId}_${sanitizeIdentifier(voice.officialCode)}`,
        tariffBookId,
      }));

      try {
        let savedBook: DesktopTariffBook;
        if (existingBookId) {
          savedBook = await updateDesktopTariffBook(existingBookId, {
            name: metadata.name,
            sourceName: metadata.sourceName,
            status: metadata.importStatus,
            voices,
            year: metadata.year,
          });
        } else {
          savedBook = await createDesktopTariffBook({
            id: tariffBookId,
            name: metadata.name,
            sourceName: metadata.sourceName,
            status: metadata.importStatus,
            voices,
            year: metadata.year,
          });
        }

        for (const duplicateId of existingBookIds) {
          if (duplicateId !== tariffBookId) duplicateBookIdsToDelete.add(duplicateId);
        }
        savedBooks.push(savedBook);
        savedVoiceEntries.push([tariffBookId, voices]);
        lastSavedResult = { tariffBookId, voices };
        importedCount++;
        totalVoices += voices.length;
      } catch (error) {
        notify({
          message: `${metadata.name}: ${error instanceof Error ? error.message : String(error)}`,
          title: existingBookId ? "Aggiornamento non riuscito" : "Importazione non riuscita",
          tone: "danger",
        });
      }

      if (latestMetadatas.length > 4) {
        await yieldToBrowser();
      }
    }

    if (duplicateBookIdsToDelete.size > 0) {
      for (const duplicateId of duplicateBookIdsToDelete) {
        try {
          await deleteDesktopTariffBook(duplicateId);
        } catch {
          /* best effort cleanup: refreshed catalog below remains the source of truth */
        }
      }
    }

    if (savedVoiceEntries.length > 0) {
      const nextSavedVoiceMap = new Map(savedVoiceMap.current);
      for (const [tariffBookId, voices] of savedVoiceEntries) {
        nextSavedVoiceMap.set(tariffBookId, voices);
      }
      savedVoiceMap.current = nextSavedVoiceMap;
    }

    clearImport();

    if (importedCount > 0) {
      const savedBookIds = new Set(savedBooks.map((book) => book.id));
      const duplicateBookIds = duplicateBookIdsToDelete;

      setActiveCatalogTab("all");
      setProjectFilter("all");
      setQuery("");
      setStatusFilter("all");
      setYearFilter("all");

      if (lastSavedResult?.voices.length) {
        setVoicesState({ data: lastSavedResult.voices, source: "desktop" });
      }
      setSelectedTariffBookId(
        lastSavedResult?.tariffBookId ?? savedBooks[savedBooks.length - 1]?.id ?? "",
      );
      setTariffBooksState((current) => ({
        data: [
          ...[...savedBooks].reverse(),
          ...current.data.filter(
            (item) => !savedBookIds.has(item.id) && !duplicateBookIds.has(item.id),
          ),
        ],
        ...(current.source === "fallback"
          ? { message: "Runtime browser: import in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      catalogRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      dispatchDataChanged();
      try {
        const tariffBooks = await listDesktopTariffBooks(fallbackTariffBooks);
        setTariffBooksState(tariffBooks);
        const voiceCountResult = await listDesktopTariffVoiceCounts(
          tariffBooks.data,
          fallbackTariffVoices,
        );
        const counts = new Map(
          voiceCountResult.data.map((entry) => [entry.tariffBookId, entry.count]),
        );
        setVoiceCountByBookId(
          Object.fromEntries(tariffBooks.data.map((book) => [book.id, counts.get(book.id) ?? 0])),
        );
      } catch {
        /* state was already updated optimistically */
      }
      notify({
        message: `${importedCount} tariffari (${totalVoices.toLocaleString("it-IT")} voci) salvati in locale.`,
        title: "Importazione completata",
        tone: "success",
      });
    }
  }

  const clearImport = useCallback(() => {
    dispatchImport({ type: "CLEAR" });
    editPreviewBookIdMap.current = new Map();
    setReviewedFiles(new Set());
    setDraftedImportFiles(new Set());
  }, []);

  const startPdfImport = useCallback(() => {
    editPreviewBookIdMap.current = new Map();
    setDraftedImportFiles(new Set());
    setReviewedFiles(new Set());
    void handlePdfImport();
  }, [handlePdfImport]);

  useActionHandler("tariff.import", startPdfImport);

  useEffect(() => {
    const processPendingWorkflowAction = (action: PendingWorkflowAction) => {
      if (action !== "import-tariff") return;
      useAppStore.getState().setPendingWorkflowAction(null);
      startPdfImport();
    };

    processPendingWorkflowAction(useAppStore.getState().pendingWorkflowAction);
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.pendingWorkflowAction !== prev.pendingWorkflowAction) {
        processPendingWorkflowAction(state.pendingWorkflowAction);
      }
    });
    return unsub;
  }, [startPdfImport]);

  useActionHandler(
    "tariff.preview.select",
    useCallback(
      (action) => {
        if (action.type === "tariff.preview.select" && importPreviews[action.index]) {
          dispatchImport({ type: "SET_INDEX", index: action.index });
        }
      },
      [importPreviews],
    ),
  );

  function handleShowTariffBookDetails(book: DesktopTariffBook) {
    setSelectedTariffBookId(book.id);
    setEditingBookId(null);
    setDetailBookId((current) => (current === book.id ? null : book.id));
  }

  function handleOpenVoices(book: DesktopTariffBook) {
    setSelectedTariffBookId(book.id);
    setEditingBookId(null);
    setDetailBookId(null);
    void handleEditVoices(book);
  }

  function handleToggleFavorite(bookId: string) {
    setFavoriteBookIds((current) =>
      current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId],
    );
  }

  function handleStartEdit(book: DesktopTariffBook) {
    setSelectedTariffBookId(book.id);
    setEditingBookId(book.id);
    setDetailBookId(null);
    setEditForm({
      name: book.name,
      sourceName: book.sourceName,
      status: book.status,
      year: String(book.year),
    });
  }

  async function handleSaveEdit() {
    const year = Number(editForm.year);
    if (!Number.isInteger(year)) {
      return;
    }

    try {
      const updated = await updateDesktopTariffBook(selectedTariffBook.id, {
        name: editForm.name.trim(),
        sourceName: editForm.sourceName.trim(),
        status: editForm.status,
        year,
      });

      setTariffBooksState((current) => ({
        data: current.data.map((book) => (book.id === updated.id ? updated : book)),
        ...(current.source === "fallback"
          ? { message: "Runtime browser: modifica in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      setEditingBookId(null);
      setDetailBookId(updated.id);
      dispatchDataChanged();
      notify({
        message: "Dati tariffario aggiornati.",
        title: "Tariffario modificato",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Modifica tariffario non riuscita",
        tone: "danger",
      });
    }
  }

  async function handleDeleteFromDropdown(bookId: string) {
    try {
      const deletedBook = tariffBooksState.data.find((book) => book.id === bookId);

      await deleteDesktopTariffBook(bookId);
      savedVoiceMap.current = new Map(savedVoiceMap.current);
      savedVoiceMap.current.delete(bookId);
      setTariffBooksState((current) => ({
        data: current.data.filter((book) => book.id !== bookId),
        ...(current.source === "fallback"
          ? { message: "Runtime browser: eliminazione in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      if (selectedTariffBookId === bookId) {
        setSelectedTariffBookId(tariffBooksState.data.find((b) => b.id !== bookId)?.id ?? "");
      }
      setDetailBookId((current) => (current === bookId ? null : current));
      setFavoriteBookIds((current) => current.filter((id) => id !== bookId));
      // Clean up dangling tariffPriorities in contracts that reference this book
      try {
        const { data: allContracts } = await listDesktopContracts([]);
        for (const contract of allContracts) {
          if (contract.tariffPriorities?.some((tp) => tp.tariffBookId === bookId)) {
            await updateDesktopContract(contract.id, {
              applicationContractCode: contract.applicationContractCode,
              contractorName: contract.contractorName ?? null,
              contractualAmount: contract.contractualAmount.amount,
              frameworkAgreementCode: contract.frameworkAgreementCode,
              id: contract.id,
              osExcludedAmount: contract.osExcludedAmount ?? null,
              tariffPriorities: contract.tariffPriorities.filter(
                (tp) => tp.tariffBookId !== bookId,
              ),
              tenderDiscountPercent: contract.tenderDiscountPercent,
              title: contract.title,
            });
          }
        }
      } catch {
        // Best-effort cleanup of orphan references
      }
      dispatchDataChanged();
      notify({
        message: `${deletedBook?.name ?? "Tariffario"} eliminato dal catalogo.`,
        title: "Tariffario eliminato",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Eliminazione tariffario non riuscita",
        tone: "danger",
      });
    }
  }

  async function handleBulkDelete() {
    const selectedBooks = deleteSelect.selectedItems;
    if (selectedBooks.length === 0) return;

    const results = await Promise.allSettled(
      selectedBooks.map((book) => deleteDesktopTariffBook(book.id)),
    );
    const deletedIds = new Set(
      selectedBooks.filter((_, i) => results[i]?.status === "fulfilled").map((b) => b.id),
    );
    const failedCount = results.filter((r) => r.status === "rejected").length;

    savedVoiceMap.current = new Map(savedVoiceMap.current);
    for (const id of deletedIds) {
      savedVoiceMap.current.delete(id);
    }

    try {
      const { data: allContracts } = await listDesktopContracts([]);
      for (const contract of allContracts) {
        if (contract.tariffPriorities?.some((tp) => deletedIds.has(tp.tariffBookId))) {
          await updateDesktopContract(contract.id, {
            applicationContractCode: contract.applicationContractCode,
            contractorName: contract.contractorName ?? null,
            contractualAmount: contract.contractualAmount.amount,
            frameworkAgreementCode: contract.frameworkAgreementCode,
            id: contract.id,
            osExcludedAmount: contract.osExcludedAmount ?? null,
            tariffPriorities: contract.tariffPriorities.filter(
              (tp) => !deletedIds.has(tp.tariffBookId),
            ),
            tenderDiscountPercent: contract.tenderDiscountPercent,
            title: contract.title,
          });
        }
      }
    } catch {
      // best-effort cleanup
    }

    setTariffBooksState((current) => ({
      data: current.data.filter((book) => !deletedIds.has(book.id)),
      ...(current.source === "fallback"
        ? { message: "Runtime browser: eliminazione in anteprima.", source: "fallback" }
        : { source: "desktop" }),
    }));

    if (deletedIds.has(selectedTariffBookId)) {
      const remaining = tariffBooksState.data.filter((b) => !deletedIds.has(b.id));
      setSelectedTariffBookId(remaining[0]?.id ?? "");
    }
    setDetailBookId((current) => (current != null && deletedIds.has(current) ? null : current));
    setFavoriteBookIds((current) => current.filter((id) => !deletedIds.has(id)));
    setEditingBookId((current) => (current != null && deletedIds.has(current) ? null : current));

    dispatchDataChanged();
    deleteSelect.onDeleted();

    if (deletedIds.size === 0) {
      notify({
        message: "Nessun tariffario eliminato.",
        title: "Eliminazione non riuscita",
        tone: "danger",
      });
      return;
    }

    notify({
      message:
        failedCount > 0
          ? `${deletedIds.size} tariffari eliminati, ${failedCount} operazioni non riuscite.`
          : `${deletedIds.size} tariffari eliminati dal catalogo.`,
      title: failedCount > 0 ? "Eliminazione parziale" : "Eliminati",
      tone: failedCount > 0 ? "warning" : "success",
    });
  }

  return (
    <ScreenLayout
      ref={screenRef}
      className={importPhase === "preview" && importPreviews.length > 0 ? "" : "overflow-x-hidden"}
    >
      {importPhase === "preview" && importPreviews.length > 0 ? (
        <TariffImportPreviewPanel
          draftedImportFiles={draftedImportFiles}
          getExistingBookIds={getExistingBookIds}
          importPreviewIndex={importPreviewIndex}
          importPreviews={importPreviews}
          onCancel={clearImport}
          onConfirm={handleConfirmImport}
          onActiveIndexChange={(index) => {
            dispatchImport({ type: "SET_INDEX", index });
          }}
          onDraftedFilesChange={updateDraftedImportFiles}
          onMetadatasChange={(nextMetadatas) => {
            dispatchImport({ type: "SET_PREVIEWS", previews: nextMetadatas });
            const prev = editPreviewBookIdMap.current;
            if (prev.size > 0) {
              const next = new Map<string, string>();
              for (const meta of nextMetadatas) {
                const k = getMetadataKey(meta);
                const bookId = prev.get(k);
                if (bookId) next.set(k, bookId);
              }
              editPreviewBookIdMap.current = next;
            }
            const nextIndex =
              nextMetadatas.length === 0
                ? 0
                : Math.min(importPreviewIndex, nextMetadatas.length - 1);
            dispatchImport({ type: "SET_INDEX", index: nextIndex });
            if (nextMetadatas.length === 0) {
              dispatchImport({ type: "SET_PHASE", phase: "idle" });
            }
          }}
          onPageCanConfirmChange={(v: boolean) => {
            previewValidationCanConfirm.current = v;
          }}
          onReviewedFilesChange={updateReviewedFiles}
          reviewedFiles={reviewedFiles}
        />
      ) : (
        <>
          <section className="border-b border-[var(--border-subtle)] pb-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <p className="text-12px font-medium text-[var(--text-tertiary)]">Catalogo prezzi</p>
                <h2 className="mt-1 text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
                  Tariffari
                </h2>
                <p className="mt-2 max-w-2xl text-14px leading-6 text-[var(--text-secondary)]">
                  Import, filtri e manutenzione dei prezzari in una lista compatta.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[560px]">
                <TariffHeaderStat
                  icon={Database}
                  label="Tariffari"
                  value={String(tariffMetrics.tariffCount)}
                />
                <TariffHeaderStat
                  icon={Building2}
                  label="Enti"
                  value={String(tariffMetrics.sourceCount)}
                />
                <TariffHeaderStat
                  icon={CalendarDays}
                  label="Anni"
                  value={String(availableYears.length)}
                />
                <TariffHeaderStat
                  icon={CheckCircle2}
                  label="Attivi"
                  value={String(tariffMetrics.activeCount)}
                />
              </div>
            </div>
          </section>

          <section className="operational-panel-grid mt-6 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-4 xl:self-start">
              <Panel eyebrow="Azioni rapide">
                <div className="space-y-3">
                  <QuickAction
                    detail="Aggiungi una voce a un tariffario esistente o nuovo"
                    icon={Plus}
                    label="Aggiungi voce"
                    onClick={() => setIsAddVoiceOpen(true)}
                    tone="info"
                  />
                  <QuickAction
                    detail="Carica un tariffario da PDF o JSON parser"
                    icon={FileText}
                    label="Importa PDF/JSON"
                    onClick={handlePdfImport}
                    tone="info"
                  />
                  <QuickAction
                    detail={
                      tariffBooksState.data.filter((b) => b.status === "draft").length > 0
                        ? `Revisiona ${tariffBooksState.data.filter((b) => b.status === "draft").length} tariffari in bozza`
                        : "Nessun tariffario in bozza"
                    }
                    icon={Save}
                    label="Revisiona bozze"
                    onClick={handleReviewAllDrafts}
                    tone="warning"
                  />
                  <QuickAction
                    detail="Crea una copia di un tariffario esistente"
                    icon={Copy}
                    label="Duplica tariffario"
                    onClick={() =>
                      notify({
                        message:
                          "La duplicazione dei tariffari sara disponibile in un prossimo aggiornamento.",
                        title: "In arrivo",
                        tone: "info",
                      })
                    }
                    tone="info"
                  />
                </div>
              </Panel>
            </div>

            <Panel className="min-w-0 overflow-visible" padding="none">
              <div className="border-b border-[var(--border-subtle)] p-4">
                <div className="operational-toolbar">
                  <div className="operational-toolbar-group">
                    <FilterChip
                      active={activeCatalogTab === "all"}
                      count={baseFilteredTariffBooks.length}
                      onClick={() => {
                        setActiveCatalogTab("all");
                        resetVisibleTariffs();
                      }}
                    >
                      Tutti i tariffari
                    </FilterChip>
                    <FilterChip
                      active={activeCatalogTab === "favorites"}
                      count={favoriteCount}
                      onClick={() => {
                        setActiveCatalogTab("favorites");
                        resetVisibleTariffs();
                      }}
                    >
                      I miei preferiti
                    </FilterChip>
                  </div>

                  <div className="operational-toolbar-actions">
                    <FilterSelect
                      label="Anno"
                      onChange={(value) => {
                        setYearFilter(value);
                        resetVisibleTariffs();
                      }}
                      options={["all", ...availableYears.map(String)]}
                      value={yearFilter}
                      displayMap={
                        new Map<string, string>([
                          ["all", "Tutti gli anni"],
                          ...availableYears.map((y) => [String(y), String(y)] as const),
                        ])
                      }
                    />
                    <FilterSelect
                      label="Progetto"
                      onChange={(value) => {
                        setProjectFilter(value);
                        resetVisibleTariffs();
                      }}
                      options={["all", ...realContracts.map((c) => c.id)]}
                      value={projectFilter}
                      displayMap={
                        new Map([
                          [
                            "all",
                            realContracts.length > 0 ? "Tutti i progetti" : "Nessun progetto",
                          ],
                          ...projectDisplayMap,
                        ])
                      }
                    />
                    <FilterSelect
                      label="Stato"
                      onChange={(value) => {
                        setStatusFilter(value);
                        resetVisibleTariffs();
                      }}
                      options={statusOptions}
                      value={statusFilter}
                      displayMap={statusDisplayMap}
                    />
                    <FilterSearch
                      onChange={(value) => {
                        setQuery(value);
                        resetVisibleTariffs();
                      }}
                      placeholder="Cerca per nome, ente o ID..."
                      value={query}
                    />
                    {yearFilter !== "all" ||
                    projectFilter !== "all" ||
                    statusFilter !== "all" ||
                    query ? (
                      <ClearFiltersButton
                        onClick={() => {
                          setYearFilter("all");
                          setProjectFilter("all");
                          setStatusFilter("all");
                          setQuery("");
                          resetVisibleTariffs();
                        }}
                      />
                    ) : null}
                    <MultiSelectToggle
                      isEnabled={deleteSelect.isEnabled}
                      onToggle={deleteSelect.toggleEnable}
                      count={deleteSelect.count}
                    />
                  </div>
                </div>
              </div>

              {deleteSelect.count > 0 && (
                <div className="px-3 pt-3 lg:px-4">
                  <MultiSelectBulkDeleteBar
                    allSelected={deleteSelect.allSelected}
                    count={deleteSelect.count}
                    entityLabel="tariffari"
                    entityLabelSingular="tariffario"
                    isDeleteConfirmOpen={deleteSelect.isConfirmOpen}
                    onClear={deleteSelect.clear}
                    onClose={deleteSelect.disable}
                    onDeleteConfirm={handleBulkDelete}
                    onDeleteConfirmDismiss={deleteSelect.dismissDelete}
                    onDeleteRequest={deleteSelect.requestDelete}
                    onSelectAll={() => deleteSelect.selectAll(visibleTariffBooks.map((b) => b.id))}
                    selectedItemNames={deleteSelect.selectedItems.map((b) => b.name)}
                    someSelected={deleteSelect.someSelected}
                  />
                </div>
              )}

              <div ref={catalogRef}>
                <div className="space-y-2 p-3">
                  {visibleTariffBooks.length > 0 ? (
                    displayedTariffBooks.map((book) => (
                      <TariffBookPreviewCard
                        key={book.id}
                        book={book}
                        editForm={editForm}
                        editing={editingBookId === book.id}
                        isFavorite={favoriteBookIdSet.has(book.id)}
                        isSelected={deleteSelect.isSelected(book.id)}
                        linkedProjectCount={linkedProjectCountByTariffBookId.get(book.id) ?? 0}
                        onCancelEdit={() => setEditingBookId(null)}
                        onDelete={() => handleDeleteFromDropdown(book.id)}
                        onEdit={() => handleStartEdit(book)}
                        onEditFormChange={setEditForm}
                        onOpenVoices={() => handleOpenVoices(book)}
                        onSaveEdit={handleSaveEdit}
                        onShowDetails={() => handleShowTariffBookDetails(book)}
                        onToggleFavorite={() => handleToggleFavorite(book.id)}
                        onToggleSelect={deleteSelect.toggle}
                        showCheckbox={deleteSelect.isEnabled}
                        showDetails={detailBookId === book.id}
                        voiceCount={voiceCountByBookId[book.id]}
                      />
                    ))
                  ) : (
                    <div>
                      <EmptyState
                        icon={Database}
                        title="Nessun tariffario trovato"
                        description={
                          activeCatalogTab === "favorites"
                            ? "I filtri correnti non includono tariffari preferiti."
                            : "Modifica i filtri o importa un nuovo PDF/JSON tariffario."
                        }
                      />
                    </div>
                  )}
                </div>
                {remainingTariffCount > 0 ? (
                  <div className="border-t border-[var(--border-subtle)] px-3 py-4 text-center">
                    <Button
                      onClick={() => setVisibleTariffLimit((current) => current + TARIFF_PAGE_SIZE)}
                      type="button"
                      variant="secondary"
                    >
                      Carica altri {Math.min(TARIFF_PAGE_SIZE, remainingTariffCount)} tariffari
                    </Button>
                    <p className="mt-2 text-11px font-medium text-[var(--text-secondary)]">
                      {displayedTariffBooks.length} di {visibleTariffBooks.length} visibili
                    </p>
                  </div>
                ) : null}
              </div>
            </Panel>
          </section>
        </>
      )}
      <AddVoiceDialog
        isOpen={isAddVoiceOpen}
        onClose={() => setIsAddVoiceOpen(false)}
        tariffBooks={tariffBooksState.data}
        onSave={handleAddVoiceSave}
      />
      {importPhase === "loading" ? <TariffImportLoadingModal files={importFiles} /> : null}
      {isVoicesExplorerOpen ? (
        <TariffVoicesExplorerModal
          groups={groupedVoices}
          onClose={() => setIsVoicesExplorerOpen(false)}
          tariffBookName={selectedTariffBook.name}
          total={voicesState.data.length}
        />
      ) : null}
    </ScreenLayout>
  );
}
