import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck, Sparkles, X } from "lucide-react";
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

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-xl"
      role="dialog"
    >
      <div className="update-modal-panel relative w-full max-w-3xl overflow-hidden rounded-[24px] border shadow-2xl">
        <div className="update-command-surface absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent" />

        <div className="relative z-10 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="update-modal-chip rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                  Nuova versione
                </span>
                <span className="update-modal-chip-muted rounded-full border px-3 py-1 text-xs">
                  Da v{update.currentVersion} a v{update.version}
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.4rem]">
                Aggiornamento pronto.
              </h2>
              <p className="update-modal-muted-text mt-3 max-w-xl text-sm leading-7 md:text-[15px]">
                Leggi cosa cambia, poi Quantara scarica la patch, installa e riavvia l&apos;app.
                Alla riapertura vedrai solo la conferma di installazione completata.
              </p>
            </div>

            <button
              aria-label="Chiudi updater"
              className="rounded-2xl border border-white/20 bg-slate-950/70 p-2.5 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <section className="update-modal-card mt-7 rounded-[22px] border p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <MetricPill icon={Sparkles} label="Release" value={`v${update.version}`} />
              <MetricPill icon={Clock3} label="Check" value={formatTimestamp(update.checkedAt)} />
              <MetricPill icon={ShieldCheck} label="Canale" value="Stable" />
            </div>

            <div className="mt-5 max-h-[38vh] space-y-3 overflow-y-auto pr-1 text-sm leading-7">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div className="update-modal-note rounded-2xl border px-4 py-3" key={note.key}>
                    {note.text}
                  </div>
                ))
              ) : (
                <p className="update-modal-muted-text rounded-2xl border border-dashed border-white/18 px-4 py-4">
                  Nessuna nota release disponibile per questa build.
                </p>
              )}
            </div>
          </section>

          {installState.phase === "error" ? (
            <div className="mt-4 rounded-2xl border border-rose-400/18 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
              {installState.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button disabled={isBusy} onClick={onClose} type="button" variant="secondary">
              Piu tardi
            </Button>
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
          </div>
        </div>
      </div>
    </div>
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
    <div className="update-modal-chip-muted inline-flex items-center gap-3 rounded-full border px-4 py-2">
      <Icon className="size-4 text-cyan-100" />
      <div>
        <div className="update-modal-subtle-text text-[10px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </div>
        <div className="text-sm font-medium">{value}</div>
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
