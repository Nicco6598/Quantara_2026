import { AlertTriangle, ChevronRight, Info, Siren } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import type { AlertPriority, DashboardAlert } from "@/features/dashboard/demo-data";

type AlertListCardProps = {
  alerts: readonly DashboardAlert[];
};

const alertPresentation: Record<AlertPriority, { icon: typeof AlertTriangle; tone: StatusTone }> = {
  critical: { icon: Siren, tone: "danger" },
  info: { icon: Info, tone: "info" },
  warning: { icon: AlertTriangle, tone: "warning" },
};

export function AlertListCard({ alerts }: AlertListCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">Alert attivi</h2>
        <button className="text-xs font-semibold text-primary" type="button">
          Vedi tutte ({alerts.length})
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {alerts.map((alert) => {
          const presentation = alertPresentation[alert.priority];
          const Icon = presentation.icon;

          return (
            <button
              className="flex items-center gap-3 rounded-md border border-subtle bg-surface px-3 py-2 text-left transition-colors duration-fast ease-standard hover:bg-table-row-hover"
              key={alert.id}
              type="button"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                <Icon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{alert.title}</p>
                  <StatusBadge label={alert.dueLabel} tone={presentation.tone} />
                </div>
                <p className="mt-1 truncate text-xs text-secondary">{alert.trace}</p>
              </div>
              <ChevronRight className="text-secondary" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
