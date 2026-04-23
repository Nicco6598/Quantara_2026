import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock3, Moon, RefreshCcw, Sparkles, Sun, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { APP_VERSION } from "@/generated/appVersion";
import { runAppUpdateCheck, type UpdateCheckResult } from "@/lib/appUpdater";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { useAppStore, type MotionMode, type ThemeMode } from "@/store/app-store";

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
    <main className="p-6 pb-8">
      <section className="settings-command-surface relative overflow-hidden rounded-[28px] border border-subtle shadow-panel">
        <div className="relative z-10 grid gap-6 p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">Sistema e release</Badge>
              <span className="text-xs font-medium text-secondary">
                Versione esposta dal pacchetto applicativo sincronizzato con la release root
              </span>
            </div>

            <div className="mt-5 max-w-3xl">
              <h2 className="text-[2rem] font-semibold tracking-tight text-foreground md:text-[2.6rem]">
                Impostazioni operative dell&apos;app desktop.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary md:text-[15px]">
                Qui restano insieme preferenze utili, stato updater e identita della build.
                Versione, Tauri updater e note di release seguono un solo flusso di rilascio.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <SettingsMetric
                detail="Aggiornata dal flusso di sync versione e usata per il rilascio desktop."
                label="Versione installata"
                tone="success"
                value={`v${APP_VERSION}`}
              />
              <SettingsMetric
                detail="Canale operativo collegato alla pipeline release del repository."
                label="Canale"
                tone="info"
                value="Stable"
              />
              <SettingsMetric
                detail={
                  updaterReady
                    ? "Il controllo nuove release e disponibile in questa build."
                    : "In sviluppo la UI resta visibile ma il check live non viene eseguito."
                }
                label="Updater"
                tone={updaterReady ? "warning" : "neutral"}
                value={updaterReady ? "Pronto" : "Solo release"}
              />
            </div>
          </div>

          <section className="rounded-[24px] border border-subtle bg-card/92 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                  Stato release
                </div>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  Verifica nuove versioni
                </h3>
              </div>
              <StatusBadge label={releaseStatus.label} tone={releaseStatus.tone} />
            </div>

            <p className="mt-4 text-sm leading-6 text-secondary">{releaseStatus.description}</p>

            {releaseStatus.checkedAt ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-secondary">
                <Clock3 className="size-3.5" />
                Ultimo controllo {formatTimestamp(releaseStatus.checkedAt)}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isCheckingUpdates}
                onClick={handleCheckForUpdates}
                size="sm"
                variant="outline"
              >
                <RefreshCcw className="size-4" />
                {isCheckingUpdates ? "Verifica in corso" : "Verifica nuove versioni disponibili"}
              </Button>
            </div>

            {releaseStatus.notes ? (
              <div className="mt-5 rounded-2xl border border-subtle bg-muted/45 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                  Note rilevate
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">{releaseStatus.notes}</p>
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
              Esperienza
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Preferenze di interfaccia
            </h3>
            <p className="mt-1 text-sm text-secondary">
              Impostazioni leggere che cambiano il comportamento della shell senza aggiungere altro
              chrome.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <PreferenceGroup
              description="Seleziona il trattamento cromatico base della shell."
              label="Tema"
            >
              <ModeSelector<ThemeMode>
                onChange={setThemeMode}
                options={[
                  {
                    description: "Superfici chiare e piu contrasto sui pannelli.",
                    icon: Sun,
                    label: "Chiaro",
                    value: "light",
                  },
                  {
                    description: "Superfici scure per ambienti a bassa luminosita.",
                    icon: Moon,
                    label: "Scuro",
                    value: "dark",
                  },
                ]}
                value={themeMode}
              />
            </PreferenceGroup>

            <PreferenceGroup
              description="Riduce transizioni e micro-animazioni della shell."
              label="Movimento"
            >
              <ModeSelector<MotionMode>
                onChange={setMotionMode}
                options={[
                  {
                    description: "Mantiene tutte le transizioni della UI.",
                    icon: Sparkles,
                    label: "Completo",
                    value: "full",
                  },
                  {
                    description: "Taglia gli effetti non essenziali sulle superfici.",
                    icon: WandSparkles,
                    label: "Ridotto",
                    value: "reduced",
                  },
                ]}
                value={motionMode}
              />
            </PreferenceGroup>
          </div>
        </section>

        <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
              Aggiornamenti
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">Regole di release</h3>
          </div>

          <div className="mt-5 space-y-4">
            <ToggleRow
              checked={autoCheckUpdatesOnLaunch}
              description="Esegue un check automatico quando la build desktop di release si avvia."
              label="Controllo automatico all'avvio"
              onChange={setAutoCheckUpdatesOnLaunch}
            />
            <ToggleRow
              checked={showReleaseNotesAfterUpdate}
              description="Dopo l'installazione conserva il changelog per il dialog di rientro."
              label="Mostra note release dopo update"
              onChange={setShowReleaseNotesAfterUpdate}
            />
          </div>

          <div className="mt-6 rounded-[22px] border border-subtle bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              Catena versione
            </div>
            <p className="mt-2 text-sm leading-6 text-secondary">
              La UI legge `APP_VERSION`, rigenerata dal flusso `pnpm version:sync` che riallinea
              root `package.json`, workspace desktop e metadati Tauri prima di check e build.
            </p>
          </div>
        </section>
      </section>

      <section className="mt-6 rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
              Identita build
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Stato applicazione e pipeline
            </h3>
          </div>
          {pendingReleaseNotes ? <Badge variant="warning">Note release in sospeso</Badge> : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SystemFact
            label="Versione"
            value={`v${APP_VERSION}`}
            note="Esportata dal modulo generato e allineata alla release root."
          />
          <SystemFact
            label="Runtime update"
            value={updaterReady ? "Desktop release" : "Sviluppo"}
            note="Il plugin updater viene interrogato solo nelle build distribuite."
          />
          <SystemFact
            label="Note aggiornamento"
            value={pendingReleaseNotes ? "Disponibili" : "Pulite"}
            note={
              pendingReleaseNotes
                ? `Ultima release letta: v${pendingReleaseNotes.version}`
                : "Nessun changelog in attesa di essere mostrato."
            }
          />
          <SystemFact
            label="Check automatico"
            value={autoCheckUpdatesOnLaunch ? "Attivo" : "Manuale"}
            note="Puoi sempre lanciare un controllo on demand dal pannello superiore."
          />
        </div>
      </section>
    </main>
  );
}

function SettingsMetric({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "danger" | "info" | "neutral" | "success" | "warning";
  value: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : tone === "info"
            ? "text-info"
            : "text-foreground";

  return (
    <div className="rounded-[22px] border border-subtle bg-card/88 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <p className="mt-2 text-xs leading-5 text-secondary">{detail}</p>
    </div>
  );
}

function PreferenceGroup({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: string;
  label: string;
}) {
  return (
    <section className="rounded-[24px] border border-subtle bg-muted/35 p-4">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
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
    <div className="grid gap-3 md:grid-cols-2">
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.icon;

        return (
          <button
            aria-pressed={active}
            className={`rounded-[20px] border p-4 text-left transition-all ${
              active
                ? "border-primary bg-card shadow-soft"
                : "border-subtle bg-card/70 hover:border-primary/40 hover:bg-card"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-10 items-center justify-center rounded-2xl ${
                    active ? "bg-primary/12 text-primary" : "bg-muted text-secondary"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{option.label}</div>
                  <div className="mt-1 text-xs text-secondary">
                    {active ? "Attivo" : "Disponibile"}
                  </div>
                </div>
              </div>
              {active ? <Badge variant="info">Selezionato</Badge> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-secondary">{option.description}</p>
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
    <div className="flex items-start justify-between gap-4 rounded-[22px] border border-subtle bg-muted/35 px-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>
      </div>
      <button
        aria-checked={checked}
        className={`relative mt-1 flex h-7 w-12 shrink-0 items-center rounded-full border transition-all ${
          checked
            ? "border-primary bg-primary"
            : "border-subtle bg-card text-secondary hover:border-primary/40"
        }`}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`mx-1 block size-5 rounded-full bg-white shadow-soft transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SystemFact({ label, note, value }: { label: string; note: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-subtle bg-muted/35 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </div>
      <div className="mt-3 text-base font-semibold text-foreground">{value}</div>
      <p className="mt-2 text-sm leading-6 text-secondary">{note}</p>
    </div>
  );
}

function getReleaseStatus(state: UpdateViewState) {
  if (state.kind === "idle") {
    return {
      checkedAt: null,
      description:
        "Nessun controllo manuale eseguito in questa sessione. Puoi verificare nuove release quando vuoi.",
      label: "In attesa",
      notes: "",
      tone: "neutral" as const,
    };
  }

  if (state.kind === "up-to-date") {
    return {
      checkedAt: state.checkedAt,
      description: "La build installata risulta allineata all'ultima release disponibile.",
      label: "Aggiornato",
      notes: "",
      tone: "success" as const,
    };
  }

  if (state.kind === "available") {
    return {
      checkedAt: state.checkedAt,
      description: `E disponibile Quantara ${state.version}. Se hai rimandato l'installazione, puoi rilanciare il check da qui.`,
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
    label: "Check fallito",
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
