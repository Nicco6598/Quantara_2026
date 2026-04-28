import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileText,
  MoreVertical,
  Save,
  Search,
  Sparkles,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { parseEuroAmount } from "@quantara/domain-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { ScreenShell, SectionPanel, SummaryLine } from "@/components/shared/Screen";
import {
  deleteDesktopTariffBook,
  createDesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
  selectTariffPdfMetadata,
  updateDesktopTariffBook,
  type DesktopContract,
  type DesktopDataResult,
  type DesktopTariffBook,
  type DesktopTariffVoice,
  type TariffPdfMetadata,
} from "@/lib/desktopData";

const fallbackTariffBook: DesktopTariffBook = {
  id: "tariff_lombardia_2025",
  name: "Tariffario Lombardia 2025",
  sourceName: "Regione Lombardia",
  status: "validated",
  year: 2025,
};

const fallbackTariffBooks: DesktopTariffBook[] = [fallbackTariffBook];
const fallbackContracts: DesktopContract[] = [
  {
    applicationContractCode: "CA-MV-001",
    contractualAmount: { amount: 26_150_000, currency: "EUR" },
    frameworkAgreementCode: "AQ-RFI-2026",
    id: "contract_demo_milano_verona",
    tariffPriorities: [
      {
        priority: 1,
        reason: "Tariffario contrattuale",
        tariffBookId: fallbackTariffBook.id,
      },
    ],
    title: "Linea AV/AC Milano-Verona",
  },
];

const tariffRows = [
  {
    category: "01 - Opere di scavo",
    code: "01.A01.A10.005",
    delta: "+4,2%",
    description: "Scavo di sbancamento in trincea",
    price: "€ 18,50",
    unit: "m3",
  },
  {
    category: "02 - Opere in cls",
    code: "02.B02.B20.025",
    delta: "+7,9%",
    description: "Calcestruzzo strutturale C25/30",
    price: "€ 154,90",
    unit: "m3",
  },
  {
    category: "03 - Armamento",
    code: "03.C01.C10.035",
    delta: "+5,3%",
    description: "Fornitura e posa binario tipo 60E1",
    price: "€ 1.250,00",
    unit: "m",
  },
] as const;

const fallbackTariffVoices: DesktopTariffVoice[] = tariffRows.map((row) => ({
  category: row.category,
  description: row.description,
  id: `voice_${row.code.replaceAll(".", "_").toLowerCase()}`,
  laborPercentage: null,
  officialCode: row.code,
  tariffBookId: fallbackTariffBook.id,
  unitOfMeasure: row.unit,
  unitPrice: parseEuroAmount(row.price),
}));

type TariffMetrics = {
  activeCount: number;
  sourceCount: number;
  tariffCount: number;
  years: number[];
};

type EditTariffBookForm = {
  name: string;
  sourceName: string;
  status: string;
  year: string;
};

export function TariffsScreen() {
  const { notify } = useToast();
  const [contractsState, setContractsState] = useState<DesktopDataResult<DesktopContract[]>>({
    data: fallbackContracts,
    message: "Runtime browser: dati dimostrativi.",
    source: "fallback",
  });
  const [createMessage, setCreateMessage] = useState("");
  const [createState, setCreateState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [projectFilter, setProjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedTariffBookId, setSelectedTariffBookId] = useState(fallbackTariffBook.id);
  const [statusFilter, setStatusFilter] = useState("all");
  const [importPreview, setImportPreview] = useState<TariffPdfMetadata | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    let active = true;

    Promise.all([
      listDesktopTariffBooks(fallbackTariffBooks),
      listDesktopContracts(fallbackContracts),
    ]).then(([tariffBooks, contracts]) => {
      if (!active) {
        return;
      }

      setTariffBooksState(tariffBooks);
      setContractsState(contracts);
      setSelectedTariffBookId(tariffBooks.data[0]?.id ?? fallbackTariffBook.id);
    });

    return () => {
      active = false;
    };
  }, []);

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

  const visibleTariffBooks = useMemo(() => {
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

  const selectedTariffBook =
    tariffBooksState.data.find((book) => book.id === selectedTariffBookId) ??
    visibleTariffBooks[0] ??
    fallbackTariffBook;

  const previewVoicesByCategory = useMemo(
    () => groupTariffVoices(voicesState.data.slice(0, 80)),
    [voicesState.data],
  );

  useEffect(() => {
    let active = true;

    listDesktopTariffVoices(selectedTariffBook.id, fallbackTariffVoices).then((result) => {
      if (active) {
        setVoicesState(result);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedTariffBook.id]);

  const handlePdfImport = useCallback(async () => {
    setIsImporting(true);
    setCreateState("saving");
    setCreateMessage("Lettura PDF tariffario in corso...");

    let metadata: TariffPdfMetadata | null = null;
    try {
      metadata = await selectTariffPdfMetadata();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setIsImporting(false);
      setCreateState("error");
      setCreateMessage(message);
      notify({
        message,
        title: "Import tariffario non riuscito",
        tone: "danger",
      });
      return;
    }
    setIsImporting(false);

    if (!metadata) {
      setCreateMessage("Selezione PDF non disponibile in browser o annullata.");
      notify({
        message: "Selezione PDF non disponibile in browser o annullata.",
        title: "Import tariffario",
        tone: "warning",
      });
      return;
    }

    setImportPreview(metadata);
    setCreateState(metadata.voices.length > 0 ? "idle" : "error");
    setCreateMessage(
      metadata.voices.length > 0
        ? `${metadata.voices.length} voci lette dal PDF ${metadata.name}. Conferma la preview per salvarle.`
        : "Metadata PDF precompilati. Nessuna voce prezzo rilevata automaticamente.",
    );
    notify({
      message:
        metadata.voices.length > 0
          ? `${metadata.voices.length} voci lette dal PDF.`
          : "Metadata PDF precompilati senza voci prezzo rilevate.",
      title: "PDF tariffario importato",
      tone: metadata.voices.length > 0 ? "success" : "warning",
    });
  }, [notify]);

  async function handleConfirmImport(metadata: TariffPdfMetadata) {
    if (metadata.voices.length === 0) {
      setCreateState("error");
      setCreateMessage("Nessuna voce prezzo rilevata: importazione non salvata.");
      return;
    }

    setCreateState("saving");
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
      setVoicesState({ data: voices, source: "desktop" });
      setImportPreview(null);
      setCreateState("saved");
      setCreateMessage(`${book.name} salvato con ${voices.length.toLocaleString("it-IT")} voci.`);
      notify({
        message: `${voices.length.toLocaleString("it-IT")} voci tariffarie salvate in locale.`,
        title: "Importazione confermata",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Importazione non riuscita",
        tone: "danger",
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

  function handleSelectTariffBook(book: DesktopTariffBook) {
    setSelectedTariffBookId(book.id);
    setEditingBookId(null);
    setCreateMessage(`${book.name} aperto per controllo e modifica.`);
    setCreateState("idle");
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
      setCreateState("error");
      setCreateMessage("Anno tariffario non valido.");
      return;
    }

    setCreateState("saving");
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
      setCreateState("saved");
      setCreateMessage(`${updated.name} aggiornato.`);
      notify({
        message: "Dati tariffario aggiornati.",
        title: "Tariffario modificato",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Modifica tariffario non riuscita",
        tone: "danger",
      });
    }
  }

  async function handleDeleteFromDropdown(bookId: string) {
    setCreateState("saving");
    setCreateMessage("");

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
      setCreateState("saved");
      setCreateMessage(`${deletedBook?.name ?? "Tariffario"} eliminato.`);
      notify({
        message: `${deletedBook?.name ?? "Tariffario"} eliminato dal catalogo.`,
        title: "Tariffario eliminato",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Eliminazione tariffario non riuscita",
        tone: "danger",
      });
    }
  }

  return (
    <ScreenShell className="space-y-5 p-4 pb-6 lg:p-5 2xl:p-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-[25px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-primary)] sm:text-[30px]">
            Catalogo tariffari
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] font-medium leading-6 text-[var(--text-secondary)]">
            Gestisci i tariffari per ente, anno e coerenza con i progetti.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)]">
          <div className="grid min-w-[680px] grid-cols-5 divide-x divide-[var(--border-subtle)] sm:min-w-0">
            <TariffMetric
              detail="Totali nel catalogo"
              icon={Database}
              label="Tariffari"
              value={String(tariffMetrics.tariffCount)}
            />
            <TariffMetric
              detail="Enti gestiti"
              icon={Building2}
              label="Enti"
              tone="success"
              value={String(tariffMetrics.sourceCount)}
            />
            <TariffMetric
              detail={availableYears.slice(0, 3).join(", ")}
              icon={CalendarDays}
              label="Anni attivi"
              tone="warning"
              value={String(availableYears.length)}
            />
            <TariffMetric
              detail="Nel catalogo"
              icon={Sparkles}
              label="Voci totali"
              tone="info"
              value={voicesState.data.length.toLocaleString("it-IT")}
            />
            <TariffMetric
              detail="Attivi o validati"
              icon={CheckCircle2}
              label="Aggiornati"
              tone="success"
              value={String(tariffMetrics.activeCount)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_410px]">
        <div className="space-y-3 xl:self-start">
          <SectionPanel className="rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Azioni rapide
            </div>
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
                onClick={() => handleSelectTariffBook(selectedTariffBook)}
                tone="violet"
              />
            </div>
            {createMessage ? (
              <p
                className={`mt-4 rounded-lg border px-3 py-2 text-xs font-medium leading-5 ${
                  createState === "error"
                    ? "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger-base)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                }`}
              >
                {createMessage}
              </p>
            ) : null}
          </SectionPanel>

          <SectionPanel className="rounded-xl p-4">
            <div className="text-[13px] font-bold text-[var(--text-primary)]">
              Come funzionano i tariffari?
            </div>
            <p className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              Un tariffario puo contenere voci importate da PDF che verranno rese disponibili nei
              progetti.
            </p>
            <button className="mt-3 text-[12px] font-bold text-[var(--info-base)]" type="button">
              Scopri di piu
            </button>
          </SectionPanel>
        </div>

        <SectionPanel className="min-w-0 rounded-xl p-0">
          <div className="border-b border-[var(--border-subtle)]/80 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="border-b-2 border-[var(--info-base)] px-2 pb-2 text-[12px] font-bold text-[var(--text-primary)]"
                  type="button"
                >
                  Tutti i tariffari
                  <Badge className="ml-2" variant="info">
                    {visibleTariffBooks.length}
                  </Badge>
                </button>
                <button
                  className="px-2 pb-2 text-[12px] font-bold text-[var(--text-secondary)]"
                  type="button"
                >
                  I miei preferiti
                  <Badge className="ml-2" variant="neutral">
                    6
                  </Badge>
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
                <select
                  className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium text-[var(--text-primary)]"
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
                  className="h-10 min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium text-[var(--text-primary)] lg:w-[180px]"
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
                  className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium text-[var(--text-primary)]"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="validated">validated</option>
                </select>
                <label className="relative block sm:col-span-2 lg:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] lg:w-[220px] 2xl:w-[260px]"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca per nome, ente o ID..."
                    type="search"
                    value={query}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-[36px_minmax(190px,1.5fr)_minmax(130px,0.8fr)_70px_82px_100px_92px_36px] border-b border-[var(--border-subtle)]/80 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] 2xl:grid">
            <span />
            <span>Nome tariffario</span>
            <span>Ente</span>
            <span>Anno</span>
            <span>Stato</span>
            <span>Progetti collegati</span>
            <span>Voci</span>
            <span />
          </div>
          <div className="divide-y divide-[var(--border-subtle)]/80">
            {visibleTariffBooks.length > 0 ? (
              visibleTariffBooks.map((book) => (
                <TariffBookRow
                  key={book.id}
                  book={book}
                  isSelected={selectedTariffBook.id === book.id}
                  linkedProjectCount={linkedProjectCountByTariffBookId.get(book.id) ?? 0}
                  onDelete={() => handleDeleteFromDropdown(book.id)}
                  onEdit={() => handleStartEdit(book)}
                  onSelect={() => handleSelectTariffBook(book)}
                  voiceCount={book.id === selectedTariffBook.id ? voicesState.data.length : null}
                />
              ))
            ) : (
              <div className="p-8 text-sm text-[var(--text-secondary)]">
                Nessun tariffario nel filtro corrente.
              </div>
            )}
          </div>
        </SectionPanel>

        <aside className="space-y-4 xl:col-span-2 2xl:col-span-1">
          <SectionPanel className="rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                <Star className="size-4 fill-[var(--warning-base)] text-[var(--warning-base)]" />
                Dettaglio tariffario
              </div>
              <Button
                onClick={() => handleStartEdit(selectedTariffBook)}
                size="icon"
                type="button"
                variant="outline"
              >
                <MoreVertical className="size-4" />
              </Button>
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
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium normal-case tracking-normal text-[var(--text-primary)]"
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
                  <Button className="flex-1" onClick={handleSaveEdit} type="button">
                    <Save className="size-4" />
                    Salva
                  </Button>
                  <Button onClick={() => setEditingBookId(null)} type="button" variant="outline">
                    Annulla
                  </Button>
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
          </SectionPanel>

          <SectionPanel className="rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                  Voci tariffario
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-secondary)]">Anteprima</div>
              </div>
              <Button size="icon" type="button" variant="outline">
                <Download className="size-4" />
              </Button>
            </div>
            <TariffVoicesPreview groups={previewVoicesByCategory} total={voicesState.data.length} />
          </SectionPanel>
        </aside>
      </section>
      {importPreview ? (
        <TariffImportPreviewModal
          isBusy={createState === "saving" || isImporting}
          metadata={importPreview}
          onCancel={() => setImportPreview(null)}
          onConfirm={handleConfirmImport}
        />
      ) : null}
    </ScreenShell>
  );
}

function TariffMetric({
  detail,
  icon: Icon,
  label,
  tone = "info",
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone?: "info" | "success" | "warning";
  value: string;
}) {
  const iconClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success-base)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
        : "bg-[var(--info-soft)] text-[var(--info-base)]";

  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconClass}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-1 text-[20px] font-bold leading-none text-[var(--text-primary)]">
            {value}
          </div>
        </div>
      </div>
      <div className="mt-2 truncate pl-[42px] text-[11px] font-medium text-[var(--text-secondary)]">
        {detail || "Nel catalogo"}
      </div>
    </div>
  );
}

function QuickAction({
  detail,
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: "info" | "success" | "violet";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success-base)]"
      : tone === "violet"
        ? "bg-[var(--info-soft)] text-[var(--info-base)]"
        : "bg-[var(--info-soft)] text-[var(--info-base)]";

  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--bg-muted)]"
      onClick={onClick}
      type="button"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="block truncate text-[11px] font-medium text-[var(--text-secondary)]">
          {detail}
        </span>
      </span>
    </button>
  );
}

function TariffBookRow({
  book,
  isSelected,
  linkedProjectCount,
  onDelete,
  onEdit,
  onSelect,
  voiceCount,
}: {
  book: DesktopTariffBook;
  isSelected: boolean;
  linkedProjectCount: number;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
  voiceCount: null | number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = book.status === "active" || book.status === "validated";

  return (
    <div className="px-2 py-1.5">
      <div
        className={`group relative grid gap-3 rounded-lg border px-3 py-3 transition-colors 2xl:grid-cols-[36px_minmax(190px,1.5fr)_minmax(130px,0.8fr)_70px_82px_100px_92px_36px] 2xl:items-center ${
          isSelected
            ? "border-[var(--accent-primary)]/45 bg-[var(--accent-primary)]/8 shadow-sm"
            : "border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]"
        }`}
      >
        <button
          aria-label={isSelected ? "Tariffario preferito" : "Segna come preferito"}
          className="hidden text-[var(--text-secondary)] hover:text-[var(--warning-base)] 2xl:block"
          type="button"
        >
          <Star
            className={`size-4 ${
              isSelected ? "fill-[var(--warning-base)] text-[var(--warning-base)]" : ""
            }`}
          />
        </button>
        <button className="min-w-0 text-left" onClick={onSelect} type="button">
          <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
            {book.name}
          </div>
          <div className="mt-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
            ID: {book.id}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)] 2xl:hidden">
            {book.sourceName} · {book.year} · {linkedProjectCount} progetti
            <Badge variant={isActive ? "success" : "warning"}>{book.status}</Badge>
          </div>
        </button>
        <div className="hidden min-w-0 text-[12px] font-medium text-[var(--text-secondary)] 2xl:block">
          <div className="truncate">{book.sourceName}</div>
        </div>
        <div className="hidden text-[13px] font-semibold text-[var(--text-primary)] 2xl:block">
          {book.year}
        </div>
        <div className="hidden 2xl:block">
          <Badge variant={isActive ? "success" : "warning"}>{book.status}</Badge>
        </div>
        <div className="hidden text-center text-[13px] font-semibold text-[var(--text-primary)] 2xl:block">
          {linkedProjectCount}
        </div>
        <div className="hidden text-right text-[13px] font-semibold text-[var(--text-primary)] 2xl:block">
          {voiceCount == null ? "-" : voiceCount.toLocaleString("it-IT")}
        </div>
        <div className="absolute right-3 top-3 2xl:static 2xl:justify-self-end">
          <Button
            aria-expanded={isOpen}
            aria-label={`Azioni per ${book.name}`}
            onClick={() => setIsOpen(!isOpen)}
            size="icon"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
          {isOpen && (
            <>
              <button
                aria-label="Chiudi menu azioni"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsOpen(false)}
                type="button"
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-[14px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] py-1 shadow-none">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Modifica
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--danger-base)] hover:bg-[var(--bg-muted)]"
                  onClick={() => {
                    onDelete();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Elimina
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TariffEditField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function TariffVoicesPreview({
  groups,
  isExpandable = false,
  total,
}: {
  groups: Array<{ children: DesktopTariffVoice[]; code: string; description: string }>;
  isExpandable?: boolean;
  total: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleGroups = showAll || !isExpandable ? groups : groups.slice(0, 3);
  const visibleVoiceCount = visibleGroups.reduce((sum, group) => sum + group.children.length, 0);

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]/80">
      <div className="grid min-w-[860px] grid-cols-[150px_minmax(280px,1fr)_90px_110px_110px] border-b border-[var(--border-subtle)]/80 bg-[var(--bg-muted)]/35 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        <span>Codice</span>
        <span>Descrizione</span>
        <span>U.M.</span>
        <span className="text-right">Manodopera</span>
        <span className="text-right">Prezzo</span>
      </div>
      <div className="overflow-x-auto">
        {visibleGroups.map((group) => (
          <div className="min-w-[860px]" key={group.code}>
            <div className="grid grid-cols-[150px_minmax(280px,1fr)_90px_110px_110px] border-b border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-4 py-3 text-[12px] font-bold text-[var(--text-primary)]">
              <span className="break-words">{group.code}</span>
              <span className="leading-5">{group.description}</span>
              <span>-</span>
              <span className="text-right">-</span>
              <span className="text-right">-</span>
            </div>
            {group.children.map((voice) => (
              <div
                className="grid grid-cols-[150px_minmax(280px,1fr)_90px_110px_110px] gap-x-3 border-b border-[var(--border-subtle)]/70 px-4 py-3 text-[12px] last:border-b-0"
                key={voice.id}
              >
                <span className="break-words font-semibold leading-5 text-[var(--text-primary)]">
                  {voice.officialCode}
                </span>
                <span className="min-w-0 whitespace-normal break-words font-medium leading-5 text-[var(--text-secondary)]">
                  {voice.description || "Descrizione mancante"}
                </span>
                <span className="font-medium text-[var(--text-secondary)]">
                  {voice.unitOfMeasure || "-"}
                </span>
                <span className="text-right font-semibold text-[var(--text-primary)]">
                  {formatPercent(voice.laborPercentage)}
                </span>
                <span className="text-right font-semibold text-[var(--text-primary)]">
                  {formatEuro(voice.unitPrice)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3 text-[12px] font-medium text-[var(--text-secondary)]">
        <span>
          Mostra {visibleVoiceCount.toLocaleString("it-IT")} di {total.toLocaleString("it-IT")} voci
        </span>
        {isExpandable && groups.length > 3 ? (
          <button
            className="font-bold text-[var(--info-base)]"
            onClick={() => setShowAll((value) => !value)}
            type="button"
          >
            {showAll ? "Riduci" : "Vedi tutte le voci"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TariffImportPreviewModal({
  isBusy,
  metadata,
  onCancel,
  onConfirm,
}: {
  isBusy: boolean;
  metadata: TariffPdfMetadata;
  onCancel: () => void;
  onConfirm: (metadata: TariffPdfMetadata) => void;
}) {
  const [editableVoices, setEditableVoices] = useState(metadata.voices);
  const validation = getImportValidation(editableVoices);
  const hasVoices = editableVoices.length > 0;
  const canConfirm = hasVoices && validation.invalidCount === 0;
  const duplicateCodes = useMemo(() => new Set(validation.duplicateExamples), [validation]);
  const editableGroups = useMemo(() => groupEditableTariffVoices(editableVoices), [editableVoices]);
  const invalidRows = useMemo(
    () => validation.invalidRows.concat(validation.duplicateRows).slice(0, 8),
    [validation],
  );

  function updateVoice(index: number, field: keyof DesktopTariffVoice, value: string) {
    setEditableVoices((current) =>
      current.map((voice, voiceIndex) =>
        voiceIndex === index
          ? {
              ...voice,
              [field]:
                field === "unitPrice"
                  ? parseEuroAmount(value)
                  : field === "laborPercentage"
                    ? parseOptionalPercent(value)
                    : value,
            }
          : voice,
      ),
    );
  }

  function focusImportCell(rowIndex: number, field: string) {
    const cell = document.getElementById(`import-cell-${rowIndex}-${field}`);
    cell?.scrollIntoView({ block: "center", inline: "nearest" });
    cell?.focus();
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-xl">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-[21px] font-bold leading-tight text-[var(--text-primary)]">
              Preview importazione
            </h3>
            <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
              Controlla i dati estratti dal PDF prima di confermarli nel catalogo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 py-1">
                {metadata.name}
              </span>
              <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 py-1">
                {metadata.sourceName}
              </span>
              <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 py-1">
                {metadata.year}
              </span>
            </div>
          </div>
          <Button
            aria-label="Chiudi preview"
            onClick={onCancel}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <ImportMetric
              label="Righe rilevate"
              value={metadata.voices.length.toLocaleString("it-IT")}
            />
            <ImportMetric
              label="Valide"
              tone={validation.validCount > 0 ? "success" : "warning"}
              value={validation.validCount.toLocaleString("it-IT")}
            />
            <ImportMetric
              label="Warning"
              tone={validation.warningCount > 0 ? "warning" : "neutral"}
              value={validation.warningCount.toLocaleString("it-IT")}
            />
            <ImportMetric
              label="Duplicati"
              tone={validation.duplicateCount > 0 ? "warning" : "neutral"}
              value={validation.duplicateCount.toLocaleString("it-IT")}
            />
          </div>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
            <EditableTariffVoicesGrid
              duplicateCodes={duplicateCodes}
              groups={editableGroups}
              onChange={updateVoice}
              validation={validation}
            />
            <div className="space-y-3 lg:sticky lg:top-0">
              <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Validazioni
                </div>
                <div className="mt-3 space-y-2 text-[12px] font-medium text-[var(--text-secondary)]">
                  <ValidationLine ok={hasVoices} text="Voci prezzo rilevate" />
                  <ValidationLine
                    ok={validation.invalidCount === 0}
                    text={`${validation.invalidCount.toLocaleString("it-IT")} voci con dati mancanti`}
                  />
                  <ValidationLine
                    ok={validation.duplicateCount === 0}
                    text={`${validation.duplicateCount.toLocaleString("it-IT")} codici duplicati`}
                  />
                  <ValidationLine
                    ok={metadata.sourceName !== "Ente da confermare"}
                    text="Ente riconosciuto"
                  />
                  <ValidationLine
                    ok={metadata.year >= 1900 && metadata.year <= 2200}
                    text="Anno coerente"
                  />
                </div>
              </div>
              {validation.duplicateExamples.length > 0 || validation.invalidExamples.length > 0 ? (
                <div className="rounded-lg border border-[var(--warning-soft)] bg-[var(--warning-soft)] p-3 text-[12px] font-medium leading-5 text-[var(--warning-base)]">
                  {validation.duplicateExamples.length > 0 ? (
                    <div>Duplicati: {validation.duplicateExamples.join(", ")}</div>
                  ) : null}
                  {validation.invalidExamples.length > 0 ? (
                    <div>Dati mancanti: {validation.invalidExamples.join(", ")}</div>
                  ) : null}
                  {invalidRows.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {invalidRows.map((row) => (
                        <button
                          className="rounded-md border border-current/25 bg-[var(--surface-base)] px-2 py-1 text-[11px] font-bold"
                          key={`${row.index}-${row.field}`}
                          onClick={() => focusImportCell(row.index, row.field)}
                          type="button"
                        >
                          Riga {row.index + 1}: {row.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {!hasVoices ? (
            <div className="mt-4 rounded-lg border border-[var(--warning-soft)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--warning-base)]">
              Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento
              contenga codici, unita di misura e prezzi leggibili.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onCancel} type="button" variant="outline">
            Annulla
          </Button>
          <Button
            disabled={!canConfirm || isBusy}
            onClick={() => onConfirm({ ...metadata, voices: editableVoices })}
            type="button"
          >
            Conferma importazione
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditableTariffVoicesGrid({
  duplicateCodes,
  groups,
  onChange,
  validation,
}: {
  duplicateCodes: Set<string>;
  groups: Array<{
    children: Array<{ index: number; voice: DesktopTariffVoice }>;
    code: string;
    description: string;
  }>;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  validation: ImportValidation;
}) {
  const invalidCellKeys = new Set(validation.invalidRows.map((row) => `${row.index}-${row.field}`));
  const totalVoices = groups.reduce((sum, group) => sum + group.children.length, 0);

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]/80">
      <div className="grid grid-cols-[minmax(86px,0.9fr)_minmax(140px,1.8fr)_minmax(46px,0.45fr)_minmax(76px,0.65fr)_minmax(76px,0.65fr)] gap-2 border-b border-[var(--border-subtle)]/80 bg-[var(--bg-muted)]/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        <span>Codice</span>
        <span>Descrizione</span>
        <span>U.M.</span>
        <span className="text-right">Manod.</span>
        <span className="text-right">Prezzo</span>
      </div>
      <div>
        {groups.map((group) => (
          <div key={group.code}>
            <div className="grid grid-cols-[minmax(86px,0.9fr)_minmax(140px,1.8fr)_minmax(46px,0.45fr)_minmax(76px,0.65fr)_minmax(76px,0.65fr)] gap-2 border-b border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 px-3 py-2 text-[12px] font-bold text-[var(--text-primary)]">
              <span className="break-words leading-5">{group.code}</span>
              <span className="min-w-0 break-words leading-5">{group.description}</span>
              <span>-</span>
              <span className="text-right">-</span>
              <span className="text-right">-</span>
            </div>
            {group.children.map(({ index, voice }) => {
              const code = voice.officialCode.trim();
              const isDuplicate = duplicateCodes.has(code);

              return (
                <div
                  className={`grid grid-cols-[minmax(86px,0.9fr)_minmax(140px,1.8fr)_minmax(46px,0.45fr)_minmax(76px,0.65fr)_minmax(76px,0.65fr)] gap-2 border-b border-[var(--border-subtle)]/65 px-3 py-2 last:border-b-0 ${
                    isDuplicate ? "bg-[var(--warning-soft)]/35" : ""
                  }`}
                  key={voice.id}
                >
                  <ImportCell
                    field="officialCode"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-officialCode`) || isDuplicate}
                    onChange={onChange}
                    value={voice.officialCode}
                  />
                  <ImportCell
                    field="description"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-description`)}
                    onChange={onChange}
                    value={voice.description}
                  />
                  <ImportCell
                    field="unitOfMeasure"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-unitOfMeasure`)}
                    onChange={onChange}
                    value={voice.unitOfMeasure}
                  />
                  <ImportCell
                    align="right"
                    field="laborPercentage"
                    index={index}
                    isInvalid={false}
                    onChange={onChange}
                    value={formatEditablePercent(voice.laborPercentage)}
                  />
                  <ImportCell
                    align="right"
                    field="unitPrice"
                    index={index}
                    isInvalid={invalidCellKeys.has(`${index}-unitPrice`)}
                    onChange={onChange}
                    value={
                      Number.isFinite(voice.unitPrice)
                        ? String(voice.unitPrice).replace(".", ",")
                        : ""
                    }
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="px-3 py-3 text-[12px] font-medium text-[var(--text-secondary)]">
        {totalVoices.toLocaleString("it-IT")} sottovoci modificabili in{" "}
        {groups.length.toLocaleString("it-IT")} voci
      </div>
    </div>
  );
}

function ImportCell({
  align = "left",
  field,
  index,
  isInvalid,
  onChange,
  value,
}: {
  align?: "left" | "right";
  field: keyof DesktopTariffVoice;
  index: number;
  isInvalid: boolean;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  value: string;
}) {
  return (
    <input
      className={`h-9 min-w-0 rounded-md border bg-[var(--surface-base)] px-2 text-[12px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] ${
        align === "right" ? "text-right" : ""
      } ${
        isInvalid
          ? "border-[var(--warning-base)] bg-[var(--warning-soft)]/40"
          : "border-transparent hover:border-[var(--border-subtle)]"
      }`}
      id={`import-cell-${index}-${field}`}
      onChange={(event) => onChange(index, field, event.target.value)}
      value={value}
    />
  );
}

function ImportMetric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  const color =
    tone === "success"
      ? "text-[var(--success-base)]"
      : tone === "warning"
        ? "text-[var(--warning-base)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-2 text-[22px] font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ValidationLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        className={`size-4 ${ok ? "text-[var(--success-base)]" : "text-[var(--warning-base)]"}`}
      />
      <span>{text}</span>
    </div>
  );
}

type ImportValidation = ReturnType<typeof getImportValidation>;

function getImportValidation(voices: DesktopTariffVoice[]) {
  const codeCounts = new Map<string, number>();
  const invalidExamples: string[] = [];
  const invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }> = [];
  let invalidCount = 0;

  for (const [index, voice] of voices.entries()) {
    const code = voice.officialCode.trim();
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);

    const missingFields: Array<{ field: keyof DesktopTariffVoice; label: string }> = [];
    if (code.length === 0) {
      missingFields.push({ field: "officialCode", label: "codice" });
    }
    if (voice.description.trim().length === 0) {
      missingFields.push({ field: "description", label: "descrizione" });
    }
    if (voice.unitOfMeasure.trim().length === 0) {
      missingFields.push({ field: "unitOfMeasure", label: "U.M." });
    }
    if (!Number.isFinite(voice.unitPrice) || voice.unitPrice <= 0) {
      missingFields.push({ field: "unitPrice", label: "prezzo" });
    }

    if (missingFields.length > 0) {
      invalidCount += 1;
      if (invalidExamples.length < 4) {
        invalidExamples.push(code || voice.id);
      }
      for (const field of missingFields) {
        invalidRows.push({ index, ...field });
      }
    }
  }

  const duplicateExamples = [...codeCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([code]) => code)
    .slice(0, 4);
  const duplicateCount = [...codeCounts.values()].reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );
  const duplicateRows = voices
    .map((voice, index) => ({ code: voice.officialCode.trim(), index }))
    .filter((row) => row.code.length > 0 && (codeCounts.get(row.code) ?? 0) > 1)
    .map((row) => ({
      field: "officialCode" as const,
      index: row.index,
      label: "codice duplicato",
    }));

  return {
    duplicateCount,
    duplicateExamples,
    duplicateRows,
    invalidCount,
    invalidExamples,
    invalidRows,
    validCount: Math.max(0, voices.length - invalidCount),
    warningCount: duplicateCount + invalidCount,
  };
}

function groupTariffVoices(voices: DesktopTariffVoice[]) {
  const groups = new Map<
    string,
    { children: DesktopTariffVoice[]; code: string; description: string }
  >();

  for (const voice of voices) {
    const codeParts = voice.officialCode.split(".");
    const groupCode =
      codeParts.length >= 4 ? codeParts.slice(0, 4).join(".") : voice.officialCode || "Altro";
    const group = groups.get(groupCode) ?? {
      children: [],
      code: groupCode,
      description: inferGroupDescription(voice),
    };
    group.children.push(voice);
    groups.set(groupCode, group);
  }

  return [...groups.values()];
}

function groupEditableTariffVoices(voices: DesktopTariffVoice[]) {
  const groups = new Map<
    string,
    {
      children: Array<{ index: number; voice: DesktopTariffVoice }>;
      code: string;
      description: string;
    }
  >();

  for (const [index, voice] of voices.entries()) {
    const codeParts = voice.officialCode.split(".");
    const groupCode =
      codeParts.length >= 4 ? codeParts.slice(0, 4).join(".") : voice.officialCode || "Altro";
    const group = groups.get(groupCode) ?? {
      children: [],
      code: groupCode,
      description: inferGroupDescription(voice),
    };
    group.children.push({ index, voice });
    groups.set(groupCode, group);
  }

  return [...groups.values()];
}

function inferGroupDescription(voice: DesktopTariffVoice) {
  if (voice.category.includes("VOCE")) {
    return voice.category;
  }
  if (voice.category === "armament") {
    return "Armamento ferroviario";
  }
  if (voice.category === "electrical") {
    return "Impianti elettrici";
  }
  if (voice.category === "safety-os") {
    return "Oneri sicurezza";
  }
  return "Opere civili";
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", { currency: "EUR", style: "currency" }).format(value);
}

function formatPercent(value: null | number | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatEditablePercent(value: null | number | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }

  return String(value).replace(".", ",");
}

function parseOptionalPercent(value: string) {
  const normalized = value.trim().replace("%", "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function createTariffBookId(metadata: TariffPdfMetadata) {
  const base = sanitizeIdentifier(`${metadata.name}_${metadata.year}`) || "import";
  return `tariff_${base}_${Date.now().toString(36)}`;
}

function sanitizeIdentifier(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
