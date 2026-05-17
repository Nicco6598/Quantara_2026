import { m } from "framer-motion";
import { CheckSquare, ListChecks, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MultiSelectToggleProps = {
  isEnabled: boolean;
  onToggle: () => void;
  count?: number;
  label?: string;
};

export function MultiSelectToggle({
  isEnabled,
  onToggle,
  count,
  label = "Selezione multipla",
}: MultiSelectToggleProps) {
  if (isEnabled) {
    return (
      <m.button
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)]/10 px-4 text-12px font-semibold text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/25 transition-colors hover:bg-[var(--accent-primary)]/15"
        initial={{ opacity: 0, scale: 0.95 }}
        onClick={onToggle}
        title="Chiudi selezione multipla"
        type="button"
      >
        <ListChecks className="size-4" />
        <span>{count != null && count > 0 ? `${count} selezionati` : label}</span>
        <X className="ml-1 size-3.5 opacity-60" />
      </m.button>
    );
  }

  return (
    <button
      className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-12px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <CheckSquare className="size-4" />
      <span>Seleziona</span>
    </button>
  );
}

type MultiSelectBulkBarProps = {
  count: number;
  entityLabel: string;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

export function MultiSelectBulkBar({
  count,
  entityLabel,
  allSelected,
  someSelected,
  onSelectAll,
  onClear,
  onClose,
  children,
}: MultiSelectBulkBarProps) {
  return (
    <m.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)]/70 bg-[var(--surface-base)] px-4 py-3 shadow-soft"
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      initial={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
    >
      <button
        className="flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors"
        onClick={allSelected ? onClear : onSelectAll}
        type="button"
      >
        {allSelected || someSelected ? (
          <svg
            className={cn("size-3", someSelected ? "opacity-50" : "")}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <title>{allSelected ? "Tutti selezionati" : "Selezione parziale"}</title>
            {allSelected ? <path d="M20 6L9 17l-5-5" /> : <path d="M6 12h12" />}
          </svg>
        ) : null}
      </button>

      <span className="inline-flex items-center gap-2 text-13px font-semibold text-[var(--text-primary)]">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-12px font-bold text-[var(--text-inverse)] shadow-sm">
          {count}
        </span>
        <span>
          {count} {entityLabel} selezionat
          {count === 1 ? (entityLabel.endsWith("a") ? "a" : "o") : "i"}
        </span>
      </span>

      <span className="h-7 w-px bg-[var(--border-subtle)]" />

      {children}

      <m.button
        className="ml-auto flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
        onClick={onClose}
        title="Chiudi selezione"
        type="button"
      >
        <X className="size-4" />
      </m.button>
    </m.div>
  );
}
