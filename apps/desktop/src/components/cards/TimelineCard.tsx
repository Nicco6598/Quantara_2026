import type { TimelineLane } from "@/features/dashboard/demo-data";
import { cn } from "@/lib/utils";

type TimelineCardProps = {
  lanes: readonly TimelineLane[];
};

export function TimelineCard({ lanes }: TimelineCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">Timeline di progetto</h2>
        <span className="text-xs font-semibold text-primary">Gantt</span>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {lanes.map((lane) => (
          <div className="grid grid-cols-[180px_1fr] items-center gap-4" key={lane.id}>
            <span className="truncate text-sm font-medium text-secondary">{lane.label}</span>
            <div className="relative h-8 rounded-sm bg-muted">
              <span
                className={cn(
                  "absolute top-1/2 h-3 -translate-y-1/2 rounded-sm",
                  lane.status === "complete" && "bg-success",
                  lane.status === "active" && "bg-info",
                  lane.status === "planned" && "bg-warning",
                )}
                style={{
                  left: `${lane.startPercent}%`,
                  width: `${lane.endPercent - lane.startPercent}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
