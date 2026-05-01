import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  type LucideIcon,
  MoreVertical,
  Save,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { SummaryLine } from "@/components/shared/Screen";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface, ProjectControlButton } from "@/features/projects/components/workspace-ui";
import {
  createDesktopTariffBook,
  type DesktopContract,
  type DesktopDataResult,
  type DesktopTariffBook,
  type DesktopTariffVoice,
  deleteDesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
  type TariffPdfMetadata,
  updateDesktopTariffBook,
} from "@/lib/desktopData";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { QuickAction } from "./components/QuickAction";
import { TariffBookRow } from "./components/TariffBookRow";
import { TariffEditField } from "./components/TariffEditField";
import { TariffImportLoadingModal } from "./components/TariffImportLoadingModal";
import { TariffImportPreviewModal } from "./components/TariffImportPreviewModal";
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
  const [yearFilter, setYearFilter] = useState("all");

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

    Promise.all(
      books.map(async (book) => {
        const fallbackForBook = fallbackTariffVoices.filter(
          (voice) => voice.tariffBookId === book.id,
        );
        const result = await listDesktopTariffVoices(book.id, fallbackForBook);
        return [book.id, result.data.length] as const;
      }),
    )
      .then((entries) => {
        if (!active) {
          return;
        }

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

  async function handleConfirmImport(metadatas: TariffPdfMetadata[]) {
    if (metadatas.length === 0) return;

    let importedCount = 0;
    let totalVoices = 0;

    for (const metadata of metadatas) {
      if (metadata.voices.length === 0) continue;

      const tariffBookId = createTariffBookId(metadata);
      const voices = metadata.voices.map((voice) => ({
        ...voice,
        id: `voice_${tariffBookId}_${sanitizeIdentifier(voice.officialCode)}`,
        tariffBookId,
      }));

      try {
        const book = await createDesktopTariffBook({
          id: tariffBookId,
          name: metadata.name,
          sourceName: metadata.sourceName,
          status: "active",
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
        importedCount++;
        totalVoices += voices.length;
      } catch (error) {
        notify({
          message: `${metadata.name}: ${error instanceof Error ? error.message : String(error)}`,
          title: "Importazione non riuscita",
          tone: "danger",
        });
      }
    }

    setImportPhase("idle");

    if (importedCount > 0) {
      setVoicesState({ data: metadatas.flatMap((m) => m.voices), source: "desktop" });
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
        void handlePdfImport();
      }
    };

    window.addEventListener("tariff-workflow-action", handleWorkflowAction);
    return () => window.removeEventListener("tariff-workflow-action", handleWorkflowAction);
  }, [handlePdfImport]);

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

  function handleToggleFavorite(bookId: string) {
    setFavoriteBookIds((current) =>
      current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId],
    );
  }

  function handleStartEdit(book: DesktopTariffBook) {
    setSelectedTariffBookId(book.id);
    setEditingBookId(book.id);
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
      setTariffBooksState((current) => ({
        data: current.data.filter((book) => book.id !== bookId),
        ...(current.source === "fallback"
          ? { message: "Runtime browser: eliminazione in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      if (selectedTariffBookId === bookId) {
        setSelectedTariffBookId(tariffBooksState.data.find((b) => b.id !== bookId)?.id ?? "");
      }
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
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      <ScreenHero
        badge="Catalogo prezzi"
        title="Catalogo tariffari"
        description="Gestisci tariffari per ente, anno e coerenza con i progetti, mantenendo import, filtri e dettaglio nello stesso piano operativo."
        sidePanel={
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Voci nel catalogo
                </div>
                <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--text-primary)]">
                  {voicesState.data.length.toLocaleString("it-IT")}
                </div>
              </div>
              <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                <Database className="size-6" />
              </span>
            </div>
            <p className="mt-5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              {tariffMetrics.tariffCount} tariffari su {tariffMetrics.sourceCount} enti.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-base)]">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="text-[12px] font-semibold text-[var(--text-primary)]">
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

      <section className="mt-8 grid gap-5 lg:grid-cols-[220px_1fr] 2xl:grid-cols-[260px_1fr_380px]">
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

          <Panel>
            <div className="text-[13px] font-bold text-[var(--text-primary)]">
              Come funzionano i tariffari?
            </div>
            <p className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              Un tariffario puo contenere voci importate da PDF che verranno rese disponibili nei
              progetti.
            </p>
            <button
              className="mt-3 text-[12px] font-bold text-[var(--info-base)]"
              onClick={() =>
                notify({
                  message: "La guida sui tariffari sara disponibile in un prossimo aggiornamento.",
                  title: "In arrivo",
                  tone: "info",
                })
              }
              type="button"
            >
              Scopri di piu
            </button>
          </Panel>
        </div>

        <Panel className="min-w-0 p-0">
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={cn(
                  "h-9 rounded-full px-4 text-[12px] font-semibold transition-colors 2xl:h-10 2xl:text-[13px]",
                  activeCatalogTab === "all"
                    ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                    : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
                onClick={() => setActiveCatalogTab("all")}
                type="button"
              >
                Tutti i tariffari
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                  {baseFilteredTariffBooks.length}
                </span>
              </button>
              <button
                className={cn(
                  "h-9 rounded-full px-4 text-[12px] font-semibold transition-colors 2xl:h-10 2xl:text-[13px]",
                  activeCatalogTab === "favorites"
                    ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                    : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
                onClick={() => setActiveCatalogTab("favorites")}
                type="button"
              >
                I miei preferiti
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                  {favoriteCount}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={(event) => setYearFilter(event.target.value)}
                value={yearFilter}
              >
                <option value="all">Tutti gli anni</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                className="h-10 min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={(event) => setProjectFilter(event.target.value)}
                value={projectFilter}
              >
                <option value="all">
                  {realContracts.length > 0 ? "Tutti i progetti" : "Nessun progetto locale"}
                </option>
                {realContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.title}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">Tutti gli stati</option>
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="validated">validated</option>
              </select>
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  className="h-10 w-full min-w-[160px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca per nome, ente o ID..."
                  type="search"
                  value={query}
                />
              </label>
              <ProjectControlButton
                onClick={() => {
                  setYearFilter("all");
                  setProjectFilter("all");
                  setStatusFilter("all");
                  setQuery("");
                }}
                variant="neutral"
              >
                Reset
              </ProjectControlButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="hidden grid-cols-[36px_minmax(190px,1.5fr)_minmax(130px,0.8fr)_70px_82px_100px_92px_36px] border-b border-[var(--border-subtle)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] 2xl:grid">
              <span />
              <span>Nome tariffario</span>
              <span>Ente</span>
              <span>Anno</span>
              <span>Stato</span>
              <span>Progetti collegati</span>
              <span>Voci</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {visibleTariffBooks.length > 0 ? (
                visibleTariffBooks.map((book) => (
                  <TariffBookRow
                    key={book.id}
                    book={book}
                    isFavorite={favoriteBookIdSet.has(book.id)}
                    isSelected={selectedTariffBook.id === book.id}
                    linkedProjectCount={linkedProjectCountByTariffBookId.get(book.id) ?? 0}
                    onDelete={() => handleDeleteFromDropdown(book.id)}
                    onEdit={() => handleStartEdit(book)}
                    onSelect={() => handleSelectTariffBook(book)}
                    onToggleFavorite={() => handleToggleFavorite(book.id)}
                    voiceCount={voiceCountByBookId[book.id]}
                  />
                ))
              ) : (
                <div className="p-8 text-[13px] text-[var(--text-secondary)]">
                  {activeCatalogTab === "favorites"
                    ? "Nessun preferito trovato con i filtri correnti."
                    : "Nessun tariffario nel filtro corrente."}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <aside className="space-y-4 lg:col-span-2 xl:col-span-1 2xl:col-span-1">
          <Panel className={cn(selectedTariffBook && "ring-1 ring-[var(--accent-primary)]/15")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <Star className="size-4 fill-[var(--warning-base)] text-[var(--warning-base)]" />
                Dettaglio tariffario
              </div>
              <ProjectControlButton
                onClick={() => handleStartEdit(selectedTariffBook)}
                variant="icon"
              >
                <MoreVertical className="size-4" />
              </ProjectControlButton>
            </div>
            {editingBookId === selectedTariffBook.id ? (
              <div className="mt-4 space-y-3">
                <TariffEditField
                  label="Nome"
                  onChange={(value) => setEditForm((form) => ({ ...form, name: value }))}
                  value={editForm.name}
                />
                <TariffEditField
                  label="Ente"
                  onChange={(value) => setEditForm((form) => ({ ...form, sourceName: value }))}
                  value={editForm.sourceName}
                />
                <div className="grid grid-cols-2 gap-2">
                  <TariffEditField
                    label="Anno"
                    onChange={(value) => setEditForm((form) => ({ ...form, year: value }))}
                    value={editForm.year}
                  />
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    Stato
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                      onChange={(event) =>
                        setEditForm((form) => ({ ...form, status: event.target.value }))
                      }
                      value={editForm.status}
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="validated">validated</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <ProjectControlButton
                    className="flex-1"
                    icon={Save}
                    onClick={handleSaveEdit}
                    variant="primary"
                  >
                    Salva
                  </ProjectControlButton>
                  <ProjectControlButton onClick={() => setEditingBookId(null)} variant="neutral">
                    Annulla
                  </ProjectControlButton>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Badge
                  className="float-right"
                  variant={selectedTariffBook.status === "active" ? "success" : "info"}
                >
                  {selectedTariffBook.status}
                </Badge>
                <div className="text-[20px] font-bold leading-tight text-[var(--text-primary)]">
                  {selectedTariffBook.name}
                </div>
                <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                  ID: {selectedTariffBook.id}
                </div>
                <dl className="mt-6 space-y-3">
                  <SummaryLine label="Ente" value={selectedTariffBook.sourceName} />
                  <SummaryLine label="Anno" value={String(selectedTariffBook.year)} />
                  <SummaryLine label="Stato" value={selectedTariffBook.status} />
                  <SummaryLine
                    label="Progetti collegati"
                    value={`${linkedProjectCountByTariffBookId.get(selectedTariffBook.id) ?? 0} progetti`}
                  />
                  <SummaryLine
                    label="Voci totali"
                    value={voicesState.data.length.toLocaleString("it-IT")}
                  />
                  <SummaryLine label="Ultimo aggiornamento" value="27 apr 2025" />
                </dl>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-bold text-[var(--text-primary)]">
                Voci tariffarie
              </div>
              <ProjectControlButton onClick={() => setIsVoicesExplorerOpen(true)} variant="neutral">
                Apri vista completa
              </ProjectControlButton>
            </div>
            <p className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              Consulta voci e sottovoci in una vista dedicata con ricerca e righe apribili.
            </p>
            <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)]/35 px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              {groupedVoices.length.toLocaleString("it-IT")} voci principali ·{" "}
              {voicesState.data.length.toLocaleString("it-IT")} sottovoci
            </div>
          </Panel>
        </aside>
      </section>
      {importPhase === "preview" && importPreviews.length > 0 ? (
        <TariffImportPreviewModal
          isBusy={false}
          metadatas={importPreviews}
          onCancel={() => setImportPhase("idle")}
          onConfirm={handleConfirmImport}
        />
      ) : null}
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

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function PanelTitle({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
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
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-[20px] font-bold leading-none 2xl:text-[22px]",
            (!tone || tone === "blue") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "info" && "text-[var(--info-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-[12px] font-medium text-[var(--text-secondary)]">{caption}</div>
      </div>
    </BezelSurface>
  );
}
