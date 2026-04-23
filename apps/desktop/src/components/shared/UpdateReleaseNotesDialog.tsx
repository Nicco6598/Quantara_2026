import { X } from "lucide-react";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { Button } from "@/components/shared/Button";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  const lines = notes.body
    .split("\n")
    .map((line) => line.trimEnd())
    .map((line) =>
      line
        .replace(/^#{1,3}\s+/, "")
        .replace(/^- \s*/, "• ")
        .replace(/^\*\s*/, "• "),
    )
    .filter((line) => line.trim().length > 0);
  const lineOccurrences = new Map<string, number>();
  const renderedLines = lines.map((line) => {
    const occurrence = lineOccurrences.get(line) ?? 0;
    lineOccurrences.set(line, occurrence + 1);

    return {
      key: occurrence === 0 ? line : `${line}-${occurrence}`,
      line,
    };
  });

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-base)] shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent-primary)] via-cyan-300 to-emerald-300" />
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
              Aggiornamento installato
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Quantara {notes.version}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Avviata il {new Date(notes.installedAt).toLocaleString("it-IT")}
            </p>
          </div>
          <button
            aria-label="Chiudi note di rilascio"
            className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Patch notes</div>
            <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
              {lines.length > 0 ? (
                renderedLines.map(({ key, line }) => (
                  <p key={key} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))
              ) : (
                <p>Nessuna nota di rilascio disponibile per questa versione.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose} type="button">
              Continua
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
