import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

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
    <section className="group min-h-[130px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]">
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
    </section>
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
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all",
        active
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-none"
          : "border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]",
      )}
      onClick={onClick}
      type="button"
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
    </button>
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
    <aside className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="rounded-[8px] bg-[var(--bg-muted-strong)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
          {value}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </aside>
  );
}

export function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
