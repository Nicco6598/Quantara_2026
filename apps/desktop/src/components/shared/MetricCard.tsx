import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { cn } from "@/lib/utils";

export type MetricCardTone = "blue" | "danger" | "info" | "success" | "warning";

export function MetricCard({
  badge,
  caption,
  className,
  density = "default",
  icon: Icon,
  innerClassName,
  label,
  layout = "horizontal",
  tone,
  value,
}: {
  badge?: ReactNode;
  caption: string;
  className?: string;
  density?: "compact" | "default";
  icon: LucideIcon;
  innerClassName?: string;
  label: string;
  layout?: "horizontal" | "vertical";
  tone?: MetricCardTone;
  value: ReactNode;
}) {
  const isVertical = layout === "vertical";
  const isCompact = density === "compact";

  return (
    <BezelSurface
      {...(className ? { className } : {})}
      innerClassName={cn(
        "group flex min-w-0 p-4",
        isVertical ? "flex-col items-center gap-3 text-center" : "items-start gap-3 min-h-[96px]",
        isCompact && !isVertical && "min-h-0 gap-2 p-3",
        tone === "blue" ? "bg-[color-mix(in_srgb,var(--info-soft)_30%,var(--surface-base))]" : "",
        innerClassName,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          isVertical ? "size-9" : "size-9",
          isCompact && !isVertical && "size-8",
          (!tone || tone === "blue" || tone === "info") &&
            "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        )}
      >
        <Icon className={cn(isCompact && !isVertical ? "size-4" : "size-5 2xl:size-6")} />
      </div>
      <div className={cn("min-w-0", isVertical ? "" : "flex-1")}>
        <div
          className={cn(
            "font-semibold leading-tight text-[var(--text-secondary)]",
            isVertical ? "text-12px" : "text-11px",
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "min-w-0 break-words font-bold leading-none tabular-nums",
            isVertical ? "mt-1 text-22px" : "mt-2 text-20px",
            isCompact && !isVertical && "mt-1 text-17px",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
          )}
        >
          {value}
        </div>
        <div
          className={cn(
            "flex min-w-0 items-start gap-1.5",
            isVertical ? "mt-1 justify-center" : "mt-2",
          )}
        >
          <span className="min-w-0 text-12px font-medium leading-4 text-[var(--text-secondary)]">
            {caption}
          </span>
          {badge ? (
            <span className="max-w-[45%] shrink-0 truncate rounded-md bg-[var(--bg-muted-strong)] px-1.5 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </BezelSurface>
  );
}
