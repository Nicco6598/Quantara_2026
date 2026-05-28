import { SortIndicator } from "@/components/shared/SortIndicator";
import type { SortDirection } from "@/hooks/use-table-sort";
import { cn } from "@/lib/utils";

export type SortableHeaderProps = {
  label: string;
  column: string;
  sortColumn?: string | undefined;
  sortDirection?: "asc" | "desc" | undefined;
  onSort?: ((column: string) => void) | undefined;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
};

export function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
  width,
  className,
}: SortableHeaderProps) {
  const isActive = sortColumn === column;
  const direction: SortDirection = isActive && sortDirection ? sortDirection : null;

  return (
    <th
      className={cn(
        "sticky top-0 z-10 select-none px-3 py-2.5 text-11px font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]",
        onSort && "cursor-pointer",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
      onClick={() => onSort?.(column)}
      style={width ? { width, minWidth: width } : undefined}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
        )}
      >
        <span>{label}</span>
        {onSort ? (
          <SortIndicator active={isActive} direction={direction} onClick={() => onSort(column)} />
        ) : null}
      </div>
    </th>
  );
}
