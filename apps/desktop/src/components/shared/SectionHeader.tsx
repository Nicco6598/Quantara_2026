import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  action?: ReactNode;
  className?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  title: string;
};

export function SectionHeader({
  action,
  className,
  eyebrow,
  icon: Icon,
  title,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        "border-b border-[var(--border-subtle)] px-5 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-11px font-medium text-[var(--text-tertiary)]">{eyebrow}</p>
        ) : null}
        <div className={cn("flex min-w-0 items-center gap-2", eyebrow && "mt-0.5")}>
          {Icon ? <Icon className="size-4 shrink-0 text-[var(--accent-primary)]" /> : null}
          <h2 className="truncate text-14px font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
