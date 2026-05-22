import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  Save,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch, FilterSelect } from "@/components/filters";
import { FilterChip } from "@/components/shared/FilterChip";
import { MetricCard } from "@/components/shared/MetricCard";
import { MultiSelectBulkDeleteBar } from "@/components/shared/MultiSelectBulkDeleteBar";
import { MultiSelectToggle } from "@/components/shared/MultiSelectControls";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useMultiSelectDelete } from "@/hooks/use-multi-select-delete";
import { useToast } from "@/components/shared/ToastProvider";

import {
  createDesktopTariffBook,
  deleteDesktopTariffBook,
  type DesktopContract,
  type DesktopDataResult,
  type DesktopTariffBook,
  type DesktopTariffVoice,
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

import { useAppStore } from "@/store/app-store";

import { QuickAction } from "./components/QuickAction";
import {
  Panel,
  PanelTitle,
  TariffBookPreviewCard,
  TariffImportPreviewPanel,
} from "./components/TariffScreenPanels";
import { TariffImportLoadingModal } from "./components/TariffImportLoadingModal";
import type { TariffImportPreviewResult } from "./components/TariffImportPreviewModal";
import { TariffVoicesExplorerModal } from "./components/TariffVoicesExplorerModal";
import {
  fallbackContracts,
  fallbackTariffBook,
  fallbackTariffBooks,
  fallbackTariffVoices,
} from "./tariffs-data";
import type { EditTariffBookForm, TariffMetrics } from "./tariffs-types";
import {
  areNumberSetsEqual,
  getScrollableAncestor,
  importMetaReducer,
  initialImportMeta,
  isStringArray,
} from "./state/import-meta";
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
  const [voiceCountByBookId, setVoiceCountByBookId] = useState<Record<string, number>>({});
  const [isVoicesExplorerOpen, setIsVoicesExplorerOpen] = useState(false);
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

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [tariffBooks, contracts] = await Promise.all([
          listDesktopTariffBooks(fallbackTariffBooks),
          listDesktopContracts(fallbackContracts),
        ]);
        if (!active) return;

        setTariffBooksState(tariffBooks);
        setContractsState(contracts);
        setSelectedTariffBookId(tariffBooks.data[0]?.id ?? fallbackTariffBook.id);

        try {
          const voiceCountResult = await listDesktopTariffVoiceCounts(
            tariffBooks.data,
            fallbackTariffVoices,
          );
          if (!active) return;

          const counts = new Map(
            voiceCountResult.data.map((entry) => [entry.tariffBookId, entry.count]),
          );
          const entries = tariffBooks.data.map(
            (book) => [book.id, counts.get(book.id) ?? 0] as const,
          );
          setVoiceCountByBookId(Object.fromEntries(entries));
        } catch {
          /* voice count failure is non-critical, silently ignore */
        }
      } catch {
        if (!active) return;
        notify({
          message: "Impossibile caricare tariffari e contratti.",
          title: "Caricamento fallito",
          tone: "danger",
        });
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [notify]);

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

  const handleWorkflowAction = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "import") {
        editPreviewBookIdMap.current = new Map();
        setDraftedImportFiles(new Set());
        setReviewedFiles(new Set());
        void handlePdfImport();
      }
    },
    [handlePdfImport],
  );

  useEffect(() => {
    window.addEventListener("tariff-workflow-action", handleWorkflowAction);
    return () => window.removeEventListener("tariff-workflow-action", handleWorkflowAction);
  }, [handleWorkflowAction]);

  const handlePreviewAction = useCallback(
    (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;

      if (actionId === "tariff-import-cancel") {
        clearImport();
        return;
      }

      if (actionId.startsWith("tariff-import-select-")) {
        const nextIndex = Number.parseInt(actionId.replace("tariff-import-select-", ""), 10);
        if (Number.isInteger(nextIndex) && importPreviews[nextIndex]) {
          dispatchImport({ type: "SET_INDEX", index: nextIndex });
        }
      }
    },
    [importPreviews, clearImport],
  );

  useEffect(() => {
    window.addEventListener("tariff-preview-action", handlePreviewAction);
    return () => window.removeEventListener("tariff-preview-action", handlePreviewAction);
  }, [handlePreviewAction]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (state.pendingWorkflowAction === "import-tariff") {
        window.dispatchEvent(new CustomEvent("tariff-workflow-action", { detail: "import" }));
        useAppStore.getState().setPendingWorkflowAction(null);
      }
    });

    return unsub;
  }, []);

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
          <ScreenHero
            badge="Catalogo prezzi"
            title="Catalogo tariffari"
            description="Gestisci tariffari per ente, anno e coerenza con i progetti, mantenendo import, filtri e dettaglio nello stesso piano operativo."
            sidePanel={
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                      Voci nel catalogo
                    </div>
                    <div className="mt-2 text-28px font-semibold leading-none text-[var(--text-primary)]">
                      {voicesState.data.length.toLocaleString("it-IT")}
                    </div>
                  </div>
                  <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                    <Database className="size-6" />
                  </span>
                </div>
                <p className="mt-5 text-12px font-medium leading-5 text-[var(--text-secondary)]">
                  {tariffMetrics.tariffCount} tariffari su {tariffMetrics.sourceCount} enti.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-base)]">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div className="text-12px font-semibold text-[var(--text-primary)]">
                    {tariffMetrics.activeCount} aggiornati
                  </div>
                </div>
              </div>
            }
          >
            <div className="grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                caption="Totali nel catalogo"
                icon={Database}
                label="Tariffari"
                value={String(tariffMetrics.tariffCount)}
              />
              <MetricCard
                caption="Enti gestiti"
                icon={Building2}
                label="Enti"
                tone="success"
                value={String(tariffMetrics.sourceCount)}
              />
              <MetricCard
                caption={availableYears.slice(0, 3).join(", ")}
                icon={CalendarDays}
                label="Anni attivi"
                tone="warning"
                value={String(availableYears.length)}
              />
              <MetricCard
                caption="Nel catalogo"
                icon={Sparkles}
                label="Voci totali"
                tone="info"
                value={voicesState.data.length.toLocaleString("it-IT")}
              />
              <MetricCard
                caption="Attivi o validati"
                icon={CheckCircle2}
                label="Aggiornati"
                tone="success"
                value={String(tariffMetrics.activeCount)}
              />
            </div>
          </ScreenHero>

          <section className="mt-8 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-4 xl:self-start">
              <Panel>
                <PanelTitle>Azioni rapide</PanelTitle>
                <div className="mt-4 space-y-3">
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

            <Panel className="min-w-0 overflow-visible p-0">
              <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip
                    active={activeCatalogTab === "all"}
                    count={baseFilteredTariffBooks.length}
                    onClick={() => setActiveCatalogTab("all")}
                  >
                    Tutti i tariffari
                  </FilterChip>
                  <FilterChip
                    active={activeCatalogTab === "favorites"}
                    count={favoriteCount}
                    onClick={() => setActiveCatalogTab("favorites")}
                  >
                    I miei preferiti
                  </FilterChip>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect
                    label="Anno"
                    onChange={setYearFilter}
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
                    onChange={setProjectFilter}
                    options={["all", ...realContracts.map((c) => c.id)]}
                    value={projectFilter}
                    displayMap={
                      new Map([
                        ["all", realContracts.length > 0 ? "Tutti i progetti" : "Nessun progetto"],
                        ...projectDisplayMap,
                      ])
                    }
                  />
                  <FilterSelect
                    label="Stato"
                    onChange={setStatusFilter}
                    options={statusOptions}
                    value={statusFilter}
                    displayMap={statusDisplayMap}
                  />
                  <FilterSearch
                    onChange={setQuery}
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
                <div className="grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3">
                  {visibleTariffBooks.length > 0 ? (
                    visibleTariffBooks.map((book) => (
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
                    <div className="col-span-full rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)]/35 p-10 text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                        <Database className="size-5" />
                      </div>
                      <div className="mt-4 text-15px font-bold text-[var(--text-primary)]">
                        Nessun tariffario trovato
                      </div>
                      <p className="mx-auto mt-2 max-w-[360px] text-13px font-medium leading-5 text-[var(--text-secondary)]">
                        {activeCatalogTab === "favorites"
                          ? "I filtri correnti non includono tariffari preferiti."
                          : "Modifica i filtri o importa un nuovo PDF/JSON tariffario."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </section>
        </>
      )}
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
