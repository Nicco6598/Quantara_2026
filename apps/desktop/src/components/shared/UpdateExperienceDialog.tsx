import { Clock3, LoaderCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { ChangelogTree } from "@/components/shared/ChangelogTree";
import { Dialog } from "@/components/shared/Dialog";
import type { AvailableAppUpdate, UpdateInstallState } from "@/lib/appUpdater";
import { parseChangelogTree } from "@/lib/changelog-tree";

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
  const tree = parseChangelogTree(update.notes);
  const isBusy = installState.phase === "installing";

  return (
    <Dialog
      className="max-w-3xl rounded-22px"
      closeOnOverlay={!isBusy}
      contentClassName="flex max-h-[80dvh] min-h-0 flex-col overflow-hidden rounded-[18px] p-0"
      isOpen
      onClose={onClose}
      zIndex={"var(--z-command-palette)"}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
            Aggiornamento disponibile
          </div>
          <h3 className="mt-1 truncate text-17px font-semibold text-[var(--text-primary)]">
            v{update.version}
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

      <div className="flex min-h-0 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-20px font-semibold leading-tight text-[var(--text-primary)]">
              Cosa cambia
            </h2>
            <p className="mt-1 text-13px leading-5 text-[var(--text-secondary)]">
              Quantara scaricherà la patch, applicherà l'update e riaprirà l'app sulla nuova
              versione.
            </p>
          </div>
          <span className="mt-1 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] px-3 py-1 text-12px font-semibold text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/25">
            v{update.version}
          </span>
        </div>

        {tree.length > 0 ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <ChangelogTree nodes={tree} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)] p-6 text-center text-13px text-[var(--text-secondary)]">
            Nessuna nota release disponibile per questa build.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] px-5 py-3">
        <div className="flex items-center gap-4 text-11px text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {formatTimestamp(update.checkedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Da v{update.currentVersion}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {installState.phase === "error" ? (
            <span className="rounded-lg bg-[var(--danger-soft)] px-2.5 py-1.5 text-11px font-medium text-[var(--danger-base)]">
              {installState.message}
            </span>
          ) : null}
          <Button disabled={isBusy} onClick={onClose} variant="ghost">
            Più tardi
          </Button>
          <Button disabled={isBusy} onClick={onInstall} variant="primary">
            {isBusy ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Installazione…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
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
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
