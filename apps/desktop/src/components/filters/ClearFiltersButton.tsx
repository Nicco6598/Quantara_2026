import { X } from "lucide-react";

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[var(--info-soft)]"
      onClick={onClick}
      type="button"
    >
      <X className="size-3.5" />
      Cancella filtri
    </button>
  );
}
