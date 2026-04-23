import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/formatters";

const projectData = {
  budget: { contractual: 26150000, committed: 16245300, executed: 11420000 },
  cpi: "0,94",
  endDate: "12 Set 2025",
  forecastImpact: "-1,3M",
  health: "BUONO" as const,
  healthTone: "success" as const,
  lastUpdate: "21 Mag 2024",
  location: "Tratta Verona Est",
  lot: "Lotto 3A",
  name: "Linea AV/AC Milano-Verona",
  progress: 68,
  sal: { amount: 2156800, current: 8, total: 12 },
  startDate: "15 Gen 2024",
};

const milestoneRows = [
  { date: "15 Mar 2024", label: "Fondazioni", status: "complete" as const },
  { date: "15 Giu 2024", label: "Armamento", status: "active" as const },
  { date: "15 Ago 2024", label: "Elettrificazione", status: "planned" as const },
  { date: "12 Set 2024", label: "Collaudo", status: "planned" as const },
] as const;

const projectTeam = [
  { initials: "MB", name: "Marco Bianchi", role: "Project Manager" },
  { initials: "LR", name: "Laura Rossi", role: "Direzione Lavori" },
  { initials: "GV", name: "Giuseppe Verdi", role: "Responsabile Cantiere" },
  { initials: "AB", name: "Anna Bianchi", role: "Responsabile QA" },
] as const;

const recentActivities = [
  { date: "20/05/2024", text: "SAL 8 approvata da D. Verdi" },
  { date: "19/05/2024", text: "Aggiornamento progress armamento" },
  { date: "18/05/2024", text: "Materiale 60E1 consegnato al km 24" },
  { date: "17/05/2024", text: "Richiesta OS #45 approvata" },
] as const;

const salRows = [
  {
    amount: 2156800,
    date: "20/05/2024",
    period: "01 - 30 Apr 2024",
    sal: "SAL 8",
    status: "Approvata",
  },
  {
    amount: 1785600,
    date: "15/04/2024",
    period: "16 - 31 Mar 2024",
    sal: "SAL 7",
    status: "Approvata",
  },
  {
    amount: 1245000,
    date: "18/03/2024",
    period: "01 - 15 Mar 2024",
    sal: "SAL 6",
    status: "Approvata",
  },
] as const;

export function ProjectDetailScreen() {
  return (
    <main className="p-6 pb-8">
      <section className="rounded-[28px] border border-subtle bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span>Portfolio</span>
              <ChevronRight className="size-3.5" />
              <span>Progetti</span>
              <ChevronRight className="size-3.5" />
              <span className="font-semibold text-foreground">{projectData.name}</span>
            </div>

            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-foreground">
              {projectData.name}
            </h2>
            <p className="mt-2 text-sm text-secondary">
              {projectData.lot} · {projectData.location}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={projectData.health} tone={projectData.healthTone} />
              <Badge variant="info">
                SAL {projectData.sal.current} / {projectData.sal.total}
              </Badge>
              <Badge variant="neutral">Ultimo aggiornamento {projectData.lastUpdate}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <MapPin className="size-4" />
              Mappa
            </Button>
            <Button size="sm">
              <BookOpen className="size-4" />
              Documenti
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            detail="Budget contrattuale"
            label="Budget"
            value={formatMoney({ amount: projectData.budget.contractual, currency: "EUR" })}
          />
          <MetricTile
            detail="Valore impegnato sul contratto"
            label="Impegnato"
            value={formatMoney({ amount: projectData.budget.committed, currency: "EUR" })}
          />
          <MetricTile
            detail="Ultima SAL approvata"
            label="SAL corrente"
            value={formatMoney({ amount: projectData.sal.amount, currency: "EUR" })}
          />
          <MetricTile
            detail="Avanzamento fisico del lotto"
            label="Progresso"
            value={`${projectData.progress}%`}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Milestone operative</h3>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {milestoneRows.map((row) => (
                <div
                  className="rounded-[22px] border border-subtle bg-muted/35 p-4"
                  key={row.label}
                >
                  <div
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      row.status === "complete"
                        ? "bg-success-soft text-success"
                        : row.status === "active"
                          ? "bg-info-soft text-info"
                          : "bg-muted text-secondary"
                    }`}
                  >
                    {row.status === "complete"
                      ? "chiusa"
                      : row.status === "active"
                        ? "in corso"
                        : "pianificata"}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{row.label}</div>
                  <div className="mt-1 text-xs text-secondary">{row.date}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Economico ed esecuzione</h3>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                  Quadro economico
                </div>
                <dl className="mt-4 space-y-3">
                  <SummaryLine
                    label="Budget contrattuale"
                    value={formatMoney({ amount: projectData.budget.contractual, currency: "EUR" })}
                  />
                  <SummaryLine
                    label="Impegnato"
                    value={formatMoney({ amount: projectData.budget.committed, currency: "EUR" })}
                  />
                  <SummaryLine
                    label="Eseguito"
                    value={formatMoney({ amount: projectData.budget.executed, currency: "EUR" })}
                  />
                </dl>
              </div>

              <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                  Forecast
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs text-secondary">Fine prevista</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {projectData.endDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-secondary">Impatto</div>
                    <div className="mt-1 flex items-center gap-1 text-lg font-semibold text-danger">
                      <TrendingDown className="size-4" />
                      {projectData.forecastImpact}
                    </div>
                  </div>
                </div>
                <div className="mt-5 border-t border-subtle pt-4">
                  <div className="text-xs text-secondary">CPI</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {projectData.cpi}
                  </div>
                  <div className="mt-1 text-xs text-danger">Sotto budget rispetto al piano</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                <h3 className="text-base font-semibold text-foreground">Registro SAL</h3>
              </div>
              <Button size="sm">Nuova SAL</Button>
            </div>

            <div className="mt-5 overflow-hidden rounded-[22px] border border-subtle">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                  <tr>
                    <th className="px-4 py-3">SAL</th>
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3">Importo</th>
                    <th className="px-4 py-3">Stato</th>
                    <th className="px-4 py-3">Approvata</th>
                  </tr>
                </thead>
                <tbody>
                  {salRows.map((row) => (
                    <tr className="border-t border-subtle" key={row.sal}>
                      <td className="px-4 py-3 font-semibold text-foreground">{row.sal}</td>
                      <td className="px-4 py-3 text-secondary">{row.period}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatMoney({ amount: row.amount, currency: "EUR" })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={row.status} tone="success" />
                      </td>
                      <td className="px-4 py-3 text-secondary">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Presidio rapido</h3>
            </div>
            <dl className="mt-5 space-y-3">
              <SummaryLine label="Inizio" value={projectData.startDate} />
              <SummaryLine label="Fine prevista" value={projectData.endDate} />
              <SummaryLine label="Ultimo aggiornamento" value={projectData.lastUpdate} />
              <SummaryLine
                label="SAL emesse"
                value={`${projectData.sal.current} / ${projectData.sal.total}`}
              />
            </dl>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Team progetto</div>
            <div className="mt-4 space-y-3">
              {projectTeam.map((member) => (
                <div
                  className="flex items-center gap-3 rounded-[20px] border border-subtle bg-muted/35 px-4 py-3"
                  key={member.initials}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-xs font-bold text-white">
                    {member.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{member.name}</div>
                    <div className="text-xs text-secondary">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
            <div className="text-base font-semibold text-foreground">Attivita recenti</div>
            <div className="mt-4 space-y-3">
              {recentActivities.map((activity) => (
                <div
                  className="rounded-[20px] border border-subtle bg-muted/35 px-4 py-3"
                  key={activity.text}
                >
                  <div className="text-sm font-medium text-foreground">{activity.text}</div>
                  <div className="mt-1 text-xs text-secondary">{activity.date}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-2 text-xs leading-5 text-secondary">{detail}</div>
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
