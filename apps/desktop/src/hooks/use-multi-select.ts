import { useCallback, useMemo, useState } from "react";

type MultiSelectState<T> = {
  isEnabled: boolean;
  selectedIds: Set<string>;
  toggleEnable: () => void;
  disable: () => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  invert: (allIds: string[]) => void;
  isSelected: (id: string) => boolean;
  count: number;
  allSelected: boolean;
  someSelected: boolean;
  getSelectedItems: (items: T[]) => T[];
};

export function useMultiSelect<T extends { id: string }>(items: T[]): MultiSelectState<T> {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleEnable = useCallback(() => {
    setIsEnabled((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const invert = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of allIds) {
        if (!prev.has(id)) next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selectedIds.has(id)),
    [allIds, selectedIds],
  );
  const someSelected = useMemo(
    () => !allSelected && allIds.some((id) => selectedIds.has(id)),
    [allSelected, allIds, selectedIds],
  );

  const getSelectedItems = useCallback(
    (allItems: T[]) => allItems.filter((i) => selectedIds.has(i.id)),
    [selectedIds],
  );

  return {
    isEnabled,
    selectedIds,
    toggleEnable,
    disable,
    toggle,
    selectAll,
    clear,
    invert,
    isSelected,
    count: selectedIds.size,
    allSelected,
    someSelected,
    getSelectedItems,
  };
}
