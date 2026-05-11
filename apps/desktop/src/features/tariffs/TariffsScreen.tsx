import { motion } from "framer-motion";
import {
  ArrowUp,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  FileText,
  type LucideIcon,
  MoreVertical,
  Pencil,
  Save,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch, FilterSelect } from "@/components/filters";
import { Badge } from "@/components/shared/Badge";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { BUTTER_EASE } from "@/components/shared/easings";

import { ScreenHero } from "@/components/shared/ScreenHero";

import { useToast } from "@/components/shared/ToastProvider";

import { BezelSurface, ProjectControlButton } from "@/components/shared/ui-primitives";

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
import { createTariffBookId, sanitizeIdentifier } from "./utils/tariffs-validation";

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
  const [importPreviews, setImportPreviews] = useState<TariffPdfMetadata[]>([]);
  const [editPreviewBookIdMap, setEditPreviewBookIdMap] = useState<Map<string, string>>(new Map());
  const [importFiles, setImportFiles] = useState<
    {
      fileName: string;
      index: number;
      total: number;
      status: "pending" | "processing" | "done" | "error";
      error?: string;
    }[]
  >([]);
  const [importPhase, setImportPhase] = useState<"idle" | "loading" | "preview">("idle");
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
  const [favoriteBookIds, setFavoriteBookIds] = useState<string[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<"all" | "favorites">("all");
  const [voiceCountByBookId, setVoiceCountByBookId] = useState<Record<string, number>>({});
  const [isVoicesExplorerOpen, setIsVoicesExplorerOpen] = useState(false);
  const [importPreviewIndex, setImportPreviewIndex] = useState(0);
  const [previewValidationCanConfirm, setPreviewValidationCanConfirm] = useState(false);
  const [reviewedFiles, setReviewedFiles] = useState<Set<number>>(() => new Set());
  const [draftedImportFiles, setDraftedImportFiles] = useState<Set<number>>(() => new Set());
  const [yearFilter, setYearFilter] = useState("all");
  const [savedVoiceMap, setSavedVoiceMap] = useState<Map<string, DesktopTariffVoice[]>>(new Map());
  const catalogRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLElement>(null);

  function getMetadataKey(meta: TariffPdfMetadata) {
    return `${meta.name}||${meta.sourceName}||${meta.year}`;
  }

  function getExistingBookIds() {
    return importPreviews.map((m) => editPreviewBookIdMap.get(getMetadataKey(m)));
  }
  const setTariffImportToolbar = useAppStore((state) => state.setTariffImportToolbar);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
        setFavoriteBookIds(parsed);
      }
    } catch {
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteBookIds));
  }, [favoriteBookIds]);

  useEffect(() => {
    let active = true;

    Promise.all([
      listDesktopTariffBooks(fallbackTariffBooks),
      listDesktopContracts(fallbackContracts),
    ])
      .then(([tariffBooks, contracts]) => {
        if (!active) {
          return;
        }

        setTariffBooksState(tariffBooks);
        setContractsState(contracts);
        setSelectedTariffBookId(tariffBooks.data[0]?.id ?? fallbackTariffBook.id);
      })
      .catch(() => {
        if (!active) return;
        notify({
          message: "Impossibile caricare tariffari e contratti.",
          title: "Caricamento fallito",
          tone: "danger",
        });
      });

    return () => {
      active = false;
    };
  }, [notify]);

  const tariffMetrics = useMemo<TariffMetrics>(() => {
    const sourceNames = new Set<string>();
    const years = new Set<number>();
    let activeCount = 0;

    for (const book of tariffBooksState.data) {
      sourceNames.add(book.sourceName);
      years.add(book.year);
      if (book.status === "active" || book.status === "validated") {
        activeCount += 1;
      }
    }

    return {
      activeCount,
      sourceCount: sourceNames.size,
      tariffCount: tariffBooksState.data.length,
      years: [...years].sort((a, b) => b - a),
    };
  }, [tariffBooksState.data]);

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

  const linkedProjectCountByTariffBookId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const contract of realContracts) {
      const linkedBookIds = new Set(
        contract.tariffPriorities.map((priority) => priority.tariffBookId),
      );

      for (const tariffBookId of linkedBookIds) {
        counts.set(tariffBookId, (counts.get(tariffBookId) ?? 0) + 1);
      }
    }

    return counts;
  }, [realContracts]);

  const projectTariffBookIds = useMemo(() => {
    if (projectFilter === "all") {
      return null;
    }

    const contract = realContracts.find((item) => item.id === projectFilter);
    return new Set(contract?.tariffPriorities.map((priority) => priority.tariffBookId) ?? []);
  }, [projectFilter, realContracts]);

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

  const baseFilteredTariffBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedYear = Number(yearFilter);

    return tariffBooksState.data.filter((book) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${book.name} ${book.sourceName} ${book.year} ${book.id}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesYear = yearFilter === "all" || book.year === selectedYear;
      const matchesStatus = statusFilter === "all" || book.status === statusFilter;
      const matchesProject = projectTariffBookIds == null || projectTariffBookIds.has(book.id);

      return matchesQuery && matchesYear && matchesStatus && matchesProject;
    });
  }, [projectTariffBookIds, query, statusFilter, tariffBooksState.data, yearFilter]);

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

    const saved = savedVoiceMap.get(selectedTariffBook.id);
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
  }, [selectedTariffBook.id, notify, savedVoiceMap]);

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

  const handlePdfImport = useCallback(async () => {
    setImportPhase("loading");
    setImportFiles([]);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    try {
      const { selectMultipleTariffPdfMetadatas } = await import("@/lib/desktopData");
      const results = await selectMultipleTariffPdfMetadatas((progress) => {
        setImportFiles((current) => {
          const existing = current.find((f) => f.index === progress.index);
          if (existing) {
            return current.map((f) => (f.index === progress.index ? { ...f, ...progress } : f));
          }
          return [...current, progress];
        });
      });

      setImportPhase("idle");

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
        setImportPreviews(results);
        setEditPreviewBookIdMap(new Map());
        setImportPhase("preview");
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
      setImportPhase("idle");
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Import tariffario non riuscito",
        tone: "danger",
      });
    }
  }, [notify]);

  async function handleEditVoices(book: DesktopTariffBook) {
    try {
      const saved = savedVoiceMap.get(book.id);
      const voiceData =
        saved ?? (await listDesktopTariffVoices(book.id, fallbackTariffVoices)).data;
      const metadata: TariffPdfMetadata = {
        name: book.name,
        sourceName: book.sourceName,
        year: book.year,
        voices: voiceData,
      };
      const key = getMetadataKey(metadata);
      setImportPreviews([metadata]);
      setEditPreviewBookIdMap(new Map([[key, book.id]]));
      setReviewedFiles(new Set());
      setDraftedImportFiles(new Set());
      setImportPreviewIndex(0);
      setPreviewValidationCanConfirm(false);
      setImportPhase("preview");
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

      const map = new Map<string, string>();
      const metadatas: TariffPdfMetadata[] = [];

      for (const book of draftBooks) {
        const saved = savedVoiceMap.get(book.id);
        const voiceData =
          saved ?? (await listDesktopTariffVoices(book.id, fallbackTariffVoices)).data;
        const metadata: TariffPdfMetadata = {
          name: book.name,
          sourceName: book.sourceName,
          year: book.year,
          voices: voiceData,
        };
        const key = getMetadataKey(metadata);
        map.set(key, book.id);
        metadatas.push(metadata);
      }

      setImportPreviews(metadatas);
      setEditPreviewBookIdMap(map);
      setReviewedFiles(new Set());
      setDraftedImportFiles(new Set());
      setImportPreviewIndex(0);
      setPreviewValidationCanConfirm(false);
      setImportPhase("preview");
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Impossibile caricare le bozze",
        tone: "danger",
      });
    }
  }

  useEffect(() => {
    setReviewedFiles(new Set());
    setImportPreviewIndex(0);
    setPreviewValidationCanConfirm(false);
  }, []);

  useEffect(() => {
    const isPreview = importPhase === "preview" && importPreviews.length > 0;

    setTariffImportToolbar({
      activeIndex: isPreview ? importPreviewIndex : 0,
      activeDrafted: isPreview ? draftedImportFiles.has(importPreviewIndex) : false,
      activeReviewed: isPreview ? reviewedFiles.has(importPreviewIndex) : false,
      canConfirm:
        isPreview &&
        importPreviews.length > 0 &&
        importPreviews.every(
          (_, index) => reviewedFiles.has(index) || draftedImportFiles.has(index),
        ) &&
        previewValidationCanConfirm,
      draftedCount: isPreview ? draftedImportFiles.size : 0,
      fileLabels: isPreview ? importPreviews.map((metadata) => metadata.name) : [],
      phase: isPreview ? "preview" : "idle",
      reviewedCount: isPreview ? reviewedFiles.size : 0,
      reviewedVoiceCount: isPreview
        ? importPreviews.reduce(
            (sum, metadata, index) => sum + (reviewedFiles.has(index) ? metadata.voices.length : 0),
            0,
          )
        : 0,
      totalVoices: isPreview
        ? importPreviews.reduce((sum, metadata) => sum + metadata.voices.length, 0)
        : 0,
    });
  }, [
    importPhase,
    importPreviewIndex,
    importPreviews,
    draftedImportFiles,
    previewValidationCanConfirm,
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
      setEditPreviewBookIdMap(new Map());
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

    for (const metadata of metadatas) {
      if (metadata.voices.length === 0) continue;

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
          notify({
            message: `${metadata.name} revisionato e salvato come "${metadata.importStatus === "active" ? "Attivo" : "Bozza"}".`,
            title: "Tariffario aggiornato",
            tone: "success",
          });
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

        setSavedVoiceMap((prev) => {
          const next = new Map(prev);
          next.set(tariffBookId, voices);
          return next;
        });
        catalogRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        importedCount++;
        totalVoices += voices.length;
        allSavedVoices.push(...voices);
      } catch (error) {
        notify({
          message: `${metadata.name}: ${error instanceof Error ? error.message : String(error)}`,
          title: existingBookId ? "Aggiornamento non riuscito" : "Importazione non riuscita",
          tone: "danger",
        });
      }
    }

    setImportPhase("idle");
    setImportPreviews([]);
    setEditPreviewBookIdMap(new Map());
    setReviewedFiles(new Set());
    setDraftedImportFiles(new Set());

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

  useEffect(() => {
    const handleWorkflowAction = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "import") {
        setEditPreviewBookIdMap(new Map());
        setDraftedImportFiles(new Set());
        setReviewedFiles(new Set());
        void handlePdfImport();
      }
    };

    window.addEventListener("tariff-workflow-action", handleWorkflowAction);
    return () => window.removeEventListener("tariff-workflow-action", handleWorkflowAction);
  }, [handlePdfImport]);

  useEffect(() => {
    const handlePreviewAction = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;

      if (actionId === "tariff-import-cancel") {
        setImportPhase("idle");
        setImportPreviews([]);
        setEditPreviewBookIdMap(new Map());
        setReviewedFiles(new Set());
        setDraftedImportFiles(new Set());
        return;
      }

      if (actionId === "tariff-import-toggle-reviewed") {
        return;
      }

      if (actionId.startsWith("tariff-import-select-")) {
        const nextIndex = Number.parseInt(actionId.replace("tariff-import-select-", ""), 10);
        if (Number.isInteger(nextIndex) && importPreviews[nextIndex]) {
          setImportPreviewIndex(nextIndex);
        }
      }
    };

    window.addEventListener("tariff-preview-action", handlePreviewAction);
    return () => window.removeEventListener("tariff-preview-action", handlePreviewAction);
  }, [importPreviews]);

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
      setSavedVoiceMap((prev) => {
        const next = new Map(prev);
        next.delete(bookId);
        return next;
      });
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
    <main
      ref={screenRef}
      className={cn(
        "relative w-full max-w-full px-4 pb-10 pt-4 md:px-6",
        importPhase === "preview" && importPreviews.length > 0 ? "" : "overflow-x-hidden",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      {importPhase === "preview" && importPreviews.length > 0 ? (
        <div className="-mx-4 -mt-4 flex flex-col md:-mx-6">
          <div className="px-6 py-6">
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
              onCancel={() => {
                setImportPhase("idle");
                setImportPreviews([]);
                setEditPreviewBookIdMap(new Map());
                setReviewedFiles(new Set());
                setDraftedImportFiles(new Set());
              }}
              onConfirm={handleConfirmImport}
              onDraftedFilesChange={setDraftedImportFiles}
              onMetadatasChange={(nextMetadatas) => {
                setImportPreviews(nextMetadatas);
                setEditPreviewBookIdMap((prev) => {
                  if (prev.size === 0) return prev;
                  const next = new Map<string, string>();
                  for (const meta of nextMetadatas) {
                    const k = getMetadataKey(meta);
                    const bookId = prev.get(k);
                    if (bookId) next.set(k, bookId);
                  }
                  return next;
                });
                setImportPreviewIndex((current) =>
                  nextMetadatas.length === 0 ? 0 : Math.min(current, nextMetadatas.length - 1),
                );
                if (nextMetadatas.length === 0) {
                  setImportPhase("idle");
                }
              }}
              onPageCanConfirmChange={setPreviewValidationCanConfirm}
              onReviewedFilesChange={setReviewedFiles}
              pageView
            />
          </div>
          <motion.button
            id="fab-back-to-top"
            className="group fixed bottom-6 right-6 z-[120] flex h-11 w-11 items-center justify-start gap-2 overflow-hidden rounded-full bg-[var(--accent-primary)] px-3 text-[var(--text-inverse)] shadow-lg outline-none ring-1 ring-white/10 transition-[width,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-40 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={scrollPreviewToTop}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            type="button"
            title="Torna su"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <ArrowUp className="size-5" />
            </span>
            <span className="whitespace-nowrap text-12px font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Torna in cima
            </span>
          </motion.button>
        </div>
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
                  <button
                    className={cn(
                      "h-9 rounded-full px-4 text-12px font-semibold transition-colors 2xl:h-10 2xl:text-13px",
                      activeCatalogTab === "all"
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                        : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                    onClick={() => setActiveCatalogTab("all")}
                    type="button"
                  >
                    Tutti i tariffari
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-11px font-bold">
                      {baseFilteredTariffBooks.length}
                    </span>
                  </button>
                  <button
                    className={cn(
                      "h-9 rounded-full px-4 text-12px font-semibold transition-colors 2xl:h-10 2xl:text-13px",
                      activeCatalogTab === "favorites"
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                        : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                    onClick={() => setActiveCatalogTab("favorites")}
                    type="button"
                  >
                    I miei preferiti
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-11px font-bold">
                      {favoriteCount}
                    </span>
                  </button>
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
    </main>
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
    <motion.article
      className={cn(
        "relative min-h-[168px] rounded-14px border p-4 text-left transition-colors duration-200",
        isSelected
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_18px_40px_-28px_var(--accent-primary)]"
          : "border-[var(--border-subtle)]/70 bg-[var(--surface-base)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]/40",
      )}
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.42, ease: BUTTER_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
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
              <div className="space-y-1.5 text-slate-300">
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
              <h3 className="mt-3 truncate text-16px font-bold leading-tight text-[var(--text-primary)]">
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
              <ProjectControlButton onClick={() => setIsMenuOpen((v) => !v)} variant="icon">
                <MoreVertical className="size-4" />
              </ProjectControlButton>
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
              <ProjectControlButton
                className="flex-1"
                icon={Save}
                onClick={onSaveEdit}
                variant="primary"
              >
                Salva
              </ProjectControlButton>
              <ProjectControlButton onClick={onCancelEdit} variant="neutral">
                Annulla
              </ProjectControlButton>
            </div>
          </div>
        ) : showDetails ? (
          <motion.div
            className="mt-4 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/40 p-3"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: BUTTER_EASE }}
          >
            <div className="grid gap-2 text-12px font-medium text-[var(--text-secondary)]">
              <DetailLine label="ID" value={book.id} />
              <DetailLine label="Ente" value={book.sourceName} />
              <DetailLine label="Stato" value={book.status} />
              <DetailLine label="Progetti collegati" value={`${linkedProjectCount}`} />
              <DetailLine label="Sottovoci" value={displayVoiceCount} />
            </div>
          </motion.div>
        ) : null}
      </div>
      {isSelected ? (
        <span className="absolute bottom-4 right-4 flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white">
          <CheckCircle2 className="size-4" strokeWidth={3} />
        </span>
      ) : null}
    </motion.article>
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

function MetricCard({
  caption,
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: LucideIcon;
  label: string;
  tone?: "blue" | "info" | "success" | "warning";
  value: string;
}) {
  return (
    <BezelSurface
      innerClassName={cn(
        "group flex min-h-[112px] items-center gap-3 p-4 2xl:min-h-[128px] 2xl:gap-4",
        tone === "blue" ? "bg-[var(--info-soft)]/20" : "",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-12",
          (!tone || tone === "blue") && "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "info" && "bg-[var(--info-soft)] text-[var(--info-base)]",
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-20px font-bold leading-none 2xl:text-22px",
            (!tone || tone === "blue") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "info" && "text-[var(--info-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-12px font-medium text-[var(--text-secondary)]">{caption}</div>
      </div>
    </BezelSurface>
  );
}
