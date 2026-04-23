import { CalendarDays, Download, Filter, Search } from "lucide-react";
import { eur } from "@quantara/domain-utils";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/formatters";

const salRows = [
  {
    amount: eur(2156800),
    cumulative: eur(10842150),
    deadline: "07 Mag 2024",
    dossier: "Firma DL oggi",
    period: "01 Apr 2024 - 30 Apr 2024",
    progress: "43,6%",
    project: "Linea AV/AC Milano-Verona",
    sal: "SAL 8",
    status: "Approvata",
    tone: "success",
  },
  {
    amount: eur(1985600),
    cumulative: eur(7442600),
    deadline: "14 Mag 2024",
    dossier: "Check documentale",
    period: "01 Apr 2024 - 30 Apr 2024",
    progress: "68,0%",
    project: "Nodo di Firenze AV",
    sal: "SAL 6",
    status: "In approvazione",
    tone: "warning",
  },
  {
    amount: eur(2890300),
    cumulative: eur(12580400),
    deadline: "20 Mag 2024",
    dossier: "Extra-costi da riallineare",
    period: "01 Apr 2024 - 30 Apr 2024",
    progress: "72,0%",
    project: "Linea AV Napoli-Bari",
    sal: "SAL 7",
    status: "In revisione",
    tone: "danger",
  },
  {
    amount: eur(842200),
    cumulative: eur(2685400),
    deadline: "28 Mag 2024",
    dossier: "Bozza da completare",
    period: "01 Apr 2024 - 30 Apr 2024",
    progress: "25,0%",
    project: "Linea AV Genova-Ventimiglia",
    sal: "SAL 3",
    status: "Bozza",
    tone: "info",
  },
] as const;

const tabs = [
  { label: "Tutte", value: "12" },
  { label: "Bozze", value: "2" },
  { label: "Revisione", value: "3" },
  { label: "Approvate", value: "7" },
] as const;

const dueRows = [
  { deadline: "Oggi", label: "Firma DL · SAL 8 Milano-Verona", tone: "warning" },
  { deadline: "24 ore", label: "Chiusura dossier · SAL 7 Napoli-Bari", tone: "danger" },
  { deadline: "48 ore", label: "Conferma allegati · SAL 6 Firenze", tone: "warning" },
] as const;

export function SalScreen() {
  return (
    <main className="p-6 pb-8">
      <section className="rounded-[28px] border border-subtle bg-card p-6 shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Finestra approvativa</Badge>
              <span className="text-xs text-secondary">Ultimo sync documentale 17:35</span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              Stati avanzamento lavori sotto presidio operativo.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              Vista compatta su emissioni, cumulati, scadenze corte e criticita documentali. La
              priorita qui e capire quali pratiche possono essere chiuse oggi e quali rischiano di
              slittare.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="SAL totale emesse" note="Da inizio progetto" value="€ 8,09M" />
              <MetricTile label="Approvate" note="Ultimi 30 giorni" tone="success" value="7 / 12" />
              <MetricTile
                label="Da revisionare"
                note="Richiedono azione"
                tone="warning"
                value="3"
              />
              <MetricTile
                label="Emissioni previste"
                note="Prossimi 14 giorni"
                tone="info"
                value="5"
              />
            </div>
          </div>

          <section className="rounded-[24px] border border-subtle bg-muted/35 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Coda 72 ore
            </div>
            <div className="mt-4 space-y-3">
              {dueRows.map((row) => (
                <div
                  className="rounded-[20px] border border-subtle bg-card px-4 py-3"
                  key={row.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">{row.label}</div>
                    <Badge variant={row.tone}>{row.deadline}</Badge>
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
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab, index) => (
                <button
                  className={
                    index === 0
                      ? "rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-white"
                      : "rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-secondary"
                  }
                  key={tab.label}
                  type="button"
                >
                  {tab.label} · {tab.value}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                  <input
                    className="h-10 w-[260px] rounded-[18px] border border-subtle bg-card pl-10 pr-3 text-sm text-foreground outline-none transition-all duration-base placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-ring"
                    placeholder="Cerca SAL o progetto"
                    type="search"
                  />
                </label>
                <Button size="sm" variant="outline">
                  <Filter className="size-4" />
                  Filtri
                </Button>
                <Button size="sm" variant="outline">
                  <CalendarDays className="size-4" />
                  Periodo
                </Button>
              </div>

              <Button size="sm" variant="outline">
                <Download className="size-4" />
                Esporta
              </Button>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                <tr>
                  <th className="px-5 py-3">SAL</th>
                  <th className="px-5 py-3">Progetto</th>
                  <th className="px-5 py-3">Periodo</th>
                  <th className="px-5 py-3">Importo</th>
                  <th className="px-5 py-3">Cumulato</th>
                  <th className="px-5 py-3">Dossier</th>
                  <th className="px-5 py-3">Stato</th>
                </tr>
              </thead>
              <tbody>
                {salRows.map((row) => (
                  <tr className="border-t border-subtle" key={row.sal}>
                    <td className="px-5 py-4 font-semibold text-foreground">{row.sal}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{row.project}</div>
                      <div className="mt-1 text-xs text-secondary">Avanzamento {row.progress}</div>
                    </td>
                    <td className="px-5 py-4 text-secondary">{row.period}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="px-5 py-4 text-foreground">{formatMoney(row.cumulative)}</td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-foreground">{row.dossier}</div>
                      <div className="mt-1 text-xs text-secondary">Scadenza {row.deadline}</div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge label={row.status} tone={row.tone as StatusTone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Panoramica pratica</div>
            <dl className="mt-5 space-y-3">
              <SummaryLine label="Totali" value="12" />
              <SummaryLine label="Approvate" value="7" />
              <SummaryLine label="In revisione" value="3" />
              <SummaryLine label="Bozze" value="2" />
            </dl>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Scadenze ravvicinate</div>
            <div className="mt-4 space-y-3">
              {salRows.slice(0, 3).map((row) => (
                <div
                  className="rounded-[20px] border border-subtle bg-muted/35 px-4 py-3"
                  key={row.sal}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">{row.sal}</div>
                    <Badge variant={row.tone}>{row.status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-secondary">{row.project}</div>
                  <div className="mt-2 text-xs font-medium text-foreground">{row.deadline}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricTile({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note: string;
  tone?: "info" | "success" | "warning";
  value: string;
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "info"
          ? "text-info"
          : "text-foreground";

  return (
    <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-2 text-xs leading-5 text-secondary">{note}</div>
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
