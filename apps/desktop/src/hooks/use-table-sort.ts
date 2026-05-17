import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc" | null;

type SortConfig<T> = {
  key: keyof T | null;
  direction: SortDirection;
};

export function useTableSort<T extends Record<string, unknown>>(
  items: T[],
  defaultSortKey?: keyof T,
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: defaultSortKey ?? null,
    direction: defaultSortKey ? "asc" : null,
  });

  const onSort = useCallback((key: keyof T) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { key: null, direction: null };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return items;
    }

    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * multiplier;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return aStr.localeCompare(bStr, "it") * multiplier;
    });
  }, [items, sortConfig]);

  return {
    sortedItems,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    onSort,
  };
}
