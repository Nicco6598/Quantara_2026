import { ArrowDown, ArrowUp } from "lucide-react";
import type { SortDirection } from "@/hooks/use-table-sort";
import { cn } from "@/lib/utils";

interface SortIndicatorProps {
  active?: boolean;
  className?: string;
  direction: SortDirection;
  onClick: () => void;
}

export function SortIndicator({ active, className, direction, onClick }: SortIndicatorProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded transition-all duration-200 hover:bg-[var(--bg-muted)]",
        active ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      type="button"
    >
      {direction === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : direction === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <div className="flex size-3.5 flex-col justify-center gap-px opacity-40">
          <ArrowUp className="size-3" />
        </div>
      )}
    </button>
  );
}
