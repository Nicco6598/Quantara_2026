import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { cn } from "@/lib/utils";

export type PanelTone = "danger" | "info" | "success" | "warning";

const toneIconBg: Record<PanelTone, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  info: "bg-[var(--info-soft)] text-[var(--info-base)]",
  success: "bg-[var(--success-soft)] text-[var(--success-base)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
};

const toneText: Record<PanelTone, string> = {
  danger: "text-[var(--danger-base)]",
  info: "text-[var(--info-base)]",
  success: "text-[var(--success-base)]",
  warning: "text-[var(--warning-base)]",
};

type PanelProps = {
  children: ReactNode;
  className?: string;
  padding?: string;
};

export function Panel({ children, className, padding = "p-4" }: PanelProps) {
  return <BezelSurface innerClassName={cn(padding, className)}>{children}</BezelSurface>;
}

type PanelTitleProps = {
  children: string;
  icon?: LucideIcon;
  iconTone?: PanelTone;
};

export function PanelTitle({ children, icon: Icon, iconTone = "info" }: PanelTitleProps) {
  return (
    <div className="flex items-center gap-2 text-[--text-sm] font-semibold uppercase tracking-[--tracking-wide] text-[var(--text-secondary)]">
      {Icon ? <Icon className={cn("size-4", toneIconBg[iconTone].split(" ")[1])} /> : null}
      {children}
    </div>
  );
}

type StatusPillProps = {
  children: ReactNode;
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
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
        tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "info" && "bg-[var(--info-soft)] text-[var(--info-base)]",
        tone === "neutral" && "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
  delta?: string;
  tone?: PanelTone;
  className?: string;
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  delta,
  tone = "info",
  className,
}: MetricCardProps) {
  return (
    <BezelSurface
      innerClassName={cn(
        "group flex min-h-[112px] items-center gap-3 p-4 2xl:min-h-[128px] 2xl:gap-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-12",
          toneIconBg[tone],
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-[--text-xs] font-semibold uppercase tracking-[--tracking-wide] text-[var(--text-secondary)]">
          {label}
        </div>
        <div className={cn("mt-2 text-[--text-3xl] font-bold leading-none", toneText[tone])}>
          {value}
        </div>
        {description ? (
          <div className="mt-2 text-[--text-base] font-medium text-[var(--text-secondary)]">
            {description}
          </div>
        ) : null}
        {delta ? (
          <div className={cn("mt-3 text-[--text-sm] font-bold", toneText[tone])}>{delta}</div>
        ) : null}
      </div>
    </BezelSurface>
  );
}
