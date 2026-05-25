import { m } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderKanban,
  HardHat,
  MapPin,
  Plus,
  Route,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ModernDonut, SegmentBars } from "@/components/shared/LegacyCharts";
import { Panel } from "@/components/shared/Panel";
import { type StatusTone, statusToneStyles } from "@/components/shared/StatusBadge";
import {
  calculateProjectPerformanceForecast,
  type ProjectFinancials,
  type SalProgressRow,
} from "@/features/project-detail/domain/project-detail-model";
import type { PortfolioProject } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MOTION_VARIANTS } from "@/motion";
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
  budgetAmount: number;
  contractor: string;
  financialProgress: number;
  forecastDeltaDays: number;
  healthLabel: string;
  location: string;
  lot: string;
  manager: string;
  milestone: string;
  phase: string;
  physicalProgress: number;
  salAmount: number;
  salState: string;
};

export type DashboardSalView = {
  projectId: string;
  date: string;
  closedAt?: string;
  status: string;
  total: number;
};

export type DashboardOperationalTotal = {
  approvedAmount: number;
  approvedCount: number;
  committedAmount: number;
  draftAmount: number;
  draftCount: number;
  inReviewAmount: number;
  inReviewCount: number;
  lastSalDate: string | null;
  lastSalTotal: number;
  progressPercent: number;
  salCount: number;
};

export type DashboardRealitySummary = {
  approvedAmount: number;
  approvedCount: number;
  budgetOverrunAmount: number;
  budgetOverrunCount: number;
  committedAmount: number;
  draftAmount: number;
  draftCount: number;
  inReviewAmount: number;
  inReviewCount: number;
  lastSal: {
    amount: number;
    date: string;
    projectTitle: string;
    status: string;
  } | null;
  progressPercent: number;
  residualAmount: number;
  salCount: number;
  totalBudget: number;
  withoutSalCount: number;
};

export function PriorityActions({ items }: { items: PortfolioProject[] }) {
  if (items.length === 0) return null;

  return (
    <Panel>
      <div className="space-y-3">
        {items.slice(0, 4).map((project, index) => (
          <m.div
            className="flex items-start gap-3 rounded-18px p-3 transition-colors duration-[var(--duration-base)] ease-standard hover:bg-[var(--bg-muted)]"
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
    </Panel>
  );
}

export function PortfolioRealityPanel({
  projects,
  summary,
}: {
  projects: PortfolioProject[];
  summary: DashboardRealitySummary;
}) {
  if (projects.length === 0 && summary.salCount === 0) return null;

  const activeAmount = summary.draftAmount + summary.inReviewAmount;
  const activeCount = summary.draftCount + summary.inReviewCount;

  return (
    <Panel className="overflow-hidden" padding="none">
      <div className="grid gap-px bg-[var(--border-subtle)]/55 md:grid-cols-[1.2fr_1fr_1fr]">
        <RealityBlock
          icon={FileText}
          eyebrow="SAL reali"
          title={`${summary.salCount} document${summary.salCount === 1 ? "o" : "i"}`}
          detail={`${summary.approvedCount} approvat${summary.approvedCount === 1 ? "o" : "i"} · ${activeCount} apert${activeCount === 1 ? "o" : "i"}`}
        >
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat label="Approvati" value={String(summary.approvedCount)} tone="success" />
            <MiniStat label="Revisione" value={String(summary.inReviewCount)} tone="info" />
            <MiniStat label="Bozze" value={String(summary.draftCount)} tone="warning" />
          </div>
        </RealityBlock>

        <RealityBlock
          icon={CircleDollarSign}
          eyebrow="Importi"
          title={formatCompactMoney(summary.committedAmount)}
          detail={`Residuo ${formatCompactMoney(summary.residualAmount)}`}
        >
          <div className="mt-4 space-y-2">
            <AmountLine label="Approvato" value={summary.approvedAmount} />
            <AmountLine label="Aperto" value={activeAmount} />
          </div>
        </RealityBlock>

        <RealityBlock
          icon={Target}
          eyebrow="Copertura budget"
          title={`${summary.progressPercent.toFixed(1)}%`}
          detail={`${summary.withoutSalCount} cantier${summary.withoutSalCount === 1 ? "e" : "i"} senza SAL`}
        >
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
            <div
              className={cn(
                "h-full rounded-full",
                summary.budgetOverrunAmount > 0
                  ? "bg-[var(--danger-base)]"
                  : "bg-[var(--accent-primary)]",
              )}
              style={{ width: `${clampPercent(summary.progressPercent)}%` }}
            />
          </div>
          <div className="mt-2 text-11px font-semibold text-[var(--text-secondary)]">
            {summary.budgetOverrunCount > 0
              ? `${summary.budgetOverrunCount} budget superat${summary.budgetOverrunCount === 1 ? "o" : "i"}`
              : "Budget nei limiti sui dati SAL"}
          </div>
        </RealityBlock>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1.2fr]">
        <RealityFooterItem
          icon={CalendarDays}
          label="Ultimo SAL"
          value={
            summary.lastSal
              ? `${formatShortDate(new Date(summary.lastSal.date))} · ${summary.lastSal.projectTitle}`
              : "Nessun SAL registrato"
          }
        />
        <RealityFooterItem
          icon={TrendingUp}
          label="Ultimo importo"
          value={
            summary.lastSal
              ? formatMoney({ amount: summary.lastSal.amount, currency: "EUR" })
              : "0,00 €"
          }
        />
        <RealityFooterItem
          icon={AlertTriangle}
          label="Segnali da guardare"
          value={`${summary.withoutSalCount} senza SAL · ${summary.draftCount} bozze · ${summary.inReviewCount} revisioni`}
        />
      </div>
    </Panel>
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
  const today = useMemo(() => new Date(), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [focus, setFocus] = useState<"all" | "risk" | "active">("all");
  const [density, setDensity] = useState<"compact" | "comfortable" | "wide">("comfortable");
  const scrollRef = useRef<HTMLDivElement>(null);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const visibleBars = useMemo(() => {
    const filtered = bars.filter((bar) => {
      if (focus === "risk") return bar.tone !== "success";
      if (focus === "active") return bar.salAmount > 0 || bar.physicalProgress > 0;
      return true;
    });
    const toneWeight = { danger: 0, warning: 1, success: 2 } as Record<StatusTone, number>;
    return filtered.toSorted((a, b) => {
      const toneDiff = toneWeight[a.tone] - toneWeight[b.tone];
      return toneDiff !== 0 ? toneDiff : a.endDate.getTime() - b.endDate.getTime();
    });
  }, [bars, focus]);

  let minTime = today.getTime();
  let maxTime = today.getTime();
  for (const bar of visibleBars.length > 0 ? visibleBars : bars) {
    minTime = Math.min(minTime, bar.startDate.getTime());
    maxTime = Math.max(maxTime, bar.endDate.getTime());
  }

  const minDate = startOfMonth(new Date(minTime));
  const maxDate = endOfMonth(new Date(maxTime));
  const monthTicks = useMemo(() => buildMonthTicks(minDate, maxDate), [minDate, maxDate]);
  const monthWidth = density === "compact" ? 74 : density === "wide" ? 132 : 96;
  const rowHeight = density === "compact" ? 86 : density === "wide" ? 116 : 104;
  const leftColumnWidth = density === "compact" ? 380 : 430;
  const timelineWidth = useMemo(
    () => Math.max(monthTicks.length * monthWidth + 80, 620),
    [monthTicks.length, monthWidth],
  );

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

  const xScale = useMemo(() => {
    const tMin = minDate.getTime();
    const tRange = maxDate.getTime() - tMin || 1;
    return (d: Date) => ((d.getTime() - tMin) / tRange) * 100;
  }, [minDate, maxDate]);

  function barStyle(bar: GanttBar) {
    const left = Math.max(xScale(bar.startDate), 0);
    const right = Math.min(xScale(bar.endDate), 100);
    return { left: `${left}%`, width: `${Math.max(right - left, 0.7)}%` };
  }

  const toneTotals = [
    {
      color: "var(--success-base)",
      count: visibleBars.filter((b) => b.tone === "success").length,
      label: "In linea",
    },
    {
      color: "var(--warning-base)",
      count: visibleBars.filter((b) => b.tone === "warning").length,
      label: "Attenzione",
    },
    {
      color: "var(--danger-base)",
      count: visibleBars.filter((b) => b.tone === "danger").length,
      label: "Critico",
    },
  ];
  const avgProgress =
    visibleBars.length > 0
      ? Math.round(
          visibleBars.reduce((sum, bar) => sum + bar.financialProgress, 0) / visibleBars.length,
        )
      : 0;
  const totalSalAmount = visibleBars.reduce((sum, bar) => sum + bar.salAmount, 0);
  const nextMilestone = visibleBars.toSorted(
    (a, b) => a.endDate.getTime() - b.endDate.getTime(),
  )[0];

  if (bars.length === 0) return null;

  return (
    <Panel className="overflow-hidden" padding="none">
      <div className="border-b border-[var(--border-subtle)]/60 p-4 lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              <HardHat className="size-3.5" />
              <span>Gantt operativo</span>
            </div>
            <h2 className="mt-2 text-18px font-semibold leading-tight text-[var(--text-primary)]">
              Pianificazione cantieri e SAL
            </h2>
            <p className="mt-1 max-w-[780px] text-12px font-medium leading-5 text-[var(--text-secondary)]">
              Avanzamento fisico, esposizione SAL, rischio e fine prevista nella stessa riga.
            </p>
          </div>

          <div className="grid min-w-[min(100%,520px)] grid-cols-2 gap-2 sm:grid-cols-4">
            <GanttStat icon={HardHat} label="Cantieri" value={String(visibleBars.length)} />
            <GanttStat icon={TrendingUp} label="Av. medio" value={`${avgProgress}%`} />
            <GanttStat
              icon={CircleDollarSign}
              label="SAL"
              value={formatCompactMoney(totalSalAmount)}
            />
            <GanttStat
              icon={Target}
              label="Prossima fine"
              value={nextMilestone ? formatShortDate(nextMilestone.endDate) : "N.D."}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <SegmentedButton active={focus === "all"} onClick={() => setFocus("all")}>
              Tutti
            </SegmentedButton>
            <SegmentedButton active={focus === "risk"} onClick={() => setFocus("risk")}>
              Rischio
            </SegmentedButton>
            <SegmentedButton active={focus === "active"} onClick={() => setFocus("active")}>
              Con SAL
            </SegmentedButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-11px font-semibold text-[var(--text-secondary)]">Zoom</span>
            <SegmentedButton active={density === "compact"} onClick={() => setDensity("compact")}>
              S
            </SegmentedButton>
            <SegmentedButton
              active={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
            >
              M
            </SegmentedButton>
            <SegmentedButton active={density === "wide"} onClick={() => setDensity("wide")}>
              L
            </SegmentedButton>
          </div>
        </div>
      </div>

      <div className="flex overflow-hidden bg-[var(--surface-base)]">
        <div
          className="sticky left-0 z-20 shrink-0 border-r border-[var(--border-subtle)]/65 bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)]"
          style={{ width: leftColumnWidth }}
        >
          <div className="grid h-12 grid-cols-[1fr_86px_72px] items-center gap-3 border-b border-[var(--border-subtle)]/65 px-4 text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
            <span>Cantiere</span>
            <span>SAL</span>
            <span>Stato</span>
          </div>
          {visibleBars.length === 0 ? (
            <div className="p-4 text-12px font-medium text-[var(--text-secondary)]">
              Nessun cantiere nel filtro selezionato.
            </div>
          ) : null}
          {visibleBars.map((bar) => {
            const operational = operationalByProjectId.get(bar.id);
            return (
              <div
                className={cn(
                  "group relative grid grid-cols-[1fr_86px_72px] items-center gap-3 border-b border-[var(--border-subtle)]/45 px-4 py-3 transition-colors duration-[var(--duration-fast)]",
                  hoveredId === bar.id && "bg-[var(--bg-muted)]/45",
                )}
                key={bar.id}
                style={{ height: rowHeight }}
              >
                <button
                  className="min-w-0 text-left"
                  onClick={() => {
                    const project = projectById.get(bar.id);
                    if (project) onOpen(project);
                  }}
                  onMouseEnter={() => setHoveredId(bar.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  type="button"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[12px]",
                        bar.tone === "danger"
                          ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                          : bar.tone === "warning"
                            ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                            : "bg-[var(--success-soft)] text-[var(--success-base)]",
                      )}
                    >
                      <FolderKanban className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-13px font-semibold leading-tight text-[var(--text-primary)]">
                          {bar.label}
                        </span>
                        <span className="shrink-0 rounded-[8px] bg-[var(--bg-muted)] px-1.5 py-0.5 text-9px font-bold text-[var(--text-secondary)]">
                          {bar.lot || "lotto"}
                        </span>
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-11px font-medium text-[var(--text-secondary)]">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">
                          {bar.contractor} · {bar.location || "Sede non indicata"}
                        </span>
                      </div>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-10px font-semibold text-[var(--text-tertiary)]">
                        <span className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--surface-base)] px-1.5 py-0.5 ring-1 ring-[var(--border-subtle)]/55">
                          <Route className="size-3" />
                          {bar.phase || "fase non indicata"}
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1 rounded-[8px] bg-[var(--surface-base)] px-1.5 py-0.5 ring-1 ring-[var(--border-subtle)]/55">
                          <UserRound className="size-3 shrink-0" />
                          <span className="truncate">{bar.manager || "PM non assegnato"}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="min-w-0">
                  <div className="text-13px font-bold tabular-nums text-[var(--text-primary)]">
                    {bar.financialProgress.toFixed(0)}%
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        bar.tone === "danger"
                          ? "bg-[var(--danger-base)]"
                          : bar.tone === "warning"
                            ? "bg-[var(--warning-base)]"
                            : "bg-[var(--accent-primary)]",
                      )}
                      style={{ width: `${clampPercent(bar.financialProgress)}%` }}
                    />
                  </div>
                  <div className="mt-1 truncate text-10px font-semibold text-[var(--text-tertiary)]">
                    {formatCompactMoney(operational?.committedAmount ?? bar.salAmount)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div
                    className={cn(
                      "inline-flex max-w-full items-center rounded-[9px] px-2 py-1 text-10px font-bold",
                      bar.tone === "danger"
                        ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                        : bar.tone === "warning"
                          ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                          : "bg-[var(--success-soft)] text-[var(--success-base)]",
                    )}
                  >
                    <span className="truncate">{getToneLabel(bar.tone)}</span>
                  </div>
                  <div className="mt-1 text-10px font-semibold tabular-nums text-[var(--text-tertiary)]">
                    fisico {bar.physicalProgress.toFixed(0)}%
                  </div>
                </div>
                <button
                  aria-label={`Elimina ${bar.label}`}
                  className="absolute right-2 top-2 rounded-[10px] bg-[var(--danger-soft)]/45 p-1.5 text-[var(--danger-base)] opacity-0 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] hover:bg-[var(--danger-soft)] active:scale-[0.94] group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetId(bar.id);
                  }}
                  type="button"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto" ref={scrollRef}>
          <div className="relative" style={{ width: "100%", minWidth: timelineWidth }}>
            <div className="sticky top-0 z-10 h-12 border-b border-[var(--border-subtle)]/65 bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)]">
              {monthTicks.map((tick, index) => {
                const next = monthTicks[index + 1] ?? addMonths(tick, 1);
                const left = xScale(tick);
                const width = Math.max(4, xScale(next) - left);
                const isNewYear =
                  index === 0 || tick.getFullYear() !== monthTicks[index - 1]?.getFullYear();
                return (
                  <div
                    className={cn(
                      "absolute flex h-full items-center justify-center border-l border-[var(--border-subtle)]/45 px-2",
                      index % 2 === 1 && "bg-[color-mix(in_srgb,var(--bg-muted)_34%,transparent)]",
                    )}
                    key={tick.getTime()}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span
                      className={cn(
                        "truncate text-10px font-bold uppercase",
                        isNewYear ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]",
                      )}
                    >
                      {tick.toLocaleDateString("it-IT", { month: "short" })}
                      {isNewYear ? ` ${tick.getFullYear()}` : ""}
                    </span>
                  </div>
                );
              })}
              <div
                className="absolute top-0 flex h-full -translate-x-1/2 items-center"
                style={{ left: `${xScale(today)}%` }}
              >
                <span className="rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-9px font-bold text-[var(--accent-contrast)] shadow-soft">
                  Oggi
                </span>
              </div>
            </div>

            <div className="relative">
              {visibleBars.map((bar) => {
                const isHovered = hoveredId === bar.id;
                const bs = barStyle(bar);
                const physicalProgress = clampPercent(bar.physicalProgress);
                const financialProgress = clampPercent(bar.financialProgress);
                const visibleFinancialProgress =
                  financialProgress > 0 ? Math.max(4, financialProgress) : 0;
                const isTodayInside =
                  today.getTime() >= bar.startDate.getTime() &&
                  today.getTime() <= bar.endDate.getTime();
                const project = projectById.get(bar.id);

                return (
                  <button
                    className={cn(
                      "relative block w-full cursor-pointer border-b border-[var(--border-subtle)]/45 text-left transition-colors duration-[var(--duration-fast)]",
                      isHovered
                        ? "bg-[var(--bg-muted)]/34"
                        : "bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--bg-muted)_22%,transparent))]",
                    )}
                    key={bar.id}
                    onClick={() => {
                      if (project) onOpen(project);
                    }}
                    onMouseEnter={() => setHoveredId(bar.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ height: rowHeight }}
                    type="button"
                  >
                    {monthTicks.map((tick) => (
                      <span
                        className="pointer-events-none absolute top-0 bottom-0 w-px border-l border-dashed border-[var(--border-subtle)]/38"
                        key={`${bar.id}-${tick.getTime()}`}
                        style={{ left: `${xScale(tick)}%` }}
                      />
                    ))}

                    <span className="absolute left-4 top-3 flex flex-wrap items-center gap-2 text-10px font-semibold text-[var(--text-tertiary)]">
                      <span className="inline-flex items-center gap-1 rounded-[8px] bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] px-1.5 py-0.5 ring-1 ring-[var(--border-subtle)]/50">
                        <CalendarDays className="size-3" />
                        {formatShortDate(bar.startDate)} - {formatShortDate(bar.endDate)}
                      </span>
                      <span className="rounded-[8px] bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] px-1.5 py-0.5 ring-1 ring-[var(--border-subtle)]/50">
                        {bar.days}g
                      </span>
                      {bar.forecastDeltaDays !== 0 ? (
                        <span
                          className={cn(
                            "rounded-[8px] px-1.5 py-0.5",
                            bar.forecastDeltaDays > 0
                              ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                              : "bg-[var(--success-soft)] text-[var(--success-base)]",
                          )}
                        >
                          {bar.forecastDeltaDays > 0 ? "+" : ""}
                          {bar.forecastDeltaDays}g forecast
                        </span>
                      ) : null}
                    </span>

                    <span
                      className="absolute top-[54%] h-7 -translate-y-1/2 rounded-[12px] border shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_70%,transparent)] transition-[height,box-shadow,transform] duration-[var(--duration-base)] ease-standard"
                      style={{
                        ...bs,
                        background: `linear-gradient(90deg, color-mix(in srgb, ${bar.color} 16%, var(--surface-base)), color-mix(in srgb, ${bar.color} 7%, var(--surface-base)))`,
                        borderColor: `color-mix(in srgb, ${bar.color} 36%, var(--border-subtle))`,
                        boxShadow: isHovered
                          ? `0 14px 34px color-mix(in srgb, ${bar.color} 18%, transparent)`
                          : undefined,
                      }}
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-[13px]"
                        style={{
                          width: `${visibleFinancialProgress}%`,
                          background: `linear-gradient(90deg, ${bar.color}, color-mix(in srgb, ${bar.color} 78%, var(--surface-base)))`,
                        }}
                      />
                      <span
                        className="absolute -bottom-2 left-0 h-px border-t-2 border-dashed border-[var(--accent-primary)]/75"
                        style={{ width: `${physicalProgress}%` }}
                      />
                      {financialProgress >= 10 ? (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-10px font-bold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.32)]">
                          SAL {financialProgress.toFixed(0)}%
                        </span>
                      ) : (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 rounded-[8px] bg-[color-mix(in_srgb,var(--surface-base)_94%,transparent)] px-1.5 py-0.5 text-9px font-bold tabular-nums text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/65"
                          style={{ left: 8 }}
                        >
                          SAL {financialProgress.toFixed(0)}%
                        </span>
                      )}
                      <span className="absolute -left-1 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-[var(--surface-base)] bg-[var(--text-secondary)]" />
                      <span
                        className="absolute -right-1 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-[var(--surface-base)]"
                        style={{ backgroundColor: bar.color }}
                      />
                    </span>

                    {isTodayInside ? (
                      <span
                        className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                        style={{ left: `${xScale(today)}%` }}
                      >
                        <span className="size-2.5 rounded-full bg-[var(--accent-primary)] ring-2 ring-[var(--surface-base)]" />
                        <span className="rounded-[8px] bg-[var(--accent-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--accent-primary)]">
                          live
                        </span>
                      </span>
                    ) : null}

                    <span
                      className="absolute bottom-3 flex max-w-[220px] -translate-x-1/2 items-center gap-1.5 rounded-[10px] border border-[var(--border-subtle)]/55 bg-[color-mix(in_srgb,var(--surface-base)_94%,transparent)] px-2 py-1 text-10px font-semibold text-[var(--text-secondary)] shadow-soft"
                      style={{ left: `${Math.min(92, Math.max(8, xScale(bar.endDate)))}%` }}
                    >
                      <Target className="size-3 shrink-0 text-[var(--accent-primary)]" />
                      <span className="truncate">
                        {bar.milestone || bar.phase || "Fine prevista"}
                      </span>
                      <span className="shrink-0 text-[var(--text-primary)]">
                        {formatShortDate(bar.endDate)}
                      </span>
                    </span>

                    <span className="absolute right-4 top-3 flex items-center gap-2 text-10px font-semibold text-[var(--text-tertiary)]">
                      <span>fisico {physicalProgress.toFixed(0)}%</span>
                      <span>budget {formatCompactMoney(bar.budgetAmount)}</span>
                    </span>
                  </button>
                );
              })}

              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10"
                style={{ left: `${xScale(today)}%` }}
              >
                <div className="h-full w-px bg-[var(--accent-primary)] opacity-70" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)]/45 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-10px font-semibold text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-8 rounded-full bg-[var(--accent-primary)]" />
            SAL maturati
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-8 border-t border-dashed border-[var(--text-secondary)]" />
            avanzamento fisico
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--accent-primary)]" />
            oggi
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {toneTotals
            .filter((t) => t.count > 0)
            .map((t) => (
              <span
                className="flex items-center gap-1.5 text-10px font-semibold text-[var(--text-secondary)]"
                key={t.label}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
                <span className="font-bold text-[var(--text-primary)]">{t.count}</span>
              </span>
            ))}
        </div>
      </div>

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
    </Panel>
  );
}

export function TimelineGanttLegacy({
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
                    className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full transition-all duration-[var(--duration-reveal)] ease-standard"
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

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }).replace(".", "");
}

function formatCompactMoney(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(amount);
}

function getToneLabel(tone: StatusTone): string {
  if (tone === "danger") return "critico";
  if (tone === "warning") return "attenzione";
  return "in linea";
}

function SegmentedButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-8 rounded-[10px] border px-3 text-12px font-semibold transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] active:scale-[0.97]",
        active
          ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function GanttStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] px-3 py-2">
      <div className="flex items-center gap-1.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
        <Icon className="size-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-15px font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
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
        <EmptyState
          icon={HardHat}
          title="Nessun cantiere nel portafoglio."
          description="Crea un progetto per iniziare a monitorare i lavori."
        />
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
  const toneClass = statusToneStyles[project.tone];

  return (
    <m.article
      className="group cursor-pointer rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_56%,transparent)] bg-[var(--surface-base)] p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--text-primary)_5%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_52%,transparent)] transition-[box-shadow,background-color] duration-[var(--duration-base)] ease-standard hover:bg-[color-mix(in_srgb,var(--surface-base)_90%,var(--bg-muted)_10%)] hover:shadow-[0_18px_44px_color-mix(in_srgb,var(--text-primary)_8%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_14%,transparent)]"
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
      <Panel padding="lg">
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
      </Panel>

      <Panel padding="lg" className="xl:col-span-2">
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
      </Panel>

      <Panel padding="lg">
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
      </Panel>
    </aside>
  );
}

function ActionButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-18px bg-[var(--bg-muted)]/70 px-4 py-3 text-left text-13px font-semibold text-[var(--text-primary)] transition-colors duration-[var(--duration-base)] ease-standard hover:bg-[var(--bg-muted)]"
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

function RealityBlock({
  children,
  detail,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  detail: string;
  eyebrow: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="bg-[var(--surface-base)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-13px bg-[var(--info-soft)] text-[var(--info-base)]">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
            {eyebrow}
          </div>
          <div className="mt-1 truncate text-20px font-bold leading-none text-[var(--text-primary)]">
            {title}
          </div>
          <div className="mt-1 text-12px font-medium leading-4 text-[var(--text-secondary)]">
            {detail}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "info" | "success" | "warning";
  value: string;
}) {
  return (
    <div className="rounded-12px bg-[var(--bg-muted)]/72 p-2">
      <div
        className={cn(
          "text-14px font-bold leading-none",
          tone === "success" && "text-[var(--success-base)]",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "info" && "text-[var(--info-base)]",
        )}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-10px font-semibold text-[var(--text-secondary)]">
        {label}
      </div>
    </div>
  );
}

function AmountLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-12px">
      <span className="font-semibold text-[var(--text-secondary)]">{label}</span>
      <span className="font-bold tabular-nums text-[var(--text-primary)]">
        {formatMoney({ amount: value, currency: "EUR" })}
      </span>
    </div>
  );
}

function RealityFooterItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-14px bg-[var(--bg-muted)]/62 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-10px bg-[var(--surface-base)] text-[var(--info-base)] ring-1 ring-[var(--border-subtle)]/55">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="text-10px font-bold uppercase tracking-0_12em text-[var(--text-secondary)]">
          {label}
        </div>
        <div className="mt-0.5 truncate text-12px font-semibold text-[var(--text-primary)]">
          {value}
        </div>
      </div>
    </div>
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

function salTime(view: { date: string; closedAt?: string }) {
  return new Date(view.closedAt || view.date).getTime();
}

export function buildOverviewMetrics(
  projects: PortfolioProject[],
  summary: DashboardRealitySummary,
) {
  const totalBudget = projects.reduce((total, project) => total + project.budget.amount, 0);
  const escalationCount = summary.budgetOverrunCount;
  const openSalCount = summary.draftCount + summary.inReviewCount;

  return [
    {
      badge: `${summary.progressPercent.toFixed(1)}% SAL`,
      caption: `${formatMoney({ amount: summary.committedAmount, currency: "EUR" })} maturati`,
      icon: Building2,
      label: "Budget portafoglio",
      tone: "blue" as const,
      value: formatMoney({ amount: totalBudget, currency: "EUR" }),
    },
    {
      badge: `${summary.withoutSalCount} senza SAL`,
      caption: `${summary.salCount} SAL reali su ${projects.length} cantieri`,
      icon: HardHat,
      label: "Lotti attivi",
      tone: "success" as const,
      value: String(projects.length),
    },
    {
      caption: `${summary.approvedCount} approvati · ${openSalCount} aperti`,
      icon: TrendingUp,
      label: "SAL registrati",
      tone: openSalCount > 0 ? ("warning" as const) : ("info" as const),
      value: String(summary.salCount),
    },
    {
      caption:
        summary.budgetOverrunAmount > 0
          ? `${formatMoney({ amount: summary.budgetOverrunAmount, currency: "EUR" })} oltre budget`
          : "Nessun superamento budget dai SAL",
      icon: FolderKanban,
      label: "Criticita budget",
      tone: escalationCount > 0 ? ("danger" as const) : ("success" as const),
      value: String(escalationCount),
    },
  ];
}

export function buildDashboardRealitySummary(
  projects: PortfolioProject[],
  views: DashboardSalView[],
  operationalByProjectId: Map<string, DashboardOperationalTotal>,
): DashboardRealitySummary {
  const totalBudget = projects.reduce((total, project) => total + project.budget.amount, 0);
  let approvedAmount = 0;
  let approvedCount = 0;
  let committedAmount = 0;
  let draftAmount = 0;
  let draftCount = 0;
  let inReviewAmount = 0;
  let inReviewCount = 0;
  let budgetOverrunAmount = 0;
  let budgetOverrunCount = 0;
  let withoutSalCount = 0;

  for (const project of projects) {
    const operational = operationalByProjectId.get(project.id);
    if (!operational || operational.salCount === 0) {
      withoutSalCount++;
      continue;
    }

    approvedAmount += operational.approvedAmount;
    approvedCount += operational.approvedCount;
    committedAmount += operational.committedAmount;
    draftAmount += operational.draftAmount;
    draftCount += operational.draftCount;
    inReviewAmount += operational.inReviewAmount;
    inReviewCount += operational.inReviewCount;

    const overrun = operational.committedAmount - project.budget.amount;
    if (overrun > 0) {
      budgetOverrunAmount += overrun;
      budgetOverrunCount++;
    }
  }

  const titleByProjectId = new Map(projects.map((project) => [project.id, project.title]));
  const lastView = [...views].sort((left, right) => salTime(right) - salTime(left))[0];

  return {
    approvedAmount,
    approvedCount,
    budgetOverrunAmount,
    budgetOverrunCount,
    committedAmount,
    draftAmount,
    draftCount,
    inReviewAmount,
    inReviewCount,
    lastSal: lastView
      ? {
          amount: lastView.total,
          date: lastView.closedAt || lastView.date,
          projectTitle: titleByProjectId.get(lastView.projectId) ?? "Progetto",
          status: lastView.status,
        }
      : null,
    progressPercent: totalBudget > 0 ? (committedAmount / totalBudget) * 100 : 0,
    residualAmount: totalBudget - committedAmount,
    salCount: views.length,
    totalBudget,
    withoutSalCount,
  };
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
    { firstSalDate: Date; lastSalDate: Date; totalSalAmount: number; rows: SalProgressRow[] }
  >();

  for (const view of views) {
    const existing = timeline.get(view.projectId);
    const salDate = new Date(view.date);
    const row = {
      amount: view.total,
      date: view.date,
      isApproved: view.status === "approved",
      isClosed: view.status === "closed",
    };

    if (!existing) {
      timeline.set(view.projectId, {
        firstSalDate: salDate,
        lastSalDate: salDate,
        rows: [row],
        totalSalAmount: view.total,
      });
    } else {
      timeline.set(view.projectId, {
        firstSalDate: salDate < existing.firstSalDate ? salDate : existing.firstSalDate,
        lastSalDate: salDate > existing.lastSalDate ? salDate : existing.lastSalDate,
        rows: [...existing.rows, row],
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
        rows: [],
        totalSalAmount: 0,
      });
      continue;
    }

    const financials: ProjectFinancials = {
      approvedAmount: entry.rows.reduce(
        (sum, row) => (row.isApproved || row.isClosed ? sum + row.amount : sum),
        0,
      ),
      committed: entry.totalSalAmount,
      contractual: project.budget.amount,
      currentSalAmount: entry.rows[entry.rows.length - 1]?.amount ?? 0,
      draftAmount: entry.rows.reduce(
        (sum, row) => (!row.isApproved && !row.isClosed ? sum + row.amount : sum),
        0,
      ),
      progress:
        project.budget.amount > 0
          ? Math.min(100, (entry.totalSalAmount / project.budget.amount) * 100)
          : 0,
      residual: project.budget.amount - entry.totalSalAmount,
    };
    const forecast = calculateProjectPerformanceForecast(entry.rows, financials, project.salDays);

    if (forecast.estimatedEndDate) {
      timeline.set(project.id, {
        ...entry,
        lastSalDate: forecast.estimatedEndDate,
      });
    }
  }

  return new Map(
    [...timeline.entries()].map(([projectId, entry]) => [
      projectId,
      {
        firstSalDate: entry.firstSalDate,
        lastSalDate: entry.lastSalDate,
        totalSalAmount: entry.totalSalAmount,
      },
    ]),
  );
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
        budgetAmount,
        contractor: project.contractor,
        financialProgress: progress,
        forecastDeltaDays: project.forecastDeltaDays,
        healthLabel: project.healthLabel,
        id: project.id,
        label: project.title,
        location: project.location,
        lot: project.lot,
        manager: project.manager,
        milestone: project.nextMilestone,
        phase: project.phase,
        physicalProgress: project.progress,
        startDate,
        endDate,
        days,
        color,
        tone: project.tone,
        progress,
        salAmount: timeline?.totalSalAmount ?? 0,
        salState: project.salState,
        subtitle: project.contractor ?? "",
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
