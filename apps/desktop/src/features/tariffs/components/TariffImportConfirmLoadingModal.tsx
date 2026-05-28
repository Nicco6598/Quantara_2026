import { Loader2, Save } from "lucide-react";
import { createPortal } from "react-dom";

const SPIN_CLASS = "animate-spin [animation-duration:1.35s]";

export function TariffImportConfirmLoadingModal({
  fileCount,
  totalVoices,
}: {
  fileCount: number;
  totalVoices: number;
}) {
  const filesLabel = fileCount === 1 ? "1 tariffario" : `${fileCount} tariffari`;
  const voicesLabel = totalVoices.toLocaleString("it-IT");

  return createPortal(
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[calc(var(--z-dialog)+1)] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-lg">
        <div className="flex items-start gap-3.5 border-b border-[var(--border-subtle)]/80 px-5 py-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Loader2 className={`size-5 ${SPIN_CLASS}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-18px font-semibold leading-tight text-[var(--text-primary)]">
              Salvataggio import
            </h3>
            <p className="mt-1 text-12px font-medium leading-5 text-[var(--text-secondary)]">
              Scrittura di {filesLabel} e {voicesLabel} voci nel catalogo locale…
            </p>
          </div>
          <Save className="size-5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
        </div>
        <div className="px-5 py-4">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent-primary)]" />
          </div>
          <p className="mt-3 text-11px font-medium text-[var(--text-tertiary)]">
            Non chiudere l&apos;applicazione fino al termine dell&apos;operazione.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
