import type { StatusTone } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const severityColors: Record<StatusTone, string> = {
  danger: "bg-[var(--severity-5)]",
  info: "bg-[var(--info-base)]",
  neutral: "bg-[var(--neutral-base)]",
  success: "bg-[var(--severity-1)]",
  warning: "bg-[var(--severity-3)]",
};

type SeverityBarProps = {
  percentage: number;
  tone?: StatusTone;
  className?: string;
};

export function SeverityBar({ percentage, tone = "neutral", className }: SeverityBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", severityColors[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function severityToneForPercentage(pct: number): StatusTone {
  if (pct >= 90) return "danger";
  if (pct >= 70) return "warning";
  return "success";
}
