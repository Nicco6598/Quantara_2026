import { Download, FileUp, MoreVertical, Search } from "lucide-react";
import { parseEuroAmount } from "@quantara/domain-utils";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { MetricTile, ScreenShell, SectionPanel, SummaryLine } from "@/components/shared/Screen";
import {
  createDesktopTariffBook,
  deleteDesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
  selectTariffPdfMetadata,
  type DesktopContract,
  type DesktopDataResult,
  type DesktopTariffBook,
  type DesktopTariffVoice,
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
  officialCode: row.code,
  tariffBookId: fallbackTariffBook.id,
  unitOfMeasure: row.unit,
  unitPrice: parseEuroAmount(row.price),
}));

type TariffFormState = {
  name: string;
  sourceName: string;
  status: string;
  year: string;
};

const initialFormState: TariffFormState = {
  name: "",
  sourceName: "",
  status: "active",
  year: String(new Date().getFullYear()),
};

type TariffMetrics = {
  activeCount: number;
  sourceCount: number;
  tariffCount: number;
  years: number[];
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
  const [formState, setFormState] = useState<TariffFormState>(initialFormState);
  const [importedVoices, setImportedVoices] = useState<DesktopTariffVoice[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedTariffBookId, setSelectedTariffBookId] = useState(fallbackTariffBook.id);
  const [statusFilter, setStatusFilter] = useState("all");
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

  const linkedProjectCountByTariffBookId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const contract of contractsState.data) {
      const linkedBookIds = new Set(
        contract.tariffPriorities.map((priority) => priority.tariffBookId),
      );

      for (const tariffBookId of linkedBookIds) {
        counts.set(tariffBookId, (counts.get(tariffBookId) ?? 0) + 1);
      }
    }

    return counts;
  }, [contractsState.data]);

  const projectTariffBookIds = useMemo(() => {
    if (projectFilter === "all") {
      return null;
    }

    const contract = contractsState.data.find((item) => item.id === projectFilter);
    return new Set(contract?.tariffPriorities.map((priority) => priority.tariffBookId) ?? []);
  }, [contractsState.data, projectFilter]);

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
    const metadata = await selectTariffPdfMetadata();

    if (!metadata) {
      setCreateMessage("Selezione PDF non disponibile in browser o annullata.");
      notify({
        message: "Selezione PDF non disponibile in browser o annullata.",
        title: "Import tariffario",
        tone: "warning",
      });
      return;
    }

    setFormState({
      name: metadata.name,
      sourceName: metadata.sourceName,
      status: "draft",
      year: String(metadata.year),
    });
    setImportedVoices(metadata.voices);
    setCreateMessage(
      metadata.voices.length > 0
        ? `${metadata.voices.length} voci lette dal PDF. Conferma ente e anno prima di salvare.`
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
    setFormState({
      name: book.name,
      sourceName: book.sourceName,
      status: book.status,
      year: String(book.year),
    });
    setImportedVoices([]);
    setCreateMessage(`${book.name} aperto per controllo e modifica.`);
    setCreateState("idle");
  }

  async function handleCreateTariffBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateState("saving");
    setCreateMessage("");

    const year = Number(formState.year);

    if (!formState.name.trim() || !formState.sourceName.trim() || !Number.isInteger(year)) {
      setCreateState("error");
      setCreateMessage("Compila nome, ente e anno tariffario.");
      notify({
        message: "Compila nome, ente e anno tariffario.",
        title: "Tariffario non salvato",
        tone: "warning",
      });
      return;
    }

    try {
      const created = await createDesktopTariffBook({
        id: `tariff_${slugify(formState.sourceName)}_${year}_${Date.now()}`,
        name: formState.name.trim(),
        sourceName: formState.sourceName.trim(),
        status: formState.status,
        voices: importedVoices,
        year,
      });

      setTariffBooksState((current) => ({
        data: [created, ...current.data.filter((book) => book.id !== created.id)],
        ...(current.source === "fallback"
          ? { message: "Runtime browser: anteprima locale.", source: "fallback" }
          : { source: "desktop" }),
      }));
      setSelectedTariffBookId(created.id);
      setCreateState("saved");
      setCreateMessage(`${created.name} salvato.`);
      setFormState(initialFormState);
      setImportedVoices([]);
      notify({
        message: `${created.name} salvato nel catalogo.`,
        title: "Tariffario salvato",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Salvataggio tariffario non riuscito",
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
    <ScreenShell className="space-y-4 p-4 pb-6 lg:p-5 2xl:p-6">
      <section>
        <h2 className="text-[26px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)] 2xl:text-[32px]">
          Catalogo tariffari
        </h2>
        <p className="mt-2 max-w-3xl text-[14px] font-medium leading-6 text-[var(--text-secondary)] 2xl:text-[15px]">
          Gestisci i tariffari per ente, anno e coerenza con i progetti.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricTile label="Tariffari" value={String(tariffMetrics.tariffCount)} />
        <MetricTile label="Enti" value={String(tariffMetrics.sourceCount)} />
        <MetricTile label="Anni" value={String(availableYears.length)} />
        <MetricTile label="Voci totali" value={String(voicesState.data.length)} />
        <MetricTile label="Aggiornati" value={String(tariffMetrics.activeCount)} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <SectionPanel className="rounded-[18px] p-4 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Nuovo tariffario
              </div>
              <h3 className="mt-1 text-[16px] font-bold text-[var(--text-primary)]">
                Dati sorgente
              </h3>
            </div>
            <Button onClick={handlePdfImport} size="icon" type="button" variant="outline">
              <FileUp className="size-4" />
            </Button>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleCreateTariffBook}>
            <TextField
              label="Nome tariffario"
              onChange={(value) => setFormState((state) => ({ ...state, name: value }))}
              placeholder="Tariffario Lombardia 2026"
              value={formState.name}
            />
            <TextField
              label="Ente"
              onChange={(value) => setFormState((state) => ({ ...state, sourceName: value }))}
              placeholder="Regione Lombardia"
              value={formState.sourceName}
            />
            <div className="grid gap-3">
              <TextField
                label="Anno"
                onChange={(value) => setFormState((state) => ({ ...state, year: value }))}
                placeholder="2026"
                type="number"
                value={formState.year}
              />
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Stato
                </span>
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, status: event.target.value }))
                  }
                  value={formState.status}
                >
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="validated">validated</option>
                </select>
              </label>
            </div>

            {createMessage ? (
              <p
                className={`text-xs leading-5 ${
                  createState === "error"
                    ? "text-[var(--danger-base)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {createMessage}
              </p>
            ) : null}

            <Button disabled={createState === "saving"} type="submit">
              {createState === "saving" ? "Salvataggio" : "Salva tariffario"}
            </Button>
          </form>
        </SectionPanel>

        <SectionPanel className="min-w-0 rounded-[18px] p-0">
          <div className="border-b border-[var(--border-subtle)]/80 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{visibleTariffBooks.length} visibili</Badge>
                <Badge variant="info">
                  {tariffBooksState.source === "desktop" ? "DB" : "Demo"}
                </Badge>
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
                  <option value="all">Tutti i progetti</option>
                  {contractsState.data.map((contract) => (
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
                    placeholder="Cerca ente o nome"
                    type="search"
                    value={query}
                  />
                </label>
              </div>
            </div>
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
          <SectionPanel className="rounded-[18px] p-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">
              Dettaglio tariffario
            </div>
            <div className="mt-4 rounded-[14px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4">
              <Badge variant={selectedTariffBook.status === "active" ? "success" : "info"}>
                {selectedTariffBook.status}
              </Badge>
              <div className="mt-3 text-[14px] font-bold text-[var(--text-primary)]">
                {selectedTariffBook.name}
              </div>
              <dl className="mt-4 space-y-3">
                <SummaryLine label="Ente" value={selectedTariffBook.sourceName} />
                <SummaryLine label="Anno" value={String(selectedTariffBook.year)} />
                <SummaryLine label="ID" value={selectedTariffBook.id} />
              </dl>
            </div>
          </SectionPanel>

          <SectionPanel className="rounded-[18px] p-4">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold text-[var(--text-primary)]">
                Voci tariffario
              </div>
              <Button size="icon" type="button" variant="outline">
                <Download className="size-4" />
              </Button>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-1">
              {voicesState.data.length > 0 ? (
                voicesState.data.map((row) => (
                  <div
                    className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-3"
                    key={row.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="neutral">{row.officialCode}</Badge>
                      <Badge variant="info">{row.unitOfMeasure}</Badge>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {row.description}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      {row.category} · € {row.unitPrice.toLocaleString("it-IT")} /{" "}
                      {row.unitOfMeasure}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4 text-sm text-[var(--text-secondary)]">
                  Nessuna voce collegata. Importa un PDF o salva un tariffario con voci rilevate.
                </div>
              )}
            </div>
          </SectionPanel>
        </aside>
      </section>
    </ScreenShell>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="mt-2 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function TariffBookRow({
  book,
  isSelected,
  linkedProjectCount,
  onDelete,
  onSelect,
  voiceCount,
}: {
  book: DesktopTariffBook;
  isSelected: boolean;
  linkedProjectCount: number;
  onDelete: () => void;
  onSelect: () => void;
  voiceCount: null | number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`group relative grid gap-3 border-b border-[var(--border-subtle)]/80 px-4 py-3 transition-colors hover:bg-[var(--bg-muted-strong)] sm:grid-cols-[minmax(0,1.4fr)_110px_84px_90px_44px] sm:items-center ${
        isSelected ? "bg-[var(--accent-primary)]/10" : ""
      }`}
    >
      <button className="min-w-0 text-left" onClick={onSelect} type="button">
        <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">{book.name}</div>
        <div className="mt-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
          ID: {book.id}
        </div>
        <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)] sm:hidden">
          {book.sourceName} · {book.year} · {linkedProjectCount} progetti
        </div>
      </button>
      <div className="hidden min-w-0 text-[12px] font-medium text-[var(--text-secondary)] sm:block">
        <div className="truncate">{book.sourceName}</div>
        <div className="mt-1 text-[11px]">{linkedProjectCount} progetti</div>
      </div>
      <div className="hidden text-[13px] font-semibold text-[var(--text-primary)] sm:block">
        {book.year}
        <div className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
          {voiceCount == null ? "Voci -" : `${voiceCount} voci`}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:block">
        <Badge variant={book.status === "active" ? "success" : "info"}>{book.status}</Badge>
      </div>
      <button
        className="hidden text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] sm:block"
        onClick={onSelect}
        type="button"
      >
        {isSelected ? "Selezionato" : "Apri"}
      </button>
      <div className="absolute right-3 top-3 sm:static sm:justify-self-end">
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
                  onSelect();
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
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
