import { CheckCircle2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <button
        aria-label="Chiudi conferma aggiornamento"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[24px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Aggiornamento installato
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              v{notes.currentVersion} {"->"} v{notes.version}
            </h3>
          </div>
          <button
            aria-label="Chiudi conferma aggiornamento"
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-[22px] border border-subtle bg-muted/35 p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold text-foreground">
                  Quantara v{notes.version} e attiva.
                </div>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  Riavvio completato il {new Date(notes.installedAt).toLocaleString("it-IT")}. Puoi
                  continuare a lavorare dalla versione aggiornata.
                </p>
              </div>
            </div>

            {notes.body.trim() ? (
              <div className="mt-5 rounded-[18px] border border-subtle bg-card px-4 py-3 text-sm leading-6 text-foreground">
                {notes.body.trim()}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={onClose} type="button">
              Continua
            </Button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
