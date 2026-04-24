import { Download, FileUp, MoreVertical, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  createDesktopTariffBook,
  deleteDesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
  selectTariffPdfMetadata,
  updateDesktopTariffBook,
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
  unitPrice: Number(row.price.replace("€", "").replace(".", "").replace(",", ".").trim()),
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

export function TariffsScreen() {
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

  const contractById = useMemo(
    () => new Map(contractsState.data.map((contract) => [contract.id, contract])),
    [contractsState.data],
  );

  const availableYears = useMemo(
    () => [...new Set(tariffBooksState.data.map((book) => book.year))].sort((a, b) => b - a),
    [tariffBooksState.data],
  );

  const visibleTariffBooks = tariffBooksState.data.filter((book) => {
    const matchesQuery = `${book.name} ${book.sourceName} ${book.year}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesYear = yearFilter === "all" || book.year === Number(yearFilter);
    const matchesStatus = statusFilter === "all" || book.status === statusFilter;
    const matchesProject =
      projectFilter === "all" ||
      contractById
        .get(projectFilter)
        ?.tariffPriorities.some((priority) => priority.tariffBookId === book.id);

    return matchesQuery && matchesYear && matchesStatus && Boolean(matchesProject);
  });

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

  async function handlePdfImport() {
    const metadata = await selectTariffPdfMetadata();

    if (!metadata) {
      setCreateMessage("Selezione PDF non disponibile in browser o annullata.");
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
  }

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
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
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
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="p-6 pb-8">
      <section className="rounded-[28px] border border-subtle bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Catalogo tariffari</Badge>
              <span className="text-xs text-secondary">
                {tariffBooksState.source === "desktop"
                  ? "Archivio locale SQLite"
                  : tariffBooksState.message}
              </span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              Catalogo tariffari per ente, anno e progetto.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
              Qui gestisci basi prezzi e provenienza. Le voci di dettaglio restano collegate al
              tariffario selezionato, mentre progetto e anno filtrano il catalogo realmente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <MetricTile label="Tariffari" value={String(tariffBooksState.data.length)} />
            <MetricTile
              label="Enti"
              value={String(new Set(tariffBooksState.data.map((b) => b.sourceName)).size)}
            />
            <MetricTile label="Anni" value={String(availableYears.length)} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                Nuovo tariffario
              </div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Dati sorgente</h3>
            </div>
            <Button onClick={handlePdfImport} size="icon" type="button" variant="outline">
              <FileUp className="size-4" />
            </Button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleCreateTariffBook}>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Anno"
                onChange={(value) => setFormState((state) => ({ ...state, year: value }))}
                placeholder="2026"
                type="number"
                value={formState.year}
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                  Stato
                </span>
                <select
                  className="mt-2 h-10 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
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
                  createState === "error" ? "text-danger" : "text-secondary"
                }`}
              >
                {createMessage}
              </p>
            ) : null}

            <Button disabled={createState === "saving"} type="submit">
              {createState === "saving" ? "Salvataggio" : "Salva tariffario"}
            </Button>
          </form>
        </section>

        <section className="rounded-[28px] border border-subtle bg-card shadow-soft">
          <div className="border-b border-subtle p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{visibleTariffBooks.length} visibili</Badge>
                <Badge variant="info">
                  {tariffBooksState.source === "desktop" ? "DB" : "Demo"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-10 rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground"
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
                  className="h-10 rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground"
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
                  className="h-10 rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="validated">validated</option>
                </select>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                  <input
                    className="h-10 w-[240px] rounded-[18px] border border-subtle bg-card pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca ente o nome"
                    type="search"
                    value={query}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="divide-y divide-subtle">
            {visibleTariffBooks.length > 0 ? (
              visibleTariffBooks.map((book) => (
                <TariffBookRow
                  key={book.id}
                  book={book}
                  isSelected={selectedTariffBook.id === book.id}
                  onDelete={() => handleDeleteFromDropdown(book.id)}
                  onSelect={() => handleSelectTariffBook(book)}
                />
              ))
            ) : (
              <div className="p-8 text-sm text-secondary">
                Nessun tariffario nel filtro corrente.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Dettaglio tariffario</div>
            <div className="mt-4 rounded-[22px] border border-subtle bg-muted/35 p-4">
              <Badge variant={selectedTariffBook.status === "active" ? "success" : "info"}>
                {selectedTariffBook.status}
              </Badge>
              <div className="mt-3 text-sm font-semibold text-foreground">
                {selectedTariffBook.name}
              </div>
              <dl className="mt-4 space-y-3">
                <SummaryLine label="Ente" value={selectedTariffBook.sourceName} />
                <SummaryLine label="Anno" value={String(selectedTariffBook.year)} />
                <SummaryLine label="ID" value={selectedTariffBook.id} />
              </dl>
            </div>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-foreground">Voci tariffario</div>
              <Button size="icon" type="button" variant="outline">
                <Download className="size-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {voicesState.data.length > 0 ? (
                voicesState.data.map((row) => (
                  <div className="rounded-[18px] border border-subtle bg-muted/35 p-3" key={row.id}>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="neutral">{row.officialCode}</Badge>
                      <Badge variant="info">{row.unitOfMeasure}</Badge>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                      {row.description}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {row.category} · € {row.unitPrice.toLocaleString("it-IT")} /{" "}
                      {row.unitOfMeasure}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-subtle bg-muted/35 p-4 text-sm text-secondary">
                  Nessuna voce collegata. Importa un PDF o salva un tariffario con voci rilevate.
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-subtle pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="text-right text-sm font-semibold text-foreground">{value}</dd>
    </div>
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
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </span>
      <input
        className="mt-2 h-10 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
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
  onDelete,
  onSelect,
}: {
  book: DesktopTariffBook;
  isSelected: boolean;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-4 border-b border-subtle px-5 py-4 transition-colors hover:bg-muted/60 ${
        isSelected ? "bg-primary/10" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground">{book.name}</div>
        <div className="mt-1 text-xs text-secondary">{book.sourceName}</div>
      </div>
      <div className="text-sm text-foreground">{book.year}</div>
      <Badge variant={book.status === "active" ? "success" : "info"}>{book.status}</Badge>
      <button
        className="text-xs font-semibold text-secondary hover:text-primary"
        onClick={onSelect}
        type="button"
      >
        {isSelected ? "Selezionato" : "Apri"}
      </button>
      <div className="relative">
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
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-[14px] border border-subtle bg-card py-1 shadow-soft">
              <button
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                onClick={() => {
                  onSelect();
                  setIsOpen(false);
                }}
                type="button"
              >
                Modifica
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-muted"
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
