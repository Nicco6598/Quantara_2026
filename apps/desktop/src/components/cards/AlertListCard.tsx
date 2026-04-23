import { AlertTriangle, ChevronRight, Info, Siren } from "lucide-react";
import type { StatusTone } from "@/components/shared/StatusBadge";
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
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Alert attivi</h2>
        <button className="text-xs font-semibold text-[var(--accent-primary)]" type="button">
          Vedi tutte ({alerts.length})
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {alerts.map((alert) => {
          const presentation = alertPresentation[alert.priority];
          const Icon = presentation.icon;

          return (
            <button
              className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 text-left transition-colors hover:bg-[var(--bg-muted)]"
              key={alert.id}
              type="button"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-md ${
                    alert.priority === "critical"
                      ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                      : alert.priority === "warning"
                        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                        : "bg-[var(--info-soft)] text-[var(--info-base)]"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{alert.title}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{alert.trace}</div>
                </div>
              </div>
              <ChevronRight className="size-4 text-[var(--text-secondary)]" />
            </button>
          );
        })}
      </div>
    </section>
  );
}