import type { LucideIcon } from "lucide-react";

export function TariffMetric({
  detail,
  icon: Icon,
  label,
  tone = "info",
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone?: "info" | "success" | "warning";
  value: string;
}) {
  const iconClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success-base)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
        : "bg-[var(--info-soft)] text-[var(--info-base)]";

  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconClass}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-1 text-[20px] font-bold leading-none text-[var(--text-primary)]">
            {value}
          </div>
        </div>
      </div>
      <div className="mt-2 truncate pl-[42px] text-[11px] font-medium text-[var(--text-secondary)]">
        {detail || "Nel catalogo"}
      </div>
    </div>
  );
}
