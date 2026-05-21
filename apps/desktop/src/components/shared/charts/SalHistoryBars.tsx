import { m } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { useChartColors } from "./useChartColors";

type SalHistoryBarsProps = {
  views: Array<{ date: string; closedAt?: string; total: number; status: string }>;
};

type TimelinePoint = {
  date: Date;
  key: string;
  total: number;
  ts: number;
};

type TooltipState = {
  point: TimelinePoint;
  x: number;
  y: number;
} | null;

const DAY_SECONDS = 24 * 60 * 60;
const FALLBACK_SVG_WIDTH = 1000;
const SVG_HEIGHT = 178;
const PLOT = {
  bottom: 112,
  left: 68,
  right: 24,
  top: 14,
};

function toDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_SECONDS * 1000);
}

function formatMoney(value: number) {
  return value.toLocaleString("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  });
}

function buildSalTimeline(views: Array<{ date: string; closedAt?: string; total: number }>) {
  const byDay = new Map<string, TimelinePoint>();

  for (const view of views) {
    const date = toDayStart(new Date(view.closedAt || view.date));
    const key = date.toISOString().slice(0, 10);
    const existing = byDay.get(key);

    byDay.set(key, {
      date,
      key,
      total: (existing?.total ?? 0) + view.total,
      ts: existing?.ts ?? toTimestamp(date),
    });
  }

  const points = [...byDay.values()].sort((left, right) => left.ts - right.ts);
  if (points.length === 0) {
    return {
      avgAmount: 0,
      dateTicks: [] as Date[],
      monthTicks: [] as Array<{ date: Date; labelDate: Date }>,
      points,
      rangeMax: 0,
      rangeMin: 0,
      yTicks: [] as number[],
    };
  }

  const firstDate = points[0]?.date as Date;
  const lastDate = points[points.length - 1]?.date as Date;
  const dataSpanDays = Math.max(
    1,
    Math.ceil((toTimestamp(lastDate) - toTimestamp(firstDate)) / DAY_SECONDS),
  );
  const edgePaddingDays = Math.max(0.75, Math.min(1.5, dataSpanDays * 0.035));
  const rangeMinDate = addDays(firstDate, -edgePaddingDays);
  const rangeMaxDate = addDays(lastDate, edgePaddingDays);
  const nextMonthStart = toDayStart(new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1));

  const dateTickSet = new Map<number, Date>();
  const monthTickSet = new Map<number, { date: Date; labelDate: Date }>();
  const firstMonth = firstDate.getMonth();
  const firstYear = firstDate.getFullYear();
  const rangeMonths =
    (nextMonthStart.getFullYear() - firstYear) * 12 + nextMonthStart.getMonth() - firstMonth + 1;

  for (let i = 0; i < rangeMonths; i++) {
    const monthStart = toDayStart(new Date(firstYear, firstMonth + i, 1));
    const monthMarker = i === 0 && monthStart < firstDate ? firstDate : monthStart;
    if (monthMarker >= firstDate && monthMarker <= rangeMaxDate) {
      monthTickSet.set(toTimestamp(monthMarker), { date: monthMarker, labelDate: monthStart });
    }

    const monday = new Date(monthStart);
    monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7));
    while (monday.getMonth() === monthStart.getMonth()) {
      if (monday >= firstDate && monday <= rangeMaxDate) {
        dateTickSet.set(toTimestamp(monday), new Date(monday));
      }
      monday.setDate(monday.getDate() + 7);
    }
  }

  monthTickSet.set(toTimestamp(rangeMaxDate), { date: rangeMaxDate, labelDate: nextMonthStart });

  const maxValue = Math.max(...points.map((point) => point.total));
  const yMax = Math.max(1, Math.ceil(maxValue / 10000) * 10000);
  const avgAmount = points.reduce((sum, point) => sum + point.total, 0) / points.length;

  return {
    avgAmount,
    dateTicks: [...dateTickSet.values()].sort(
      (left, right) => toTimestamp(left) - toTimestamp(right),
    ),
    monthTicks: [...monthTickSet.values()].sort(
      (left, right) => toTimestamp(left.date) - toTimestamp(right.date),
    ),
    points,
    rangeMax: toTimestamp(rangeMaxDate),
    rangeMin: toTimestamp(rangeMinDate),
    yTicks: [0, yMax / 2, yMax],
  };
}

export function SalHistoryBars({ views }: SalHistoryBarsProps) {
  const { colors } = useChartColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [measuredWidth, setMeasuredWidth] = useState(FALLBACK_SVG_WIDTH);

  const timeline = useMemo(() => buildSalTimeline(views), [views]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setMeasuredWidth(Math.max(640, Math.round(element.getBoundingClientRect().width)));
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (timeline.points.length === 0) return null;

  const svgWidth = measuredWidth;
  const plotWidth = svgWidth - PLOT.left - PLOT.right;
  const plotHeight = PLOT.bottom - PLOT.top;
  const range = Math.max(1, timeline.rangeMax - timeline.rangeMin);
  const yMax = timeline.yTicks[timeline.yTicks.length - 1] ?? 1;
  const barWidth = Math.max(
    14,
    Math.min(40, plotWidth / Math.max(8, timeline.points.length * 2.6)),
  );
  const avgY = PLOT.bottom - (timeline.avgAmount / yMax) * plotHeight;

  const xForTs = (ts: number) => PLOT.left + ((ts - timeline.rangeMin) / range) * plotWidth;
  const yForValue = (value: number) => PLOT.bottom - (value / yMax) * plotHeight;

  function handleTooltipMove(event: React.MouseEvent<SVGRectElement>, point: TimelinePoint) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      point,
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top + 14,
    });
  }

  return (
    <m.div
      animate={{ opacity: 1, scaleY: 1 }}
      className="w-full"
      initial={{ opacity: 0, scaleY: 0.97 }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      <BezelSurface className="w-full" innerClassName="p-2 pb-2">
        <div className="relative w-full" ref={containerRef}>
          <svg
            aria-label="Storico SAL"
            className="block h-[180px] w-full overflow-visible"
            role="img"
            viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
          >
            {timeline.yTicks.map((tick) => {
              const y = yForValue(tick);
              return (
                <g key={tick}>
                  <line
                    stroke={`${colors.borderSubtle}66`}
                    strokeDasharray={tick === 0 ? undefined : "3 3"}
                    x1={PLOT.left}
                    x2={svgWidth - PLOT.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill={colors.textTertiary}
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="end"
                    x={PLOT.left - 10}
                    y={y + 4}
                  >
                    {formatMoney(tick)}
                  </text>
                </g>
              );
            })}

            <line
              stroke={colors.chart5}
              strokeDasharray="4 3"
              strokeWidth="1.5"
              x1={PLOT.left}
              x2={svgWidth - PLOT.right}
              y1={avgY}
              y2={avgY}
            />

            {timeline.points.map((point) => {
              const x = xForTs(point.ts);
              const y = yForValue(point.total);
              const height = Math.max(5, PLOT.bottom - y);
              return (
                <g key={point.key}>
                  <rect
                    fill={`${colors.chart1}55`}
                    height={height}
                    rx="5"
                    stroke={colors.chart1}
                    strokeWidth="1.5"
                    width={barWidth}
                    x={x - barWidth / 2}
                    y={PLOT.bottom - height}
                  />
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG hover targets expose contextual chart values without changing state. */}
                  <rect
                    aria-label={`SAL del ${point.date.toLocaleDateString("it-IT")}: ${formatMoney(point.total)}`}
                    fill="transparent"
                    height={plotHeight}
                    onMouseLeave={() => setTooltip(null)}
                    onMouseMove={(event) => handleTooltipMove(event, point)}
                    width={Math.max(barWidth + 26, 34)}
                    x={x - Math.max(barWidth + 26, 34) / 2}
                    y={PLOT.top}
                  />
                </g>
              );
            })}

            {timeline.monthTicks.map(({ date, labelDate }) => (
              <text
                fill={colors.accentPrimary}
                fontSize="11"
                fontWeight="800"
                key={`month-${toTimestamp(date)}`}
                textAnchor="middle"
                x={xForTs(toTimestamp(date))}
                y={137}
              >
                {labelDate.toLocaleDateString("it-IT", { month: "short" }).toUpperCase()}
              </text>
            ))}

            {timeline.dateTicks.map((date) => (
              <text
                fill={colors.textTertiary}
                fontSize="10"
                fontWeight="500"
                key={`date-${toTimestamp(date)}`}
                textAnchor="middle"
                x={xForTs(toTimestamp(date))}
                y={158}
              >
                {date.toLocaleDateString("it-IT", { day: "2-digit" })}
              </text>
            ))}
          </svg>

          <div className="mt-1 flex items-center gap-4 border-t border-[var(--border-subtle)]/50 pt-2 text-11px font-medium text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border border-[var(--chart-1)] bg-[color-mix(in_srgb,var(--chart-1)_35%,transparent)]" />
              Importo SAL
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-4 border-t border-dashed border-[var(--chart-5)]" />
              Media SAL
            </span>
          </div>

          {tooltip ? (
            <div
              className="pointer-events-none absolute z-[var(--z-dropdown-menu)] min-w-[180px] rounded-14px border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]/95 px-3 py-2 text-11px font-medium text-[var(--text-secondary)] shadow-[0_20px_58px_color-mix(in_srgb,var(--text-primary)_16%,transparent)] backdrop-blur-xl"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform:
                  tooltip.x > (containerRef.current?.clientWidth ?? 0) - 220
                    ? "translateX(calc(-100% - 28px))"
                    : undefined,
              }}
            >
              <div className="text-10px font-semibold text-[var(--text-secondary)]">
                {tooltip.point.date.toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-12px font-semibold text-[var(--text-primary)]">
                <span className="size-2 rounded-full bg-[var(--chart-1)]" />
                Importo SAL: {formatMoney(tooltip.point.total)}
              </div>
              <div className="mt-1 flex items-center gap-2 text-11px font-semibold text-[var(--text-secondary)]">
                <span className="h-px w-3 border-t border-dashed border-[var(--chart-5)]" />
                Media SAL: {formatMoney(timeline.avgAmount)}
              </div>
            </div>
          ) : null}
        </div>
      </BezelSurface>
    </m.div>
  );
}
