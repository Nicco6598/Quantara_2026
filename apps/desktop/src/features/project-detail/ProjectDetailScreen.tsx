import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers3,
  Plus,
  Radio,
  ReceiptText,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  mapContractToProject,
  type PortfolioProject,
  portfolioProjects,
} from "@/features/projects/ProjectsScreen";
import { formatDueWindow, formatForecastDelta } from "@/features/projects/utils/projects-helpers";
import { listDesktopContracts } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  const kpiCards = [
    {
      caption: "Budget totale del contratto",
      icon: WalletCards,
      label: "Budget contrattuale",
      tone: "blue",
      value: formatMoney({ amount: detail.budget.contractual, currency: "EUR" }),
    },
    {
      caption: "Valore impegnato sul contratto",
      icon: Layers3,
      label: "Impegnato",
      tone: "green",
      value: formatMoney({ amount: detail.budget.committed, currency: "EUR" }),
    },
    {
      caption: "Ultima SAL approvata",
      icon: Clock3,
      label: "SAL corrente",
      tone: "orange",
      value: formatMoney({ amount: detail.sal.amount, currency: "EUR" }),
    },
    {
      caption: "Avanzamento fisico del lotto",
      icon: TrendingUp,
      label: "Progresso",
      tone: "violet",
      value: `${detail.progress}%`,
    },
  ] as const;

  return (
    <div className="pt-4 text-[var(--text-primary)]">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
        <span>Portfolio</span>
        <ChevronRight className="size-3.5" />
        <span>Progetti</span>
        <ChevronRight className="size-3.5" />
        <span className="font-bold text-[var(--text-primary)]">{detail.name}</span>
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 py-5 shadow-sm md:px-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)] md:size-16 lg:size-[76px]">
                  <BarChart3 className="size-6 md:size-8" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-[24px] font-bold leading-none tracking-[-0.02em] text-[var(--text-primary)] md:text-[28px] lg:text-[34px]">
                    {detail.name}
                  </h2>
                  <p className="mt-1 truncate text-[14px] font-medium text-[var(--text-secondary)] md:mt-2 md:text-[15px]">
                    {detail.lot} - {detail.location}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill tone={detail.healthTone}>{detail.health}</StatusPill>
                    <StatusPill tone="info">{String(detail.sal.current)}</StatusPill>
                  </div>
                </div>
              </div>
              <div className="grid shrink-0 gap-3 text-left md:w-[220px] md:text-right">
                <MetaLine label="Ultimo aggiornamento" value="27 Apr 2025 · 17:40" />
                <MetaLine label="Responsabile" value={detail.manager} icon={UserRound} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm md:p-5">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Milestone operative
            </h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              {milestoneRows.map((row, index) => (
                <MilestoneItem
                  isLast={index === milestoneRows.length - 1}
                  key={row.label}
                  row={row}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm md:p-5">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Economico ed esecuzione
            </h3>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[14px] border border-[var(--border-subtle)] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Quadro economico
                </div>
                <dl className="mt-3 divide-y divide-[var(--border-subtle)]">
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

              <div className="grid rounded-[14px] border border-[var(--border-subtle)] p-4 md:grid-cols-2">
                <div className="border-b border-[var(--border-subtle)] pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                    Forecast
                  </div>
                  <InfoBlock label="Fine prevista" value={detail.endDate} />
                  <InfoBlock label="CPI" value={detail.cpi} note="Sotto budget rispetto al piano" />
                </div>
                <div className="pt-4 md:pl-4 md:pt-0">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                    <span>Impatto</span>
                    <span className="text-[14px] tracking-normal text-[var(--danger-base)]">
                      {detail.forecastImpact}
                    </span>
                  </div>
                  <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                    <InfoBlock label="Rischio materiale" value={detail.materialRisk} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                Registro SAL
              </h3>
              <button
                className="flex h-9 items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-3 text-[13px] font-bold text-[var(--text-inverse)] shadow-sm transition-all hover:bg-[var(--accent-primary-hover)]"
                type="button"
              >
                <Plus className="size-4" />
                Nuova SAL
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                <thead className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  <tr className="border-y border-[var(--border-subtle)]">
                    <th className="px-3 py-3">SAL</th>
                    <th className="px-3 py-3">Periodo</th>
                    <th className="px-3 py-3">Importo</th>
                    <th className="px-3 py-3">Stato</th>
                    <th className="px-3 py-3">Approvata</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {salRows.map((row, index) => (
                    <tr
                      className={cn(
                        "border-b border-[var(--border-subtle)]",
                        index === 0 &&
                          "rounded-lg bg-[var(--info-soft)] outline outline-1 outline-[var(--info-base)]/40",
                      )}
                      key={row.sal}
                    >
                      <td className="px-3 py-3 font-bold text-[var(--text-primary)]">{row.sal}</td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{row.period}</td>
                      <td className="px-3 py-3 font-bold text-[var(--text-primary)]">
                        {formatMoney({ amount: row.amount, currency: "EUR" })}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={row.tone}>{row.status}</StatusPill>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{row.date}</td>
                      <td className="px-3 py-3 text-right text-[var(--info-base)]">
                        <ChevronRight className="ml-auto size-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
            <PanelTitle icon={Radio}>Presidio rapido</PanelTitle>
            <dl className="mt-3 divide-y divide-[var(--border-subtle)]">
              <SummaryRow label="Inizio" value={detail.startDate} />
              <SummaryRow label="Fine prevista" value={detail.endDate} />
              <SummaryRow label="Ultimo aggiornamento" value={detail.lastUpdate} />
              <SummaryRow label="SAL" value={String(detail.sal.current)} />
              <SummaryRow label="Responsabile" value={detail.manager} />
              <SummaryRow label="Prossima milestone" value={detail.nextMilestone} />
              <SummaryRow label="Rischio materiale" value={detail.materialRisk} />
            </dl>
          </section>

          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
            <PanelTitle icon={UsersRound}>Team progetto</PanelTitle>
            <div className="mt-3 space-y-2.5">
              {projectTeam.map((member) => (
                <div
                  className="flex items-center gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2.5 shadow-sm"
                  key={member.initials}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[12px] font-bold text-[var(--text-inverse)]">
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
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

          <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
            <PanelTitle icon={Activity}>Attivita recenti</PanelTitle>
            <div className="mt-3 space-y-3">
              {recentActivities.slice(0, 1).map((activity) => (
                <div
                  className="flex items-start gap-3 rounded-[12px] border border-[var(--border-subtle)] px-3 py-3 shadow-sm"
                  key={activity.text}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                    <ReceiptText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                      {activity.text}
                    </div>
                    <div className="mt-0.5 text-[12px] font-medium text-[var(--text-secondary)]">
                      Operazione in attesa
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[12px] font-medium text-[var(--text-secondary)]">
                    Oggi
                    <br />
                    17:40
                  </div>
                </div>
              ))}
              <button
                className="flex w-full items-center justify-between pt-1 text-[12px] font-bold text-[var(--info-base)]"
                type="button"
              >
                Vedi tutte le attivita
                <ChevronRight className="size-4" />
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="max-w-[58%] text-right text-[13px] font-bold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: string;
  tone: "danger" | "info" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-[11px] font-bold",
        tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "info" && "bg-[var(--info-soft)] text-[var(--info-base)]",
      )}
    >
      {children}
    </span>
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
  icon: typeof WalletCards;
  label: string;
  tone: "blue" | "green" | "orange" | "violet";
  value: string;
}) {
  return (
    <section className="flex min-h-[116px] items-center gap-4 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "green" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "orange" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "violet" && "bg-[var(--bg-muted-strong)] text-[var(--accent-secondary)]",
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div className="mt-2 truncate text-[20px] font-bold leading-none text-[var(--text-primary)] md:text-[22px]">
          {value}
        </div>
        <div className="mt-2 truncate text-[11px] font-medium text-[var(--text-secondary)]">
          {caption}
        </div>
      </div>
    </section>
  );
}

function MilestoneItem({
  isLast,
  row,
}: {
  isLast: boolean;
  row: { date: string; label: string; status: string };
}) {
  const isComplete = row.status === "complete";
  const isActive = row.status === "active";

  return (
    <div className="relative flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border",
          isComplete && "border-[var(--info-base)] bg-[var(--info-soft)] text-[var(--info-base)]",
          isActive && "border-[var(--info-base)] bg-[var(--info-soft)] text-[var(--info-base)]",
          !isComplete &&
            !isActive &&
            "border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <span className="size-3 rounded-full bg-current" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">{row.label}</div>
        <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
          {row.date}
        </div>
      </div>
      {!isLast ? (
        <div className="pointer-events-none absolute left-10 right-0 top-5 hidden border-t border-dashed border-[var(--border-subtle)] lg:block" />
      ) : null}
    </div>
  );
}

function InfoBlock({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="mt-4">
      <div className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-[15px] font-bold text-[var(--text-primary)]">{value}</div>
      {note ? (
        <div className="mt-1 text-[11px] font-bold text-[var(--danger-base)]">{note}</div>
      ) : null}
    </div>
  );
}

function MetaLine({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)] md:justify-end">
        {value}
        {Icon ? <Icon className="size-4 text-[var(--text-secondary)]" /> : null}
      </div>
    </div>
  );
}

function PanelTitle({ children, icon: Icon }: { children: string; icon: typeof Radio }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
      <Icon className="size-4 text-[var(--info-base)]" />
      {children}
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
