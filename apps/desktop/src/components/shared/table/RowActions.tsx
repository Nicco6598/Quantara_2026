import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowActionItem = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

export type RowActionsProps = {
  items: RowActionItem[];
  className?: string;
};

export function RowActions({ items, className }: RowActionsProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            aria-label={item.label}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-lg text-13px transition-colors",
              item.destructive
                ? "text-[var(--text-tertiary)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                : "text-[var(--text-tertiary)] hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]",
            )}
            key={item.label}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
            }}
            title={item.label}
            type="button"
          >
            <Icon className="size-3.5" strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
