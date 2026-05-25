import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const LIST_SKELETON_KEYS = [
  "list-skeleton-0",
  "list-skeleton-1",
  "list-skeleton-2",
  "list-skeleton-3",
  "list-skeleton-4",
] as const;

const listGapVariants = cva("flex flex-col", {
  defaultVariants: {
    gap: "md",
  },
  variants: {
    gap: {
      sm: "gap-1.5",
      md: "gap-2",
      lg: "gap-3",
    },
  },
});

export type DataListProps<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  emptyState?: ReactNode;
  loading?: boolean;
  gap?: "sm" | "md" | "lg";
};

export function DataList<T>({
  data,
  keyExtractor,
  renderItem,
  className,
  emptyState,
  loading,
  gap,
}: DataListProps<T>) {
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {LIST_SKELETON_KEYS.map((key) => (
          <div key={key} className="h-14 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <ul className={cn(listGapVariants({ gap }), className)}>
      {data.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
