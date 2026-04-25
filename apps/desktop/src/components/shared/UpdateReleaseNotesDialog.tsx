import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-xl"
      role="dialog"
    >
      <div className="update-modal-panel relative w-full max-w-xl overflow-hidden rounded-[24px] border shadow-2xl">
        <div className="update-command-surface absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent" />

        <div className="relative z-10 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/16 px-3 py-1 text-xs font-semibold text-emerald-50">
                  <CheckCircle2 className="size-3.5" />
                  Aggiornamento installato
                </span>
                <span className="update-modal-chip-muted rounded-full border px-3 py-1 text-xs">
                  v{notes.currentVersion} {"->"} v{notes.version}
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-semibold text-white">Installazione completata.</h2>
              <p className="update-modal-muted-text mt-2 max-w-md text-sm leading-6">
                Ultima versione ora operativa. Riavvio completato il{" "}
                {new Date(notes.installedAt).toLocaleString("it-IT")}.
              </p>
            </div>

            <button
              aria-label="Chiudi conferma aggiornamento"
              className="rounded-2xl border border-white/20 bg-slate-950/70 p-2.5 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <section className="update-modal-card mt-7 rounded-[22px] border p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="update-modal-subtle-text text-xs font-semibold">Stato app</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Quantara v{notes.version} risulta attiva.
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 flex justify-end">
            <Button onClick={onClose} type="button">
              Continua
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
