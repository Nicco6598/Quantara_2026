import { m } from "framer-motion";
import {
  ArrowUp,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Save,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch, FilterSelect } from "@/components/filters";
import { Badge } from "@/components/shared/Badge";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { MOTION_VARIANTS } from "@/components/shared/easings";

import { ScreenHero } from "@/components/shared/ScreenHero";

import { useToast } from "@/components/shared/ToastProvider";

import { Button } from "@/components/shared/Button";
import { FilterChip } from "@/components/shared/FilterChip";
import { MetricCard } from "@/components/shared/MetricCard";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { BezelSurface } from "@/components/shared/ui-primitives";

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
  type TariffPdfMetadata,
  updateDesktopTariffBook,
} from "@/lib/desktopData";

import { cn } from "@/lib/utils";

import { useAppStore } from "@/store/app-store";

import { QuickAction } from "./components/QuickAction";
import { TariffEditField } from "./components/TariffEditField";
import { TariffImportLoadingModal } from "./components/TariffImportLoadingModal";
import {
  TariffImportPreviewModal,
  type TariffImportPreviewResult,
} from "./components/TariffImportPreviewModal";
import { TariffVoicesExplorerModal } from "./components/TariffVoicesExplorerModal";
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

type ImportFile = {
  fileName: string;
  index: number;
  total: number;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
};

type ImportMetaState = {
  phase: "idle" | "loading" | "preview";
  previews: TariffPdfMetadata[];
  previewIndex: number;
  files: ImportFile[];
};

const initialImportMeta: ImportMetaState = {
  phase: "idle",
  previews: [],
  previewIndex: 0,
  files: [],
};

type ImportMetaAction =
  | { type: "START_LOADING" }
  | { type: "UPDATE_FILE"; file: ImportFile }
  | { type: "SHOW_PREVIEW"; previews: TariffPdfMetadata[] }
  | { type: "SET_PREVIEWS"; previews: TariffPdfMetadata[] }
  | { type: "SET_INDEX"; index: number }
  | { type: "SET_PHASE"; phase: ImportMetaState["phase"] }
  | { type: "CLEAR" };

function areNumberSetsEqual(left: Set<number>, right: Set<number>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function importMetaReducer(state: ImportMetaState, action: ImportMetaAction): ImportMetaState {
  switch (action.type) {
    case "START_LOADING":
      return { ...state, phase: "loading", files: [] };
    case "UPDATE_FILE":
      return {
        ...state,
        files: state.files.some((f) => f.index === action.file.index)
          ? state.files.map((f) => (f.index === action.file.index ? { ...f, ...action.file } : f))
          : [...state.files, action.file],
      };
    case "SHOW_PREVIEW":
      return { ...state, phase: "preview", previews: action.previews, previewIndex: 0 };
    case "SET_PREVIEWS":
      return { ...state, previews: action.previews };
    case "SET_INDEX":
      return { ...state, previewIndex: action.index };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "CLEAR":
      return { ...initialImportMeta };
    default:
      return state;
  }
}

function getScrollableAncestor(element: HTMLElement | null) {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const canScroll =
      /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;
    if (canScroll) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

export function TariffsScreen() {
  const FAVORITES_STORAGE_KEY = "quantara.tariffs.favoriteBookIds";
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
      const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (rawValue) {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
          return parsed;
        }
      }
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

    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteBookIds));
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
      const { selectMultipleTariffPdfMetadatas } = await import("@/lib/desktopData");
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
        message: error instanceof Error ? error.message : String(error),
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
    const allSavedVoices: DesktopTariffVoice[] = [];

    const ops = metadatas
      .filter((m) => m.voices.length > 0)
      .map(async (metadata) => {
        const existingBookId = metadata.existingBookId;
        const tariffBookId = existingBookId ?? createTariffBookId(metadata);
        const voices = metadata.voices.map((voice) => ({
          ...voice,
          id: `voice_${tariffBookId}_${sanitizeIdentifier(voice.officialCode)}`,
          tariffBookId,
        }));

        try {
          if (existingBookId) {
            const updated = await updateDesktopTariffBook(existingBookId, {
              name: metadata.name,
              sourceName: metadata.sourceName,
              status: metadata.importStatus,
              voices,
              year: metadata.year,
            });

            setTariffBooksState((current) => ({
              data: current.data.map((b) => (b.id === existingBookId ? updated : b)),
              ...(current.source === "fallback"
                ? { message: "Runtime browser: modifica in anteprima.", source: "fallback" }
                : { source: "desktop" }),
            }));
            setSelectedTariffBookId(existingBookId);
          } else {
            const book = await createDesktopTariffBook({
              id: tariffBookId,
              name: metadata.name,
              sourceName: metadata.sourceName,
              status: metadata.importStatus,
              voices,
              year: metadata.year,
            });

            setTariffBooksState((current) => ({
              data: [book, ...current.data.filter((item) => item.id !== book.id)],
              ...(current.source === "fallback"
                ? { message: "Runtime browser: import in anteprima.", source: "fallback" }
                : { source: "desktop" }),
            }));
            setSelectedTariffBookId(book.id);
          }

          return { tariffBookId, voices };
        } catch (error) {
          notify({
            message: `${metadata.name}: ${error instanceof Error ? error.message : String(error)}`,
            title: existingBookId ? "Aggiornamento non riuscito" : "Importazione non riuscita",
            tone: "danger",
          });
          return null;
        }
      });

    const results = await Promise.all(ops);

    for (const result of results) {
      if (result) {
        const { tariffBookId, voices } = result;
        savedVoiceMap.current = new Map(savedVoiceMap.current).set(tariffBookId, voices);
        catalogRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        importedCount++;
        totalVoices += voices.length;
        allSavedVoices.push(...voices);
      }
    }

    clearImport();

    if (importedCount > 0) {
      if (allSavedVoices.length > 0) {
        setVoicesState({ data: allSavedVoices, source: "desktop" });
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

  function scrollPreviewToTop() {
    const host = getScrollableAncestor(screenRef.current);
    if (host) {
      host.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (state.pendingWorkflowAction === "import-tariff") {
        window.dispatchEvent(new CustomEvent("tariff-workflow-action", { detail: "import" }));
        useAppStore.getState().setPendingWorkflowAction(null);
      }
    });

    return unsub;
  }, []);

  function handleSelectTariffBook(book: DesktopTariffBook) {
    setSelectedTariffBookId(book.id);
    setEditingBookId(null);
  }

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
          scrollPreviewToTop={scrollPreviewToTop}
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
                </div>
              </div>

              <div ref={catalogRef}>
                <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
                  {visibleTariffBooks.length > 0 ? (
                    visibleTariffBooks.map((book) => (
                      <TariffBookPreviewCard
                        key={book.id}
                        book={book}
                        editForm={editForm}
                        editing={editingBookId === book.id}
                        isFavorite={favoriteBookIdSet.has(book.id)}
                        isSelected={selectedTariffBook.id === book.id}
                        linkedProjectCount={linkedProjectCountByTariffBookId.get(book.id) ?? 0}
                        onCancelEdit={() => setEditingBookId(null)}
                        onDelete={() => handleDeleteFromDropdown(book.id)}
                        onEdit={() => handleStartEdit(book)}
                        onEditFormChange={setEditForm}
                        onOpenVoices={() => handleOpenVoices(book)}
                        onSaveEdit={handleSaveEdit}
                        onSelect={() => handleSelectTariffBook(book)}
                        onShowDetails={() => handleShowTariffBookDetails(book)}
                        onToggleFavorite={() => handleToggleFavorite(book.id)}
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

function TariffBookPreviewCard({
  book,
  editForm,
  editing,
  isFavorite,
  isSelected,
  linkedProjectCount,
  onCancelEdit,
  onDelete,
  onEdit,
  onEditFormChange,
  onOpenVoices,
  onSaveEdit,
  onSelect,
  onShowDetails,
  onToggleFavorite,
  showDetails,
  voiceCount,
}: {
  book: DesktopTariffBook;
  editForm: EditTariffBookForm;
  editing: boolean;
  isFavorite: boolean;
  isSelected: boolean;
  linkedProjectCount: number;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onEditFormChange: Dispatch<SetStateAction<EditTariffBookForm>>;
  onOpenVoices: () => void;
  onSaveEdit: () => void;
  onSelect: () => void;
  onShowDetails: () => void;
  onToggleFavorite: () => void;
  showDetails: boolean;
  voiceCount: number | undefined;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayVoiceCount = voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT");

  return (
    <m.article
      className={cn(
        "relative min-h-[168px] rounded-14px border p-4 text-left transition-colors duration-200",
        isSelected
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_18px_40px_-28px_var(--accent-primary)]"
          : "border-[var(--border-subtle)]/70 bg-[var(--surface-base)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]/40",
      )}
      initial={MOTION_VARIANTS.row.initial}
      transition={MOTION_VARIANTS.row.transition}
      viewport={MOTION_VARIANTS.row.viewport}
      whileInView={MOTION_VARIANTS.row.whileInView}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <button
            className="flex min-w-0 flex-1 items-start gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            onClick={onSelect}
            type="button"
          >
            <div
              className={cn(
                "relative flex h-[96px] w-[72px] shrink-0 items-center justify-center rounded-md border bg-white text-10px font-bold uppercase leading-tight shadow-[0_12px_22px_-18px_rgba(15,23,42,0.45)]",
                isSelected ? "border-[var(--accent-primary)]" : "border-[var(--border-subtle)]",
              )}
            >
              <span className="absolute left-[-6px] top-2 rounded-xs bg-[var(--danger-base)] px-1.5 py-1 text-9px font-black text-white">
                PDF
              </span>
              <div className="space-y-1.5 text-[var(--text-tertiary)]">
                <div className="h-1 w-9 rounded bg-current" />
                <div className="h-1 w-7 rounded bg-current" />
                <div className="h-1 w-10 rounded bg-current" />
                <div className="mt-4 h-1 w-8 rounded bg-current" />
                <div className="h-1 w-11 rounded bg-current" />
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    book.status === "draft"
                      ? "warning"
                      : book.status === "validated"
                        ? "info"
                        : "success"
                  }
                >
                  {book.status === "draft"
                    ? "Bozza"
                    : book.status === "validated"
                      ? "Validato"
                      : "Attivo"}
                </Badge>
                <span className="text-12px font-semibold text-[var(--text-secondary)]">
                  Anno {book.year}
                </span>
              </div>
              <h3 className="mt-3 truncate text-16px font-semibold leading-tight text-[var(--text-primary)]">
                {book.name}
              </h3>
              <p className="mt-2 truncate text-13px text-[var(--text-secondary)]">
                {book.sourceName}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-12px font-medium text-[var(--text-secondary)]">
                <span>{displayVoiceCount} voci</span>
                <span>·</span>
                <span>{linkedProjectCount} progetti</span>
              </div>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Segna come preferito"}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--warning-soft)] hover:text-[var(--warning-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                isFavorite && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
              )}
              onClick={onToggleFavorite}
              type="button"
            >
              <Star className={cn("size-4", isFavorite && "fill-current")} />
            </button>
            <div ref={menuRef}>
              <Button onClick={() => setIsMenuOpen((v) => !v)} variant="icon">
                <MoreVertical className="size-4" />
              </Button>
              <DropdownMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                triggerRef={menuRef}
              >
                <DropdownItem
                  icon={Eye}
                  label={showDetails ? "Nascondi scheda" : "Mostra scheda"}
                  onClick={() => {
                    onShowDetails();
                    setIsMenuOpen(false);
                  }}
                />
                <DropdownItem
                  icon={Pencil}
                  label="Modifica dettagli"
                  onClick={() => {
                    onEdit();
                    setIsMenuOpen(false);
                  }}
                />
                <DropdownItem
                  icon={Database}
                  label="Modifica voci"
                  onClick={() => {
                    onOpenVoices();
                    setIsMenuOpen(false);
                  }}
                />
                <DropdownDivider />
                <DropdownItem
                  icon={Trash2}
                  label="Elimina tariffario"
                  onClick={() => {
                    onDelete();
                    setIsMenuOpen(false);
                  }}
                  tone="danger"
                />
              </DropdownMenu>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="mt-4 space-y-3 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--surface-base)] p-3">
            <TariffEditField
              label="Nome"
              onChange={(value) => onEditFormChange((form) => ({ ...form, name: value }))}
              value={editForm.name}
            />
            <TariffEditField
              label="Ente"
              onChange={(value) => onEditFormChange((form) => ({ ...form, sourceName: value }))}
              value={editForm.sourceName}
            />
            <div className="grid grid-cols-2 gap-2">
              <TariffEditField
                label="Anno"
                onChange={(value) => onEditFormChange((form) => ({ ...form, year: value }))}
                value={editForm.year}
              />
              <label className="text-11px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
                Stato
                <div className="relative mt-1">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-13px font-medium normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    onChange={(event) =>
                      onEditFormChange((form) => ({ ...form, status: event.target.value }))
                    }
                    value={editForm.status}
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="validated">validated</option>
                  </select>
                  <svg
                    aria-hidden={true}
                    className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" icon={Save} onClick={onSaveEdit} variant="primary">
                Salva
              </Button>
              <Button onClick={onCancelEdit} variant="outline">
                Annulla
              </Button>
            </div>
          </div>
        ) : showDetails ? (
          <m.div
            className="mt-4 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/40 p-3"
            animate={MOTION_VARIANTS.viewSwap.animate}
            exit={MOTION_VARIANTS.viewSwap.exit}
            initial={MOTION_VARIANTS.viewSwap.initial}
            transition={MOTION_VARIANTS.viewSwap.transition}
          >
            <div className="grid gap-2 text-12px font-medium text-[var(--text-secondary)]">
              <DetailLine label="ID" value={book.id} />
              <DetailLine label="Ente" value={book.sourceName} />
              <DetailLine label="Stato" value={book.status} />
              <DetailLine label="Progetti collegati" value={`${linkedProjectCount}`} />
              <DetailLine label="Sottovoci" value={displayVoiceCount} />
            </div>
          </m.div>
        ) : null}
      </div>
      {isSelected ? (
        <span className="absolute bottom-4 right-4 flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white">
          <CheckCircle2 className="size-4" strokeWidth={3} />
        </span>
      ) : null}
    </m.article>
  );
}

function TariffImportPreviewPanel({
  draftedImportFiles,
  getExistingBookIds,
  importPreviewIndex,
  importPreviews,
  onCancel,
  onConfirm,
  onDraftedFilesChange,
  onMetadatasChange,
  onPageCanConfirmChange,
  onReviewedFilesChange,
  reviewedFiles,
  scrollPreviewToTop,
}: {
  draftedImportFiles: Set<number>;
  getExistingBookIds: () => string[];
  importPreviewIndex: number;
  importPreviews: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffImportPreviewResult[]) => Promise<void>;
  onDraftedFilesChange: (next: Set<number>) => void;
  onMetadatasChange: (metadatas: TariffPdfMetadata[]) => void;
  onPageCanConfirmChange: (v: boolean) => void;
  onReviewedFilesChange: (next: Set<number>) => void;
  reviewedFiles: Set<number>;
  scrollPreviewToTop: () => void;
}) {
  return (
    <div className="-mx-4 -mt-4 flex flex-col md:-mx-6">
      <div className="p-6">
        <section className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
              Preview importazione
            </div>
            <h2 className="mt-2 truncate text-28px font-semibold leading-tight text-[var(--text-primary)]">
              {importPreviews[importPreviewIndex]?.name ?? "Tariffario da importare"}
            </h2>
            <p className="mt-1 text-13px font-medium text-[var(--text-secondary)]">
              Revisiona descrizioni, codici e prezzi; i comandi principali sono nella toolbar.
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-2 text-12px font-bold ring-1",
              draftedImportFiles.has(importPreviewIndex)
                ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-[var(--warning-base)]/30"
                : reviewedFiles.has(importPreviewIndex)
                  ? "bg-[var(--success-soft)] text-[var(--success-base)] ring-[var(--success-base)]/30"
                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-[var(--border-subtle)]",
            )}
          >
            {draftedImportFiles.has(importPreviewIndex) ? (
              <Save className="size-4" />
            ) : (
              <CheckCircle2
                className={cn(
                  "size-4",
                  reviewedFiles.has(importPreviewIndex)
                    ? "text-[var(--success-base)]"
                    : "text-[var(--text-secondary)]",
                )}
              />
            )}
            {draftedImportFiles.has(importPreviewIndex)
              ? "Salvato in bozza"
              : reviewedFiles.has(importPreviewIndex)
                ? "File revisionato"
                : "Da revisionare"}
          </div>
        </section>
        <TariffImportPreviewModal
          activeIndex={importPreviewIndex}
          existingBookIds={getExistingBookIds()}
          isBusy={false}
          metadatas={importPreviews}
          onCancel={onCancel}
          onConfirm={onConfirm}
          onDraftedFilesChange={onDraftedFilesChange}
          onMetadatasChange={onMetadatasChange}
          onPageCanConfirmChange={onPageCanConfirmChange}
          onReviewedFilesChange={onReviewedFilesChange}
          pageView
        />
      </div>
      <m.button
        id="fab-back-to-top"
        className="group fixed bottom-6 right-6 z-[120] flex h-11 w-11 items-center justify-start gap-2 overflow-hidden rounded-full bg-[var(--accent-primary)] px-3 text-[var(--text-inverse)] shadow-lg outline-none ring-1 ring-white/10 transition-[width,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-40 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        initial={MOTION_VARIANTS.popover.initial}
        animate={MOTION_VARIANTS.popover.animate}
        onClick={scrollPreviewToTop}
        transition={MOTION_VARIANTS.popover.transition}
        type="button"
        title="Torna su"
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <ArrowUp className="size-5" />
        </span>
        <span className="whitespace-nowrap text-12px font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Torna in cima
        </span>
      </m.button>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-baseline gap-3">
      <span className="text-10px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="truncate text-right text-12px font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function PanelTitle({ children }: { children: string }) {
  return (
    <div className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
      {children}
    </div>
  );
}
