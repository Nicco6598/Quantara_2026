import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { BezelSurface, ProjectControlButton } from "@/components/shared/ui-primitives";
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
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const isActive = book.status === "active" || book.status === "validated";

  return (
    <div className="p-2 2xl:p-0">
      {/* Mobile card view */}
      <BezelSurface
        className="2xl:hidden"
        innerClassName={cn(
          "p-3 transition-all duration-200",
          isSelected &&
            "bg-[color-mix(in_srgb,var(--info-soft)_24%,var(--surface-base)_76%)] ring-1 ring-[var(--accent-primary)]/25",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <button className="min-w-0 flex-1 text-left" onClick={onSelect} type="button">
            <div className="flex items-center gap-2">
              <button
                aria-label={isFavorite ? "Rimuovi dai preferiti" : "Segna come preferito"}
                className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--warning-base)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                type="button"
              >
                <Star
                  className={`size-4 ${
                    isFavorite ? "fill-[var(--warning-base)] text-[var(--warning-base)]" : ""
                  }`}
                />
              </button>
              <span className="truncate text-13px font-bold text-[var(--text-primary)]">
                {book.name}
              </span>
            </div>
            <div className="mt-1 truncate text-11px font-medium text-[var(--text-secondary)]">
              {book.sourceName} · {book.year}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-12px font-medium text-[var(--text-secondary)]">
              <Badge variant={isActive ? "success" : "warning"}>{book.status}</Badge>
              <span>{linkedProjectCount} progetti</span>
              <span>{voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT")} voci</span>
            </div>
          </button>
          <div ref={mobileRef}>
            <ProjectControlButton
              aria-label={`Azioni per ${book.name}`}
              onClick={() => setIsOpen(!isOpen)}
              variant="icon"
            >
              <MoreVertical className="size-4" />
            </ProjectControlButton>
          </div>
          <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={mobileRef}>
            <DropdownItem
              icon={Pencil}
              label="Modifica"
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
            />
            <DropdownDivider />
            <DropdownItem
              icon={Trash2}
              label="Elimina"
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              tone="danger"
            />
          </DropdownMenu>
        </div>
      </BezelSurface>

      {/* Desktop grid row (2xl+) */}
      <div
        className={cn(
          "hidden 2xl:grid 2xl:grid-cols-[36px_minmax(190px,1.5fr)_minmax(130px,0.8fr)_70px_82px_100px_92px_36px] 2xl:items-center 2xl:gap-3 2xl:rounded-lg 2xl:px-3 2xl:py-3 2xl:transition-all 2xl:duration-200",
          isSelected
            ? "bg-[color-mix(in_srgb,var(--info-soft)_24%,var(--surface-base)_76%)] ring-1 ring-[var(--accent-primary)]/25 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_60%,transparent)]"
            : "hover:bg-[var(--bg-muted)]",
        )}
      >
        <button
          aria-label={isFavorite ? "Rimuovi dai preferiti" : "Segna come preferito"}
          className="text-[var(--text-secondary)] hover:text-[var(--warning-base)]"
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
          <div className="truncate text-13px font-bold text-[var(--text-primary)]">{book.name}</div>
          <div className="mt-1 truncate text-11px font-medium text-[var(--text-secondary)]">
            ID: {book.id}
          </div>
        </button>
        <div className="min-w-0 text-12px font-medium text-[var(--text-secondary)]">
          <div className="truncate">{book.sourceName}</div>
        </div>
        <div className="text-13px font-semibold text-[var(--text-primary)]">{book.year}</div>
        <div>
          <Badge variant={isActive ? "success" : "warning"}>{book.status}</Badge>
        </div>
        <div className="text-center text-13px font-semibold text-[var(--text-primary)]">
          {linkedProjectCount}
        </div>
        <div className="text-right text-13px font-semibold text-[var(--text-primary)]">
          {voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT")}
        </div>
        <div className="justify-self-end">
          <div ref={desktopRef}>
            <ProjectControlButton
              aria-label={`Azioni per ${book.name}`}
              onClick={() => setIsOpen(!isOpen)}
              variant="icon"
            >
              <MoreVertical className="size-4" />
            </ProjectControlButton>
          </div>
          <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={desktopRef}>
            <DropdownItem
              icon={Pencil}
              label="Modifica"
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
            />
            <DropdownDivider />
            <DropdownItem
              icon={Trash2}
              label="Elimina"
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              tone="danger"
            />
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
