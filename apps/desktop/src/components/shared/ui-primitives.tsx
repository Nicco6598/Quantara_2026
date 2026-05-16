import { m } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION_DURATION, SPRING_EASE } from "@/motion";
import { cn } from "@/lib/utils";

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
        "micro-interact inline-flex items-center gap-2 rounded-full border px-4 py-2 text-13px font-medium outline-none transition-all duration-slow ease-standard",
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
            ? "bg-[var(--accent-primary)]/16 text-[var(--text-inverse)]"
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
