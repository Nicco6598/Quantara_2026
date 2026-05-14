import { cn } from "@/lib/utils";

type SelectionCheckboxProps = {
  checked: boolean;
  id: string;
  onToggle: (id: string) => void;
  className?: string;
};

export function SelectionCheckbox({ checked, id, onToggle, className }: SelectionCheckboxProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: styled custom checkbox with SVG, needs <button> not <input>
    <button
      aria-checked={checked}
      aria-label={checked ? "Deseleziona" : "Seleziona"}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        checked
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
          : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/60",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(id);
      }}
      role="checkbox"
      type="button"
    >
      {checked ? (
        <svg
          aria-hidden="true"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  );
}

type SelectAllCheckboxProps = {
  allIds: string[];
  selectedIds: Set<string>;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
};

export function SelectAllCheckbox({
  allIds,
  selectedIds,
  onSelectAll,
  onClear,
}: SelectAllCheckboxProps) {
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && allIds.some((id) => selectedIds.has(id));

  return (
    // biome-ignore lint/a11y/useSemanticElements: styled custom checkbox with SVG, needs <button> not <input>
    <button
      aria-checked={allSelected}
      aria-label={allSelected ? "Deseleziona tutto" : "Seleziona tutto"}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        allSelected
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
          : someSelected
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
            : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/60",
      )}
      onClick={() => (allSelected ? onClear() : onSelectAll(allIds))}
      role="checkbox"
      type="button"
    >
      {allSelected || someSelected ? (
        <svg
          aria-hidden="true"
          className={cn("size-3", someSelected ? "opacity-50" : "")}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          {allSelected ? <path d="M20 6L9 17l-5-5" /> : <path d="M6 12h12" />}
        </svg>
      ) : null}
    </button>
  );
}
