import { X } from "lucide-react";

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex h-10 items-center gap-1.5 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3.5 text-13px font-medium text-[var(--accent-primary)] outline-none transition-[border-color,background-color,box-shadow,transform] duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--accent-primary)_32%,var(--border-subtle))] hover:bg-[var(--info-soft)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0"
      onClick={onClick}
      type="button"
    >
      <X className="size-4" />
      Cancella
    </button>
  );
}
