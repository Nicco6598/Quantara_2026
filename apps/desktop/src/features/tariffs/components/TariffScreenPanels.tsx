import { m } from "framer-motion";
import { Database, Eye, MoreVertical, Pencil, Save, Star, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { DetailList, DetailRow } from "@/components/shared/DetailList";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { useContextMenu } from "@/hooks/useContextMenu";
import { buildTariffBookContextMenuEntries } from "@/lib/context-menu-presets";
import type { DesktopTariffBook, TariffPdfMetadata } from "@/lib/desktopData";
import { cn } from "@/lib/utils";
import { MOTION_VARIANTS } from "@/motion";
import type { EditTariffBookForm } from "../tariffs-types";
import { TariffEditField } from "./TariffEditField";
import {
  TariffImportPreviewModal,
  type TariffImportPreviewResult,
} from "./TariffImportPreviewModal";

export function TariffBookPreviewCard({
  book,
  editForm,
  editing,
  isFavorite,
  isSelected,
  linkedProjectCount,
  onCancelEdit,
  onDelete,
  onEdit,
  onEditFormChange,
  onOpenVoices,
  onSaveEdit,
  onShowDetails,
  onToggleFavorite,
  onToggleSelect,
  showCheckbox,
  showDetails,
  voiceCount,
}: {
  book: DesktopTariffBook;
  editForm: EditTariffBookForm;
  editing: boolean;
  isFavorite: boolean;
  isSelected?: boolean;
  linkedProjectCount: number;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onEditFormChange: Dispatch<SetStateAction<EditTariffBookForm>>;
  onOpenVoices: () => void;
  onSaveEdit: () => void;
  onShowDetails: () => void;
  onToggleFavorite: () => void;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
  showDetails: boolean;
  voiceCount: number | undefined;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenu = useContextMenu<void>();
  const displayVoiceCount = voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT");

  return (
    <m.article
      className={cn(
        "operational-card-hover relative rounded-lg border px-3 py-2 text-left",
        isSelected
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_7%,var(--surface-base)_93%)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-base)]",
      )}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenu.open(event, undefined);
      }}
      initial={MOTION_VARIANTS.row.initial}
      transition={MOTION_VARIANTS.row.transition}
      viewport={MOTION_VARIANTS.row.viewport}
      whileInView={MOTION_VARIANTS.row.whileInView}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          {showCheckbox ? (
            <span className="shrink-0">
              <SelectionCheckbox
                checked={isSelected ?? false}
                id={book.id}
                onToggle={onToggleSelect ?? (() => {})}
              />
            </span>
          ) : null}
          <button
            className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] md:grid-cols-[minmax(0,1fr)_92px_92px_86px]"
            onClick={showCheckbox ? () => onToggleSelect?.(book.id) : onShowDetails}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-10px font-bold text-[var(--text-tertiary)]">
                PDF
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-13px font-semibold leading-tight text-[var(--text-primary)]">
                  {book.name}
                </h3>
                <p className="mt-0.5 truncate text-12px text-[var(--text-secondary)]">
                  {book.sourceName}
                </p>
              </div>
            </div>

            <div className="hidden min-w-0 md:block">
              <div className="flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
                <Badge
                  variant={
                    book.status === "draft"
                      ? "warning"
                      : book.status === "validated"
                        ? "info"
                        : "success"
                  }
                >
                  {book.status === "draft"
                    ? "Bozza"
                    : book.status === "validated"
                      ? "Validato"
                      : "Attivo"}
                </Badge>
              </div>
            </div>

            <div className="hidden text-12px font-semibold tabular-nums text-[var(--text-primary)] md:block">
              {displayVoiceCount} voci
            </div>

            <div className="text-right text-12px font-semibold tabular-nums text-[var(--text-primary)]">
              <span className="block md:hidden">{book.year}</span>
              <span className="hidden md:block">{book.year}</span>
              <span className="mt-0.5 block text-10px font-medium text-[var(--text-secondary)]">
                {linkedProjectCount} progetti
              </span>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Segna come preferito"}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--warning-soft)] hover:text-[var(--warning-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                isFavorite && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
              )}
              onClick={onToggleFavorite}
              type="button"
            >
              <Star className={cn("size-4", isFavorite && "fill-current")} />
            </button>
            <div ref={menuRef}>
              <Button onClick={() => setIsMenuOpen((value) => !value)} variant="icon">
                <MoreVertical className="size-4" />
              </Button>
              <DropdownMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                triggerRef={menuRef}
              >
                <DropdownItem
                  icon={Eye}
                  label={showDetails ? "Nascondi scheda" : "Mostra scheda"}
                  onClick={() => {
                    onShowDetails();
                    setIsMenuOpen(false);
                  }}
                />
                <DropdownItem
                  icon={Pencil}
                  label="Modifica dettagli"
                  onClick={() => {
                    onEdit();
                    setIsMenuOpen(false);
                  }}
                />
                <DropdownItem
                  icon={Database}
                  label="Modifica voci"
                  onClick={() => {
                    onOpenVoices();
                    setIsMenuOpen(false);
                  }}
                />
                <DropdownDivider />
                <DropdownItem
                  icon={Trash2}
                  label="Elimina tariffario"
                  onClick={() => {
                    onDelete();
                    setIsMenuOpen(false);
                  }}
                  tone="danger"
                />
              </DropdownMenu>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="mt-3 space-y-3 rounded-lg border border-[var(--border-subtle)]/70 bg-[var(--surface-base)] p-3">
            <TariffEditField
              label="Nome"
              onChange={(value) => onEditFormChange((form) => ({ ...form, name: value }))}
              value={editForm.name}
            />
            <TariffEditField
              label="Ente"
              onChange={(value) => onEditFormChange((form) => ({ ...form, sourceName: value }))}
              value={editForm.sourceName}
            />
            <div className="grid grid-cols-2 gap-2">
              <TariffEditField
                label="Anno"
                onChange={(value) => onEditFormChange((form) => ({ ...form, year: value }))}
                value={editForm.year}
              />
              <label className="text-11px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
                Stato
                <div className="relative mt-1">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-13px font-medium normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    onChange={(event) =>
                      onEditFormChange((form) => ({ ...form, status: event.target.value }))
                    }
                    value={editForm.status}
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="validated">validated</option>
                  </select>
                  <svg
                    aria-hidden={true}
                    className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" icon={Save} onClick={onSaveEdit} variant="primary">
                Salva
              </Button>
              <Button onClick={onCancelEdit} variant="outline">
                Annulla
              </Button>
            </div>
          </div>
        ) : showDetails ? (
          <m.div
            className="mt-3 rounded-lg border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/40 p-3"
            animate={MOTION_VARIANTS.viewSwap.animate}
            exit={MOTION_VARIANTS.viewSwap.exit}
            initial={MOTION_VARIANTS.viewSwap.initial}
            transition={MOTION_VARIANTS.viewSwap.transition}
          >
            <DetailList>
              <DetailRow label="ID" value={book.id} />
              <DetailRow label="Ente" value={book.sourceName} />
              <DetailRow label="Stato" value={book.status} />
              <DetailRow label="Progetti collegati" value={`${linkedProjectCount}`} />
              <DetailRow label="Sottovoci" value={displayVoiceCount} />
            </DetailList>
          </m.div>
        ) : null}
      </div>

      {contextMenu.state ? (
        <AppContextMenu
          entries={buildTariffBookContextMenuEntries({
            isFavorite,
            onShowDetails,
            onEdit,
            onOpenVoices,
            onToggleFavorite,
            onDelete,
          })}
          header={{ title: book.name, subtitle: book.sourceName }}
          onClose={contextMenu.close}
          position={{ x: contextMenu.state.x, y: contextMenu.state.y }}
        />
      ) : null}
    </m.article>
  );
}
export function TariffImportPreviewPanel({
  draftedImportFiles: _draftedImportFiles,
  getExistingBookIds,
  importPreviewIndex,
  importPreviews,
  onCancel,
  onConfirm,
  onActiveIndexChange,
  onDraftedFilesChange,
  onMetadatasChange,
  onPageCanConfirmChange,
  onPreviewReady,
  onReviewedFilesChange,
  reviewedFiles: _reviewedFiles,
}: {
  draftedImportFiles: Set<number>;
  getExistingBookIds: () => string[];
  importPreviewIndex: number;
  importPreviews: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffImportPreviewResult[]) => Promise<void>;
  onActiveIndexChange: (index: number) => void;
  onDraftedFilesChange: (next: Set<number>) => void;
  onMetadatasChange: (metadatas: TariffPdfMetadata[]) => void;
  onPageCanConfirmChange: (value: boolean) => void;
  onPreviewReady?: () => void;
  onReviewedFilesChange: (next: Set<number>) => void;
  reviewedFiles: Set<number>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TariffImportPreviewModal
          activeIndex={importPreviewIndex}
          existingBookIds={getExistingBookIds()}
          isBusy={false}
          metadatas={importPreviews}
          onCancel={onCancel}
          onConfirm={onConfirm}
          onActiveIndexChange={onActiveIndexChange}
          onDraftedFilesChange={onDraftedFilesChange}
          onMetadatasChange={onMetadatasChange}
          onPageCanConfirmChange={onPageCanConfirmChange}
          {...(onPreviewReady ? { onPreviewReady } : {})}
          onReviewedFilesChange={onReviewedFilesChange}
          pageView
        />
      </div>
    </div>
  );
}
