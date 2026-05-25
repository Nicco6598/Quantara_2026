import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { type StatusTone, statusToneStyles } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export type StatusChipProps = {
  children: ReactNode;
  className?: string;
  dot?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md";
  tone?: StatusTone;
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-10px gap-1",
  md: "px-3 py-1 text-12px gap-1.5",
};

export function StatusChip({
  children,
  className,
  dot = false,
  icon: Icon,
  size = "md",
  tone = "neutral",
}: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center justify-center rounded-full font-bold",
        sizeStyles[size],
        statusToneStyles[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {Icon ? <Icon className="size-3.5 shrink-0" strokeWidth={2.5} /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
