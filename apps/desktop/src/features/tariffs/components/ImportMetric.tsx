import type { LucideIcon } from "lucide-react";

export function ImportMetric({
  caption,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  caption?: string;
  icon?: LucideIcon;
  label: string;
  tone?: "info" | "neutral" | "success" | "warning";
  value: string;
}) {
  const color =
    tone === "success"
      ? "text-[var(--success-base)]"
      : tone === "warning"
        ? "text-[var(--warning-base)]"
        : tone === "info"
          ? "text-[var(--info-base)]"
          : "text-[var(--text-primary)]";
  const iconTone =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success-base)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
        : tone === "info"
          ? "bg-[var(--info-soft)] text-[var(--info-base)]"
          : "bg-[var(--bg-muted)] text-[var(--accent-primary)]";

  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-18px bg-[var(--surface-base)] p-4 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)] shadow-[0_18px_44px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]">
      {Icon ? (
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-14px ${iconTone}`}
        >
          <Icon className="size-5" strokeWidth={1.9} />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-10px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
          {label}
        </div>
        <div className={`mt-2 text-25px font-bold leading-none tracking-neg-0_03em ${color}`}>
          {value}
        </div>
        {caption ? (
          <div className="mt-2 truncate text-12px font-semibold text-[var(--text-secondary)]">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}
