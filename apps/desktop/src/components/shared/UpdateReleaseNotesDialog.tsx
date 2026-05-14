import { m } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import { ProjectControlButton } from "@/components/shared/ui-primitives";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  const bodyNotes = normalizeBodyNotes(notes.body);
  const [installedAt, setInstalledAt] = useState("");
  useEffect(() => {
    setInstalledAt(new Date(notes.installedAt).toLocaleString("it-IT"));
  }, [notes.installedAt]);

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[210] flex min-h-0 items-center justify-center overflow-hidden bg-[var(--overlay-bg)] p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
    >
      <button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <m.div
        animate={MOTION_VARIANTS.dialog.animate}
        className="relative flex max-h-[75dvh] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-22px bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={MOTION_VARIANTS.dialog.initial}
        transition={MOTION_VARIANTS.dialog.transition}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[18px] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="shrink-0 p-5 pb-4">
            <div className="rounded-xl bg-[var(--bg-muted)] p-4 ring-1 ring-[var(--border-subtle)]">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-base)]">
                  <CheckCircle2 className="size-6" />
                </span>
                <div className="min-w-0">
                  <span className="inline-flex max-w-full items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-2.5 py-0.5 text-10px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
                    Aggiornamento completato
                  </span>
                  <h2 className="mt-3 text-19px font-semibold leading-tight text-[var(--text-primary)]">
                    Quantara v{notes.version} e attiva
                  </h2>
                  <p className="mt-2 text-13px leading-5 text-[var(--text-secondary)]">
                    Riavvio completato il {installedAt}. Puoi continuare a lavorare dalla versione
                    aggiornata.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {bodyNotes.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-hidden px-5">
              <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                Cosa e cambiato in questa release
              </div>
              <div className="mt-3 max-h-full space-y-2 overflow-y-auto pb-1 pr-1">
                {bodyNotes.map((note) => (
                  <div
                    className="flex min-w-0 items-start gap-3 rounded-xl bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]"
                    key={note.key}
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                    <span className="min-w-0 text-13px leading-5 text-[var(--text-primary)]">
                      {note.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] p-5">
            <div className="flex justify-end">
              <ProjectControlButton onClick={onClose} variant="primary">
                Continua
              </ProjectControlButton>
            </div>
          </div>
        </div>
      </m.div>
    </div>,
    document.body,
  );
}

function normalizeBodyNotes(body: string) {
  const seen = new Map<string, number>();

  return body
    .trim()
    .split("\n")
    .flatMap((line) => {
      const cleaned = line
        .replace(/^[-*]\s+/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
      return cleaned ? [cleaned] : [];
    })
    .map((text) => {
      const current = seen.get(text) ?? 0;
      seen.set(text, current + 1);
      return { key: current === 0 ? text : `${text}-${current}`, text };
    });
}
