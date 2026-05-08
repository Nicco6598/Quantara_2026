import {
  Building2,
  ChevronRight,
  FileText,
  FolderKanban,
  HardHat,
  Plus,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ModernDonut, SegmentBars } from "@/components/shared/Charts";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { BezelSurface, ProjectControlButton } from "@/components/shared/ui-primitives";
import type { PortfolioProject } from "@/features/projects/ProjectsScreen";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function PriorityActions({ summary }: { summary: { critical: number; warning: number } }) {
  const urgentActions = summary.critical + summary.warning;
  if (urgentActions === 0) return null;

  return (
    <BezelSurface innerClassName="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-10 items-center justify-center rounded-[14px] bg-[var(--danger-soft)] text-[var(--danger-base)]">
          <span className="text-[18px] font-bold">!</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">
            {urgentActions} azion{urgentActions === 1 ? "e" : "i"} urgent
            {urgentActions === 1 ? "e" : "i"}
          </div>
          <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
            {summary.critical > 0
              ? `${summary.critical} criticita ad alta priorita · Intervento richiesto.`
              : `${summary.warning} avvisi da monitorare.`}
          </div>
        </div>
        <button
          className="flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-primary)] hover:underline"
          type="button"
        >
          Vedi tutto
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </BezelSurface>
  );
}

export function OperationalSites({
  onDeleteProject,
  operationalByProjectId,
  projects,
}: {
  onDeleteProject: (projectId: string) => void;
  operationalByProjectId: Map<
    string,
    { approvedAmount: number; committedAmount: number; progressPercent: number }
  >;
  projects: PortfolioProject[];
}) {
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleProjects = useMemo(
    () => projects.slice(0, Math.min(visibleCount, projects.length)),
    [projects, visibleCount],
  );
  const canShowMore = visibleCount < projects.length;

  useEffect(() => {
    setVisibleCount((current) =>
      Math.min(Math.max(current, PAGE_SIZE), Math.max(PAGE_SIZE, projects.length)),
    );
  }, [projects.length]);

  return (
    <BezelSurface innerClassName="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] p-4 xl:flex-row xl:items-center xl:justify-between xl:p-5">
        <div className="flex items-center gap-3">
          <HardHat className="size-5 text-[var(--info-base)]" />
          <div>
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              Cantieri operativi
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
              {projects.length} cantier{projects.length === 1 ? "e" : "i"}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {visibleProjects.map((project) => {
          const operational = operationalByProjectId.get(project.id);
          return (
            <ProjectRow
              key={project.id}
              {...(operational ? { operational } : {})}
              onDelete={() => onDeleteProject(project.id)}
              project={project}
            />
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Building2 className="size-8 text-[var(--text-secondary)]" />
          <p className="text-[13px] font-medium text-[var(--text-secondary)]">
            Nessun cantiere nel portafoglio.
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Crea un progetto per iniziare a monitorare i lavori.
          </p>
        </div>
      )}

      <div className="flex min-h-14 flex-col gap-2 border-t border-[var(--border-subtle)] px-4 py-3 text-[12px] font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>
          Vista 1-{visibleProjects.length} di {projects.length} cantieri
        </span>
        <div className="flex items-center gap-3">
          {canShowMore ? (
            <ProjectControlButton
              onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}
              variant="neutral"
            >
              Mostra altro
            </ProjectControlButton>
          ) : null}
        </div>
      </div>
    </BezelSurface>
  );
}

function ProjectRow({
  onDelete,
  operational,
  project,
}: {
  onDelete: () => void;
  operational?: { approvedAmount: number; committedAmount: number; progressPercent: number };
  project: PortfolioProject;
}) {
  const salApprovedAmount = operational?.approvedAmount ?? project.salValue.amount;
  const progressPercent = operational?.progressPercent ?? project.progress;

  return (
    <div className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-[var(--bg-muted)] xl:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
            project.tone === "danger"
              ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
              : project.tone === "warning"
                ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                : "bg-[var(--success-soft)] text-[var(--success-base)]",
          )}
        >
          <FolderKanban className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
            {project.title}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <span>{project.contractor}</span>
            <span className="text-[var(--border-subtle)]">·</span>
            <span>{project.location}</span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-5 md:flex">
        <div className="min-w-0 text-right">
          <div className="text-[11px] font-medium text-[var(--text-secondary)]">SAL</div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            {formatMoney({ amount: salApprovedAmount, currency: "EUR" })}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[11px] font-medium text-[var(--text-secondary)]">Progr.</div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
              <div
                className={cn(
                  "h-full rounded-full",
                  project.tone === "danger"
                    ? "bg-[var(--danger-base)]"
                    : project.tone === "warning"
                      ? "bg-[var(--warning-base)]"
                      : "bg-[var(--success-base)]",
                )}
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[11px] font-medium text-[var(--text-secondary)]">Budget</div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            {formatMoney(project.budget)}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ProjectControlButton
          className="h-9 px-3 text-[12px]"
          onClick={() => {
            try {
              window.sessionStorage.setItem(
                "quantara.selectedProjectDetail.v1",
                JSON.stringify(project),
              );
            } catch {
              /* no-op */
            }
            window.dispatchEvent(new CustomEvent("navigate", { detail: "project-detail" }));
          }}
          variant="neutral"
        >
          Apri
        </ProjectControlButton>
        <button
          aria-label="Elimina cantiere"
          className="flex size-9 items-center justify-center rounded-full text-[var(--danger-base)] opacity-0 ring-1 ring-[var(--border-subtle)] transition-opacity hover:bg-[var(--danger-soft)] group-hover:opacity-100"
          onClick={onDelete}
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function Milestones({
  items,
}: {
  items: Array<{ date: string; place: string; title: string }>;
}) {
  if (
    items.length === 0 ||
    (items.length === 1 && items[0]?.title === "Nessuna milestone disponibile")
  ) {
    return null;
  }

  return (
    <BezelSurface innerClassName="p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--info-base)]">
        <TrendingUp className="size-4" />
        Prossime milestone
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <div
            className="rounded-[14px] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-4 py-3"
            key={`${item.date}-${item.title}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--info-base)]">
              {item.date}
            </div>
            <div className="mt-1 text-[13px] font-semibold text-[var(--text-primary)]">
              {item.title}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{item.place}</div>
          </div>
        ))}
      </div>
    </BezelSurface>
  );
}

export function RightRail({
  activities,
  distribution,
  projectCount,
}: {
  activities: string[];
  distribution: Array<{ label: string; tone: StatusTone; value: string }>;
  projectCount: number;
}) {
  return (
    <aside className="grid gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4">
      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-bold text-[var(--info-base)]">
            01
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Distribuzione stato
          </h3>
        </div>
        {projectCount > 0 ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
            <ModernDonut segments={buildSegments(distribution)} size={120} strokeWidth={8} />
            <SegmentBars
              className="w-full flex-1 self-center sm:self-start"
              segments={buildSegments(distribution)}
            />
          </div>
        ) : (
          <p className="py-4 text-center text-[12px] text-[var(--text-secondary)]">
            Nessun progetto nel portafoglio.
          </p>
        )}
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-bold text-[var(--info-base)]">
            02
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Attivita recenti
          </h3>
        </div>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 3).map((activity, index) => {
              const [label, ...rest] = activity.split(" · ");
              const detail = rest.join(" · ");
              return (
                <div className="grid grid-cols-[40px_1fr] gap-3" key={activity}>
                  <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {["17:32", "16:41", "15:28"][index] ?? "--:--"}
                  </div>
                  <div>
                    <div className="text-[12px] font-medium leading-4 text-[var(--text-primary)]">
                      {label}
                    </div>
                    {detail && (
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                        {detail}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-[12px] text-[var(--text-secondary)]">
            Nessuna attivita recente.
          </p>
        )}
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-bold text-[var(--info-base)]">
            03
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Azioni rapide
          </h3>
        </div>
        <div className="space-y-2">
          <ActionButton icon={FileText} label="Nuova SAL" />
          <ActionButton icon={Upload} label="Importa tariffario" />
          <ActionButton icon={Plus} label="Crea progetto" />
        </div>
      </BezelSurface>
    </aside>
  );
}

function ActionButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-[14px] bg-[var(--bg-muted)]/70 px-4 py-3 text-left text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
      type="button"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--info-soft)] text-[var(--info-base)]">
        <Icon className="size-4" />
      </span>
      {label}
      <ChevronRight className="ml-auto size-4 text-[var(--text-secondary)]" />
    </button>
  );
}

function buildSegments(
  distribution: Array<{ label: string; tone: StatusTone; value: string }>,
): Array<{ color: string; label: string; value: number }> {
  const findVal = (tone: StatusTone) => {
    const match = distribution.find((d) => d.tone === tone);
    return match ? Number(match.value) : 0;
  };
  return [
    { color: "var(--success-base)", label: "In linea", value: findVal("success") },
    { color: "var(--warning-base)", label: "Attenzione", value: findVal("warning") },
    { color: "var(--danger-base)", label: "Critico", value: findVal("danger") },
  ];
}

export function buildOverviewMetrics(projects: PortfolioProject[]) {
  const totalBudget = projects.reduce((total, project) => total + project.budget.amount, 0);
  const escalationCount = projects.filter((project) => project.tone === "danger").length;
  const salCount = projects.filter((project) => project.salDays <= 7).length;

  return [
    {
      caption: "Budget complessivo dei lotti attivi",
      icon: Building2,
      label: "Budget portafoglio",
      tone: "blue" as const,
      value: formatMoney({ amount: totalBudget, currency: "EUR" }),
    },
    {
      caption: "Cantieri con SAL attivi",
      icon: HardHat,
      label: "Lotti attivi",
      tone: "success" as const,
      value: String(projects.length),
    },
    {
      caption: "SAL da configurare o in corso",
      icon: TrendingUp,
      label: "SAL in corso",
      tone: "warning" as const,
      value: String(salCount),
    },
    {
      caption: "Elementi critici da risolvere",
      icon: FolderKanban,
      label: "Criticita / Escalation",
      tone: escalationCount > 0 ? ("danger" as const) : ("success" as const),
      value: String(escalationCount),
    },
  ];
}

export function buildFocusRows(projects: PortfolioProject[]) {
  const success = projects.filter((project) => project.tone === "success").length;
  const warning = projects.filter((project) => project.tone === "warning").length;
  const danger = projects.filter((project) => project.tone === "danger").length;

  return [
    { label: "In linea", tone: "success" as StatusTone, value: String(success) },
    { label: "Attenzione", tone: "warning" as StatusTone, value: String(warning) },
    { label: "Critico", tone: "danger" as StatusTone, value: String(danger) },
  ];
}

export function buildActivityRows(projects: PortfolioProject[]) {
  if (projects.length === 0) return [];
  return projects
    .slice()
    .sort((left, right) => left.salDays - right.salDays)
    .slice(0, 5)
    .map((project) => `${project.salState} · ${project.title} · ${project.contractor}`);
}

export function buildActionSummary(projects: PortfolioProject[]) {
  return {
    critical: projects.filter((project) => project.tone === "danger").length,
    warning: projects.filter((project) => project.tone === "warning").length,
  };
}

export function buildMilestones(projects: PortfolioProject[]) {
  if (projects.length === 0) return [];

  const today = new Date();
  const months = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];

  return projects.slice(0, 4).map((project, index) => {
    const milestoneDate = new Date(today);
    milestoneDate.setDate(today.getDate() + (index + 1) * 7);
    return {
      date: `${milestoneDate.getDate()} ${months[milestoneDate.getMonth()]}`,
      place: `${project.title}`,
      title: project.salState,
    };
  });
}
