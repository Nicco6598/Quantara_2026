import type { ReactNode } from "react";
import { type StatusTone, statusToneStyles } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
  title?: string;
};

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
  className,
  title,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-12px font-bold",
        statusToneStyles[tone],
        className,
      )}
      title={title}
    >
      {dot ? <span className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
