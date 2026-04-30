import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { PendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { cn } from "@/lib/utils";

type UpdateReleaseNotesDialogProps = {
  notes: PendingReleaseNotes;
  onClose: () => void;
};

export function UpdateReleaseNotesDialog({ notes, onClose }: UpdateReleaseNotesDialogProps) {
  const SOFT_EASE = [0.22, 1, 0.36, 1] as const;
  const bodyNotes = notes.body
    .trim()
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);

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
      <motion.div
        className="relative w-full max-w-xl overflow-hidden rounded-[30px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SOFT_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="rounded-[24px] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="p-5">
            <div className="rounded-[20px] bg-[var(--bg-muted)] p-4 ring-1 ring-[var(--border-subtle)]">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--success-soft)] text-[var(--success-base)]">
                  <CheckCircle2 className="size-6" />
                </span>
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
                    Aggiornamento completato
                  </span>
                  <h2 className="mt-3 text-[20px] font-semibold leading-tight text-[var(--text-primary)]">
                    Quantara v{notes.version} è attiva
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                    Riavvio completato il{" "}
                    {new Date(notes.installedAt).toLocaleString("it-IT")}. Puoi continuare a
                    lavorare dalla versione aggiornata.
                  </p>
                </div>
              </div>
            </div>

            {bodyNotes.length > 0 ? (
              <div className="mt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Cosa è cambiato in questa release
                </div>
                <div className="mt-4 space-y-2">
                  {bodyNotes.map((note, i) => (
                    <div
                      className="flex items-start gap-3 rounded-[14px] bg-[var(--bg-muted)] px-4 py-3 ring-1 ring-[var(--border-subtle)]"
                      key={note}
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
                      <span className="text-[13px] leading-5 text-[var(--text-primary)]">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <ActionButton onClick={onClose}>
                Continua
              </ActionButton>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="group inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-full bg-[var(--accent-primary)] py-1 pl-5 pr-1 text-[13px] font-semibold text-[var(--text-inverse)] outline-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      onClick={onClick}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <span>{children}</span>
      <span className="flex size-9 items-center justify-center rounded-full bg-white/16 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
        <ArrowUpRight className="size-4" />
      </span>
    </motion.button>
  );
}
