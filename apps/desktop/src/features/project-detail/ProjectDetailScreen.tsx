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
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  CommandPanel,
  MetricTile,
  ScreenShell,
  SectionPanel,
  SummaryLine,
} from "@/components/shared/Screen";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { listDesktopContracts } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import {
  formatDueWindow,
  formatForecastDelta,
  mapContractToProject,
  portfolioProjects,
  type PortfolioProject,
} from "@/features/projects/ProjectsScreen";

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
    <ScreenShell>
      <CommandPanel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span>Portfolio</span>
              <ChevronRight className="size-3.5" />
              <span>Progetti</span>
              <ChevronRight className="size-3.5" />
              <span className="font-semibold text-foreground">{detail.name}</span>
            </div>

            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-foreground">
              {detail.name}
            </h2>
            <p className="mt-2 text-sm text-secondary">
              {detail.lot} · {detail.location}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge label={detail.health} tone={detail.healthTone} />
              <Badge variant="info">{String(detail.sal.current)}</Badge>
              <Badge variant="neutral">Ultimo aggiornamento {detail.lastUpdate}</Badge>
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
            value={formatMoney({ amount: detail.budget.contractual, currency: "EUR" })}
          />
          <MetricTile
            detail="Valore impegnato sul contratto"
            label="Impegnato"
            value={formatMoney({ amount: detail.budget.committed, currency: "EUR" })}
          />
          <MetricTile
            detail="Ultima SAL approvata"
            label="SAL corrente"
            value={formatMoney({ amount: detail.sal.amount, currency: "EUR" })}
          />
          <MetricTile
            detail="Avanzamento fisico del lotto"
            label="Progresso"
            value={`${detail.progress}%`}
          />
        </div>
      </CommandPanel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="space-y-6">
          <SectionPanel>
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
          </SectionPanel>

          <SectionPanel>
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
                    value={formatMoney({ amount: detail.budget.contractual, currency: "EUR" })}
                  />
                  <SummaryLine
                    label="Impegnato"
                    value={formatMoney({ amount: detail.budget.committed, currency: "EUR" })}
                  />
                  <SummaryLine
                    label="Eseguito"
                    value={formatMoney({ amount: detail.budget.executed, currency: "EUR" })}
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
                      {detail.endDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-secondary">Impatto</div>
                    <div className="mt-1 flex items-center gap-1 text-lg font-semibold text-danger">
                      <TrendingDown className="size-4" />
                      {detail.forecastImpact}
                    </div>
                  </div>
                </div>
                <div className="mt-5 border-t border-subtle pt-4">
                  <div className="text-xs text-secondary">CPI</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">{detail.cpi}</div>
                  <div className="mt-1 text-xs text-danger">Sotto budget rispetto al piano</div>
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel>
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
                        <StatusBadge label={row.status} tone={row.tone} />
                      </td>
                      <td className="px-4 py-3 text-secondary">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-6">
          <SectionPanel>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Presidio rapido</h3>
            </div>
            <dl className="mt-5 space-y-3">
              <SummaryLine label="Inizio" value={detail.startDate} />
              <SummaryLine label="Fine prevista" value={detail.endDate} />
              <SummaryLine label="Ultimo aggiornamento" value={detail.lastUpdate} />
              <SummaryLine label="SAL" value={String(detail.sal.current)} />
              <SummaryLine label="Responsabile" value={detail.manager} />
              <SummaryLine label="Prossima milestone" value={detail.nextMilestone} />
              <SummaryLine label="Rischio materiale" value={detail.materialRisk} />
            </dl>
          </SectionPanel>

          <SectionPanel>
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
          </SectionPanel>

          <SectionPanel>
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
          </SectionPanel>
        </div>
      </section>
    </ScreenShell>
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
