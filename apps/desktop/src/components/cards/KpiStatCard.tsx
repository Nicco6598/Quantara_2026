import type { ReactNode } from "react";

type KpiStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};

export function KpiStatCard({ detail, icon, label, value }: KpiStatCardProps) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5 transition-transform duration-base hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
          <strong className="text-2xl font-semibold text-[var(--text-primary)]">{value}</strong>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">{detail}</p>
      <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-muted)]">
        <div className="h-full w-2/3 rounded-full bg-[var(--accent-primary)]" />
      </div>
    </section>
  );
}