import type { ReactNode } from "react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const toneStyles: Record<StatusTone, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  info: "bg-[var(--info-soft)] text-[var(--info-base)]",
  neutral: "bg-[var(--neutral-soft)] text-[var(--neutral-base)]",
  success: "bg-[var(--success-soft)] text-[var(--success-base)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
};

type StatusPillProps = {
  children: ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
};

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[--text-sm] font-bold",
        toneStyles[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
