import { motion } from "framer-motion";
import { ArrowUpRight, Building2, ChevronRight, FolderKanban, HardHat, Trash2, TrendingUp } from "lucide-react";
import { ModernDonut, ProgressRing, SegmentBars } from "@/components/shared/Charts";
import { useEffect, useMemo, useState } from "react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import type { PortfolioProject } from "@/features/projects/ProjectsScreen";
import { BezelSurface, ProjectControlButton } from "@/features/projects/components/workspace-ui";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section
      className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-end"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Buonasera, Marco
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--success-base)]">
            <span className="size-1.5 rounded-full bg-current" />
            Portafoglio in tempo reale
          </span>
        </div>
        <h2 className="mt-5 max-w-4xl text-[38px] font-semibold leading-[0.98] text-[var(--text-primary)] md:text-[56px]">
          Centro di controllo dei lavori ferroviari.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--text-secondary)]">
          Monitora avanzamento, SAL e segnali di rischio con una vista operativa unica, costruita
          per decidere prima che i cantieri rallentino.
        </p>
      </div>
      <BezelSurface className="self-start md:translate-y-2" innerClassName="p-5">
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Indice operativo
          </div>
          <ProgressRing className="mx-auto mt-4" color="var(--accent-primary)" percentage={82} size={140} strokeWidth={10}>
            <div className="text-center">
              <div className="text-[32px] font-bold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                82<span className="text-[20px]">,4</span>
              </div>
            </div>
          </ProgressRing>
          <div className="mt-3 text-[12px] font-medium text-[var(--text-secondary)]">
            su base SAL, budget e priorita
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {["SAL", "Budget", "Rischi", "Milestone"].map((label) => (
              <span
                className="rounded-full bg-[var(--bg-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </BezelSurface>
    </section>
  );
}

export function PriorityActions({ summary }: { summary: { critical: number; warning: number } }) {
  const urgentActions = summary.critical + summary.warning;
  return (
    <BezelSurface innerClassName="p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Azioni prioritarie
          </span>
          <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--warning-base)]">
            {urgentActions.toLocaleString("it-IT")} azioni urgenti
          </span>
        </div>
        <button
          className="flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-primary)] hover:underline"
          type="button"
        >
          Vedi tutte le azioni
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1px_1fr] xl:items-center xl:gap-6">
        <div className="flex items-start gap-4 rounded-[16px] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--danger-soft)] text-[var(--danger-base)]">
            <span className="text-[18px] font-bold">!</span>
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[var(--text-primary)]">
              {summary.critical.toLocaleString("it-IT")} criticita ad alta priorita
            </div>
            <div className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
              Intervento richiesto per evitare impatti sulle lavorazioni.
            </div>
            <button
              className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-primary)] hover:underline"
              type="button"
            >
              Apri alert materiali
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="hidden h-16 w-px bg-[var(--border-subtle)] xl:block" />
        <div className="flex items-start gap-4 rounded-[16px] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--warning-soft)] text-[var(--warning-base)]">
            <span className="text-[18px] font-bold">&#9651;</span>
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[var(--text-primary)]">
              {summary.warning.toLocaleString("it-IT")} avvisi da monitorare
            </div>
            <div className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
              Verifica e conferma per mantenere il programma.
            </div>
            <button
              className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-primary)] hover:underline"
              type="button"
            >
              Vai alle forniture
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
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
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            <HardHat className="size-4 text-[var(--info-base)]" />
            Cantieri operativi
          </div>
          <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Stato avanzamento dei lotti attivi nel portafoglio
          </div>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
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

      <div className="flex min-h-14 flex-col gap-2 border-t border-[var(--border-subtle)] px-4 py-3 text-[12px] font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>
          Vista 1-{visibleProjects.length} di {projects.length} cantieri
        </span>
        <div className="flex items-center gap-3">
          <span>
            Mostra <strong className="text-[var(--text-primary)]">10</strong> per pagina
          </span>
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
          <div className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
            {project.lot} &middot; {project.location}
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-6 md:flex">
        <div className="min-w-0 text-right">
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">SAL</div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            {formatMoney({ amount: salApprovedAmount, currency: "EUR" })}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">Progr.</div>
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
          <div className="text-[12px] font-medium text-[var(--text-secondary)]">Budget</div>
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
              // no-op
            }
            window.dispatchEvent(new CustomEvent("navigate", { detail: "project-detail" }));
          }}
          variant="neutral"
        >
          Apri
        </ProjectControlButton>
        <button
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
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--info-base)]">
        <TrendingUp className="size-4" />
        Prossime milestone
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            className="rounded-[14px] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-4 py-3"
            key={item.date}
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
      <button
        className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-[var(--info-base)] hover:underline"
        type="button"
      >
        Vedi calendario
        <ChevronRight className="size-4" />
      </button>
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
            Salute sistema
          </h3>
        </div>
        <div className="space-y-3">
          {[
            ["Database", "Operativo"],
            ["Servizi", projectCount > 0 ? "Operativo" : "In attesa dati"],
            ["Integrazioni", projectCount > 0 ? "Operativo" : "In attesa dati"],
          ].map(([item, status]) => (
            <div
              className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
              key={item}
            >
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">{item}</span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--success-base)]">
                <span className="size-1.5 rounded-full bg-[var(--success-base)]" />
                {status}
              </span>
            </div>
          ))}
        </div>
        <RailLink label="Vedi stato servizi" />
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-bold text-[var(--info-base)]">
            02
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Feed operativo
          </h3>
        </div>
        <div className="space-y-3">
          {activities.slice(0, 3).map((activity, index) => (
            <div className="grid grid-cols-[40px_1fr] gap-3" key={activity}>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                {["17:32", "16:41", "15:28"][index] ?? "--:--"}
              </div>
              <div>
                <div className="text-[12px] font-medium leading-4 text-[var(--text-primary)]">
                  {activity.split(" · ")[0]}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  {activity.split(" · ").slice(1).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
        <RailLink label="Vai al feed completo" />
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-bold text-[var(--info-base)]">
            03
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Distribuzione stato
          </h3>
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <ModernDonut segments={buildSegments(distribution)} size={120} strokeWidth={8} />
          <SegmentBars className="w-full flex-1 self-center sm:self-start" segments={buildSegments(distribution)} />
        </div>
        <RailLink label="Vedi distribuzione" />
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-bold text-[var(--info-base)]">
            04
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Team operativo
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {[
            ["DA", "bg-[var(--warning-soft)] text-[var(--warning-base)]"],
            ["DL", "bg-[var(--danger-soft)] text-[var(--danger-base)]"],
            ["CC", "bg-[var(--danger-soft)] text-[var(--danger-base)]"],
            ["PR", "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]"],
            ["+2", "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]"],
          ].map(([label, className]) => (
            <span
              className={`flex size-9 items-center justify-center rounded-[13px] text-[12px] font-semibold ${className}`}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        <RailLink label="Vai al team" />
      </BezelSurface>
    </aside>
  );
}

function RailLink({ label }: { label: string }) {
  return (
    <motion.button
      className="group mt-4 inline-flex h-11 w-full shrink-0 items-center justify-center gap-2.5 rounded-full bg-[var(--accent-primary)] py-1 pl-4 pr-1 text-[12px] font-semibold text-[var(--text-inverse)] outline-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="truncate">{label}</span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/16 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
        <ArrowUpRight className="size-4" />
      </span>
    </motion.button>
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
      tone: "warning" as const,
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
    { label: "In esaurimento", tone: "warning" as StatusTone, value: String(warning) },
    { label: "Critico", tone: "danger" as StatusTone, value: String(danger) },
  ];
}

export function buildActivityRows(projects: PortfolioProject[]) {
  return projects
    .slice()
    .sort((left, right) => left.salDays - right.salDays)
    .slice(0, 3)
    .map((project) => `${project.salState} · ${project.title} · ${project.lot}`);
}

export function buildActionSummary(projects: PortfolioProject[]) {
  return {
    critical: projects.filter((project) => project.tone === "danger").length,
    warning: projects.filter((project) => project.tone === "warning").length,
  };
}

export function buildMilestones(projects: PortfolioProject[]) {
  const today = new Date();
  const months = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
  ];
  const fallback = [
    {
      date: `${today.getDate()} ${months[today.getMonth()]}`,
      title: "Nessuna milestone disponibile",
      place: "Aggiungi progetti per popolare la timeline",
    },
  ];

  if (projects.length === 0) {
    return fallback;
  }

  return projects.slice(0, 3).map((project, index) => {
    const milestoneDate = new Date(today);
    milestoneDate.setDate(today.getDate() + (index + 1) * 7);

    return {
      date: `${milestoneDate.getDate()} ${months[milestoneDate.getMonth()]}`,
      place: `${project.title} · ${project.lot}`,
      title: project.salState,
    };
  });
}
