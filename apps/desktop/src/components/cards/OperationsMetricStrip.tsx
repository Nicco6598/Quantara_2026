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
            className="rounded-md border border-subtle bg-card p-3 shadow-soft"
            key={metric.label}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted text-primary">
                <Icon />
              </div>
              <StatusBadge label={metric.delta} tone={metric.tone} />
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">{metric.value}</div>
            <div className="mt-1 text-xs text-secondary">{metric.label}</div>
          </div>
        );
      })}
    </section>
  );
}
