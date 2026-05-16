import { m } from "framer-motion";
import {
  AlertTriangle,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { ModernDonut, SegmentBars } from "@/components/shared/LegacyCharts";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MOTION_VARIANTS } from "@/motion";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { BezelSurface } from "@/components/shared/ui-primitives";
import type { PortfolioProject } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/store/audit-log-store";

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
        {items.slice(0, 4).map((project, index) => (
          <m.div
            className="flex items-start gap-3 rounded-18px p-3 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted)]"
            initial={MOTION_VARIANTS.listItem.initial}
            key={project.id}
            transition={{
              ...MOTION_VARIANTS.listItem.transition,
              delay: Math.min(0.12, index * 0.03),
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

export function TimelineGantt({
  bars,
  projects,
  operationalByProjectId,
  onOpen,
  onDelete,
}: {
  bars: GanttBar[];
  projects: PortfolioProject[];
  operationalByProjectId: Map<
    string,
    { approvedAmount: number; committedAmount: number; progressPercent: number }
  >;
  onOpen: (project: PortfolioProject) => void;
  onDelete: (projectId: string) => void;
}) {
  const today = new Date();
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const bar of bars) {
    const s = bar.startDate.getTime();
    const e = bar.endDate.getTime();
    if (s < minTime) minTime = s;
    if (e > maxTime) maxTime = e;
  }
  const todayTime = today.getTime();
  if (todayTime < minTime) minTime = todayTime;
  if (todayTime > maxTime) maxTime = todayTime;
  const minDate = bars.length > 0 ? startOfMonth(new Date(minTime)) : today;
  const maxDate = bars.length > 0 ? endOfMonth(new Date(maxTime)) : today;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const monthTicks = useMemo(() => buildMonthTicks(minDate, maxDate), [minDate, maxDate]);
  const MIN_MONTH_PX = 80;

  const timelineWidth = useMemo(
    () => Math.max(monthTicks.length * MIN_MONTH_PX + 32, 400),
    [monthTicks.length],
  );

  const xScale = useMemo(() => {
    const tMin = minDate.getTime();
    const tRange = maxDate.getTime() - tMin || 1;
    return (d: Date) => ((d.getTime() - tMin) / tRange) * 100;
  }, [minDate, maxDate]);

  const barStyle = (bar: GanttBar) => {
    const left = Math.max(xScale(bar.startDate), 0);
    const right = Math.min(xScale(bar.endDate), 100);
    const width = Math.max(right - left, 0.5);
    return { left: `${left}%`, width: `${width}%` };
  };

  const successCount = bars.filter((b) => b.tone === "success").length;
  const warningCount = bars.filter((b) => b.tone === "warning").length;
  const dangerCount = bars.filter((b) => b.tone === "danger").length;
  const toneTotals = [
    { color: "var(--success-base)", label: "In linea", count: successCount },
    { color: "var(--warning-base)", label: "Attenzione", count: warningCount },
    { color: "var(--danger-base)", label: "Critico", count: dangerCount },
  ];
  const avgProgress =
    bars.length > 0 ? Math.round(bars.reduce((s, b) => s + b.progress, 0) / bars.length) : 0;

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  if (bars.length === 0) return null;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          <HardHat className="size-3.5" />
          <span>Cantieri operativi</span>
        </div>
        <span className="rounded-full border border-[color-mix(in_srgb,var(--border-subtle)_50%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_72%,transparent)] px-2.5 py-1 text-10px font-bold text-[var(--text-secondary)]">
          {bars.length} cantier{bars.length === 1 ? "e" : "i"}
        </span>
      </div>

      <div className="flex overflow-hidden rounded-18px border border-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)]">
        {/* Sticky project column */}
        <div className="sticky left-0 z-10 shrink-0 w-[260px] border-r border-[var(--border-subtle)]/50 bg-[var(--surface-base)]">
          <div className="flex items-center px-3 h-7 text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Cantiere
          </div>
          {bars.map((bar) => {
            const project = projectById.get(bar.id);
            const operational = operationalByProjectId.get(bar.id);
            return (
              <div
                key={bar.id}
                className={cn(
                  "group relative flex items-start gap-2 border-t border-[var(--border-subtle)]/50 px-3 py-2 transition-colors",
                  hoveredId === bar.id && "bg-[var(--bg-muted)]/50",
                )}
                style={{ height: 52 }}
              >
                <span
                  className="mt-0.5 size-2.5 shrink-0 rounded-full ring-2 ring-[var(--surface-base)]"
                  style={{ backgroundColor: `var(--${bar.tone}-base)` }}
                />
                <div className="min-w-0 flex-1 pr-6">
                  <div className="flex items-center gap-1.5" title={bar.label}>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-12px font-semibold leading-tight text-[var(--text-primary)]">
                      {bar.label}
                    </span>
                    {bar.days > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--bg-muted)] px-1.5 py-0.5 text-9px font-semibold text-[var(--text-secondary)]">
                        {bar.days}g
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-10px font-medium leading-tight text-[var(--text-secondary)]">
                    {bar.subtitle || "N.D."}
                  </div>
                  {operational && project ? (
                    <div className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-10px font-semibold text-[var(--text-tertiary)]">
                      <span>€{(operational.committedAmount / 1000).toFixed(0)}k</span>
                      <span className="opacity-30">/</span>
                      <span>€{(project.budget.amount / 1000).toFixed(0)}k</span>
                      <span className="mx-0.5 opacity-20">·</span>
                      <span>
                        {((operational.committedAmount / project.budget.amount) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : null}
                </div>
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[var(--danger-soft)]/40 p-1 text-[var(--danger-base)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--danger-soft)]/70 active:scale-[0.92]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetId(bar.id);
                  }}
                  type="button"
                  title="Elimina progetto"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ width: "100%", minWidth: timelineWidth }}>
            {/* Month header */}
            <div className="sticky top-0 z-10 flex h-7 items-end border-b border-[var(--border-subtle)]/50 bg-[var(--surface-base)] px-2 pb-0.5">
              {monthTicks.map((tick, i) => {
                const prevYear = i > 0 ? (monthTicks[i - 1] as Date).getFullYear() : null;
                const isNewYear = tick.getFullYear() !== prevYear;
                const left = `${xScale(tick)}%`;
                return (
                  <div
                    key={tick.getTime()}
                    className="absolute text-center"
                    style={{ left, transform: "translateX(-50%)" }}
                  >
                    <span
                      className={cn(
                        "whitespace-nowrap",
                        isNewYear
                          ? "text-9px font-bold text-[var(--accent-primary)]"
                          : "text-8px font-semibold text-[var(--text-secondary)]/50",
                      )}
                    >
                      {tick.toLocaleDateString("it-IT", { month: "short" })}
                      {isNewYear ? ` '${String(tick.getFullYear()).slice(2)}` : ""}
                    </span>
                  </div>
                );
              })}
              {/* Today label */}
              <div
                className="absolute top-0 -translate-x-1/2 text-8px font-bold text-[var(--accent-primary)]"
                style={{ left: `${xScale(today)}%` }}
              >
                Oggi
              </div>
            </div>

            {/* Rows */}
            {bars.map((bar) => {
              const isHovered = hoveredId === bar.id;
              const progress = Math.max(0, Math.min(100, bar.progress));
              const bs = barStyle(bar);
              const project = projectById.get(bar.id);

              return (
                <button
                  type="button"
                  key={bar.id}
                  className={cn(
                    "relative flex w-full border-t border-[var(--border-subtle)]/50 transition-colors cursor-pointer",
                    isHovered && "bg-[var(--bg-muted)]/30",
                  )}
                  style={{ height: 52 }}
                  onMouseEnter={() => setHoveredId(bar.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    if (project) onOpen(project);
                  }}
                >
                  {/* Timeline bar */}
                  <div
                    className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      left: bs.left,
                      width: bs.width,
                      backgroundColor: `color-mix(in srgb, var(--accent-primary) ${bar.tone === "danger" ? 25 : bar.tone === "warning" ? 40 : 55}%, transparent)`,
                    }}
                  >
                    {/* Progress fill */}
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: `color-mix(in srgb, var(--accent-primary) ${bar.tone === "danger" ? 70 : bar.tone === "warning" ? 85 : 100}%, transparent)`,
                      }}
                    >
                      {progress > 10 && (
                        <span className="absolute inset-0 flex items-center px-2 text-10px font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
                          {progress.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Month grid lines */}
            {monthTicks.map((tick) => (
              <div
                key={`grid-${tick.getTime()}`}
                className="absolute top-0 bottom-0 w-px pointer-events-none"
                style={{
                  left: `${xScale(tick)}%`,
                  borderLeft: "1px dashed var(--text-tertiary)",
                  opacity: 0.35,
                }}
              />
            ))}

            {/* Today vertical line */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${xScale(today)}%`,
              }}
            >
              <div className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[var(--accent-primary)]" />
              <div className="h-full w-px bg-[var(--accent-primary)] opacity-60" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {bars.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)]/25 px-1 pt-3">
          <span className="text-10px font-semibold text-[var(--text-secondary)]/60">
            {bars.length} cantiere{bars.length === 1 ? "" : "i"} · {avgProgress}% medio avanzamento
          </span>
          <div className="flex items-center gap-4">
            {toneTotals
              .filter((t) => t.count > 0)
              .map((t) => (
                <span
                  className="flex items-center gap-1.5 text-10px font-semibold text-[var(--text-secondary)]/70"
                  key={t.label}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.label}
                  <span className="ml-0.5 font-bold text-[var(--text-secondary)]/90">
                    {t.count}
                  </span>
                </span>
              ))}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Elimina"
        isOpen={deleteTargetId !== null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) onDelete(deleteTargetId);
          setDeleteTargetId(null);
        }}
        title="Eliminare questo progetto?"
        tone="danger"
      >
        Il progetto verrà rimosso definitivamente insieme a tutte le SAL collegate.
      </ConfirmDialog>
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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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
            onDelete={() => setDeleteTargetId(project.id)}
            onOpen={() => onOpenProject(project)}
            project={project}
          />
        );
      })}

      <ConfirmDialog
        confirmLabel="Elimina"
        isOpen={deleteTargetId !== null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) onDeleteProject(deleteTargetId);
          setDeleteTargetId(null);
        }}
        title="Eliminare questo progetto?"
        tone="danger"
      >
        Il progetto verrà rimosso definitivamente insieme a tutte le SAL collegate.
      </ConfirmDialog>

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
          <Button onClick={onOpen} size="sm" variant="outline">
            Apri
          </Button>
          <Button aria-label="Elimina cantiere" onClick={onDelete} size="sm" variant="destructive">
            <Trash2 className="size-4" />
          </Button>
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
    <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <BezelSurface innerClassName="p-5 xl:col-span-2">
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
    const entry = timeline.get(project.id);

    if (!entry) {
      timeline.set(project.id, {
        firstSalDate: new Date(),
        lastSalDate: new Date(),
        totalSalAmount: 0,
      });
      continue;
    }

    // Estimate end date based on progress (same logic as Quadro economico)
    const budget = project.budget.amount;
    const remaining = Math.max(0, budget - entry.totalSalAmount);

    if (remaining > 0 && entry.totalSalAmount > 0) {
      const elapsedMs = entry.lastSalDate.getTime() - entry.firstSalDate.getTime();
      const elapsedDays = elapsedMs / 86400000;

      if (elapsedDays > 0) {
        const progress = entry.totalSalAmount / Math.max(budget, 1);
        const totalDays = Math.round(elapsedDays / Math.min(Math.max(progress, 0.05), 0.95));
        const remainingDays = Math.max(0, totalDays - elapsedDays);
        const estimatedEnd = new Date(entry.lastSalDate.getTime() + remainingDays * 86400000);

        timeline.set(project.id, {
          ...entry,
          lastSalDate: estimatedEnd,
        });
      }
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
      const budgetAmount = project.budget.amount;
      const progress =
        budgetAmount > 0 && timeline?.totalSalAmount
          ? Math.min(100, (timeline.totalSalAmount / budgetAmount) * 100)
          : 0;

      return {
        id: project.id,
        label: project.title,
        subtitle: project.contractor ?? "",
        startDate,
        endDate,
        days,
        color,
        tone: project.tone,
        progress,
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
