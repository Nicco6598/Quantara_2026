import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock3, Moon, RefreshCcw, Sparkles, Sun, WandSparkles } from "lucide-react";
import { useState } from "react";
import { APP_VERSION } from "@/generated/appVersion";
import { runAppUpdateCheck, type UpdateCheckResult } from "@/lib/appUpdater";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { cn } from "@/lib/utils";
import { type MotionMode, type ThemeMode, useAppStore } from "@/store/app-store";

type UpdateViewState = { kind: "idle" } | UpdateCheckResult;

const updaterReady = import.meta.env.PROD;

export function SettingsScreen() {
  const autoCheckUpdatesOnLaunch = useAppStore((state) => state.autoCheckUpdatesOnLaunch);
  const motionMode = useAppStore((state) => state.motionMode);
  const setAutoCheckUpdatesOnLaunch = useAppStore((state) => state.setAutoCheckUpdatesOnLaunch);
  const setMotionMode = useAppStore((state) => state.setMotionMode);
  const setShowReleaseNotesAfterUpdate = useAppStore(
    (state) => state.setShowReleaseNotesAfterUpdate,
  );
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const showReleaseNotesAfterUpdate = useAppStore((state) => state.showReleaseNotesAfterUpdate);
  const themeMode = useAppStore((state) => state.themeMode);
  const { pendingReleaseNotes } = usePendingReleaseNotes();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateViewState>({ kind: "idle" });

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    const result = await runAppUpdateCheck({
      promptForInstall: true,
      showReleaseNotesAfterUpdate,
    });
    setUpdateState(result);
    setIsCheckingUpdates(false);
  };

  const releaseStatus = getReleaseStatus(updateState);

  return (
    <div className="pt-2">
      {/* Hero - outside cards, like dashboard */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-[9px] bg-[var(--bg-muted-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
            Impostazioni
          </span>
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            Build v{APP_VERSION} · {updaterReady ? "Desktop release" : "Sviluppo"}
          </span>
        </div>
        <div className="mt-3">
          <h2 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--text-primary)]">
            Configurazione applicazione
          </h2>
          <p className="mt-2 max-w-3xl text-[16px] font-normal leading-6 text-[var(--text-secondary)]">
            Preferenze operative, stato updater e identita della build. Le modifiche vengono
            applicate immediatamente.
          </p>
        </div>
      </section>

      {/* Version info - outside cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          {
            detail: "Sync versione e rilascio desktop",
            label: "Versione installata",
            tone: "success" as const,
            value: `v${APP_VERSION}`,
          },
          {
            detail: "Canale operativo collegato alla pipeline release",
            label: "Canale",
            tone: "info" as const,
            value: "Stable",
          },
          {
            detail: updaterReady
              ? "Check live disponibile in questa build"
              : "Check live non eseguito in sviluppo",
            label: "Updater",
            tone: updaterReady ? ("success" as const) : ("neutral" as const),
            value: updaterReady ? "Pronto" : "Solo release",
          },
        ].map((metric) => (
          <section
            className="group min-h-[130px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]"
            key={metric.label}
          >
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {metric.label}
              </div>
              <div className="mt-2 text-[22px] font-semibold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                {metric.value}
              </div>
              <div className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                {metric.detail}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Main content */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column - Release check */}
        <div className="space-y-6">
          {/* Release updater */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Aggiornamenti
                </div>
                <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
                  Controllo release
                </h3>
              </div>
              <span
                className={cn(
                  "rounded-[9px] px-2.5 py-1 text-[11px] font-semibold",
                  releaseStatus.tone === "success"
                    ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                    : releaseStatus.tone === "warning"
                      ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                      : releaseStatus.tone === "danger"
                        ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                        : releaseStatus.tone === "info"
                          ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                          : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
                )}
              >
                {releaseStatus.label}
              </span>
            </div>

            <p className="mt-3 text-[13px] leading-5 text-[var(--text-secondary)]">
              {releaseStatus.description}
            </p>

            {releaseStatus.checkedAt ? (
              <div className="mt-3 flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
                <Clock3 className="size-3.5" />
                Ultimo controllo {formatTimestamp(releaseStatus.checkedAt)}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className={cn(
                  "flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all",
                  isCheckingUpdates
                    ? "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                    : "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]",
                )}
                disabled={isCheckingUpdates}
                onClick={handleCheckForUpdates}
                type="button"
              >
                <RefreshCcw className={cn("size-4", isCheckingUpdates && "animate-spin")} />
                {isCheckingUpdates ? "Verifica in corso..." : "Verifica disponibilita"}
              </button>
            </div>

            {releaseStatus.notes ? (
              <div className="mt-4 rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Note rilevate
                </div>
                <p className="mt-2 text-[13px] leading-5 text-[var(--text-primary)]">
                  {releaseStatus.notes}
                </p>
              </div>
            ) : null}
          </section>

          {/* Build info */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Build
                </div>
                <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
                  Catena versione
                </h3>
              </div>
              {pendingReleaseNotes ? (
                <span className="rounded-[9px] bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning-base)]">
                  Note release in sospeso
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success-base)]" />
              <div>
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Catena di versione attiva
                </div>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                  La UI legge APP_VERSION, rigenerata dal flusso pnpm version:sync che riallinea
                  root package.json, workspace desktop e metadati Tauri prima di check e build.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <InfoTile
                label="Runtime update"
                value={updaterReady ? "Desktop release" : "Sviluppo"}
              />
              <InfoTile
                label="Note aggiornamento"
                value={
                  pendingReleaseNotes ? `v${pendingReleaseNotes.version}` : "Nessuna in sospeso"
                }
              />
              <InfoTile
                label="Check automatico"
                value={autoCheckUpdatesOnLaunch ? "Attivo" : "Manuale"}
              />
              <InfoTile
                label="Release feedback"
                value={showReleaseNotesAfterUpdate ? "Abilitato" : "Disabilitato"}
              />
            </div>
          </section>
        </div>

        {/* Right column - Preferences */}
        <div className="space-y-6">
          {/* Theme */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Interfaccia
              </div>
              <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">Tema</h3>
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Trattamento cromatico della shell.
              </p>
            </div>
            <ModeSelector<ThemeMode>
              onChange={setThemeMode}
              options={[
                { description: "Superfici chiare", icon: Sun, label: "Chiaro", value: "light" },
                { description: "Superfici scure", icon: Moon, label: "Scuro", value: "dark" },
              ]}
              value={themeMode}
            />
          </section>

          {/* Motion */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Esperienza
              </div>
              <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
                Movimento
              </h3>
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Transizioni e micro-animazioni della shell.
              </p>
            </div>
            <ModeSelector<MotionMode>
              onChange={setMotionMode}
              options={[
                {
                  description: "Tutte le transizioni",
                  icon: Sparkles,
                  label: "Completo",
                  value: "full",
                },
                {
                  description: "Effetti ridotti",
                  icon: WandSparkles,
                  label: "Ridotto",
                  value: "reduced",
                },
              ]}
              value={motionMode}
            />
          </section>

          {/* Release rules */}
          <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Release
              </div>
              <h3 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
                Regole di aggiornamento
              </h3>
            </div>

            <div className="mt-4 space-y-3">
              <ToggleRow
                checked={autoCheckUpdatesOnLaunch}
                description="Check automatico all'avvio della build desktop."
                label="Auto-check all'avvio"
                onChange={setAutoCheckUpdatesOnLaunch}
              />
              <ToggleRow
                checked={showReleaseNotesAfterUpdate}
                description="Mostra conferma di installazione dopo il riavvio."
                label="Feedback post-update"
                onChange={setShowReleaseNotesAfterUpdate}
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function ModeSelector<TValue extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: TValue) => void;
  options: {
    description: string;
    icon: LucideIcon;
    label: string;
    value: TValue;
  }[];
  value: TValue;
}) {
  return (
    <div className="mt-4 grid gap-2">
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.icon;

        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
              active
                ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5"
                : "border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] hover:border-[var(--accent-primary)]/20 hover:bg-[var(--bg-muted-strong)]",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg transition-all",
                active
                  ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                  : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                {option.label}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">{option.description}</div>
            </div>
            {active ? (
              <span className="rounded-[9px] bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                Attivo
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</div>
        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{description}</p>
      </div>
      <button
        aria-checked={checked}
        className={cn(
          "relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border transition-all",
          checked
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
            : "border-[var(--border-subtle)] bg-[var(--surface-base)]",
        )}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={cn(
            "mx-0.5 block size-5 rounded-full bg-[var(--surface-base)] shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function getReleaseStatus(state: UpdateViewState) {
  if (state.kind === "idle") {
    return {
      checkedAt: null,
      description: "Nessun controllo eseguito in questa sessione.",
      label: "In attesa",
      notes: "",
      tone: "neutral" as const,
    };
  }

  if (state.kind === "up-to-date") {
    return {
      checkedAt: state.checkedAt,
      description: "Build allineata all'ultima release disponibile.",
      label: "Aggiornato",
      notes: "",
      tone: "success" as const,
    };
  }

  if (state.kind === "available") {
    return {
      checkedAt: state.checkedAt,
      description: `Quantara ${state.version} disponibile per installazione.`,
      label: "Nuova release",
      notes: state.notes,
      tone: "warning" as const,
    };
  }

  if (state.kind === "unsupported") {
    return {
      checkedAt: state.checkedAt,
      description: state.message,
      label: "Build sviluppo",
      notes: "",
      tone: "info" as const,
    };
  }

  return {
    checkedAt: state.checkedAt,
    description: state.message,
    label: "Errore",
    notes: "",
    tone: "danger" as const,
  };
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
