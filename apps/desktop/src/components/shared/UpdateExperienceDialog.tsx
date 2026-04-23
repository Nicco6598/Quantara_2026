import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CloudDownload,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
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
  const isBusy = installState.phase === "downloading" || installState.phase === "installing";
  const progress =
    installState.phase === "downloading" && installState.totalBytes && installState.totalBytes > 0
      ? Math.min(100, Math.round((installState.downloadedBytes / installState.totalBytes) * 100))
      : null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-xl"
      role="dialog"
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/12 bg-[var(--surface-base)] shadow-2xl">
        <div className="update-command-surface absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10 p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  Update cockpit
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">
                  Da v{update.currentVersion} a v{update.version}
                </span>
              </div>

              <h2 className="mt-5 text-[2rem] font-semibold tracking-tight text-white md:text-[2.8rem]">
                Nuova release pronta per il deploy locale.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/72 md:text-[15px]">
                L&apos;updater ora usa un flusso dedicato dentro Quantara: patch notes leggibili,
                stato download reale e installazione finale senza prompt generici del sistema.
              </p>
            </div>

            <button
              aria-label="Chiudi updater"
              className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section className="overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/46 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <MetricPill icon={Sparkles} label="Release" value={`v${update.version}`} />
                <MetricPill icon={Clock3} label="Check" value={formatTimestamp(update.checkedAt)} />
                <MetricPill icon={ShieldCheck} label="Canale" value="Stable" />
              </div>

              <div className="mt-5 rounded-[22px] border border-white/8 bg-white/4 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/54">
                  Patch notes
                </div>
                <div className="mt-3 space-y-3 text-sm leading-7 text-white/82">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div
                        className="rounded-2xl border border-white/6 bg-black/14 px-4 py-3"
                        key={note.key}
                      >
                        {note.text}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-white/62">
                      Nessuna nota release disponibile per questa build.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,34,0.92),rgba(7,12,24,0.98))] p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                  {installState.phase === "installing" ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : installState.phase === "downloading" ? (
                    <CloudDownload className="size-5" />
                  ) : installState.phase === "error" ? (
                    <ArrowUpRight className="size-5" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/54">
                    Deployment step
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {getInstallHeadline(installState.phase)}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/68">
                {getInstallDescription(installState)}
              </p>

              <div className="mt-5 rounded-[22px] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/56">
                  <span>Pipeline</span>
                  <span>
                    {progress !== null
                      ? `${progress}%`
                      : installState.phase === "installing"
                        ? "Finale"
                        : "Pronta"}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full bg-[linear-gradient(90deg,#67e8f9,#22c55e)] transition-[width] duration-300 ${
                      installState.phase === "installing" ? "animate-pulse" : ""
                    }`}
                    style={{
                      width:
                        installState.phase === "idle"
                          ? "12%"
                          : installState.phase === "installing"
                            ? "100%"
                            : `${progress ?? 8}%`,
                    }}
                  />
                </div>

                {installState.phase === "downloading" ? (
                  <div className="mt-3 text-sm text-white/72">
                    {formatBytes(installState.downloadedBytes)}
                    {installState.totalBytes ? ` / ${formatBytes(installState.totalBytes)}` : ""}
                  </div>
                ) : null}

                {installState.phase === "error" ? (
                  <div className="mt-3 rounded-2xl border border-rose-400/18 bg-rose-400/10 px-3 py-3 text-sm leading-6 text-rose-100">
                    {installState.message}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-3 text-sm text-white/76">
                <StepRow
                  active={installState.phase === "idle"}
                  label="Verifica release disponibile"
                />
                <StepRow
                  active={installState.phase === "downloading"}
                  label="Download pacchetto firmato"
                />
                <StepRow
                  active={installState.phase === "installing"}
                  label="Installazione e riavvio app"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={isBusy} onClick={onInstall} type="button">
                  {isBusy ? "Installazione in corso" : "Installa aggiornamento"}
                </Button>
                <Button disabled={isBusy} onClick={onClose} type="button" variant="secondary">
                  Ricordamelo dopo
                </Button>
              </div>
            </section>
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
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-white/86">
      <Icon className="size-4 text-cyan-100" />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          {label}
        </div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function StepRow({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
        active
          ? "border-cyan-300/24 bg-cyan-400/10 text-white"
          : "border-white/6 bg-white/3 text-white/62"
      }`}
    >
      <span
        className={`block size-2.5 rounded-full ${active ? "bg-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.55)]" : "bg-white/24"}`}
      />
      <span>{label}</span>
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

function getInstallHeadline(phase: UpdateExperienceDialogProps["installState"]["phase"]) {
  switch (phase) {
    case "downloading":
      return "Download in esecuzione";
    case "installing":
      return "Installazione finale";
    case "error":
      return "Installazione interrotta";
    default:
      return "Pronta per l'update";
  }
}

function getInstallDescription(installState: UpdateExperienceDialogProps["installState"]) {
  switch (installState.phase) {
    case "downloading":
      return "Quantara sta scaricando il pacchetto firmato della release. La finestra resta sincronizzata con l'avanzamento reale.";
    case "installing":
      return "Il pacchetto e stato scaricato. Windows completa l'installazione e Quantara verra riavviata automaticamente.";
    case "error":
      return "L'update non e andato a buon fine. Puoi chiudere il pannello e rilanciare il check oppure tentare subito un nuovo deploy.";
    default:
      return "Patch notes, versione di partenza e stato rilascio sono gia pronti. Se procedi, il pacchetto viene installato senza aprire prompt nativi separati.";
  }
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(0)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
