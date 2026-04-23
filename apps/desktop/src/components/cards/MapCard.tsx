import { ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { SiteWaypoint } from "@/features/dashboard/demo-data";
import { cn } from "@/lib/utils";

type MapCardProps = {
  waypoints: readonly SiteWaypoint[];
};

const waypointPositions: Record<string, { x: number; y: number }> = {
  km18: { x: 20, y: 60 },
  km24: { x: 45, y: 40 },
  km29: { x: 65, y: 55 },
  km30: { x: 80, y: 35 },
};

export function MapCard({ waypoints }: MapCardProps) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Mappa cantiere</h2>
          <span className="rounded-sm bg-[var(--success-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--success-base)]">
            LIVE
          </span>
        </div>
        <Button aria-label="Espandi mappa" size="icon" variant="ghost">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
        <div className="relative h-36 overflow-hidden rounded-sm bg-[var(--surface-base)]">
          {waypoints.map((waypoint, index) => {
            const pos = waypointPositions[waypoint.id] || { x: 50, y: 50 };
            return (
              <div
                key={waypoint.id}
                className={cn(
                  "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold transition-transform hover:scale-110",
                  waypoint.status === "active"
                    ? "border-[var(--success-base)] bg-[var(--success-base)] text-white"
                    : waypoint.status === "complete"
                      ? "border-[var(--info-base)] bg-[var(--info-base)] text-white"
                      : waypoint.status === "late"
                        ? "border-[var(--danger-base)] bg-[var(--danger-base)] text-white"
                        : "border-[var(--text-secondary)] bg-[var(--surface-base)] text-[var(--text-secondary)]"
                )}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
                title={waypoint.label}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--success-base)]" />
            <span className="text-[var(--text-secondary)]">Attivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--info-base)]" />
            <span className="text-[var(--text-secondary)]">Completato</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--danger-base)]" />
            <span className="text-[var(--text-secondary)]">In ritardo</span>
          </div>
        </div>
        <Button className="text-xs" size="sm" variant="ghost">
          <ExternalLink className="mr-1 h-3 w-3" />
          Apri in Google Maps
        </Button>
      </div>
    </section>
  );
}