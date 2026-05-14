import { m } from "framer-motion";
import { Clock3, FileText, LoaderCircle, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import { ProjectControlButton } from "@/components/shared/ui-primitives";
import type { AvailableAppUpdate, UpdateInstallState } from "@/lib/appUpdater";

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

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[210] flex min-h-0 items-center justify-center overflow-hidden bg-[var(--overlay-bg)] p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
    >
      <button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        disabled={isBusy}
        onClick={onClose}
        type="button"
      />
      <m.div
        className="relative flex max-h-[75dvh] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-22px bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        animate={MOTION_VARIANTS.dialog.animate}
        initial={MOTION_VARIANTS.dialog.initial}
        transition={MOTION_VARIANTS.dialog.transition}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[18px] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="min-w-0">
              <div className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
                Aggiornamento disponibile
              </div>
              <h3 className="mt-1 truncate text-17px font-semibold text-[var(--text-primary)]">
                Da v{update.currentVersion} a v{update.version}
              </h3>
            </div>
            <button
              aria-label="Chiudi"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5">
              <span className="inline-flex w-max items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-10px font-semibold uppercase tracking-uppercase-wide text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
                <Sparkles className="size-3" />v{update.version}
              </span>
              <h2 className="mt-4 text-20px font-semibold leading-tight text-[var(--text-primary)]">
                Cosa cambia
              </h2>
              <p className="mt-2 text-13px leading-5 text-[var(--text-secondary)]">
                Quantara scarichera la patch, applichera l'update e riaprira l'app sulla nuova
                versione.
              </p>

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <div
                      className="flex min-w-0 items-start gap-3 rounded-xl bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]"
                      key={note.key}
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                      <span className="min-w-0 text-13px leading-5 text-[var(--text-primary)]">
                        {note.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4 text-center text-13px text-[var(--text-secondary)]">
                    Nessuna nota release disponibile per questa build.
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-60 shrink-0 flex-col gap-4 border-l border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_30%,transparent)] p-5">
              <div className="space-y-2">
                <MetricPill icon={Sparkles} label="Release" value={`v${update.version}`} />
                <MetricPill
                  icon={Clock3}
                  label="Controllo"
                  value={formatTimestamp(update.checkedAt)}
                />
                <MetricPill icon={FileText} label="Modifiche" value={`${notes.length} note`} />
              </div>

              {installState.phase === "error" ? (
                <div className="rounded-xl bg-[var(--danger-soft)] px-3 py-2.5 text-12px font-medium text-[var(--danger-base)] ring-1 ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)]">
                  {installState.message}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:mt-auto">
                <ProjectControlButton
                  className="w-full"
                  disabled={isBusy}
                  onClick={onInstall}
                  variant="primary"
                >
                  {isBusy ? (
                    <span className="flex items-center gap-2">
                      <LoaderCircle className="size-4 animate-spin" />
                      Installazione in corso…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5">
                      <svg
                        aria-hidden="true"
                        className="size-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M21 2v6h-6M3 22v-6h6"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                        />
                        <path
                          d="M21 8A9 9 0 003.28 13M3 16a9 9 0 0017.72-5"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                        />
                      </svg>
                      Aggiorna e riavvia
                    </span>
                  )}
                </ProjectControlButton>
                <ProjectControlButton
                  className="w-full"
                  disabled={isBusy}
                  onClick={onClose}
                  variant="ghost"
                >
                  Più tardi
                </ProjectControlButton>
              </div>
            </div>
          </div>
        </div>
      </m.div>
    </div>,
    document.body,
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
    <div className="rounded-xl bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-[var(--info-base)]" />
        <div>
          <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-0.5 text-13px font-semibold text-[var(--text-primary)]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function normalizeNotes(notes: string) {
  const values: string[] = [];
  for (const raw of notes.split("\n")) {
    const line = raw
      .trim()
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
    if (line.length > 0 && !line.startsWith("```") && !line.startsWith("---")) {
      values.push(line);
    }
  }

  const seen = new Map<string, number>();

  return values.map((text) => {
    const current = seen.get(text) ?? 0;
    seen.set(text, current + 1);
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
