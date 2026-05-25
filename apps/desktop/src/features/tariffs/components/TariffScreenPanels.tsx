import { m } from "framer-motion";
import {
  CheckCircle2,
  Database,
  Eye,
  MoreVertical,
  Pencil,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { DetailList, DetailRow } from "@/components/shared/DetailList";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
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
  const displayVoiceCount = voiceCount == null ? "..." : voiceCount.toLocaleString("it-IT");

  return (
    <m.article
      className={cn(
        "operational-card-hover relative rounded-[18px] border p-3 text-left",
        isSelected
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_18px_40px_-28px_var(--accent-primary)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-base)]",
      )}
      initial={MOTION_VARIANTS.row.initial}
      transition={MOTION_VARIANTS.row.transition}
      viewport={MOTION_VARIANTS.row.viewport}
      whileInView={MOTION_VARIANTS.row.whileInView}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          {showCheckbox ? (
            <span className="mt-0.5 shrink-0">
              <SelectionCheckbox
                checked={isSelected ?? false}
                id={book.id}
                onToggle={onToggleSelect ?? (() => {})}
              />
            </span>
          ) : null}
          <button
            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            onClick={showCheckbox ? () => onToggleSelect?.(book.id) : onShowDetails}
            type="button"
          >
            <div className="relative flex h-[76px] w-[58px] shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-10px font-bold uppercase leading-tight shadow-[0_12px_22px_-18px_color-mix(in_srgb,var(--text-primary)_14%,transparent)]">
              <span className="absolute left-[-6px] top-2 rounded-xs bg-[var(--danger-base)] px-1.5 py-1 text-9px font-black text-[var(--text-inverse)]">
                PDF
              </span>
              <div className="space-y-1.5 text-[var(--text-tertiary)]">
                <div className="h-1 w-9 rounded bg-current" />
                <div className="h-1 w-7 rounded bg-current" />
                <div className="h-1 w-10 rounded bg-current" />
                <div className="mt-4 h-1 w-8 rounded bg-current" />
                <div className="h-1 w-11 rounded bg-current" />
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
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
                <span className="text-12px font-semibold text-[var(--text-secondary)]">
                  Anno {book.year}
                </span>
              </div>
              <h3 className="mt-2 truncate text-14px font-semibold leading-tight text-[var(--text-primary)]">
                {book.name}
              </h3>
              <p className="mt-1 truncate text-12px text-[var(--text-secondary)]">
                {book.sourceName}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-2 text-11px font-medium text-[var(--text-secondary)]">
                <span>{displayVoiceCount} voci</span>
                <span>{linkedProjectCount} progetti</span>
              </div>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={isFavorite ? "Rimuovi dai preferiti" : "Segna come preferito"}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--warning-soft)] hover:text-[var(--warning-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
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
          <div className="mt-4 space-y-3 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--surface-base)] p-3">
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
            className="mt-4 rounded-14px border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/40 p-3"
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
    </m.article>
  );
}
export function TariffImportPreviewPanel({
  draftedImportFiles,
  getExistingBookIds,
  importPreviewIndex,
  importPreviews,
  onCancel,
  onConfirm,
  onActiveIndexChange,
  onDraftedFilesChange,
  onMetadatasChange,
  onPageCanConfirmChange,
  onReviewedFilesChange,
  reviewedFiles,
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
  onReviewedFilesChange: (next: Set<number>) => void;
  reviewedFiles: Set<number>;
}) {
  return (
    <div className="-mx-4 -mt-4 flex flex-col md:-mx-6">
      <div className="p-6">
        <section className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
              Preview importazione
            </div>
            <h2 className="mt-2 truncate text-28px font-semibold leading-tight text-[var(--text-primary)]">
              {importPreviews[importPreviewIndex]?.name ?? "Tariffario da importare"}
            </h2>
            <p className="mt-1 text-13px font-medium text-[var(--text-secondary)]">
              Revisiona descrizioni, codici e prezzi; i comandi principali sono nella toolbar.
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-2 text-12px font-bold ring-1",
              draftedImportFiles.has(importPreviewIndex)
                ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-[var(--warning-base)]/30"
                : reviewedFiles.has(importPreviewIndex)
                  ? "bg-[var(--success-soft)] text-[var(--success-base)] ring-[var(--success-base)]/30"
                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-[var(--border-subtle)]",
            )}
          >
            {draftedImportFiles.has(importPreviewIndex) ? (
              <Save className="size-4" />
            ) : (
              <CheckCircle2
                className={cn(
                  "size-4",
                  reviewedFiles.has(importPreviewIndex)
                    ? "text-[var(--success-base)]"
                    : "text-[var(--text-secondary)]",
                )}
              />
            )}
            {draftedImportFiles.has(importPreviewIndex)
              ? "Salvato in bozza"
              : reviewedFiles.has(importPreviewIndex)
                ? "File revisionato"
                : "Da revisionare"}
          </div>
        </section>
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
          onReviewedFilesChange={onReviewedFilesChange}
          pageView
        />
      </div>
    </div>
  );
}
