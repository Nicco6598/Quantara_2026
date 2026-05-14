import { m } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronRight,
  FileText,
  FolderKanban,
  HardHat,
  Plus,
  TrendingUp,
  Upload,
} from "lucide-react";
import { scaleTime } from "@visx/scale";
import { useEffect, useMemo, useState } from "react";
import { ModernDonut, SegmentBars } from "@/components/shared/Charts";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { Button } from "@/components/shared/Button";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import { BezelSurface } from "@/components/shared/ui-primitives";
import type { AuditEntry } from "@/store/audit-log-store";
import type { PortfolioProject } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type GanttBar = {
  id: string;
  label: string;
  subtitle: string;
  startDate: Date;
  endDate: Date;
  days: number;
  color: string;
  tone: StatusTone;
  progress: number;
};

export function PriorityActions({ items }: { items: PortfolioProject[] }) {
  if (items.length === 0) return null;

  return (
    <BezelSurface innerClassName="p-4">
      <div className="space-y-3">
        {items.slice(0, 4).map((project) => (
          <m.div
            className="flex items-start gap-3 rounded-18px p-3 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted)]"
            initial={MOTION_VARIANTS.listItem.initial}
            key={project.id}
            transition={{
              ...MOTION_VARIANTS.listItem.transition,
              delay: Math.min(0.12, items.indexOf(project) * 0.03),
            }}
            viewport={MOTION_VARIANTS.row.viewport}
            whileInView={MOTION_VARIANTS.listItem.animate}
          >
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-10px",
                project.tone === "danger"
                  ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                  : "bg-[var(--warning-soft)] text-[var(--warning-base)]",
              )}
            >
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-13px font-semibold text-[var(--text-primary)]">
                {project.title}
              </div>
              <div className="mt-0.5 text-12px font-medium text-[var(--text-secondary)]">
                {project.healthLabel} · {project.contractor}
              </div>
            </div>
            <span className="shrink-0 text-11px font-semibold text-[var(--text-secondary)]">
              {project.progress.toFixed(0)}%
            </span>
          </m.div>
        ))}
      </div>
      {items.length > 4 ? (
        <div className="mt-2 text-center text-11px font-medium text-[var(--text-secondary)]">
          +{items.length - 4} altri element{items.length - 4 === 1 ? "o" : "i"}
        </div>
      ) : null}
    </BezelSurface>
  );
}

export function TimelineGantt({ bars }: { bars: GanttBar[] }) {
  const today = new Date();
  const allDates = bars.flatMap((bar) => [bar.startDate, bar.endDate, today]);
  const minDate =
    allDates.length > 0
      ? startOfMonth(new Date(Math.min(...allDates.map((date) => date.getTime()))))
      : today;
  const maxDate =
    allDates.length > 0
      ? endOfMonth(new Date(Math.max(...allDates.map((date) => date.getTime()))))
      : today;
  const [hoveredBar, setHoveredBar] = useState<GanttBar | null>(null);

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [minDate, maxDate],
        range: [0, 100],
      }),
    [minDate, maxDate],
  );

  const monthTicks = useMemo(() => buildMonthTicks(minDate, maxDate), [minDate, maxDate]);
  const todayX = xScale(today);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          <CalendarDays className="size-3.5" />
          <span>Timeline</span>
        </div>
        <span className="rounded-full border border-[color-mix(in_srgb,var(--border-subtle)_50%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_72%,transparent)] px-2.5 py-1 text-10px font-bold text-[var(--text-secondary)]">
          {bars.length} cantier{bars.length === 1 ? "e" : "i"}
        </span>
      </div>

      <div className="overflow-hidden rounded-18px border border-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-base)_96%,var(--info-soft)_4%),color-mix(in_srgb,var(--surface-base)_90%,var(--bg-muted)_10%))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)]">
        <div className="grid grid-cols-[minmax(150px,210px)_minmax(420px,1fr)] border-b border-[color-mix(in_srgb,var(--border-subtle)_52%,transparent)] bg-[color-mix(in_srgb,var(--surface-highlight)_18%,transparent)]">
          <div className="px-4 py-3 text-10px font-black uppercase tracking-0_14em text-[var(--text-secondary)]">
            Cantiere
          </div>
          <div className="relative min-w-0 px-4 py-3">
            <div className="relative h-4">
              {monthTicks.map((tick) => (
                <span
                  className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-9px font-black uppercase tracking-0_08em text-[var(--text-secondary)]/70"
                  key={tick.toISOString()}
                  style={{ left: `${xScale(tick)}%` }}
                >
                  {tick.toLocaleDateString("it-IT", { month: "short" })}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-[color-mix(in_srgb,var(--border-subtle)_34%,transparent)]">
          {bars.map((bar, index) => {
            const start = Math.max(0, Math.min(100, xScale(bar.startDate)));
            const end = Math.max(0, Math.min(100, xScale(bar.endDate)));
            const width = Math.max(1.4, end - start);
            const progress = Math.max(0, Math.min(100, bar.progress));
            const toneClass = ganttToneClass(bar.tone);
            const isHovered = hoveredBar?.id === bar.id;

            return (
              <m.div
                className={cn(
                  "group grid min-h-[58px] grid-cols-[minmax(150px,210px)_minmax(420px,1fr)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isHovered
                    ? "bg-[color-mix(in_srgb,var(--bg-muted)_58%,transparent)]"
                    : "hover:bg-[color-mix(in_srgb,var(--bg-muted)_34%,transparent)]",
                )}
                initial={MOTION_VARIANTS.row.initial}
                key={bar.id}
                transition={{
                  ...MOTION_VARIANTS.row.transition,
                  delay: index * 0.035,
                }}
                viewport={MOTION_VARIANTS.row.viewport}
                whileInView={MOTION_VARIANTS.row.whileInView}
              >
                <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "relative size-2.5 shrink-0 rounded-full shadow-[0_0_0_5px_color-mix(in_srgb,currentColor_12%,transparent)]",
                      bar.tone === "danger" && "bg-[var(--danger-base)] text-[var(--danger-base)]",
                      bar.tone === "warning" &&
                        "bg-[var(--warning-base)] text-[var(--warning-base)]",
                      bar.tone === "success" &&
                        "bg-[var(--success-base)] text-[var(--success-base)]",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-12px font-bold leading-none text-[var(--text-primary)]">
                      {bar.label}
                    </div>
                    <div className="mt-1.5 truncate text-10px font-semibold leading-none text-[var(--text-secondary)]">
                      {bar.subtitle || "Impresa non assegnata"}
                    </div>
                  </div>
                </div>

                <div className="relative min-w-0 px-4 py-3">
                  <div className="absolute inset-y-0 left-4 right-4 pointer-events-none">
                    {monthTicks.map((tick) => (
                      <span
                        className="absolute top-0 h-full w-px bg-[color-mix(in_srgb,var(--border-subtle)_32%,transparent)]"
                        key={tick.toISOString()}
                        style={{ left: `${xScale(tick)}%` }}
                      />
                    ))}
                    <span
                      className="absolute top-1 bottom-1 w-px bg-[var(--accent-primary)]/45"
                      style={{ left: `${todayX}%` }}
                    >
                      <span className="absolute -top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-primary)_12%,transparent)]" />
                    </span>
                  </div>

                  <div className="relative h-8 rounded-10px bg-[color-mix(in_srgb,var(--bg-muted-strong)_52%,var(--surface-base)_48%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_42%,transparent)]">
                    <m.button
                      aria-label={`${bar.label}, ${progress.toFixed(0)}%, ${bar.days} giorni`}
                      className={cn(
                        "absolute top-1 bottom-1 overflow-hidden rounded-10px text-left shadow-[0_10px_22px_color-mix(in_srgb,var(--text-primary)_9%,transparent)] outline-none transition-[filter,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                        toneClass,
                      )}
                      initial={MOTION_VARIANTS.progress.initial}
                      onBlur={() => setHoveredBar(null)}
                      onFocus={() => setHoveredBar(bar)}
                      onMouseEnter={() => setHoveredBar(bar)}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{ left: `${start}%`, width: `${width}%` }}
                      transition={{
                        ...MOTION_VARIANTS.progress.transition,
                        delay: 0.08 + index * 0.035,
                      }}
                      type="button"
                      whileHover={{ y: -1 }}
                      whileInView={{ scaleX: 1 }}
                    >
                      <m.span
                        className="absolute inset-y-0 left-0 rounded-10px bg-white/24"
                        initial={MOTION_VARIANTS.progress.initial}
                        style={{ width: `${progress}%` }}
                        transition={{
                          ...MOTION_VARIANTS.progress.transition,
                          delay: 0.18 + index * 0.035,
                        }}
                        whileInView={{ scaleX: 1 }}
                      />
                      <span className="relative z-10 flex h-full min-w-0 items-center justify-between gap-2 px-2.5 text-white">
                        <span className="truncate text-10px font-black leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.24)]">
                          {progress.toFixed(0)}%
                        </span>
                        {width > 10 ? (
                          <span className="shrink-0 text-9px font-bold leading-none text-white/75">
                            {bar.days}g
                          </span>
                        ) : null}
                      </span>
                    </m.button>
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>
      </div>

      {hoveredBar ? (
        <m.div
          animate={MOTION_VARIANTS.popover.animate}
          className="absolute right-3 top-12 z-20 hidden max-w-[280px] rounded-14px border border-[color-mix(in_srgb,var(--border-subtle)_66%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_94%,transparent)] px-3 py-2 text-10px font-semibold text-[var(--text-secondary)] shadow-[0_20px_58px_color-mix(in_srgb,var(--text-primary)_16%,transparent)] backdrop-blur-xl md:block"
          initial={MOTION_VARIANTS.popover.initial}
          transition={MOTION_VARIANTS.popover.transition}
        >
          <div className="text-12px font-bold text-[var(--text-primary)]">{hoveredBar.label}</div>
          <div className="mt-1">{hoveredBar.subtitle}</div>
          <div className="mt-1">
            {hoveredBar.startDate.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
            {" - "}
            {hoveredBar.endDate.toLocaleDateString("it-IT", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {hoveredBar.days} giorni · {hoveredBar.progress.toFixed(0)}%
          </div>
        </m.div>
      ) : null}

      {bars.length > 0 ? (
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)]/25 pt-3 text-10px font-medium text-[var(--text-secondary)]/50">
          <span>
            {bars.length} cantier{bars.length === 1 ? "e" : "i"}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--success-base)]" />
              In linea
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--warning-base)]" />
              Attenzione
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--danger-base)]" />
              Critico
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildMonthTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  const cursor = startOfMonth(start);
  while (cursor <= end) {
    ticks.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

function ganttToneClass(tone: StatusTone): string {
  if (tone === "danger") {
    return "bg-[linear-gradient(135deg,var(--danger-base),color-mix(in_srgb,var(--danger-base)_70%,var(--warning-base)_30%))]";
  }
  if (tone === "warning") {
    return "bg-[linear-gradient(135deg,var(--warning-base),color-mix(in_srgb,var(--warning-base)_78%,var(--accent-primary)_22%))]";
  }
  return "bg-[linear-gradient(135deg,var(--success-base),color-mix(in_srgb,var(--success-base)_76%,var(--accent-primary)_24%))]";
}

export function OperationalSites({
  onDeleteProject,
  onOpenProject,
  operationalByProjectId,
  projects,
}: {
  onDeleteProject: (projectId: string) => void;
  onOpenProject: (project: PortfolioProject) => void;
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
    <section className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <HardHat className="size-5 text-[var(--info-base)]" />
        <div>
          <div className="text-13px font-semibold text-[var(--text-primary)]">
            Cantieri operativi
          </div>
          <div className="mt-0.5 text-12px text-[var(--text-secondary)]">
            {projects.length} cantier{projects.length === 1 ? "e" : "i"}
          </div>
        </div>
      </div>

      {visibleProjects.map((project) => {
        const operational = operationalByProjectId.get(project.id);
        return (
          <ProjectRow
            key={project.id}
            {...(operational ? { operational } : {})}
            onDelete={() => onDeleteProject(project.id)}
            onOpen={() => onOpenProject(project)}
            project={project}
          />
        );
      })}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-22px border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] p-10 text-center shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--surface-highlight)_48%,transparent)]">
          <HardHat className="size-8 text-[var(--text-secondary)]" />
          <p className="text-13px font-medium text-[var(--text-secondary)]">
            Nessun cantiere nel portafoglio.
          </p>
          <p className="text-12px text-[var(--text-secondary)]">
            Crea un progetto per iniziare a monitorare i lavori.
          </p>
        </div>
      ) : null}

      {canShowMore ? (
        <div className="flex justify-center pt-1">
          <Button onClick={() => setVisibleCount((value) => value + PAGE_SIZE)} variant="outline">
            Mostra altro ({projects.length - visibleProjects.length} rimanenti)
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function ProjectRow({
  onDelete,
  onOpen,
  operational,
  project,
}: {
  onDelete: () => void;
  onOpen: () => void;
  operational?: { approvedAmount: number; committedAmount: number; progressPercent: number };
  project: PortfolioProject;
}) {
  const salApprovedAmount = operational?.approvedAmount ?? project.salValue.amount;
  const progressPercent = operational?.progressPercent ?? project.progress;
  const toneClass =
    project.tone === "danger"
      ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
      : project.tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
        : "bg-[var(--success-soft)] text-[var(--success-base)]";

  return (
    <m.article
      className="group cursor-pointer rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_56%,transparent)] bg-[var(--surface-base)] p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--text-primary)_5%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_52%,transparent)] transition-[box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[color-mix(in_srgb,var(--surface-base)_90%,var(--bg-muted)_10%)] hover:shadow-[0_18px_44px_color-mix(in_srgb,var(--text-primary)_8%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_14%,transparent)]"
      initial={MOTION_VARIANTS.row.initial}
      transition={MOTION_VARIANTS.row.transition}
      viewport={MOTION_VARIANTS.row.viewport}
      whileInView={MOTION_VARIANTS.row.whileInView}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              "relative flex size-12 shrink-0 items-center justify-center rounded-22px shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]",
              toneClass,
            )}
          >
            <FolderKanban className="size-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-15px font-semibold leading-tight text-[var(--text-primary)]">
                {project.title}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-18px px-2 py-1 text-11px font-semibold",
                  toneClass,
                )}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-current" />
                {project.healthLabel}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 text-12px font-medium text-[var(--text-secondary)]">
              <span className="truncate">
                {project.lot} · {project.location}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button className="h-9 px-3 text-12px" onClick={onOpen} variant="outline">
            Apri
          </Button>
          <button
            aria-label="Elimina cantiere"
            className="flex size-9 items-center justify-center rounded-lg text-[var(--danger-base)] opacity-0 ring-1 ring-[var(--border-subtle)] transition-all hover:bg-[var(--danger-soft)] group-hover:opacity-100"
            onClick={onDelete}
            type="button"
          >
            <span className="text-lg font-bold leading-none">×</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_62%,transparent)] p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_42%,transparent)] sm:grid-cols-3">
        <div>
          <div className="text-10px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
            SAL
          </div>
          <div className="mt-1 text-14px font-semibold leading-none text-[var(--text-primary)]">
            {formatMoney({ amount: salApprovedAmount, currency: "EUR" })}
          </div>
        </div>
        <div>
          <div className="text-10px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
            Progresso
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border-subtle)_64%,transparent)]">
              <div
                className={cn(
                  "h-full rounded-full",
                  project.tone === "danger"
                    ? "bg-[var(--danger-base)]"
                    : project.tone === "warning"
                      ? "bg-[var(--warning-base)]"
                      : "bg-[var(--accent-primary)]",
                )}
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>
            <span className="text-12px font-semibold text-[var(--accent-primary)]">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
        </div>
        <div>
          <div className="text-10px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
            Budget
          </div>
          <div className="mt-1 text-14px font-semibold leading-none text-[var(--text-primary)]">
            {formatMoney(project.budget)}
          </div>
        </div>
      </div>
    </m.article>
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
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-11px font-bold text-[var(--info-base)]">
            01
          </span>
          <h3 className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
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
          <p className="py-4 text-center text-12px text-[var(--text-secondary)]">
            Nessun progetto nel portafoglio.
          </p>
        )}
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-11px font-bold text-[var(--info-base)]">
            02
          </span>
          <h3 className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
            Attivita recenti
          </h3>
        </div>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => {
              const [time, ...rest] = activity.split(" · ");
              const detail = rest.join(" · ");
              return (
                <div className="grid grid-cols-[56px_1fr] gap-2" key={activity}>
                  <span className="text-10px font-medium text-[var(--text-secondary)]">{time}</span>
                  <span className="text-12px font-medium leading-4 text-[var(--text-primary)]">
                    {detail}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-12px text-[var(--text-secondary)]">
            Nessuna attivita recente.
          </p>
        )}
      </BezelSurface>

      <BezelSurface innerClassName="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-11px font-bold text-[var(--info-base)]">
            03
          </span>
          <h3 className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
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
      className="flex w-full items-center gap-3 rounded-18px bg-[var(--bg-muted)]/70 px-4 py-3 text-left text-13px font-semibold text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted)]"
      type="button"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-10px bg-[var(--info-soft)] text-[var(--info-base)]">
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

// ---------------------------------------------------------------------------
// Data builders (pure functions)
// ---------------------------------------------------------------------------

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

export function buildActivityRows(entries: AuditEntry[]): string[] {
  if (entries.length === 0) return [];

  return entries.slice(0, 10).map((entry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${time} · ${entry.action}: ${entry.details}`;
  });
}

export function buildPriorityActions(projects: PortfolioProject[]): PortfolioProject[] {
  return projects
    .filter((p) => p.tone === "danger" || p.tone === "warning")
    .sort((a, b) => {
      if (a.tone === "danger" && b.tone !== "danger") return -1;
      if (a.tone !== "danger" && b.tone === "danger") return 1;
      return a.progress - b.progress;
    });
}

export function buildSalTimeline(
  projects: PortfolioProject[],
  views: Array<{
    projectId: string;
    date: string;
    closedAt?: string;
    total: number;
    status: string;
  }>,
): Map<string, { firstSalDate: Date; lastSalDate: Date; totalSalAmount: number }> {
  const timeline = new Map<
    string,
    { firstSalDate: Date; lastSalDate: Date; totalSalAmount: number }
  >();

  for (const view of views) {
    const existing = timeline.get(view.projectId);
    const salDate = new Date(view.closedAt ?? view.date);

    if (!existing) {
      timeline.set(view.projectId, {
        firstSalDate: salDate,
        lastSalDate: salDate,
        totalSalAmount: view.total,
      });
    } else {
      timeline.set(view.projectId, {
        firstSalDate: salDate < existing.firstSalDate ? salDate : existing.firstSalDate,
        lastSalDate: salDate > existing.lastSalDate ? salDate : existing.lastSalDate,
        totalSalAmount: existing.totalSalAmount + view.total,
      });
    }
  }

  for (const project of projects) {
    if (!timeline.has(project.id)) {
      timeline.set(project.id, {
        firstSalDate: new Date(),
        lastSalDate: new Date(),
        totalSalAmount: 0,
      });
    }
  }

  return timeline;
}

const statusColorMap: Record<string, string> = {
  success: "var(--success-base)",
  warning: "var(--warning-base)",
  danger: "var(--danger-base)",
};

export function buildGanttBars(
  projects: PortfolioProject[],
  salTimeline: Map<string, { firstSalDate: Date; lastSalDate: Date; totalSalAmount: number }>,
): GanttBar[] {
  const today = new Date();

  return projects
    .map((project) => {
      const timeline = salTimeline.get(project.id);
      const startDate = timeline?.firstSalDate ?? today;
      const endDate =
        timeline && timeline.totalSalAmount > 0
          ? timeline.lastSalDate > today
            ? timeline.lastSalDate
            : today
          : today;
      const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
      const color = statusColorMap[project.tone] ?? "var(--info-base)";

      return {
        id: project.id,
        label: project.title,
        subtitle: project.contractor ?? "",
        startDate,
        endDate,
        days,
        color,
        tone: project.tone,
        progress: project.progress,
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
