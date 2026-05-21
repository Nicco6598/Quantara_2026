import { ChevronDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildSpendingTrend } from "./chart-helpers";
import { UplotChart } from "./UplotChart";
import { useChartColors } from "./useChartColors";

type Timeframe = "3M" | "6M" | "1Y" | "ALL";

type SpendingTrendProps = {
  views: Array<{ date: string; closedAt?: string; total: number }>;
  contractualAmount: number;
};

function toDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function buildCalendarAxisTicks(dates: number[]) {
  if (dates.length === 0) {
    return { dateTicks: [] as number[], monthTicks: [] as Array<{ ts: number; label: string }> };
  }

  const first = toDayStart(new Date((dates[0] as number) * 1000));
  const last = toDayStart(new Date((dates[dates.length - 1] as number) * 1000));
  const firstYear = first.getFullYear();
  const firstMonth = first.getMonth();
  const lastYear = last.getFullYear();
  const lastMonth = last.getMonth();
  const rangeMonths = (lastYear - firstYear) * 12 + lastMonth - firstMonth + 1;
  const rangeDays = Math.max(1, Math.ceil((toTimestamp(last) - toTimestamp(first)) / 86400));
  const mondayStep = rangeDays > 220 ? 4 : rangeDays > 120 ? 2 : 1;

  const dateTickSet = new Set<number>();
  const monthTicks: Array<{ ts: number; label: string }> = [];

  for (let i = 0; i < rangeMonths; i++) {
    const monthStart = toDayStart(new Date(firstYear, firstMonth + i, 1));
    const monthMarker = i === 0 && monthStart < first ? first : monthStart;
    if (monthMarker >= first && monthMarker <= last) {
      monthTicks.push({
        label: monthStart.toLocaleDateString("it-IT", { month: "short" }).toUpperCase(),
        ts: toTimestamp(monthMarker),
      });
    }

    const monday = new Date(monthStart);
    monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7));
    let mondayIndex = 0;
    while (monday.getMonth() === monthStart.getMonth()) {
      if (monday >= first && monday <= last && mondayIndex % mondayStep === 0) {
        dateTickSet.add(toTimestamp(monday));
      }
      mondayIndex++;
      monday.setDate(monday.getDate() + 7);
    }
  }

  return {
    dateTicks: [...dateTickSet].sort((left, right) => left - right),
    monthTicks,
  };
}

function buildPreCumulative(
  all: Array<{ date: string; closedAt?: string; total: number }>,
  visible: Array<{ date: string; closedAt?: string; total: number }>,
): number {
  if (all.length === visible.length || visible.length === 0) return 0;
  const first = visible[0];
  if (!first) return 0;
  const cutoff = new Date(first.closedAt || first.date).getTime();
  let cum = 0;
  for (const v of all) {
    const d = new Date(v.closedAt || v.date).getTime();
    if (d >= cutoff) break;
    cum += v.total;
  }
  return cum;
}

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

function filterByTimeframe(
  views: Array<{ date: string; closedAt?: string; total: number }>,
  tf: Timeframe,
) {
  if (tf === "ALL" || views.length === 0) return views;

  const dates = views.map((v) => new Date(v.closedAt || v.date).getTime());
  const dataMax = Math.max(...dates);

  const days = tf === "3M" ? 90 : tf === "6M" ? 180 : 365;
  const cutoff = dataMax - days * 86400000;

  return views.filter((v) => new Date(v.closedAt || v.date).getTime() >= cutoff);
}

export function SpendingTrend({ views, contractualAmount }: SpendingTrendProps) {
  const { colors } = useChartColors();
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterByTimeframe(views, timeframe), [views, timeframe]);
  const { dates, actual, projected } = useMemo(() => {
    const preCumulative = buildPreCumulative(views, filtered);
    const raw = buildSpendingTrend(filtered, contractualAmount, preCumulative);
    const todaySec = Math.floor(Date.now() / 1000);
    const cutoff = raw.dates.findIndex((d) => d > todaySec);
    if (cutoff > 0) {
      return {
        dates: raw.dates.slice(0, cutoff),
        actual: raw.actual.slice(0, cutoff),
        projected: raw.projected.slice(0, cutoff),
      };
    }
    return raw;
  }, [views, filtered, contractualAmount]);
  const { dateTicks, monthTicks } = useMemo(() => buildCalendarAxisTicks(dates), [dates]);
  const monthLabelByTick = useMemo(
    () => new Map(monthTicks.map((tick) => [tick.ts, tick.label])),
    [monthTicks],
  );

  function handleSelect(tf: Timeframe) {
    setTimeframe(tf);
    setOpen(false);
  }

  if (views.length === 0) return null;

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10" ref={ref}>
        <button
          className="flex items-center gap-1 rounded-full bg-[var(--bg-muted)]/70 px-2 py-1 text-10px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/50 backdrop-blur-sm transition-colors hover:bg-[var(--bg-muted-strong)]/70"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {TF_LABEL[timeframe]}
          <ChevronDown
            className={cn("size-3 opacity-60 transition-transform", open && "rotate-180")}
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
            <div className="absolute right-0 top-full z-[var(--z-dropdown-menu)] mt-1 w-max min-w-[130px] overflow-hidden rounded-11px bg-[var(--surface-base)] p-1 shadow-soft ring-1 ring-[var(--border-subtle)]">
              {TF_OPTS.map((opt) => (
                <button
                  className={cn(
                    "flex w-full items-center rounded-8px px-2.5 py-1.5 text-left text-11px font-medium transition-colors",
                    timeframe === opt.key
                      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                  )}
                  key={opt.key}
                  onClick={() => handleSelect(opt.key)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <UplotChart
        animateData
        data={[dates, actual, projected]}
        options={{
          title: "",
          series: [
            {},
            {
              label: "Spesa effettiva",
              stroke: colors.chart1,
              fill: `${colors.chart1}28`,
              width: 2,
              points: { show: false } as const,
            },
            {
              label: "Budget previsto",
              stroke: colors.warningBase,
              fill: `${colors.warningBase}15`,
              dash: [6, 3],
              width: 1.5,
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
                ticks.map(
                  (tick) =>
                    monthLabelByTick.get(tick) ??
                    new Date(tick * 1000)
                      .toLocaleDateString("it-IT", { month: "short" })
                      .toUpperCase(),
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
      />
    </div>
  );
}
