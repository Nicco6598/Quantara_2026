import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { cn } from "@/lib/utils";

export type MetricCardTone = "blue" | "danger" | "info" | "success" | "warning";

export function MetricCard({
  badge,
  caption,
  className,
  icon: Icon,
  innerClassName,
  label,
  tone,
  value,
}: {
  badge?: ReactNode;
  caption: string;
  className?: string;
  icon: LucideIcon;
  innerClassName?: string;
  label: string;
  tone?: MetricCardTone;
  value: ReactNode;
}) {
  return (
    <BezelSurface
      {...(className ? { className } : {})}
      innerClassName={cn(
        "group flex min-h-[112px] min-w-0 items-center gap-3 p-4 2xl:min-h-[128px] 2xl:gap-4",
        tone === "blue" ? "bg-[var(--info-soft)]/20" : "",
        innerClassName,
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-12",
          (!tone || tone === "blue" || tone === "info") &&
            "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 min-w-0 truncate text-20px font-bold leading-none 2xl:text-22px",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <span className="truncate text-12px font-medium text-[var(--text-secondary)]">
            {caption}
          </span>
          {badge ? (
            <span className="max-w-[45%] shrink-0 truncate rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </BezelSurface>
  );
}
