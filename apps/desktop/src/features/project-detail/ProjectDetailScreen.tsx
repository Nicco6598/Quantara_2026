import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  MapPin,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ForecastCard } from "@/components/cards/ForecastCard";
import { KpiStatCard } from "@/components/cards/KpiStatCard";
import { MapCard } from "@/components/cards/MapCard";
import { TimelineCard } from "@/components/cards/TimelineCard";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/formatters";
import { siteWaypoints, timelineLanes } from "@/features/dashboard/demo-data";

const projectData = {
  name: "Linea AV/AC Milano-Verona",
  lot: "Lotto 3A",
  location: "Tratta Verona Est",
  progress: 68,
  status: "active" as const,
  health: "BUONO" as const,
  healthTone: "success" as const,
  budget: { contractual: 26150000, committed: 16245300, executed: 11420000 },
  cpi: "0,94",
  endDate: "12 Set 2025",
  forecastImpact: "-1,3M",
  startDate: "15 Gen 2024",
  sal: { current: 8, total: 12, amount: 2156800 },
  lastUpdate: "21 Mag 2024",
};

const projectTeam = [
  { name: "Marco Bianchi", role: "Project Manager", initials: "MB" },
  { name: "Laura Rossi", role: "Direzione Lavori", initials: "LR" },
  { name: "Giuseppe Verdi", role: "Responsabile Cantiere", initials: "GV" },
  { name: "Anna Bianchi", role: "Responsabile QA", initials: "AB" },
];

const recentActivities = [
  { id: 1, text: "SAL 8 approvata da D. Verdi", date: "20/05/2024" },
  { id: 2, text: "Aggiornamento progress - Armamento", date: "19/05/2024" },
  { id: 3, text: "Materiale 60E1 consegnato - Km 24", date: "18/05/2024" },
  { id: 4, text: "Richiesta OS #45 approvata", date: "17/05/2024" },
];

export function ProjectDetailScreen() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <main className="flex-1 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>Progetto</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-semibold text-[var(--text-primary)]">{projectData.name}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {projectData.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {projectData.lot} · {projectData.location}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge label={projectData.health} tone={projectData.healthTone} />
            <Button variant="outline">
              <MapPin className="h-4 w-4" />
              Mappa
            </Button>
            <Button>
              <BookOpen className="h-4 w-4" />
              Documenti
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-5 gap-3">
          <KpiStatCard
            detail="Budget contrattuale"
            icon={<Calculator className="h-5 w-5" />}
            label="Budget"
            value={formatMoney({ amount: projectData.budget.contractual, currency: "EUR" })}
          />
          <KpiStatCard
            detail="65,4% del budget"
            icon={<BookOpen className="h-5 w-5" />}
            label="Impegnato"
            value={formatMoney({ amount: projectData.budget.committed, currency: "EUR" })}
          />
          <KpiStatCard
            detail="43,7% del budget"
            icon={<TrendingUp className="h-5 w-5" />}
            label="Eseguito"
            value={formatMoney({ amount: projectData.budget.executed, currency: "EUR" })}
          />
          <KpiStatCard
            detail="8 SAL approvate"
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="SAL"
            value={`${projectData.sal.current} / ${projectData.sal.total}`}
          />
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5 flex flex-col items-center justify-center">
            <div className="relative size-20 -mt-2">
              <svg
                aria-label="Indicatore circolare del progresso del progetto"
                className="size-full -rotate-90"
                role="img"
                viewBox="0 0 36 36"
              >
                <title>Indicatore circolare del progresso del progetto</title>
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--success-base)"
                  strokeWidth="3"
                  strokeDasharray={`${projectData.progress}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[var(--text-primary)]">
                {projectData.progress}%
              </span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] -mt-1">Avanzamento</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1fr] gap-4">
          <TimelineCard lanes={timelineLanes} />
          <ForecastCard
            cpi={projectData.cpi}
            endDate={projectData.endDate}
            impact={projectData.forecastImpact}
          />
        </div>

        <div className="mt-4 grid grid-cols-[1.2fr_1fr_1fr] gap-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)]">Timeline Milestone</h3>
              <span className="text-xs text-[var(--text-secondary)]">Gantt</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "Fondazioni", date: "15 Mar 2024", status: "complete" as const },
                { label: "Armamento", date: "15 Giu 2024", status: "active" as const },
                { label: "Elettrificazione", date: "15 Ago 2024", status: "planned" as const },
                { label: "Collaudo", date: "12 Set 2024", status: "planned" as const },
              ].map((milestone) => (
                <div
                  key={`${milestone.label}-${milestone.date}`}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      milestone.status === "complete"
                        ? "bg-[var(--success-base)]"
                        : milestone.status === "active"
                          ? "bg-[var(--info-base)]"
                          : "bg-[var(--border-subtle)]"
                    }`}
                  />
                  <span className="flex-1 text-sm text-[var(--text-primary)]">
                    {milestone.label}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{milestone.date}</span>
                </div>
              ))}
            </div>
          </div>

          <MapCard waypoints={siteWaypoints} />

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
            <h3 className="font-semibold text-[var(--text-primary)]">Team progetto</h3>
            <div className="mt-4 space-y-3">
              {projectTeam.map((member) => (
                <div key={member.initials} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-white">
                    {member.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {member.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Attivita recenti</h3>
            <Button variant="ghost" size="sm">
              Vedi tutte
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 text-sm">
                <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="flex-1 text-[var(--text-primary)]">{activity.text}</span>
                <span className="text-xs text-[var(--text-secondary)]">{activity.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Dettaglio SAL</h3>
            <Button size="sm">Nuova SAL</Button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left text-xs text-[var(--text-secondary)]">
                <th className="pb-2 font-medium">SAL</th>
                <th className="pb-2 font-medium">Periodo</th>
                <th className="pb-2 font-medium">Importo</th>
                <th className="pb-2 font-medium">Stato</th>
                <th className="pb-2 font-medium">Approvata</th>
                <th className="pb-2 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-3 font-medium">SAL 8</td>
                <td>01 - 30 Apr 2024</td>
                <td className="font-medium">{formatMoney({ amount: 2156800, currency: "EUR" })}</td>
                <td>
                  <StatusBadge label="Approvata" tone="success" />
                </td>
                <td>20/05/2024</td>
                <td>
                  <Button variant="ghost" size="sm">
                    Visualizza
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-3 font-medium">SAL 7</td>
                <td>16 - 31 Mar 2024</td>
                <td className="font-medium">{formatMoney({ amount: 1785600, currency: "EUR" })}</td>
                <td>
                  <StatusBadge label="Approvata" tone="success" />
                </td>
                <td>15/04/2024</td>
                <td>
                  <Button variant="ghost" size="sm">
                    Visualizza
                  </Button>
                </td>
              </tr>
              <tr>
                <td className="py-3 font-medium">SAL 6</td>
                <td>01 - 15 Mar 2024</td>
                <td className="font-medium">{formatMoney({ amount: 1245000, currency: "EUR" })}</td>
                <td>
                  <StatusBadge label="Approvata" tone="success" />
                </td>
                <td>18/03/2024</td>
                <td>
                  <Button variant="ghost" size="sm">
                    Visualizza
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <aside className="w-72 border-l border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
        <h3 className="font-semibold text-[var(--text-primary)]">Quick info</h3>
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-xs text-[var(--text-secondary)]">Inizio</span>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {projectData.startDate}
            </p>
          </div>
          <div>
            <span className="text-xs text-[var(--text-secondary)]">Fine previsto</span>
            <p className="text-sm font-medium text-[var(--text-primary)]">{projectData.endDate}</p>
          </div>
          <div>
            <span className="text-xs text-[var(--text-secondary)]">Ultimo aggiornamento</span>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {projectData.lastUpdate}
            </p>
          </div>
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-secondary)]">CPI</span>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{projectData.cpi}</p>
            <p className="text-xs text-[var(--danger-base)]">
              <TrendingDown className="inline h-3 w-3" />
              Sotto budget
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
