import { Archive, Check, CheckCircle2, Loader, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function ImportPreviewWorkflowControls({
  draftedFiles,
  isBusy,
  hasSavedDraftOnDisk,
  isSavingDraft,
  localActiveIndex,
  markAllFilesReviewed,
  metadatasCount,
  modalReviewedFiles,
  onRemoveFile,
  onSaveSessionDraft,
  toggleActiveFileDraft,
  toggleActiveFileReviewed,
}: {
  draftedFiles: Set<number>;
  isBusy: boolean;
  hasSavedDraftOnDisk?: boolean;
  isSavingDraft?: boolean;
  localActiveIndex: number;
  markAllFilesReviewed: () => void;
  metadatasCount: number;
  modalReviewedFiles: Set<number>;
  onRemoveFile: () => void;
  onSaveSessionDraft: () => void;
  toggleActiveFileDraft: () => void;
  toggleActiveFileReviewed: () => void;
}) {
  const multiFile = metadatasCount > 1;
  const isReviewed = modalReviewedFiles.has(localActiveIndex);
  const isDrafted = draftedFiles.has(localActiveIndex);
  const allReviewed = modalReviewedFiles.size === metadatasCount && metadatasCount > 0;

  if (!multiFile) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          disabled={isBusy}
          icon={Save}
          onClick={onSaveSessionDraft}
          size="toolbar"
          variant="secondary"
        >
          Bozza sessione
        </Button>
        {hasSavedDraftOnDisk ? (
          <span className="text-10px font-semibold text-[var(--text-tertiary)]">
            · bozza salvata
          </span>
        ) : null}
        <Button icon={Trash2} onClick={onRemoveFile} size="toolbar" variant="outline">
          Rimuovi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <Button
        className={cn(
          isReviewed &&
            "border-[var(--success-base)] bg-[color-mix(in_srgb,var(--success-base)_12%,var(--surface-base))] text-[var(--success-base)]",
        )}
        disabled={isBusy || isDrafted}
        icon={isReviewed ? Check : CheckCircle2}
        onClick={toggleActiveFileReviewed}
        size="toolbar"
        title={
          isReviewed ? "Annulla revisione file corrente" : "Segna file corrente come revisionato"
        }
        variant={isReviewed ? "outline" : "secondary"}
      >
        {isReviewed ? "Revisionato" : "Revisiona"}
      </Button>
      <Button
        className={cn(
          isDrafted &&
            "border-[var(--warning-base)] bg-[color-mix(in_srgb,var(--warning-base)_12%,var(--surface-base))] text-[var(--warning-base)]",
        )}
        disabled={isBusy}
        icon={Save}
        onClick={toggleActiveFileDraft}
        size="toolbar"
        title={isDrafted ? "Togli da bozza" : "Metti file corrente in bozza"}
        variant={isDrafted ? "outline" : "secondary"}
      >
        {isDrafted ? "In bozza" : "Bozza"}
      </Button>

      <span className="hidden h-4 w-px bg-[var(--border-subtle)] sm:inline" />

      <span className="text-11px font-bold tabular-nums text-[var(--text-secondary)]">
        <span className={allReviewed ? "text-[var(--success-base)]" : ""}>
          {modalReviewedFiles.size}/{metadatasCount}
        </span>{" "}
        rev.
        {draftedFiles.size > 0 ? (
          <>
            {" "}
            · <span className="text-[var(--warning-base)]">{draftedFiles.size}</span> bozze
          </>
        ) : null}
      </span>

      <Button
        disabled={isBusy || allReviewed}
        onClick={markAllFilesReviewed}
        size="toolbar"
        variant="ghost"
      >
        {allReviewed ? "Tutti ok" : "Rev. tutti"}
      </Button>

      <span className="hidden h-4 w-px bg-[var(--border-subtle)] md:inline" />

      <Button
        disabled={isBusy}
        icon={isSavingDraft ? Loader : Save}
        onClick={onSaveSessionDraft}
        size="toolbar"
        variant="ghost"
      >
        {isSavingDraft ? "Salvataggio…" : "Bozza sessione"}
      </Button>
      {hasSavedDraftOnDisk ? (
        <Button icon={Archive} onClick={onSaveSessionDraft} size="toolbar" variant="ghost">
          Aggiorna
        </Button>
      ) : null}
      <Button icon={Trash2} onClick={onRemoveFile} size="toolbar" variant="ghost">
        Rimuovi
      </Button>
    </div>
  );
}

export function ImportPreviewConfirmLabel({
  canConfirm,
  isBusy,
  metadatasCount,
  reviewedCount,
}: {
  canConfirm: boolean;
  isBusy: boolean;
  metadatasCount: number;
  reviewedCount: number;
}) {
  if (isBusy) return "Salvataggio…";
  if (metadatasCount <= 1) return "Approva";
  const allReviewed = reviewedCount === metadatasCount;
  if (allReviewed && canConfirm) return `Approva (${metadatasCount})`;
  if (allReviewed) return "Correggi errori";
  return `Approva (${reviewedCount}/${metadatasCount})`;
}
