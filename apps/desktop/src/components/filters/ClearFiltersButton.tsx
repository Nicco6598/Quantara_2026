import { X } from "lucide-react";

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex h-10 items-center gap-1.5 rounded-14px border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3.5 text-13px font-medium text-[var(--accent-primary)] outline-none transition hover:border-[var(--accent-primary)]/40 hover:bg-[var(--info-soft)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
      onClick={onClick}
      type="button"
    >
      <X className="size-4" />
      Cancella
    </button>
  );
}
