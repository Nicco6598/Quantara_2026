import { type HTMLMotionProps, m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { MOTION_DURATION, SPRING_EASE } from "@/components/shared/easings";
import { cn } from "@/lib/utils";

export function ProjectControlButton({
  children,
  className,
  icon: Icon,
  variant = "neutral",
  ...props
}: Omit<HTMLMotionProps<"button">, "children"> & {
  children?: ReactNode;
  icon?: LucideIcon;
  variant?: "ghost" | "icon" | "neutral" | "primary" | "soft";
}) {
  return (
    <m.button
      className={cn(
        "micro-interact projects-control-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-12px font-semibold outline-none",
        variant === "primary" && "projects-control-button-primary text-[var(--text-inverse)]",
        variant === "neutral" && "projects-control-button-neutral text-[var(--text-primary)]",
        variant === "soft" && "projects-control-button-soft text-[var(--accent-primary)]",
        variant === "ghost" && "projects-control-button-ghost text-[var(--text-secondary)]",
        variant === "icon" &&
          "projects-control-button-neutral size-10 px-0 text-[var(--text-secondary)]",
        className,
      )}
      transition={{ duration: MOTION_DURATION.fast, ease: SPRING_EASE }}
      type="button"
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {Icon ? <Icon className="size-4" strokeWidth={1.8} /> : null}
      {children}
    </m.button>
  );
}

export function BezelSurface({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <m.section
      className={cn(
        "min-w-0 rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[var(--surface-base)] shadow-[var(--shadow-soft)]",
        className,
      )}
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      transition={{ duration: MOTION_DURATION.reveal, ease: SPRING_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      <div className={cn("h-full rounded-22px bg-[var(--surface-base)]", innerClassName)}>
        {children}
      </div>
    </m.section>
  );
}

export function MetricCard({
  caption,
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: LucideIcon;
  label: string;
  tone?: "blue" | "danger" | "info" | "success" | "warning";
  value: string;
}) {
  return (
    <BezelSurface
      innerClassName={cn(
        "group flex min-h-[112px] items-center gap-3 p-4 2xl:min-h-[128px] 2xl:gap-4",
        tone === "blue" ? "bg-[var(--info-soft)]/20" : "",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-12",
          (!tone || tone === "blue" || tone === "info") &&
            "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-20px font-bold leading-none 2xl:text-22px",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-12px font-medium text-[var(--text-secondary)]">{caption}</div>
      </div>
    </BezelSurface>
  );
}

export function FocusChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <m.button
      className={cn(
        "micro-interact inline-flex items-center gap-2 rounded-full border px-4 py-2 text-13px font-medium outline-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        active
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-none"
          : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_78%,transparent)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/24 hover:bg-[var(--bg-muted)]",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-11px font-semibold",
          active
            ? "bg-white/16 text-white"
            : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
        )}
      >
        {count}
      </span>
    </m.button>
  );
}

export function CompactRail({
  children,
  title,
  value,
}: {
  children: ReactNode;
  title: string;
  value: ReactNode;
}) {
  return (
    <BezelSurface innerClassName="p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-12px font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="rounded-md bg-[var(--bg-muted-strong)] px-2 py-1 text-11px font-semibold text-[var(--text-secondary)]">
          {value}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </BezelSurface>
  );
}

export function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-18px border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] p-4">
      <div className="text-13px font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-1 text-12px leading-5 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
