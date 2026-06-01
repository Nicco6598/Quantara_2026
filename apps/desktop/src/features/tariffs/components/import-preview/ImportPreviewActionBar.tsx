import { CheckCircle2, Loader } from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  ImportPreviewConfirmLabel,
  ImportPreviewWorkflowControls,
} from "./ImportPreviewWorkflowControls";

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function ImportPreviewActionBar({
  canConfirm,
  draftedFiles,
  isBusy,
  hasSavedDraftOnDisk,
  isSavingDraft,
  localActiveIndex,
  markAllFilesReviewed,
  metadatasCount,
  modalReviewedFiles,
  onCancel,
  onConfirm,
  removeActiveFile,
  saveDraft,
  toggleActiveFileDraft,
  toggleActiveFileReviewed,
}: {
  canConfirm: boolean;
  draftedFiles: Set<number>;
  isBusy: boolean;
  hasSavedDraftOnDisk?: boolean;
  isSavingDraft?: boolean;
  localActiveIndex: number;
  markAllFilesReviewed: () => void;
  metadatasCount: number;
  modalReviewedFiles: Set<number>;
  onCancel: () => void;
  onConfirm: () => void;
  removeActiveFile: () => void;
  saveDraft: () => void;
  toggleActiveFileDraft: () => void;
  toggleActiveFileReviewed: () => void;
}) {
  const ConfirmIcon = isBusy ? Loader : CheckCircle2;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/70 px-4 py-2.5 md:px-5">
      <ImportPreviewWorkflowControls
        draftedFiles={draftedFiles}
        isBusy={isBusy}
        hasSavedDraftOnDisk={hasSavedDraftOnDisk ?? false}
        isSavingDraft={isSavingDraft ?? false}
        localActiveIndex={localActiveIndex}
        markAllFilesReviewed={markAllFilesReviewed}
        metadatasCount={metadatasCount}
        modalReviewedFiles={modalReviewedFiles}
        onRemoveFile={removeActiveFile}
        onSaveSessionDraft={saveDraft}
        toggleActiveFileDraft={toggleActiveFileDraft}
        toggleActiveFileReviewed={toggleActiveFileReviewed}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button disabled={isBusy} onClick={onCancel} size="sm" variant="outline">
            Annulla
          </Button>
          <Button
            className={cn(!canConfirm && !isBusy && "opacity-60")}
            disabled={!canConfirm || isBusy}
            icon={ConfirmIcon}
            onClick={onConfirm}
            variant="primary"
          >
            <ImportPreviewConfirmLabel
              canConfirm={canConfirm}
              isBusy={isBusy}
              metadatasCount={metadatasCount}
              reviewedCount={modalReviewedFiles.size}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
