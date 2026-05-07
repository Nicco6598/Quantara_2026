import { motion } from "framer-motion";
import { ArrowUpRight, Clock3, LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { AvailableAppUpdate, UpdateInstallState } from "@/lib/appUpdater";
import { cn } from "@/lib/utils";

type UpdateExperienceDialogProps = {
  installState: UpdateInstallState | { message: string; phase: "error" } | { phase: "idle" };
  onClose: () => void;
  onInstall: () => void;
  update: AvailableAppUpdate;
};

export function UpdateExperienceDialog({
  installState,
  onClose,
  onInstall,
  update,
}: UpdateExperienceDialogProps) {
  const notes = normalizeNotes(update.notes);
  const isBusy = installState.phase === "installing";
  const SOFT_EASE = [0.22, 1, 0.36, 1] as const;

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[210] flex min-h-0 items-center justify-center overflow-hidden bg-black/45 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
    >
      <button
        aria-label="Chiudi updater"
        className="absolute inset-0 cursor-default"
        disabled={isBusy}
        onClick={onClose}
        type="button"
      />
      <motion.div
        className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-[26px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[30px] sm:p-1.5"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SOFT_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[22px] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] sm:rounded-[24px]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Aggiornamento disponibile
              </div>
              <h3 className="mt-1 truncate text-[17px] font-semibold text-[var(--text-primary)] sm:text-[18px]">
                Da v{update.currentVersion} a v{update.version}
              </h3>
            </div>
            <button
              aria-label="Chiudi updater"
              className="flex size-9 items-center justify-center rounded-[14px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="flex min-h-0 flex-col p-4 sm:p-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
                <Sparkles className="size-3" />
                Nuova versione pronta
              </span>
              <h2 className="mt-4 text-[20px] font-semibold leading-tight text-[var(--text-primary)] sm:text-[22px]">
                Cosa cambia in v{update.version}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)] sm:leading-6">
                Quantara scaricherà la patch, applicherà l'update e riaprirà l'app sulla nuova
                versione.
              </p>

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1 sm:mt-5">
                {notes.length > 0 ? (
                  notes.map((note, i) => (
                    <div
                      className="flex min-w-0 items-start gap-3 rounded-[14px] bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)] sm:px-4 sm:py-3"
                      key={note.key}
                    >
                      <span
                        className={cn(
                          "mt-1 size-2 shrink-0 rounded-full",
                          i < notes.length / 3
                            ? "bg-[var(--success-base)]"
                            : i < (notes.length * 2) / 3
                              ? "bg-[var(--info-base)]"
                              : "bg-[var(--accent-primary)]",
                        )}
                      />
                      <span className="min-w-0 break-words text-[13px] leading-5 text-[var(--text-primary)]">
                        {note.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-4 text-center text-[13px] text-[var(--text-secondary)]">
                    Nessuna nota release disponibile per questa build.
                  </div>
                )}
              </div>
            </div>

            <aside className="flex min-h-0 shrink-0 flex-col border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_30%,transparent)] p-4 sm:p-5 lg:border-l lg:border-t-0">
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
                <MetricPill icon={Sparkles} label="Release" value={`v${update.version}`} />
                <MetricPill
                  icon={Clock3}
                  label="Controllo"
                  value={formatTimestamp(update.checkedAt)}
                />
                <MetricPill icon={ShieldCheck} label="Canale" value="Stable" />
              </div>

              {installState.phase === "error" ? (
                <div className="mt-4 rounded-[14px] bg-[var(--danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--danger-base)] ring-1 ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)]">
                  {installState.message}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 lg:mt-auto lg:pt-5">
                <ActionButton disabled={isBusy} onClick={onInstall}>
                  {isBusy ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Installazione in corso...
                    </>
                  ) : (
                    <>Aggiorna e riavvia</>
                  )}
                </ActionButton>
                <button
                  className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--bg-muted)] px-5 text-[13px] font-semibold text-[var(--text-primary)] outline-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isBusy}
                  onClick={onClose}
                  type="button"
                >
                  Più tardi
                </button>
              </div>
            </aside>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="group inline-flex h-11 w-full shrink-0 items-center justify-center gap-3 rounded-full bg-[var(--accent-primary)] py-1 pl-5 pr-1 text-[13px] font-semibold text-[var(--text-inverse)] outline-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...(!disabled ? { whileHover: { y: -1 }, whileTap: { scale: 0.97 } } : {})}
    >
      <span>{children}</span>
      <span className="flex size-9 items-center justify-center rounded-full bg-white/16 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
        {disabled ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowUpRight className="size-4" />
        )}
      </span>
    </motion.button>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-[var(--info-base)]" />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-[var(--text-primary)]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function normalizeNotes(notes: string) {
  const values = notes
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

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
