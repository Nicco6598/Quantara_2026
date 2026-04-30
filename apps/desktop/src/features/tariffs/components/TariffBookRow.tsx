import { MoreVertical, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import type { DesktopTariffBook } from "@/lib/desktopData";

export function TariffBookRow({
  book,
  isFavorite,
  isSelected,
  linkedProjectCount,
  onDelete,
  onEdit,
  onSelect,
  onToggleFavorite,
  voiceCount,
}: {
  book: DesktopTariffBook;
  isFavorite: boolean;
  isSelected: boolean;
  linkedProjectCount: number;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
  onToggleFavorite: () => void;
  voiceCount: number | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = book.status === "active" || book.status === "validated";

  return (
    <div className="px-2 py-1.5">
      <div
        className={`group relative grid gap-3 rounded-lg border px-3 py-3 transition-colors 2xl:grid-cols-[36px_minmax(190px,1.5fr)_minmax(130px,0.8fr)_70px_82px_100px_92px_36px] 2xl:items-center ${
          isSelected
            ? "border-[var(--accent-primary)]/45 bg-[var(--accent-primary)]/8 shadow-sm"
            : "border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]"
        }`}
      >
        <button
          aria-label={isFavorite ? "Rimuovi dai preferiti" : "Segna come preferito"}
          className="hidden text-[var(--text-secondary)] hover:text-[var(--warning-base)] 2xl:block"
          onClick={onToggleFavorite}
          type="button"
        >
          <Star
            className={`size-4 ${
              isFavorite ? "fill-[var(--warning-base)] text-[var(--warning-base)]" : ""
            }`}
          />
        </button>
        <button className="min-w-0 text-left" onClick={onSelect} type="button">
          <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
            {book.name}
          </div>
          <div className="mt-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
            ID: {book.id}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)] 2xl:hidden">
            {book.sourceName} · {book.year} · {linkedProjectCount} progetti ·{" "}
            {voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT")} voci
            <Badge variant={isActive ? "success" : "warning"}>{book.status}</Badge>
          </div>
        </button>
        <div className="hidden min-w-0 text-[12px] font-medium text-[var(--text-secondary)] 2xl:block">
          <div className="truncate">{book.sourceName}</div>
        </div>
        <div className="hidden text-[13px] font-semibold text-[var(--text-primary)] 2xl:block">
          {book.year}
        </div>
        <div className="hidden 2xl:block">
          <Badge variant={isActive ? "success" : "warning"}>{book.status}</Badge>
        </div>
        <div className="hidden text-center text-[13px] font-semibold text-[var(--text-primary)] 2xl:block">
          {linkedProjectCount}
        </div>
        <div className="hidden text-right text-[13px] font-semibold text-[var(--text-primary)] 2xl:block">
          {voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT")}
        </div>
        <div className="absolute right-3 top-3 2xl:static 2xl:justify-self-end">
          <Button
            aria-expanded={isOpen}
            aria-label={`Azioni per ${book.name}`}
            onClick={() => setIsOpen(!isOpen)}
            size="icon"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
          {isOpen && (
            <>
              <button
                aria-label="Chiudi menu azioni"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsOpen(false)}
                type="button"
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-[14px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] py-1 shadow-none">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Modifica
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--danger-base)] hover:bg-[var(--bg-muted)]"
                  onClick={() => {
                    onDelete();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Elimina
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
