import type { LucideIcon } from "lucide-react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export function MetricCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: "blue" | "green" | "orange" | "red";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
    green: "bg-[var(--success-soft)] text-[var(--success-base)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    red: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  }[tone];

  return (
    <section className="group min-h-[154px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]">
      <div className="flex items-start gap-4">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {value}
          </div>
          <div className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
            {detail}
          </div>
        </div>
      </div>
    </section>
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
  const toneClass = tone
    ? {
        danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        info: "bg-[var(--info-soft)] text-[var(--info-base)]",
        neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
        success: "bg-[var(--success-soft)] text-[var(--success-base)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
      }[tone]
    : undefined;

  return (
    <section className="group min-h-[130px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]">
      <div className="flex items-start gap-4">
        {Icon && toneClass ? (
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

export function WorkbenchMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[12px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}

export function LaneMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-semibold text-[var(--text-primary)]">{value}</dd>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

export function FolderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-2.5 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
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

export function ToneBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const cls = {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone];

  return (
    <span className={cn("rounded-[9px] px-2.5 py-1 text-[11px] font-semibold", cls)}>{label}</span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

export function CountBadge({
  tone = "neutral",
  value,
}: {
  tone?: StatusTone;
  value: number | string;
}) {
  const cls = {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone];

  return (
    <span className={cn("rounded-[9px] px-2.5 py-1 text-[11px] font-semibold", cls)}>{value}</span>
  );
}
