import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";
import { SOFT_EASE } from "@/components/shared/easings";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";

import { cn } from "@/lib/utils";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  const bodyNotes = normalizeBodyNotes(notes.body);

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[210] flex min-h-0 items-center justify-center overflow-hidden bg-black/45 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
    >
      <button
        aria-label="Chiudi conferma aggiornamento"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.div
        className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-[26px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[30px] sm:p-1.5"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SOFT_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[22px] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] sm:rounded-[24px]">
          <div className="shrink-0 p-4 pb-3 sm:p-5 sm:pb-4">
            <div className="rounded-[20px] bg-[var(--bg-muted)] p-4 ring-1 ring-[var(--border-subtle)]">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-[var(--success-soft)] text-[var(--success-base)] sm:size-12">
                  <CheckCircle2 className="size-6" />
                </span>
                <div className="min-w-0">
                  <span className="inline-flex max-w-full items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] sm:tracking-[0.24em]">
                    Aggiornamento completato
                  </span>
                  <h2 className="mt-3 break-words text-[19px] font-semibold leading-tight text-[var(--text-primary)] sm:text-[20px]">
                    Quantara v{notes.version} è attiva
                  </h2>
                  <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)] sm:leading-6">
                    Riavvio completato il {new Date(notes.installedAt).toLocaleString("it-IT")}.
                    Puoi continuare a lavorare dalla versione aggiornata.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {bodyNotes.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-hidden px-4 sm:px-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Cosa è cambiato in questa release
              </div>
              <div className="mt-3 max-h-full space-y-2 overflow-y-auto overflow-x-hidden pb-1 pr-1">
                {bodyNotes.map((note, i) => (
                  <div
                    className="flex min-w-0 items-start gap-3 rounded-[14px] bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)] sm:px-4 sm:py-3"
                    key={note.key}
                  >
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        i < bodyNotes.length / 3
                          ? "bg-[var(--success-base)]"
                          : i < (bodyNotes.length * 2) / 3
                            ? "bg-[var(--info-base)]"
                            : "bg-[var(--accent-primary)]",
                      )}
                    />
                    <span className="min-w-0 break-words text-[13px] leading-5 text-[var(--text-primary)]">
                      {note.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] p-4 sm:p-5">
            <div className="flex justify-end">
              <ActionButton onClick={onClose}>Continua</ActionButton>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function normalizeBodyNotes(body: string) {
  const occurrences = new Map<string, number>();

  return body
    .trim()
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .map((text) => {
      const current = occurrences.get(text) ?? 0;
      occurrences.set(text, current + 1);

      return {
        key: current === 0 ? text : `${text}-${current}`,
        text,
      };
    });
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      className="group inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-full bg-[var(--accent-primary)] py-1 pl-5 pr-1 text-[13px] font-semibold text-[var(--text-inverse)] outline-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      onClick={onClick}
      type="button"
    >
      <span>{children}</span>
      <span className="flex size-9 items-center justify-center rounded-full bg-white/16 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
        <ArrowUpRight className="size-4" />
      </span>
    </motion.button>
  );
}
