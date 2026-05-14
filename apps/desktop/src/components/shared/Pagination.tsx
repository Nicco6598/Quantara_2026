import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  filteredCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-5 py-4 text-12px font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        Mostra {pageSize} di {filteredCount} risult{filteredCount === 1 ? "ato" : "i"}
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Pagina precedente"
          className="flex size-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-12px font-bold transition-colors",
              p === page
                ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                : "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]",
            )}
            key={p}
            onClick={() => onPageChange(p)}
            type="button"
          >
            {p}
          </button>
        ))}
        <button
          aria-label="Pagina successiva"
          className="flex size-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
