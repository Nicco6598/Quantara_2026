import { ChevronDown, Download, Filter, Search } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";

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
    category: "01 - Opere di scavo",
    code: "01.A02.A20.010",
    delta: "+3,1%",
    description: "Rinfianco con materiale arido",
    price: "€ 16,80",
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
  {
    category: "05 - Elettrificazione",
    code: "05.E01.E20.060",
    delta: "+3,6%",
    description: "Pali per linea di contatto",
    price: "€ 210,00",
    unit: "cad",
  },
] as const;

const summaryRows = [
  { label: "Fonte", value: "Regione Lombardia" },
  { label: "Anno", value: "2025" },
  { label: "Import", value: "08/05/2024 10:32" },
  { label: "Voci", value: "12.348" },
  { label: "Parsing", value: "98,6%" },
] as const;

const anomalyRows = [
  { label: "23 anomalie da confermare", tone: "warning" as const },
  { label: "2 voci collegate a materiale sensibile", tone: "info" as const },
  { label: "7.832 voci in aumento vs 2024", tone: "danger" as const },
] as const;

export function TariffsScreen() {
  return (
    <main className="p-6 pb-8">
      <section className="rounded-[28px] border border-subtle bg-card p-6 shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Reference base</Badge>
              <span className="text-xs text-secondary">Import ufficiale validato</span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              Tariffario letto come base operativa, non come archivio.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              Codici, variazioni e anomalie vengono tenuti nello stesso piano per velocizzare
              verifica, collegamenti a voci di lavoro e confronto con la base dell'anno precedente.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {summaryRows.map((row) => (
                <MetricTile key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          </div>

          <section className="rounded-[24px] border border-subtle bg-muted/35 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Segnali tariffario
            </div>
            <div className="mt-4 space-y-3">
              {anomalyRows.map((row) => (
                <div
                  className="rounded-[20px] border border-subtle bg-card px-4 py-3"
                  key={row.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">{row.label}</div>
                    <Badge variant={row.tone}>{row.tone}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
        <section className="rounded-[28px] border border-subtle bg-card shadow-soft">
          <div className="border-b border-subtle px-5 py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {["Voci", "Diff. 2024", "Anomalie", "Log import"].map((tab, index) => (
                  <button
                    className={
                      index === 0
                        ? "rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-white"
                        : "rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-secondary"
                    }
                    key={tab}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline">
                  Tutte le categorie
                  <ChevronDown className="size-4" />
                </Button>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                  <input
                    className="h-10 w-[280px] rounded-[18px] border border-subtle bg-card pl-10 pr-3 text-sm text-foreground outline-none transition-all duration-base placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-ring"
                    placeholder="Cerca codice o descrizione"
                    type="search"
                  />
                </label>
                <Button size="sm" variant="outline">
                  <Filter className="size-4" />
                  Filtri
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="size-4" />
                  Esporta
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                <tr>
                  <th className="px-5 py-3">Codice</th>
                  <th className="px-5 py-3">Descrizione</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">UM</th>
                  <th className="px-5 py-3">Prezzo</th>
                  <th className="px-5 py-3">Var. 2024</th>
                  <th className="px-5 py-3">Stato</th>
                </tr>
              </thead>
              <tbody>
                {tariffRows.map((row) => (
                  <tr className="border-t border-subtle" key={row.code}>
                    <td className="px-5 py-4 font-semibold text-foreground">{row.code}</td>
                    <td className="px-5 py-4 text-foreground">{row.description}</td>
                    <td className="px-5 py-4 text-secondary">{row.category}</td>
                    <td className="px-5 py-4 text-foreground">{row.unit}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">{row.price}</td>
                    <td className="px-5 py-4">
                      <Badge variant="danger">{row.delta}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="success">Validata</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Voce selezionata</div>
            <div className="mt-4 rounded-[22px] border border-subtle bg-muted/35 p-4">
              <div className="flex items-center gap-2">
                <Badge variant="neutral">03.C01.C10.035</Badge>
                <Badge variant="success">Validata</Badge>
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">
                Fornitura e posa binario tipo 60E1
              </div>
              <dl className="mt-4 space-y-3">
                <SummaryLine label="Categoria" value="03 - Armamento" />
                <SummaryLine label="Prezzo unitario" value="€ 1.250,00 / m" />
                <SummaryLine label="Variazione" value="+5,3%" />
                <SummaryLine label="Utilizzo" value="Voci SAL e computi" />
              </dl>
            </div>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Azioni</div>
            <div className="mt-4 grid gap-2">
              <Button size="sm" variant="outline">
                Segnala anomalia
              </Button>
              <Button size="sm" variant="outline">
                Collega a voce lavoro
              </Button>
              <Button size="sm">Apri storico prezzi</Button>
            </div>
          </section>
        </div>
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
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
