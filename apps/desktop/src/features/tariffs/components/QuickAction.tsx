import type { LucideIcon } from "lucide-react";

export function QuickAction({
  badge,
  detail,
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  badge?: string;
  detail: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: "info" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success-base)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
        : "bg-[var(--info-soft)] text-[var(--info-base)]";

  return (
    <button
      className="group relative flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--bg-muted)]"
      onClick={onClick}
      type="button"
    >
      <span className={`relative grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="size-4" />
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 py-px text-9px font-bold leading-tight text-white ring-2 ring-[var(--surface-base)]">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-13px font-bold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="block truncate text-11px font-medium text-[var(--text-secondary)]">
          {detail}
        </span>
      </span>
      {badge ? (
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[var(--accent-primary)]/10 px-2.5 py-1 text-10px font-bold text-[var(--accent-primary)] sm:flex">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
