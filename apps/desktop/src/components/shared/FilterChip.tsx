import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilterChipProps = {
  active: boolean;
  children: ReactNode;
  count?: number;
  onClick: () => void;
};

export function FilterChip({ active, children, count, onClick }: FilterChipProps) {
  return (
    <button
      className={cn(
        "h-9 rounded-full px-4 text-12px font-semibold transition-colors 2xl:h-10 2xl:text-13px",
        active
          ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
          : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "ml-2 rounded-full px-2 py-0.5 text-11px font-bold",
            active
              ? "bg-[var(--accent-primary)]/20"
              : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
