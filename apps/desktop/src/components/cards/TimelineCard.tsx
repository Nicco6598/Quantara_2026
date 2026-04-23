import { cn } from "@/lib/utils";

export interface TimelineLane {
  id: string;
  label: string;
  startPercent: number;
  endPercent: number;
  status: "complete" | "active" | "planned";
}

type TimelineCardProps = {
  lanes: readonly TimelineLane[];
};

export function TimelineCard({ lanes }: TimelineCardProps) {
  const completed = lanes.filter((l) => l.status === "complete").length;
  const active = lanes.filter((l) => l.status === "active").length;
  const planned = lanes.filter((l) => l.status === "planned").length;

  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Timeline di Progetto</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {completed} completati · {active} in corso · {planned} pianificati
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success-base)]" />
            <span className="text-xs text-[var(--text-secondary)]">Completato</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--info-base)]" />
            <span className="text-xs text-[var(--text-secondary)]">In corso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning-base)]" />
            <span className="text-xs text-[var(--text-secondary)]">Pianificato</span>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-[600px] flex-col gap-3">
          {lanes.map((lane) => (
            <div key={lane.id} className="flex items-center gap-4">
              <span className="w-40 truncate text-sm font-medium text-[var(--text-primary)]">{lane.label}</span>
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      lane.status === "complete" && "bg-[var(--success-base)]",
                      lane.status === "active" && "bg-[var(--info-base)]",
                      lane.status === "planned" && "bg-[var(--warning-base)]"
                    )}
                    style={{
                      width: `${lane.endPercent - lane.startPercent}%`,
                      marginLeft: `${lane.startPercent}%`,
                    }}
                  />
                </div>
              </div>
              <span className="w-14 text-right text-sm font-semibold text-[var(--text-secondary)]">
                {lane.endPercent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 border-t border-[var(--border-subtle)] pt-4">
        <Milestone date="15 Gen" label="Inizio" />
        <div className="h-px w-8 bg-[var(--border-subtle)]" />
        <Milestone date="31 Mar" label="Fase 1" />
        <div className="h-px w-8 bg-[var(--border-subtle)]" />
        <Milestone date="15 Mag" label="Fase 2" />
        <div className="h-px w-8 bg-[var(--border-subtle)]" />
        <Milestone date="30 Giu" label="Fase 3" />
        <div className="h-px w-8 bg-[var(--border-subtle)]" />
        <Milestone date="15 Set" label="Fine" active />
      </div>
    </section>
  );
}

function Milestone({
  date,
  label,
  active,
}: {
  date: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "h-3 w-3 rounded-full border-2 bg-[var(--surface-base)]",
          active ? "border-[var(--info-base)]" : "border-[var(--border-subtle)]"
        )}
      />
      <span className="mt-1.5 text-xs font-semibold text-[var(--text-primary)]">{label}</span>
      <span className="text-xs text-[var(--text-secondary)]">{date}</span>
    </div>
  );
}