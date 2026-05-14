import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  action?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title: string;
};

export function SectionHeader({ action, className, icon: Icon, title }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        "border-b border-[var(--border-subtle)] px-5 py-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-[var(--info-base)]" /> : null}
        <h2 className="text-11px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {title}
        </h2>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
