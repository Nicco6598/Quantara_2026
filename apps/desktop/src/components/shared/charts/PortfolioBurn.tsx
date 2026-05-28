import { m } from "framer-motion";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type uPlot from "uplot";
import { cn } from "@/lib/utils";
import { buildCalendarAxisTicks } from "./chart-helpers";
import { UplotChart } from "./UplotChart";
import { useChartColors } from "./useChartColors";

type Timeframe = "3M" | "6M" | "1Y" | "ALL";

const TF_OPTS: { key: Timeframe; label: string }[] = [
  { key: "ALL", label: "Tutto" },
  { key: "1Y", label: "Ultimo anno" },
  { key: "6M", label: "Ultimi 6 mesi" },
  { key: "3M", label: "Ultimi 3 mesi" },
];

const TF_LABEL: Record<Timeframe, string> = {
  ALL: "Tutto",
  "1Y": "1 anno",
  "6M": "6 mesi",
  "3M": "3 mesi",
};

type PortfolioBurnProps = {
  projects: Array<{ id: string; title: string }>;
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>;
  totalBudget: number;
};

type SalView = { date: string; closedAt?: string; total: number };
type SalIncrease = {
  projectTitle: string;
  total: number;
};
type PortfolioTrend = {
  dates: number[];
  cumulative: number[];
  deltas: number[];
  increases: SalIncrease[][];
};

function viewTimeMs(view: { date: string; closedAt?: string }): number {
  return new Date(view.closedAt || view.date).getTime();
}

function toSeconds(timeMs: number): number {
  return Math.floor(timeMs / 1000);
}

function sortViews(views: SalView[]): SalView[] {
  return [...views].sort((left, right) => viewTimeMs(left) - viewTimeMs(right));
}

function formatMoney(value: number): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getProjectDates(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string }>>,
): number[] {
  const all: number[] = [];
  for (const views of viewsByProjectId.values()) {
    for (const v of views) {
      all.push(viewTimeMs(v));
    }
  }
  return all;
}

function buildPortfolioTrend(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>,
  projects: Array<{ id: string; title: string }>,
  cutoff: number,
  windowEnd: number,
): PortfolioTrend {
  const projectTitleById = new Map(projects.map((project) => [project.id, project.title]));
  const rows: Array<{ timeMs: number; projectTitle: string; total: number }> = [];

  for (const [projectId, views] of viewsByProjectId) {
    const projectTitle = projectTitleById.get(projectId) ?? "Progetto";
    for (const view of sortViews(views)) {
      rows.push({
        projectTitle,
        timeMs: viewTimeMs(view),
        total: view.total,
      });
    }
  }

  rows.sort((left, right) => left.timeMs - right.timeMs);
  if (rows.length === 0) return { dates: [], cumulative: [], deltas: [], increases: [] };

  const hasWindowCutoff = Number.isFinite(cutoff);
  let cumulativeBeforeWindow = 0;
  const visibleRows: typeof rows = [];

  for (const row of rows) {
    if (hasWindowCutoff && row.timeMs < cutoff) {
      cumulativeBeforeWindow += row.total;
    } else {
      visibleRows.push(row);
    }
  }

  if (visibleRows.length === 0 && cumulativeBeforeWindow <= 0) {
    return { dates: [], cumulative: [], deltas: [], increases: [] };
  }

  const dates: number[] = [];
  const cumulative: number[] = [];
  const deltas: number[] = [];
  const increases: SalIncrease[][] = [];
  let running = cumulativeBeforeWindow;
  const firstVisibleTime = visibleRows[0]?.timeMs;

  if (
    hasWindowCutoff &&
    cumulativeBeforeWindow > 0 &&
    (firstVisibleTime === undefined || firstVisibleTime > cutoff)
  ) {
    dates.push(toSeconds(cutoff));
    cumulative.push(running);
    deltas.push(0);
    increases.push([]);
  }

  let index = 0;
  while (index < visibleRows.length) {
    const timeMs = visibleRows[index]?.timeMs;
    if (timeMs === undefined) break;

    const pointIncreases: SalIncrease[] = [];
    let pointDelta = 0;

    while (index < visibleRows.length && visibleRows[index]?.timeMs === timeMs) {
      const row = visibleRows[index];
      if (row) {
        pointDelta += row.total;
        pointIncreases.push({ projectTitle: row.projectTitle, total: row.total });
      }
      index++;
    }

    running += pointDelta;
    dates.push(toSeconds(timeMs));
    cumulative.push(running);
    deltas.push(pointDelta);
    increases.push(pointIncreases);
  }

  if (
    visibleRows.length === 0 &&
    hasWindowCutoff &&
    Number.isFinite(windowEnd) &&
    windowEnd > cutoff
  ) {
    dates.push(toSeconds(windowEnd));
    cumulative.push(running);
    deltas.push(0);
    increases.push([]);
  }

  return { dates, cumulative, deltas, increases };
}

export function PortfolioBurn({ projects, viewsByProjectId, totalBudget }: PortfolioBurnProps) {
  const { colors } = useChartColors();
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allDates = useMemo(() => getProjectDates(viewsByProjectId), [viewsByProjectId]);

  const cutoff = useMemo(() => {
    if (timeframe === "ALL" || allDates.length === 0) return -Infinity;
    const dataMax = Math.max(...allDates);
    const days = timeframe === "3M" ? 90 : timeframe === "6M" ? 180 : 365;
    return dataMax - days * 86400000;
  }, [timeframe, allDates]);

  const trend = useMemo(() => {
    const windowEnd = allDates.length > 0 ? Math.max(...allDates) : NaN;
    return buildPortfolioTrend(viewsByProjectId, projects, cutoff, windowEnd);
  }, [viewsByProjectId, projects, cutoff, allDates]);

  if (trend.dates.length === 0) return null;

  const maxSal = Math.max(...trend.cumulative, 0);
  const showBudgetLine = totalBudget > 0 && totalBudget <= Math.max(maxSal * 1.8, 1);
  const data: uPlot.AlignedData = [
    trend.dates,
    trend.cumulative,
    trend.dates.map(() => totalBudget),
  ];
  const { dateTicks, monthTicks } = buildCalendarAxisTicks(trend.dates);
  const monthLabelByTick = new Map(monthTicks.map((tick) => [tick.ts, tick.label]));

  const renderTooltip = ({ index }: { index: number }) => {
    const date = trend.dates[index];
    const total = trend.cumulative[index] ?? 0;
    const pointDelta = trend.deltas[index] ?? 0;
    const pointIncreases = trend.increases[index] ?? [];
    const dateLabel =
      date !== undefined
        ? new Date(date * 1000).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

    const changedRows = pointIncreases
      .filter((row) => row.total > 0.005)
      .sort((left, right) => right.total - left.total);

    const rowsHtml =
      changedRows.length > 0
        ? changedRows
            .slice(0, 6)
            .map(
              (
                row,
              ) => `<div style="margin-top:5px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:baseline;font-size:12px;font-weight:650;color:var(--text-primary)">
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(row.projectTitle)}</span>
                <span style="color:var(--success-base)">+${formatMoney(row.total)}</span>
              </div>`,
            )
            .join("")
        : `<div style="margin-top:6px;font-size:11px;font-weight:600;color:var(--text-secondary)">Nessun nuovo SAL in questa data.</div>`;

    const hiddenCount = Math.max(0, changedRows.length - 6);
    const hiddenHtml =
      hiddenCount > 0
        ? `<div style="margin-top:4px;font-size:10px;font-weight:600;color:var(--text-secondary)">+${hiddenCount} altri aumenti</div>`
        : "";

    return `<div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">${dateLabel}</div>
      <div style="margin-top:4px;font-size:13px;font-weight:800;color:var(--text-primary)">Totale SAL ${formatMoney(total)}</div>
      <div style="margin-top:2px;font-size:11px;font-weight:700;color:var(--success-base)">Aumento ${formatMoney(pointDelta)}</div>
      <div style="margin-top:2px;font-size:10px;font-weight:600;color:var(--text-secondary)">Budget ${formatMoney(totalBudget)}</div>
      ${rowsHtml}${hiddenHtml}`;
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--info-base)]">
          <TrendingUp className="size-4" />
          Andamento portafoglio
        </div>
        <div className="relative" ref={ref}>
          <button
            className="flex items-center gap-1 rounded-full bg-[var(--bg-muted)]/70 px-2.5 py-1 text-10px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/50 backdrop-blur-sm transition-all duration-[var(--duration-fast)] ease-standard hover:bg-[var(--bg-muted-strong)]/70 active:scale-[0.96]"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {TF_LABEL[timeframe]}
            <ChevronDown
              className={cn(
                "size-3 opacity-60 transition-transform duration-[var(--duration-fast)]",
                open && "rotate-180",
              )}
            />
          </button>
          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[var(--z-topbar)]"
                onClick={() => setOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                tabIndex={-1}
                aria-label="Close"
              />
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full z-[var(--z-dropdown-menu)] mt-1.5 w-max min-w-[130px] origin-top-right overflow-hidden rounded-14px bg-[var(--surface-base)] p-1 shadow-soft ring-1 ring-[var(--border-subtle)]"
                initial={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                {TF_OPTS.map((opt) => (
                  <button
                    className={cn(
                      "flex w-full items-center rounded-10px px-3 py-2 text-left text-12px font-medium transition-colors",
                      timeframe === opt.key
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                    )}
                    key={opt.key}
                    onClick={() => {
                      setTimeframe(opt.key);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </m.div>
            </>
          )}
        </div>
      </div>
      <UplotChart
        animateData
        data={data}
        options={{
          title: "",
          legend: { show: true },
          scales: {
            y: {
              range: (_self: uPlot, _min: number, max: number) => [0, max > 0 ? max * 1.12 : 1],
            },
          },
          series: [
            {},
            {
              label: "SAL cumulati",
              stroke: colors.chart1,
              fill: `${colors.chart1}28`,
              width: 2,
              points: { show: true, size: 4, width: 1 } as const,
            },
            {
              label: "Budget totale",
              stroke: colors.chart5,
              dash: [4, 4] as number[],
              show: showBudgetLine,
              width: 1,
              points: { show: false } as const,
            },
          ],
          axes: [
            {
              stroke: colors.accentPrimary,
              grid: { show: false },
              ticks: { stroke: "transparent" as const },
              font: "700 11px system-ui",
              scale: "x",
              side: 2,
              size: 28,
              splits: monthTicks.map((tick) => tick.ts),
              values: (_self: unknown, ticks: number[]) =>
                ticks.map((t) =>
                  (
                    monthLabelByTick.get(t) ??
                    new Date(t * 1000).toLocaleDateString("it-IT", { month: "short" })
                  ).toUpperCase(),
                ),
            },
            {
              stroke: colors.textTertiary,
              grid: { stroke: `${colors.borderSubtle}44`, width: 1 },
              ticks: { stroke: "transparent" as const },
              font: "500 10px system-ui",
              scale: "x",
              side: 2,
              size: 26,
              splits: dateTicks,
              values: (_self: unknown, ticks: number[]) =>
                ticks.map((t) =>
                  new Date(t * 1000).toLocaleDateString("it-IT", {
                    day: "2-digit",
                  }),
                ),
            },
            {
              scale: "y",
              stroke: colors.textTertiary,
              grid: { stroke: `${colors.borderSubtle}44`, width: 1 },
              ticks: { stroke: "transparent" as const },
              font: "10px system-ui",
              size: 72,
              values: (_self: unknown, ticks: number[]) =>
                ticks.map((t) =>
                  t.toLocaleString("it-IT", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }),
                ),
            },
          ],
        }}
        tooltipAnchorSeries={1}
        tooltipMaxDistance={26}
        tooltipRenderer={renderTooltip}
      />
    </div>
  );
}
