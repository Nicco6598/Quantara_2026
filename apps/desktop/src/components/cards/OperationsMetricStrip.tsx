import { Activity, CircleAlert, PackageCheck, Users, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OperationsMetric } from "@/features/dashboard/demo-data";

type OperationsMetricStripProps = {
  metrics: readonly OperationsMetric[];
};

const icons = [Users, Wrench, Activity, PackageCheck, CircleAlert] as const;

export function OperationsMetricStrip({ metrics }: OperationsMetricStripProps) {
  return (
    <section className="grid grid-cols-5 gap-3">
      {metrics.map((metric, index) => {
        const Icon = icons[index] ?? Activity;
        return (
          <div
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4"
            key={metric.label}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)]">
                <Icon className="h-4 w-4" />
              </div>
              <StatusBadge label={metric.delta} tone={metric.tone} />
            </div>
            <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {metric.value}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">{metric.label}</div>
          </div>
        );
      })}
    </section>
  );
}
