import { useCallback, useMemo, useState } from "react";
import { useMultiSelect } from "./use-multi-select";

export function useMultiSelectDelete<T extends { id: string }>(items: T[]) {
  const multiSelect = useMultiSelect(items);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((i) => multiSelect.selectedIds.has(i.id)),
    [multiSelect.selectedIds, items],
  );

  const requestDelete = useCallback(() => setIsConfirmOpen(true), []);
  const dismissDelete = useCallback(() => setIsConfirmOpen(false), []);
  const onDeleted = useCallback(() => {
    setIsConfirmOpen(false);
    multiSelect.disable();
  }, [multiSelect]);

  return {
    ...multiSelect,
    selectedItems,
    isConfirmOpen,
    requestDelete,
    dismissDelete,
    onDeleted,
  };
}
