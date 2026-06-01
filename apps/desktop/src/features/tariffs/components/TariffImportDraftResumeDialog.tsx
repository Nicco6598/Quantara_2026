import { Archive, FileStack, Loader2, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Dialog } from "@/components/shared/Dialog";
import { cn } from "@/lib/utils";
import type { TariffImportDraftSummary } from "../utils/tariff-import-drafts";

function formatDraftSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return savedAt;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reviewPercent(draft: TariffImportDraftSummary): number {
  if (draft.fileCount <= 0) return 0;
  return Math.round((draft.reviewedCount / draft.fileCount) * 100);
}

export function TariffImportDraftResumeDialog({
  activeDraftId,
  drafts,
  isOpen,
  isResuming,
  onClose,
  onDelete,
  onResume,
}: {
  activeDraftId: string | null;
  drafts: TariffImportDraftSummary[];
  isOpen: boolean;
  isResuming: boolean;
  onClose: () => void;
  onDelete: (draftId: string) => void;
  onResume: (draftId: string) => void;
}) {
  const totalFiles = drafts.reduce((sum, d) => sum + d.fileCount, 0);
  const totalVoices = drafts.reduce((sum, d) => sum + d.totalVoices, 0);

  return (
    <Dialog
      className="max-w-2xl"
      contentClassName="max-w-2xl p-0"
      isOpen={isOpen}
      onClose={onClose}
      title="Riprendi bozza import"
    >
      <div className="flex max-h-[min(82vh,680px)] flex-col">
        {drafts.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 border-b border-[var(--border-subtle)]/60 px-6 py-3.5">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-2.5">
                <span className="block text-11px font-medium text-[var(--text-tertiary)]">
                  Bozze
                </span>
                <span className="mt-0.5 block text-17px font-semibold tabular-nums text-[var(--text-primary)]">
                  {drafts.length}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-2.5">
                <span className="block text-11px font-medium text-[var(--text-tertiary)]">
                  File
                </span>
                <span className="mt-0.5 block text-17px font-semibold tabular-nums text-[var(--text-primary)]">
                  {totalFiles}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-2.5">
                <span className="block text-11px font-medium text-[var(--text-tertiary)]">
                  Voci
                </span>
                <span className="mt-0.5 block text-17px font-semibold tabular-nums text-[var(--text-primary)]">
                  {totalVoices.toLocaleString("it-IT")}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
              <ul className="space-y-2.5">
                {drafts.map((draft) => {
                  const percent = reviewPercent(draft);
                  const isActive = activeDraftId === draft.id;
                  const isRowBusy = isActive && isResuming;

                  return (
                    <li key={draft.id}>
                      <article
                        className={cn(
                          "group relative rounded-xl border bg-[var(--surface-base)] transition-all duration-150",
                          isRowBusy
                            ? "border-[var(--accent-primary)]/50 ring-1 ring-[var(--accent-primary)]/25"
                            : "border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:shadow-sm",
                        )}
                      >
                        <div className="flex items-start gap-4 p-4">
                          <div
                            className={cn(
                              "grid size-11 shrink-0 place-items-center rounded-xl",
                              isRowBusy
                                ? "bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-[var(--accent-primary)]"
                                : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
                            )}
                          >
                            {isRowBusy ? (
                              <Loader2 className="size-5 animate-spin" />
                            ) : (
                              <FileStack className="size-5" strokeWidth={1.5} />
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-14px font-semibold leading-tight text-[var(--text-primary)]">
                                  {draft.name}
                                </h3>
                                <p className="mt-0.5 text-11px font-medium text-[var(--text-tertiary)]">
                                  Salvata {formatDraftSavedAt(draft.savedAt)}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <Button
                                  disabled={isResuming}
                                  icon={isRowBusy ? Loader2 : Play}
                                  onClick={() => onResume(draft.id)}
                                  size="sm"
                                  variant="primary"
                                >
                                  {isRowBusy ? "Apertura…" : "Riprendi"}
                                </Button>
                                <button
                                  aria-label="Elimina bozza"
                                  className={cn(
                                    "flex size-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] opacity-0 transition-all hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                                    isRowBusy ? "pointer-events-none" : "group-hover:opacity-100",
                                  )}
                                  disabled={isResuming}
                                  onClick={() => onDelete(draft.id)}
                                  type="button"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
                                <Archive className="size-3" strokeWidth={2.5} />
                                {draft.fileCount} file
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
                                <FileStack className="size-3" strokeWidth={2.5} />
                                {draft.totalVoices.toLocaleString("it-IT")} voci
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-10px font-semibold",
                                  draft.reviewedCount === draft.fileCount
                                    ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    draft.reviewedCount === draft.fileCount
                                      ? "bg-[var(--success-base)]"
                                      : "bg-[var(--text-tertiary)]",
                                  )}
                                />
                                {draft.reviewedCount}/{draft.fileCount} revisionati
                              </span>
                            </div>

                            <div className="mt-0.5">
                              <div className="relative h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-[width] duration-500 ease-out",
                                    percent === 100
                                      ? "bg-[var(--success-base)]"
                                      : percent > 50
                                        ? "bg-[var(--accent-primary)]"
                                        : "bg-[var(--warning-base)]",
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-10px font-medium text-[var(--text-tertiary)]">
                                <span>Avanzamento revisione</span>
                                <span
                                  className={cn(
                                    "tabular-nums",
                                    percent === 100 && "text-[var(--success-base)]",
                                  )}
                                >
                                  {percent}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {drafts.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
            <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-[var(--bg-muted)] ring-1 ring-[var(--border-subtle)]">
              <FileStack className="size-7 text-[var(--text-tertiary)]" strokeWidth={1.5} />
            </div>
            <p className="text-16px font-semibold text-[var(--text-primary)]">
              Nessuna bozza salvata
            </p>
            <p className="mt-2 max-w-xs text-13px leading-5 text-[var(--text-tertiary)]">
              Durante l&apos;import usa &quot;Bozza sessione&quot; per salvare lo stato di
              revisione.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
