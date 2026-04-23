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
    delta: "+12,4%",
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
    delta: "+6,8%",
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
    delta: "+24,9%",
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
    delta: "+3,1%",
    period: "01 Apr 2024 - 30 Apr 2024",
    progress: "25,0%",
    project: "Linea AV Genova-Ventimiglia",
    sal: "SAL 3",
    status: "Bozza",
    tone: "info",
  },
] as const;

const tabs = ["Tutte le SAL", "Bozze", "In revisione", "Approvate", "Emesse"];

export function SalScreen() {
  return (
    <main className="p-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricBox label="SAL totale emesse" note="Da inizio progetto" value="€ 8.085.400" />
        <MetricBox label="SAL approvate" note="Ultimi 30 giorni" value="7 / 12" />
        <MetricBox label="Da revisionare" note="Richiedono azione" tone="warning" value="3" />
        <MetricBox label="Emissioni previste" note="Prossimi 14 giorni" tone="info" value="5" />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_330px] gap-4">
        <section className="rounded-md border border-subtle bg-card shadow-soft">
          <div className="flex gap-7 border-b border-subtle px-4">
            {tabs.map((tab, index) => (
              <button
                className={
                  index === 0
                    ? "border-b-2 border-primary py-4 text-sm font-semibold text-primary"
                    : "py-4 text-sm font-semibold text-secondary"
                }
                key={tab}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-[280px] items-center gap-2 rounded-md border border-subtle bg-surface px-3 text-sm text-secondary">
                <Search className="size-4" />
                Cerca SAL o progetto...
              </div>
              <Button variant="outline">
                <Filter data-icon="inline-start" />
                Filtri
              </Button>
              <Button variant="outline">
                <CalendarDays data-icon="inline-start" />
                Periodo
              </Button>
            </div>
            <Button variant="outline">
              <Download data-icon="inline-start" />
              Esporta
            </Button>
          </div>

          <SalTable />
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
            <h3 className="text-base font-semibold text-foreground">Panoramica SAL</h3>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <SideMetric label="Totali" value="12" />
              <SideMetric label="Approvate" value="7" variant="success" />
              <SideMetric label="In revisione" value="3" variant="warning" />
              <SideMetric label="Bozze" value="2" variant="info" />
            </dl>
          </section>

          <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Scadenze SAL</h3>
              <button className="text-xs font-semibold text-primary" type="button">
                Vedi calendario
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {salRows.slice(0, 3).map((row) => (
                <div className="rounded-md bg-muted p-3" key={row.sal}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-foreground">{row.sal}</div>
                    <Badge variant={row.tone}>{row.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-secondary">{row.project}</div>
                  <div className="mt-2 text-xs font-semibold text-primary">{row.deadline}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

type MetricBoxProps = {
  label: string;
  note: string;
  tone?: "info" | "warning";
  value: string;
};

function MetricBox({ label, note, tone, value }: MetricBoxProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <p className="text-sm font-medium text-secondary">{label}</p>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <p
        className={tone === "warning" ? "mt-2 text-sm text-primary" : "mt-2 text-sm text-secondary"}
      >
        {note}
      </p>
    </section>
  );
}

function SalTable() {
  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-[11px] font-semibold uppercase text-secondary">
          <tr>
            <th className="px-4 py-3">SAL</th>
            <th className="px-4 py-3">Progetto</th>
            <th className="px-4 py-3">Periodo</th>
            <th className="px-4 py-3">Importo</th>
            <th className="px-4 py-3">Cumulato</th>
            <th className="px-4 py-3">Avanzamento</th>
            <th className="px-4 py-3">Scadenza</th>
            <th className="px-4 py-3">Stato</th>
          </tr>
        </thead>
        <tbody>
          {salRows.map((row) => (
            <tr className="border-t border-subtle hover:bg-table-row-hover" key={row.sal}>
              <td className="px-4 py-3 font-semibold text-foreground">{row.sal}</td>
              <td className="px-4 py-3 text-foreground">{row.project}</td>
              <td className="px-4 py-3 text-secondary">{row.period}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{formatMoney(row.amount)}</td>
              <td className="px-4 py-3 text-foreground">{formatMoney(row.cumulative)}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{row.progress}</div>
                <div className="text-xs font-semibold text-success">{row.delta}</div>
              </td>
              <td className="px-4 py-3 text-secondary">{row.deadline}</td>
              <td className="px-4 py-3">
                <StatusBadge label={row.status} tone={row.tone as StatusTone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-subtle px-4 py-3 text-sm text-secondary">
        <span>Mostra 10 per pagina</span>
        <span>1-4 di 12</span>
      </div>
    </div>
  );
}

type SideMetricProps = {
  label: string;
  value: string;
  variant?: StatusTone;
};

function SideMetric({ label, value, variant }: SideMetricProps) {
  const color =
    variant === "success"
      ? "text-success"
      : variant === "warning"
        ? "text-warning"
        : variant === "info"
          ? "text-info"
          : "text-foreground";

  return (
    <div>
      <dt className="text-xs text-secondary">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold ${color}`}>{value}</dd>
    </div>
  );
}
