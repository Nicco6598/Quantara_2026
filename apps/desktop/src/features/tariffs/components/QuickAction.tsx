import type { LucideIcon } from "lucide-react";

export function QuickAction({
  detail,
  icon: Icon,
  label,
  onClick,
  tone,
}: {
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
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--bg-muted)]"
      onClick={onClick}
      type="button"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-13px font-bold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="block truncate text-11px font-medium text-[var(--text-secondary)]">
          {detail}
        </span>
      </span>
    </button>
  );
}
