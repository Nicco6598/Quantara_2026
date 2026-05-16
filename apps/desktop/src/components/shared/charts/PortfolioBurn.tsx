import { useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useChartColors } from "./useChartColors";
import { buildPortfolioBurnByProject } from "./chart-helpers";
import type { ProjectBurnSeries } from "./chart-helpers";
import { UplotChart } from "./UplotChart";
import { cn } from "@/lib/utils";
import type uPlot from "uplot";

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

const FILL_OPS = ["44", "33", "28"];

type PortfolioBurnProps = {
  projects: Array<{ id: string; title: string }>;
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>;
  totalBudget: number;
};

function getProjectDates(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string }>>,
): number[] {
  const all: number[] = [];
  for (const views of viewsByProjectId.values()) {
    for (const v of views) {
      all.push(new Date(v.closedAt || v.date).getTime());
    }
  }
  return all;
}

function filterViewsByTimeframe(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>,
  tf: Timeframe,
  overrideCutoff?: number,
): Map<string, Array<{ date: string; closedAt?: string; total: number }>> {
  if (tf === "ALL") return viewsByProjectId;

  const allDates = getProjectDates(viewsByProjectId);
  if (allDates.length === 0) return viewsByProjectId;

  const dataMax = Math.max(...allDates);
  const days = tf === "3M" ? 90 : tf === "6M" ? 180 : 365;
  const cutoff = overrideCutoff ?? dataMax - days * 86400000;

  const result = new Map<string, Array<{ date: string; closedAt?: string; total: number }>>();
  for (const [projectId, views] of viewsByProjectId) {
    result.set(
      projectId,
      views.filter((v) => new Date(v.closedAt || v.date).getTime() >= cutoff),
    );
  }
  return result;
}

function computePreCumulative(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>,
  cutoff: number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const [projectId, views] of viewsByProjectId) {
    let cum = 0;
    for (const v of views) {
      if (new Date(v.closedAt || v.date).getTime() < cutoff) {
        cum += v.total;
      }
    }
    result.set(projectId, cum);
  }
  return result;
}

function buildStackedSeries(projectSeries: ProjectBurnSeries[]): {
  dates: number[];
  layers: number[][];
} {
  if (projectSeries.length === 0) return { dates: [], layers: [] };

  const allDates = [...new Set(projectSeries.flatMap((s) => s.dates))].sort((a, b) => a - b);
  if (allDates.length === 0) return { dates: [], layers: [] };

  const layers: number[][] = [];
  const currentCum = projectSeries.map(() => 0);
  const pointers = projectSeries.map(() => 0);

  for (const date of allDates) {
    for (let p = 0; p < projectSeries.length; p++) {
      const s = projectSeries[p];
      if (!s) continue;
      let ptr = pointers[p] ?? 0;
      let nextDate = s.dates[ptr + 1];
      while (nextDate !== undefined && nextDate <= date) {
        ptr++;
        nextDate = s.dates[ptr + 1];
      }
      pointers[p] = ptr;
      currentCum[p] = s.cumulative[ptr] ?? 0;
    }
    const row: number[] = [];
    let running = 0;
    for (let p = 0; p < projectSeries.length; p++) {
      running += currentCum[p] ?? 0;
      row.push(running);
    }
    layers.push(row);
  }

  return { dates: allDates, layers };
}

const PALETTE: ReadonlyArray<keyof ReturnType<typeof useChartColors>["colors"]> = [
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  "chart6",
];

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

  const preCumulativeByProject = useMemo(
    () => computePreCumulative(viewsByProjectId, cutoff),
    [viewsByProjectId, cutoff],
  );

  const filteredViews = useMemo(
    () => filterViewsByTimeframe(viewsByProjectId, timeframe, cutoff),
    [viewsByProjectId, timeframe, cutoff],
  );

  const projectSeries = useMemo(() => {
    const series = buildPortfolioBurnByProject(filteredViews, projects);
    for (const s of series) {
      const pre = preCumulativeByProject.get(s.id) ?? 0;
      if (pre > 0) {
        s.cumulative = s.cumulative.map((c) => c + pre);
      }
    }
    return series;
  }, [filteredViews, projects, preCumulativeByProject]);

  if (projectSeries.length === 0) return null;

  const { dates, layers } = buildStackedSeries(projectSeries);

  if (dates.length === 0) return null;

  const data: uPlot.AlignedData = [dates];
  const seriesOpts: uPlot.Options["series"] = [{}];

  for (let p = 0; p < projectSeries.length; p++) {
    const col: number[] = [];
    for (let d = 0; d < layers.length; d++) {
      const layer = layers[d];
      if (!layer) continue;
      col.push(layer[p] ?? 0);
    }
    data.push(col);
    const paletteKey = PALETTE[p % PALETTE.length];
    const color = paletteKey ? colors[paletteKey] : colors.chart1;
    const opacityKey = FILL_OPS[p % FILL_OPS.length];
    const opacity = opacityKey ?? "44";
    const series = projectSeries[p];
    seriesOpts.push({
      label: series?.title ?? "",
      stroke: color,
      fill: `${color}${opacity}`,
      width: 2,
      points: { show: false } as const,
      fillTo: p as uPlot.Series["fillTo"],
    } as uPlot.Series);
  }

  const budgetValues = dates.map(() => totalBudget);
  data.push(budgetValues);
  seriesOpts.push({
    label: "Budget totale",
    stroke: colors.chart5,
    dash: [4, 4] as number[],
    width: 1,
    points: { show: false } as const,
  } as uPlot.Series);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--info-base)]">
          <TrendingUp className="size-4" />
          Andamento portafoglio
        </div>
        <div className="relative" ref={ref}>
          <button
            className="flex items-center gap-1 rounded-full bg-[var(--bg-muted)]/70 px-2.5 py-1 text-10px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/50 backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted-strong)]/70 active:scale-[0.96]"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {TF_LABEL[timeframe]}
            <ChevronDown
              className={cn(
                "size-3 opacity-60 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30"
                onClick={() => setOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                tabIndex={-1}
                aria-label="Close"
              />
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full z-40 mt-1.5 w-max min-w-[130px] origin-top-right overflow-hidden rounded-14px bg-[var(--surface-base)] p-1 shadow-soft ring-1 ring-[var(--border-subtle)]"
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
          series: seriesOpts,
          axes: [
            {
              stroke: colors.textTertiary as string,
              grid: { stroke: `${colors.borderSubtle}33` },
              ticks: { stroke: "transparent" },
              font: "10px system-ui",
              values: (_self: unknown, ticks: number[]) =>
                ticks.map((t) =>
                  new Date(t * 1000).toLocaleDateString("it-IT", {
                    month: "short",
                    year: "2-digit",
                  }),
                ),
            },
            {
              stroke: colors.textTertiary as string,
              grid: { stroke: `${colors.borderSubtle}33` },
              ticks: { stroke: "transparent" },
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
      />
    </div>
  );
}
