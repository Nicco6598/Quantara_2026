import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DetailListProps = {
  children: ReactNode;
  className?: string;
};

export function DetailList({ children, className }: DetailListProps) {
  return <dl className={cn("min-w-0 space-y-2", className)}>{children}</dl>;
}

type DetailRowProps = {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function DetailRow({ label, value, children, className }: DetailRowProps) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-3", className)}>
      <dt className="truncate text-13px font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="min-w-0 shrink-0 text-14px font-semibold text-[var(--text-primary)]">
        {children ?? value}
      </dd>
    </div>
  );
}
