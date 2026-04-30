import { type HTMLMotionProps, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const SOFT_EASE = [0.22, 1, 0.36, 1] as const;
const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

export function ProjectSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={cn(
        "projects-surface rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-none",
        className,
      )}
      initial={{ opacity: 0, y: 14, scale: 0.994 }}
      transition={{ duration: 0.58, ease: SOFT_EASE }}
      viewport={{ amount: 0.16, once: true }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      {children}
    </motion.section>
  );
}

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
    <motion.button
      className={cn(
        "projects-control-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold outline-none",
        variant === "primary" && "projects-control-button-primary text-[var(--text-inverse)]",
        variant === "neutral" && "projects-control-button-neutral text-[var(--text-primary)]",
        variant === "soft" && "projects-control-button-soft text-[var(--accent-primary)]",
        variant === "ghost" && "projects-control-button-ghost text-[var(--text-secondary)]",
        variant === "icon" &&
          "projects-control-button-neutral size-10 px-0 text-[var(--text-secondary)]",
        className,
      )}
      transition={{ duration: 0.42, ease: SOFT_EASE }}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      {...props}
    >
      {Icon ? <Icon className="size-4" strokeWidth={1.8} /> : null}
      {children}
    </motion.button>
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
    <motion.section
      className={cn(
        "min-w-0 rounded-[30px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]",
        className,
      )}
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      transition={{ duration: 0.72, ease: SPRING_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      <div
        className={cn(
          "h-full rounded-[24px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </motion.section>
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
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-[20px] font-bold leading-none 2xl:text-[22px]",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-[12px] font-medium text-[var(--text-secondary)]">
          {caption}
        </div>
      </div>
    </BezelSurface>
  );
}

export function PortfolioMetric({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail?: string;
  icon?: LucideIcon;
  label: string;
  tone?: StatusTone;
  value: string;
}) {
  const toneClass = {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone ?? "neutral"];

  return (
    <ProjectSurface className="group min-h-[130px] p-5">
      <div className="flex items-start gap-4">
        {Icon ? (
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {value}
          </div>
          {detail ? (
            <div className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              {detail}
            </div>
          ) : null}
        </div>
      </div>
    </ProjectSurface>
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
    <motion.button
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium outline-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        active
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-none"
          : "border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_78%,transparent)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/24 hover:bg-[var(--bg-muted)]",
      )}
      onClick={onClick}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
          active
            ? "bg-white/16 text-white"
            : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
        )}
      >
        {count}
      </span>
    </motion.button>
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
        <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="rounded-[8px] bg-[var(--bg-muted-strong)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
          {value}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </BezelSurface>
  );
}

export function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] p-4">
      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
