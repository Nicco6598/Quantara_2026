import { useMemo } from "react";
import { useChartColors } from "./useChartColors";
import type { ContractorExposureItem } from "./chart-helpers";
import { UplotChart } from "./UplotChart";

type ContractorExposureProps = {
  items: ContractorExposureItem[];
};

export function ContractorExposure({ items }: ContractorExposureProps) {
  const { colors } = useChartColors();
  const labels = useMemo(() => items.map((i) => i.contractor), [items]);
  const budgetData = useMemo(() => items.map((i) => i.budget), [items]);
  const committedData = useMemo(() => items.map((i) => i.committed), [items]);

  if (items.length === 0) return null;

  const data: uPlot.AlignedData = [labels.map((_, i) => i), budgetData, committedData];

  return (
    <UplotChart
      data={data}
      options={{
        title: "",
        series: [
          {},
          {
            label: "Budget",
            stroke: colors.chart1 as string,
            fill: `${colors.chart1}44`,
            width: 3,
            points: { show: false } as const,
          },
          {
            label: "Impegnato",
            stroke: colors.chart2 as string,
            fill: `${colors.chart2}44`,
            width: 3,
            points: { show: false } as const,
          },
        ],
        axes: [
          {
            stroke: colors.textTertiary as string,
            grid: { stroke: `${colors.borderSubtle}33`, width: 1 },
            ticks: { stroke: "transparent" },
            font: "10px system-ui",
            values: (_self: unknown, ticks: number[]) =>
              ticks.map((t) => labels[Math.round(t)]?.slice(0, 12) || ""),
          },
          {
            stroke: colors.textTertiary as string,
            grid: { stroke: `${colors.borderSubtle}33`, width: 1 },
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
  );
}
