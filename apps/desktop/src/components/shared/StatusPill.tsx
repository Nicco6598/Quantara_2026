import type { ReactNode } from "react";
import { type StatusTone, statusToneStyles } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

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
        "inline-flex w-fit items-center justify-center gap-1.5 rounded-full px-3 py-1 text-12px font-bold",
        statusToneStyles[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
