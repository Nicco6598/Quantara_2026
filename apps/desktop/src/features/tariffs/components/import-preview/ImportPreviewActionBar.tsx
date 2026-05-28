import { Archive, CheckCircle2, Loader, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { ImportDraft } from "../../utils/tariff-import-drafts";

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function ImportPreviewActionBar({
  canConfirm,
  draftedFiles,
  isBusy,
  loadedDraft,
  localActiveIndex,
  markActiveFileReviewed,
  markAllFilesReviewed,
  metadatasCount,
  modalReviewedFiles,
  onCancel,
  onConfirm,
  removeActiveFile,
  saveDraft,
  toggleActiveFileDraft,
}: {
  canConfirm: boolean;
  draftedFiles: Set<number>;
  isBusy: boolean;
  loadedDraft: ImportDraft | null;
  localActiveIndex: number;
  markActiveFileReviewed: () => void;
  markAllFilesReviewed: () => void;
  metadatasCount: number;
  modalReviewedFiles: Set<number>;
  onCancel: () => void;
  onConfirm: () => void;
  removeActiveFile: () => void;
  saveDraft: () => void;
  toggleActiveFileDraft: () => void;
}) {
  const multiFile = metadatasCount > 1;
  const allReviewed = modalReviewedFiles.size === metadatasCount && metadatasCount > 0;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-center gap-2">
        {multiFile ? (
          <>
            <Button
              disabled={draftedFiles.has(localActiveIndex)}
              icon={CheckCircle2}
              onClick={markActiveFileReviewed}
              variant="secondary"
            >
              Segna revisionato
            </Button>
            <Button icon={CheckCircle2} onClick={markAllFilesReviewed} variant="outline">
              Revisiona tutti
            </Button>
            <Button icon={Save} onClick={toggleActiveFileDraft} variant="secondary">
              {draftedFiles.has(localActiveIndex) ? "In bozza" : "Salva in bozza"}
            </Button>
          </>
        ) : null}
        <Button icon={Save} onClick={saveDraft} variant="secondary">
          Salva bozza sessione
        </Button>
        {loadedDraft ? (
          <Button icon={Archive} onClick={saveDraft} variant="outline">
            Aggiorna bozza
          </Button>
        ) : null}
        <Button icon={Trash2} onClick={removeActiveFile} variant="outline">
          Rimuovi file
        </Button>
        <Button disabled={isBusy} onClick={onCancel} variant="outline">
          Annulla
        </Button>
        {multiFile ? (
          <span className="ml-1 text-12px font-semibold text-[var(--text-secondary)]">
            <span className="text-[var(--success-base)]">{modalReviewedFiles.size}</span>/
            {metadatasCount} revisionati ·{" "}
            <span className="text-[var(--warning-base)]">{draftedFiles.size}</span>/{metadatasCount}{" "}
            in bozza
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-12px font-medium text-[var(--text-secondary)]">
          {multiFile
            ? "Usa la colonna tariffari per saltare tra i file. Gli errori di tutti i file sono nel pannello Correzioni."
            : "Correggi i campi in rosso nel ledger prima di approvare."}
        </p>
        <Button
          className={cn(!canConfirm && "opacity-60")}
          disabled={!canConfirm || isBusy}
          icon={isBusy ? Loader : CheckCircle2}
          onClick={onConfirm}
          variant="primary"
        >
          {isBusy
            ? "Salvataggio in corso…"
            : multiFile
              ? allReviewed
                ? `Approva import (${metadatasCount})`
                : `Approva (${modalReviewedFiles.size}/${metadatasCount} revisionati)`
              : "Approva importazione"}
        </Button>
      </div>
    </div>
  );
}
