import { useMemo } from "react";
import { useChartColors } from "./useChartColors";
import { UplotChart } from "./UplotChart";
import type uPlot from "uplot";

type SalHistoryBarsProps = {
  views: Array<{ date: string; closedAt?: string; total: number; status: string }>;
};

function buildMonthlySpend(views: Array<{ date: string; closedAt?: string; total: number }>): {
  labels: string[];
  values: number[];
  timestamps: number[];
} {
  if (views.length === 0) return { labels: [], values: [], timestamps: [] };

  const byMonth = new Map<string, { total: number; ts: number }>();
  let firstDate: Date | null = null;

  for (const v of views) {
    const d = new Date(v.closedAt || v.date);
    if (!firstDate || d < firstDate) firstDate = d;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = byMonth.get(key);
    byMonth.set(key, {
      total: (existing?.total ?? 0) + v.total,
      ts: existing?.ts ?? Math.floor(new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000),
    });
  }

  const months = [
    "",
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

  const now = new Date();
  const firstY = (firstDate as Date).getFullYear();
  const firstM = (firstDate as Date).getMonth() + 1;
  const rangeMonths = (now.getFullYear() - firstY) * 12 + now.getMonth() + 1 - firstM + 1;

  const labels: string[] = [];
  const values: number[] = [];
  const timestamps: number[] = [];

  for (let i = 0; i < rangeMonths; i++) {
    let y = firstY;
    let m = firstM + i;
    while (m > 12) {
      m -= 12;
      y++;
    }

    const key = `${y}-${String(m).padStart(2, "0")}`;
    labels.push(months[m] as string);
    const entry = byMonth.get(key);
    values.push(entry?.total ?? 0);
    timestamps.push(entry?.ts ?? Math.floor(new Date(y, m - 1, 1).getTime() / 1000));
  }

  return { labels, values, timestamps };
}

export function SalHistoryBars({ views }: SalHistoryBarsProps) {
  const { colors } = useChartColors();

  const { labels, values, timestamps } = useMemo(() => buildMonthlySpend(views), [views]);

  if (labels.length === 0) return null;

  const totalInRange = values.reduce((s, v) => s + v, 0);
  const monthsWithData = values.filter((v) => v > 0).length;
  const avgMonthlySpend = monthsWithData > 0 ? totalInRange / monthsWithData : 0;
  const avgLine = values.map(() => avgMonthlySpend);

  const data: uPlot.AlignedData = [timestamps, values, avgLine];

  return (
    <UplotChart
      data={data}
      height={180}
      options={{
        title: "",
        legend: { show: true },
        series: [
          {},
          {
            type: "bars",
            label: "Spesa mensile",
            stroke: colors.chart1,
            fill: `${colors.chart1}55`,
            width: 1,
            points: { show: false },
          } as unknown as uPlot.Series,
          {
            label: "Media mensile",
            stroke: colors.chart5,
            dash: [4, 3] as number[],
            width: 1,
            points: { show: false } as const,
          },
        ],
        axes: [
          {
            stroke: colors.textTertiary,
            grid: { show: false },
            ticks: { stroke: "transparent" as const },
            font: "10px system-ui",
            splits: timestamps,
            values: (_self: unknown, ticks: number[]) =>
              ticks.map((t) => {
                const d = new Date(t * 1000);
                return d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
              }),
            size: 60,
          },
          {
            stroke: colors.textTertiary,
            grid: { stroke: `${colors.borderSubtle}33` },
            ticks: { stroke: "transparent" as const },
            font: "10px system-ui",
            size: 64,
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
  );
}
