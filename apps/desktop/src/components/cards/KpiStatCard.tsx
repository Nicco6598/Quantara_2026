import type { ReactNode } from "react";

type KpiStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
};

export function KpiStatCard({ detail, icon, label, value }: KpiStatCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft transition-transform duration-base ease-standard hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-secondary">{label}</span>
          <strong className="text-xl font-semibold text-foreground">{value}</strong>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-primary">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-secondary">{detail}</p>
      <div className="mt-3 h-1.5 rounded-sm bg-muted">
        <div className="h-full w-2/3 rounded-sm bg-primary" />
      </div>
    </section>
  );
}
