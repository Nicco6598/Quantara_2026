import { CheckCircle2, Sparkles, X } from "lucide-react";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { Button } from "@/components/shared/Button";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  const releaseNotes = normalizeReleaseNotes(notes.body);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-xl"
      role="dialog"
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/12 bg-[var(--surface-base)] shadow-2xl">
        <div className="update-command-surface absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10 p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  <CheckCircle2 className="size-3.5" />
                  Aggiornamento installato
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">
                  v{notes.currentVersion} {"->"} v{notes.version}
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-semibold text-white">Quantara {notes.version}</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Riavvio completato il {new Date(notes.installedAt).toLocaleString("it-IT")}.
              </p>
            </div>

            <button
              aria-label="Chiudi note di rilascio"
              className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <section className="mt-7 max-h-[58vh] overflow-y-auto rounded-[26px] border border-white/10 bg-slate-950/46 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/54">Patch notes</div>
                <div className="mt-1 text-lg font-semibold text-white">Novita installate</div>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-white/82">
              {releaseNotes.length > 0 ? (
                releaseNotes.map((note) => (
                  <div
                    className="rounded-2xl border border-white/6 bg-black/14 px-4 py-3"
                    key={note.key}
                  >
                    {note.text}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-white/62">
                  Nessuna nota di rilascio disponibile per questa versione.
                </p>
              )}
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

function normalizeReleaseNotes(body: string) {
  const values = body
    .split("\n")
    .map((line) => line.trim())
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*]\s+/, "")
        .trim(),
    )
    .filter(Boolean);

  const occurrences = new Map<string, number>();

  return values.map((text) => {
    const current = occurrences.get(text) ?? 0;
    occurrences.set(text, current + 1);

    return {
      key: current === 0 ? text : `${text}-${current}`,
      text,
    };
  });
}
