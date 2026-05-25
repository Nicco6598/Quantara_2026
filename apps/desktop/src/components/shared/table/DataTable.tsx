import type { ReactNode } from "react";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { cn } from "@/lib/utils";

const TABLE_SKELETON_KEYS = [
  "table-skeleton-0",
  "table-skeleton-1",
  "table-skeleton-2",
  "table-skeleton-3",
  "table-skeleton-4",
  "table-skeleton-5",
  "table-skeleton-6",
  "table-skeleton-7",
] as const;

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render: (item: T, index: number) => ReactNode;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  className?: string;
  emptyState?: ReactNode;
  loading?: boolean;
  rowActions?: (item: T) => ReactNode;
  getRowClassName?: (item: T) => string | undefined;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  sortColumn,
  sortDirection,
  onSort,
  className,
  emptyState,
  loading,
  rowActions,
  getRowClassName,
}: DataTableProps<T>) {
  const hasSelection = Boolean(onToggleSelect && selectedIds);
  const allSelected =
    hasSelection && data.length > 0 && data.every((item) => selectedIds?.has(keyExtractor(item)));
  const someSelected =
    hasSelection && !allSelected && data.some((item) => selectedIds?.has(keyExtractor(item)));

  if (loading) {
    return (
      <div
        className={cn("overflow-hidden rounded-lg border border-[var(--border-subtle)]", className)}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {hasSelection ? <th className="w-10 px-3 py-2.5" /> : null}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-11px font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]"
                  style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
              {rowActions ? <th className="w-12 px-3 py-2.5" /> : null}
            </tr>
          </thead>
          <tbody>
            {TABLE_SKELETON_KEYS.map((key) => (
              <tr key={key} className="border-b border-[var(--border-subtle)]">
                {hasSelection ? (
                  <td className="px-3 py-2.5">
                    <div className="size-5 animate-pulse rounded-[4px] bg-[var(--bg-muted)]" />
                  </td>
                ) : null}
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-muted)]" />
                  </td>
                ))}
                {rowActions ? (
                  <td className="px-3 py-2.5">
                    <div className="size-5 animate-pulse rounded bg-[var(--bg-muted)]" />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-[var(--border-subtle)]", className)}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
              {hasSelection ? (
                <th className="sticky top-0 z-10 w-10 bg-[var(--surface-base)] px-3 py-2.5">
                  {allSelected || someSelected ? (
                    <SelectionCheckbox
                      checked={allSelected}
                      id="select-all"
                      onToggle={() => {
                        if (allSelected) {
                          onClearSelection?.();
                        } else {
                          onSelectAll?.();
                        }
                      }}
                    />
                  ) : (
                    <SelectionCheckbox
                      checked={false}
                      id="select-all"
                      onToggle={() => onSelectAll?.()}
                    />
                  )}
                </th>
              ) : null}
              {columns.map((col) =>
                col.sortable ? (
                  <SortableHeader
                    key={col.key}
                    column={col.key}
                    label={col.header}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={onSort}
                    {...(col.align ? { align: col.align } : {})}
                    {...(col.width ? { width: col.width } : {})}
                  />
                ) : (
                  <th
                    key={col.key}
                    className={cn(
                      "sticky top-0 z-10 bg-[var(--surface-base)] px-3 py-2.5 text-11px font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                    )}
                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                ),
              )}
              {rowActions ? (
                <th className="sticky right-0 top-0 z-20 w-12 bg-[var(--surface-base)] px-3 py-2.5" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds?.has(id) ?? false;

              return (
                <tr
                  key={id}
                  className={cn(
                    "group border-b border-[var(--border-subtle)] transition-colors duration-[var(--duration-fast)]",
                    onRowClick && "cursor-pointer",
                    isSelected && "bg-[var(--info-soft)]/10",
                    !isSelected && "hover:bg-[var(--bg-muted)]",
                    getRowClassName?.(item),
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {hasSelection ? (
                    <td className="px-3 py-2.5">
                      <SelectionCheckbox
                        checked={isSelected}
                        id={id}
                        onToggle={(checkedId) => onToggleSelect?.(checkedId)}
                      />
                    </td>
                  ) : null}
                  {columns.map((col) => {
                    const Cell = col.render(item, index);
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-2.5 text-13px text-[var(--text-primary)]",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                        )}
                        style={col.width ? { width: col.width, maxWidth: col.width } : undefined}
                      >
                        {typeof Cell === "string" || typeof Cell === "number" ? (
                          <span className="block truncate">{Cell}</span>
                        ) : (
                          Cell
                        )}
                      </td>
                    );
                  })}
                  {rowActions ? (
                    <td className="sticky right-0 z-10 bg-[var(--surface-base)] px-2 py-2.5 group-hover:bg-[var(--bg-muted)]">
                      <div className="invisible flex items-center justify-end group-hover:visible">
                        {rowActions(item)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
