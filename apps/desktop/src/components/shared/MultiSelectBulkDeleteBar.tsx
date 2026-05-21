import { type ReactNode, useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { MultiSelectBulkBar } from "./MultiSelectControls";

type MultiSelectBulkDeleteBarProps = {
  count: number;
  entityLabel: string;
  entityLabelSingular: string;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
  onDeleteRequest: () => void;
  isDeleteConfirmOpen: boolean;
  onDeleteConfirmDismiss: () => void;
  onDeleteConfirm: () => Promise<void> | void;
  selectedItemNames: string[];
  children?: ReactNode;
};

export function MultiSelectBulkDeleteBar({
  count,
  entityLabel,
  entityLabelSingular,
  allSelected,
  someSelected,
  onSelectAll,
  onClear,
  onClose,
  onDeleteRequest,
  isDeleteConfirmOpen,
  onDeleteConfirmDismiss,
  onDeleteConfirm,
  selectedItemNames,
  children,
}: MultiSelectBulkDeleteBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const showingNames = selectedItemNames.slice(0, 5);
  const remaining = selectedItemNames.length - showingNames.length;

  return (
    <>
      <MultiSelectBulkBar
        allSelected={allSelected}
        count={count}
        entityLabel={entityLabel}
        onClear={onClear}
        onClose={onClose}
        onSelectAll={onSelectAll}
        someSelected={someSelected}
      >
        {children}
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3.5 text-12px font-bold text-[var(--danger-base)] ring-1 ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger-soft)_80%,var(--danger-base)_20%)]"
          onClick={onDeleteRequest}
          type="button"
        >
          <Trash2 className="size-4" />
          Elimina
        </button>
      </MultiSelectBulkBar>

      <ConfirmDialog
        confirmLabel={isDeleting ? "Eliminazione..." : "Elimina"}
        isOpen={isDeleteConfirmOpen}
        onCancel={onDeleteConfirmDismiss}
        onConfirm={handleDelete}
        title={`Eliminare ${count} ${count === 1 ? entityLabelSingular : entityLabel}?`}
        tone="danger"
      >
        <p>
          {count === 1
            ? `Stai per eliminare definitivamente questo ${entityLabelSingular}.`
            : `Stai per eliminare ${count} ${entityLabel} definitivamente.`}
        </p>
        {count > 1 && (
          <ul className="mt-2 space-y-0.5">
            {showingNames.map((name) => (
              <li key={name} className="truncate text-13px">
                {name}
              </li>
            ))}
            {remaining > 0 && (
              <li className="text-12px text-[var(--text-secondary)]">
                ...e altri {remaining} {entityLabel}
              </li>
            )}
          </ul>
        )}
      </ConfirmDialog>
    </>
  );
}
