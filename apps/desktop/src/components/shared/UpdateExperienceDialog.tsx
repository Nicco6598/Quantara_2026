import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button";
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
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <button
        aria-label="Chiudi updater"
        className="absolute inset-0 cursor-default"
        disabled={isBusy}
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[24px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Aggiornamento disponibile
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              Da v{update.currentVersion} a v{update.version}
            </h3>
          </div>
          <button
            aria-label="Chiudi updater"
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-h-0 p-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-info/25 bg-info-soft px-3 py-1 text-xs font-semibold text-info">
                <Sparkles className="size-3.5" />
                Nuova versione pronta
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                Controlla cosa cambia prima di installare
              </h2>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Quantara scarichera la patch, applichera l&apos;update e riaprira l&apos;app sulla
                nuova versione. In sviluppo il pulsante installazione serve solo a verificare lo
                stato errore.
              </p>
            </div>

            <div className="mt-5 max-h-[38vh] space-y-2 overflow-y-auto pr-1 text-sm leading-6">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    className="flex gap-3 rounded-[18px] border border-subtle bg-muted/35 px-4 py-3"
                    key={note.key}
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {note.text}
                  </div>
                ))
              ) : (
                <p className="rounded-[18px] border border-dashed border-subtle bg-muted/35 px-4 py-4 text-secondary">
                  Nessuna nota release disponibile per questa build.
                </p>
              )}
            </div>
          </div>

          <aside className="border-t border-subtle bg-muted/30 p-5 lg:border-l lg:border-t-0">
            <div className="space-y-3">
              <MetricPill icon={Sparkles} label="Release" value={`v${update.version}`} />
              <MetricPill icon={Clock3} label="Check" value={formatTimestamp(update.checkedAt)} />
              <MetricPill icon={ShieldCheck} label="Canale" value="Stable" />
            </div>

            {installState.phase === "error" ? (
              <div className="mt-4 rounded-[18px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                {installState.message}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Button disabled={isBusy} onClick={onInstall} type="button">
                {isBusy ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Installazione
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Aggiorna e riavvia
                  </>
                )}
              </Button>
              <Button disabled={isBusy} onClick={onClose} type="button" variant="secondary">
                Piu tardi
              </Button>
            </div>
          </aside>
        </div>
      </section>
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
    <div className="rounded-[18px] border border-subtle bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-primary" />
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
            {label}
          </div>
          <div className="text-sm font-semibold text-foreground">{value}</div>
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
