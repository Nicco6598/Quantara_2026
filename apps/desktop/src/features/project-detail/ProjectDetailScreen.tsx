import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { listDesktopContracts } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import {
  mapContractToProject,
  portfolioProjects,
  type PortfolioProject,
} from "@/features/projects/ProjectsScreen";
import { formatDueWindow, formatForecastDelta } from "@/features/projects/utils/projects-helpers";

export function ProjectDetailScreen() {
  const [projects, setProjects] = useState<PortfolioProject[]>(portfolioProjects);

  useEffect(() => {
    let active = true;

    listDesktopContracts([]).then((contracts) => {
      if (!active) {
        return;
      }

      const runtimeProjects = contracts.data.map(mapContractToProject);
      setProjects(runtimeProjects.length > 0 ? runtimeProjects : portfolioProjects);
    });

    return () => {
      active = false;
    };
  }, []);

  const selectedProject = useMemo(() => {
    const storedProject = readSelectedProjectDetail();

    if (storedProject) {
      return projects.find((project) => project.id === storedProject.id) ?? storedProject;
    }

    return projects[0] ?? getFallbackProject();
  }, [projects]);

  const detail = useMemo(() => buildProjectDetail(selectedProject), [selectedProject]);
  const milestoneRows = useMemo(() => buildMilestoneRows(selectedProject), [selectedProject]);
  const projectTeam = useMemo(() => buildProjectTeam(selectedProject), [selectedProject]);
  const recentActivities = useMemo(() => buildRecentActivities(selectedProject), [selectedProject]);
  const salRows = useMemo(() => buildSalRows(selectedProject), [selectedProject]);

  return (
    <div className="pt-2">
      {/* Hero - outside cards, like dashboard */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-[9px] bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--info-base)]">
            Dettaglio progetto
          </span>
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            Portfolio · Progetti · {detail.name}
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <div className="text-[18px] font-medium leading-none text-[var(--accent-primary)]">
              {detail.lot} · {detail.location}
            </div>
            <h2 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--text-primary)]">
              {detail.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-[9px] px-2.5 py-1 text-[11px] font-semibold",
                  detail.healthTone === "danger"
                    ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                    : detail.healthTone === "warning"
                      ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                      : "bg-[var(--success-soft)] text-[var(--success-base)]",
                )}
              >
                {detail.health}
              </span>
              <span className="rounded-[9px] bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--info-base)]">
                {String(detail.sal.current)}
              </span>
              <span className="rounded-[9px] bg-[var(--bg-muted-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                Ultimo aggiornamento {detail.lastUpdate}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]"
              type="button"
            >
              <MapPin className="size-4" />
              Mappa
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-[13px] font-semibold text-[var(--text-inverse)] transition-all hover:bg-[var(--accent-primary-hover)] active:scale-[0.98]"
              type="button"
            >
              <BookOpen className="size-4" />
              Documenti
            </button>
          </div>
        </div>
      </section>

      {/* Metrics - outside cards, like dashboard */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        {[
          {
            detail: "Budget contrattuale",
            label: "Budget",
            value: formatMoney({ amount: detail.budget.contractual, currency: "EUR" }),
          },
          {
            detail: "Valore impegnato sul contratto",
            label: "Impegnato",
            value: formatMoney({ amount: detail.budget.committed, currency: "EUR" }),
          },
          {
            detail: "Ultima SAL approvata",
            label: "SAL corrente",
            value: formatMoney({ amount: detail.sal.amount, currency: "EUR" }),
          },
          {
            detail: "Avanzamento fisico del lotto",
            label: "Progresso",
            value: `${detail.progress}%`,
          },
        ].map((metric) => (
          <section
            className="group min-h-[130px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]"
            key={metric.label}
          >
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {metric.label}
              </div>
              <div className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                {metric.value}
              </div>
              <div className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                {metric.detail}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="space-y-6">
          {/* Milestone */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-4 text-[var(--info-base)]" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Milestone operative
              </h3>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {milestoneRows.map((row) => (
                <div
                  className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4"
                  key={row.label}
                >
                  <div
                    className={cn(
                      "inline-flex rounded-[9px] px-2.5 py-1 text-[11px] font-semibold",
                      row.status === "complete"
                        ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                        : row.status === "active"
                          ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                          : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
                    )}
                  >
                    {row.status === "complete"
                      ? "chiusa"
                      : row.status === "active"
                        ? "in corso"
                        : "pianificata"}
                  </div>
                  <div className="mt-3 text-[14px] font-medium text-[var(--text-primary)]">
                    {row.label}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                    {row.date}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Economico */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center gap-3">
              <TrendingUp className="size-4 text-[var(--info-base)]" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Economico ed esecuzione
              </h3>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Quadro economico
                </div>
                <dl className="mt-4 space-y-3">
                  <SummaryRow
                    label="Budget contrattuale"
                    value={formatMoney({ amount: detail.budget.contractual, currency: "EUR" })}
                  />
                  <SummaryRow
                    label="Impegnato"
                    value={formatMoney({ amount: detail.budget.committed, currency: "EUR" })}
                  />
                  <SummaryRow
                    label="Eseguito"
                    value={formatMoney({ amount: detail.budget.executed, currency: "EUR" })}
                  />
                </dl>
              </div>

              <div className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Forecast
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Fine prevista
                    </div>
                    <div className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
                      {detail.endDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Impatto
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[16px] font-semibold text-[var(--danger-base)]">
                      <TrendingDown className="size-4" />
                      {detail.forecastImpact}
                    </div>
                  </div>
                </div>
                <div className="mt-5 border-t border-[var(--border-subtle)]/80 pt-4">
                  <div className="text-[12px] font-medium text-[var(--text-secondary)]">CPI</div>
                  <div className="mt-1 text-[20px] font-semibold text-[var(--text-primary)]">
                    {detail.cpi}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-[var(--danger-base)]">
                    Sotto budget rispetto al piano
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Registro SAL */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-[var(--success-base)]" />
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  Registro SAL
                </h3>
              </div>
              <button
                className="flex h-9 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-[13px] font-semibold text-[var(--text-inverse)] transition-all hover:bg-[var(--accent-primary-hover)] active:scale-[0.98]"
                type="button"
              >
                Nuova SAL
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-[16px] border border-[var(--border-subtle)]/80">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-[var(--bg-muted)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
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
                    <tr className="border-t border-[var(--border-subtle)]/80" key={row.sal}>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {row.sal}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{row.period}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {formatMoney({ amount: row.amount, currency: "EUR" })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-[9px] px-2.5 py-1 text-[11px] font-semibold",
                            row.tone === "danger"
                              ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                              : row.tone === "warning"
                                ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                                : "bg-[var(--success-soft)] text-[var(--success-base)]",
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Presidio rapido */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center gap-3">
              <Clock3 className="size-4 text-[var(--info-base)]" />
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Presidio rapido
              </h3>
            </div>
            <dl className="mt-5 space-y-3">
              <SummaryRow label="Inizio" value={detail.startDate} />
              <SummaryRow label="Fine prevista" value={detail.endDate} />
              <SummaryRow label="Ultimo aggiornamento" value={detail.lastUpdate} />
              <SummaryRow label="SAL" value={String(detail.sal.current)} />
              <SummaryRow label="Responsabile" value={detail.manager} />
              <SummaryRow label="Prossima milestone" value={detail.nextMilestone} />
              <SummaryRow label="Rischio materiale" value={detail.materialRisk} />
            </dl>
          </section>

          {/* Team progetto */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Team progetto</h3>
            <div className="mt-4 space-y-3">
              {projectTeam.map((member) => (
                <div
                  className="flex items-center gap-3 rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-4 py-3"
                  key={member.initials}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[12px] font-bold text-[var(--text-inverse)]">
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                      {member.name}
                    </div>
                    <div className="truncate text-[12px] font-medium text-[var(--text-secondary)]">
                      {member.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Attivita recenti */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
              Attivita recenti
            </h3>
            <div className="mt-4 space-y-3">
              {recentActivities.map((activity) => (
                <div
                  className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-4 py-3"
                  key={activity.text}
                >
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {activity.text}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                    {activity.date}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function readSelectedProjectDetail(): PortfolioProject | null {
  try {
    const rawValue = window.sessionStorage.getItem("quantara.selectedProjectDetail.v1");

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as PortfolioProject;
  } catch {
    return null;
  }
}

function getFallbackProject(): PortfolioProject {
  const fallbackProject = portfolioProjects[0];

  if (!fallbackProject) {
    throw new Error("Portfolio demo non configurato.");
  }

  return fallbackProject;
}

function buildProjectDetail(project: PortfolioProject) {
  const contractual = project.budget.amount;
  const executed = Math.round(contractual * (project.progress / 100));
  const committed = Math.max(
    executed,
    Math.round(contractual * Math.min(0.92, project.progress / 100 + 0.18)),
  );
  const costPerformance = committed > 0 ? executed / committed : 1;

  return {
    budget: {
      committed,
      contractual,
      executed,
    },
    cpi: costPerformance.toLocaleString("it-IT", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }),
    endDate:
      project.forecastDeltaDays === 0
        ? "In linea con piano"
        : `${formatForecastDelta(project.forecastDeltaDays)} forecast`,
    forecastImpact: project.variance,
    health: project.healthLabel,
    healthTone: project.tone,
    lastUpdate: "Aggiornato da registro progetti",
    location: project.location,
    lot: project.lot,
    manager: project.manager,
    materialRisk: project.materialRisk,
    name: project.title,
    nextMilestone: project.nextMilestone,
    progress: project.progress,
    sal: {
      amount: project.salValue.amount,
      current: project.salState,
    },
    startDate: "Dossier operativo",
  };
}

function buildMilestoneRows(project: PortfolioProject) {
  const completed = Math.max(1, Math.min(3, Math.floor(project.progress / 30)));
  const labels = ["Avvio lotto", project.phase, project.nextMilestone, "Chiusura contabilita"];

  return labels.map((label, index) => ({
    date:
      index === 0
        ? "Completata"
        : index === completed
          ? formatDueWindow(project.salDays)
          : formatForecastDelta(project.forecastDeltaDays),
    label,
    status: index < completed ? "complete" : index === completed ? "active" : "planned",
  }));
}

function buildProjectTeam(project: PortfolioProject) {
  return [
    { initials: getInitials(project.manager), name: project.manager, role: "Project Manager" },
    { initials: "DL", name: "Direzione Lavori", role: "Validazione SAL" },
    { initials: "CC", name: "Controllo Costi", role: "Forecast e budget" },
    { initials: "PR", name: "Procurement", role: project.materialRisk },
  ];
}

function buildRecentActivities(project: PortfolioProject) {
  return [
    { date: "Oggi", text: `${project.salState} su ${project.title}` },
    { date: formatDueWindow(project.salDays), text: project.nextMilestone },
    { date: "Ultimo aggiornamento", text: project.materialRisk },
    { date: "Registro", text: `Avanzamento fisico al ${project.progress}%` },
  ];
}

function buildSalRows(project: PortfolioProject) {
  const currentAmount = project.salValue.amount;
  const previousAmount = Math.round(currentAmount * 0.82);
  const historicalAmount = Math.round(currentAmount * 0.58);

  return [
    {
      amount: currentAmount,
      date: formatDueWindow(project.salDays),
      period: "Periodo corrente",
      sal: project.salState,
      status:
        project.tone === "danger"
          ? "Bloccata"
          : project.tone === "warning"
            ? "Da chiudere"
            : "In linea",
      tone: project.tone,
    },
    {
      amount: previousAmount,
      date: "Ciclo precedente",
      period: "Periodo precedente",
      sal: "SAL precedente",
      status: "Approvata",
      tone: "success" as const,
    },
    {
      amount: historicalAmount,
      date: "Storico",
      period: "Progressivo lotto",
      sal: "Progressivo",
      status: "Consolidata",
      tone: "success" as const,
    },
  ];
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
