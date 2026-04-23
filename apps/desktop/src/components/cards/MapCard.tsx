import { ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { SiteWaypoint } from "@/features/dashboard/demo-data";
import { cn } from "@/lib/utils";

type MapCardProps = {
  waypoints: readonly SiteWaypoint[];
};

export function MapCard({ waypoints }: MapCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Mappa cantiere</h2>
          <span className="rounded-sm bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
            LIVE
          </span>
        </div>
        <Button aria-label="Espandi mappa" size="icon" variant="ghost">
          <Maximize2 />
        </Button>
      </div>
      <div className="mt-4 rounded-md border border-subtle bg-muted p-4">
        <div className="relative h-36 overflow-hidden rounded-sm bg-surface">
          <div className="absolute inset-x-4 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted-strong" />
          <div className="absolute left-6 right-20 top-1/2 h-2 -translate-y-1/2 rounded-full bg-success" />
          <div className="absolute right-12 top-1/2 h-2 w-28 -translate-y-1/2 rounded-full bg-danger" />
          {waypoints.map((waypoint, index) => (
            <div
              className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-2"
              key={waypoint.id}
              style={{ left: `${10 + index * 27}%` }}
            >
              <span
                className={cn(
                  "size-4 rounded-full border-2 border-card",
                  waypoint.status === "complete" && "bg-success",
                  waypoint.status === "active" && "bg-info",
                  waypoint.status === "late" && "bg-danger",
                  waypoint.status === "planned" && "bg-muted-strong",
                )}
              />
              <span className="text-xs font-semibold text-foreground">{waypoint.km}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex gap-3 text-xs text-secondary">
            <Legend label="Completa" tone="success" />
            <Legend label="In esecuzione" tone="info" />
            <Legend label="In ritardo" tone="danger" />
          </div>
          <Button size="sm" variant="outline">
            <ExternalLink data-icon="inline-start" />
            Apri mappa
          </Button>
        </div>
      </div>
    </section>
  );
}

type LegendProps = {
  label: string;
  tone: "success" | "info" | "danger";
};

function Legend({ label, tone }: LegendProps) {
  return (
    <span className="flex items-center gap-1">
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "success" && "bg-success",
          tone === "info" && "bg-info",
          tone === "danger" && "bg-danger",
        )}
      />
      {label}
    </span>
  );
}
