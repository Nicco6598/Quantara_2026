import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { type StatusTone, statusToneStyles } from "@/components/shared/StatusBadge";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { cn } from "@/lib/utils";

type QuickActionProps = {
  children?: ReactNode;
  className?: string;
  detail: string;
  icon: LucideIcon;
  label: string;
  layout?: "card" | "row";
  onClick: () => void;
  size?: "md" | "sm";
  tone?: StatusTone;
};

export function QuickAction({
  className,
  detail,
  icon: Icon,
  label,
  layout = "row",
  onClick,
  size = "md",
  tone = "info",
}: QuickActionProps) {
  const isCardLayout = layout === "card";
  const isCompact = size === "sm";

  const content = (
    <button
      className={cn(
        "flex w-full items-center gap-3 text-left transition-colors",
        isCardLayout ? "p-4" : "rounded-lg p-2 hover:bg-[var(--bg-muted)]",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg",
          isCompact ? "size-8" : "size-9",
          statusToneStyles[tone],
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-bold text-[var(--text-primary)]",
            isCompact ? "text-12px" : "text-13px",
          )}
        >
          {label}
        </span>
        <span className="block truncate text-11px font-medium text-[var(--text-secondary)]">
          {detail}
        </span>
      </span>
    </button>
  );

  if (isCardLayout) {
    return <BezelSurface innerClassName="p-0">{content}</BezelSurface>;
  }

  return content;
}
