import {
  ArrowsClockwise,
  ArrowUpRight,
  BellRinging,
  CheckCircle,
  Clock,
  DesktopTower,
  FloppyDisk,
  GitBranch,
  MagicWand,
  Moon,
  Palette,
  Sparkle,
  Sun,
  Trash,
  WaveSine,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { APP_VERSION } from "@/generated/appVersion";
import { runAppUpdateCheck, type UpdateCheckResult } from "@/lib/appUpdater";
import { backupDatabase, type DatabaseInfo, getDatabaseInfo, restoreDatabase } from "@/lib/backup";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { cn } from "@/lib/utils";
import {
  type MotionMode,
  type ThemeMode,
  usePreferenceState,
  useThemeState,
} from "@/store/app-store";
import { useAuditLogStore } from "@/store/audit-log-store";

type UpdateViewState = { kind: "idle" } | UpdateCheckResult;
type Tone = "danger" | "info" | "neutral" | "success" | "warning";
type PhosphorIcon = ComponentType<{
  className?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}>;

const updaterReady = import.meta.env.PROD;
const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

export function SettingsScreen() {
  const {
    autoCheckUpdatesOnLaunch,
    motionMode,
    setAutoCheckUpdatesOnLaunch,
    setMotionMode,
    setShowReleaseNotesAfterUpdate,
    showReleaseNotesAfterUpdate,
  } = usePreferenceState();
  const { setThemeMode, themeMode } = useThemeState();
  const { pendingReleaseNotes } = usePendingReleaseNotes();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateViewState>({ kind: "idle" });
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);
  const auditEntries = useAuditLogStore((state) => state.entries);

  useEffect(() => {
    getDatabaseInfo()
      .then(setDbInfo)
      .catch(() => {});
  }, []);

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
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_16%_8%,color-mix(in_srgb,var(--accent-primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--info-base)_14%,transparent),transparent_32%)]" />

      <section className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
        <div>
          <div className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Impostazioni
          </div>
          <h2 className="mt-5 max-w-4xl text-[38px] font-semibold leading-[0.98] text-[var(--text-primary)] md:text-[56px]">
            Configurazione applicazione
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--text-secondary)]">
            Preferenze operative, stato updater e identita della build. Le modifiche vengono
            applicate immediatamente.
          </p>
        </div>

        <BezelSurface className="md:translate-y-2" innerClassName="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Build attiva
              </div>
              <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--text-primary)]">
                v{APP_VERSION}
              </div>
            </div>
            <IconOrb icon={DesktopTower} tone={updaterReady ? "success" : "neutral"} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <MiniStat label="Canale" value="Stable" />
            <MiniStat label="Updater" value={updaterReady ? "Pronto" : "Solo release"} />
          </div>
        </BezelSurface>
      </section>

      <section className="mt-8 grid grid-flow-dense gap-5 xl:grid-cols-12">
        <BezelSurface className="xl:col-span-8 xl:row-span-2" innerClassName="p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <IconOrb icon={ArrowsClockwise} tone={releaseStatus.tone} />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                    Aggiornamenti
                  </div>
                  <h3 className="mt-1 text-[20px] font-semibold text-[var(--text-primary)]">
                    Controllo release
                  </h3>
                </div>
              </div>

              <p className="mt-5 text-[14px] leading-6 text-[var(--text-secondary)]">
                {releaseStatus.description}
              </p>

              {releaseStatus.checkedAt ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
                  <Clock className="size-3.5" weight="light" />
                  Ultimo controllo {formatTimestamp(releaseStatus.checkedAt)}
                </div>
              ) : null}
            </div>

            <StatusPill label={releaseStatus.label} tone={releaseStatus.tone} />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ActionButton disabled={isCheckingUpdates} onClick={handleCheckForUpdates}>
              {isCheckingUpdates ? "Verifica in corso" : "Verifica disponibilita"}
            </ActionButton>
            <div className="text-[12px] leading-5 text-[var(--text-secondary)]">
              {updaterReady
                ? "Il controllo usa il canale release desktop."
                : "Il check live e disponibile solo sulle build firmate."}
            </div>
          </div>

          {releaseStatus.notes ? (
            <div className="mt-6 rounded-[22px] bg-[var(--bg-muted)] p-1 ring-1 ring-[var(--border-subtle)]">
              <div className="rounded-[18px] bg-[var(--surface-base)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_60%,transparent)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  Note rilevate
                </div>
                <p className="mt-2 text-[13px] leading-5 text-[var(--text-primary)]">
                  {releaseStatus.notes}
                </p>
              </div>
            </div>
          ) : null}
        </BezelSurface>

        <BezelSurface className="xl:col-span-4" innerClassName="p-5">
          <SectionTitle eyebrow="Interfaccia" icon={Palette} title="Tema" />
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            Trattamento cromatico della shell.
          </p>
          <ModeSelector<ThemeMode>
            onChange={setThemeMode}
            options={[
              { description: "Superfici chiare", icon: Sun, label: "Chiaro", value: "light" },
              { description: "Superfici scure", icon: Moon, label: "Scuro", value: "dark" },
            ]}
            value={themeMode}
          />
        </BezelSurface>

        <BezelSurface className="xl:col-span-4" innerClassName="p-5">
          <SectionTitle eyebrow="Esperienza" icon={WaveSine} title="Movimento" />
          <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
            Transizioni e micro-animazioni della shell.
          </p>
          <ModeSelector<MotionMode>
            onChange={setMotionMode}
            options={[
              {
                description: "Tutte le transizioni",
                icon: Sparkle,
                label: "Completo",
                value: "full",
              },
              {
                description: "Effetti ridotti",
                icon: MagicWand,
                label: "Ridotto",
                value: "reduced",
              },
            ]}
            value={motionMode}
          />
        </BezelSurface>

        <BezelSurface className="xl:col-span-5" innerClassName="p-5">
          <SectionTitle eyebrow="Build" icon={GitBranch} title="Catena versione" />
          {pendingReleaseNotes ? (
            <div className="mt-4 inline-flex rounded-full bg-[var(--warning-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--warning-base)]">
              Note release in sospeso
            </div>
          ) : null}

          <div className="mt-5 flex items-start gap-3 rounded-[20px] bg-[var(--bg-muted)] p-4 ring-1 ring-[var(--border-subtle)]">
            <CheckCircle
              className="mt-0.5 size-5 shrink-0 text-[var(--success-base)]"
              weight="light"
            />
            <div>
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                Catena di versione attiva
              </div>
              <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                La UI legge APP_VERSION, rigenerata dal flusso pnpm version:sync che riallinea root
                package.json, workspace desktop e metadati Tauri prima di check e build.
              </p>
            </div>
          </div>
        </BezelSurface>

        <BezelSurface className="xl:col-span-3" innerClassName="p-5">
          <SectionTitle eyebrow="Release" icon={BellRinging} title="Regole" />
          <div className="mt-5 space-y-3">
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
        </BezelSurface>

        <BezelSurface className="xl:col-span-4" innerClassName="p-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoTile
              label="Runtime update"
              value={updaterReady ? "Desktop release" : "Sviluppo"}
            />
            <InfoTile
              label="Note update"
              value={pendingReleaseNotes ? `v${pendingReleaseNotes.version}` : "Nessuna"}
            />
            <InfoTile
              label="Check automatico"
              value={autoCheckUpdatesOnLaunch ? "Attivo" : "Manuale"}
            />
            <InfoTile
              label="Feedback release"
              value={showReleaseNotesAfterUpdate ? "Abilitato" : "Disabilitato"}
            />
          </div>
        </BezelSurface>

        <BezelSurface className="xl:col-span-4" innerClassName="p-5">
          <SectionTitle eyebrow="Backup" icon={FloppyDisk} title="Backup e ripristino" />
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Dimensione DB"
                value={dbInfo ? formatFileSize(dbInfo.sizeBytes) : "—"}
              />
              <MiniStat label="Directory dati" value={dbInfo ? "Locale" : "—"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90 disabled:opacity-50"
                disabled={isBackupRunning}
                onClick={async () => {
                  setIsBackupRunning(true);
                  const result = await backupDatabase();
                  setBackupResult(result);
                  setIsBackupRunning(false);
                  if (result !== "annullato") {
                    getDatabaseInfo()
                      .then(setDbInfo)
                      .catch(() => {});
                  }
                }}
                type="button"
              >
                <FloppyDisk className="size-4" weight="bold" />
                Crea backup
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
                onClick={async () => {
                  const result = await restoreDatabase();
                  if (result !== "annullato") {
                    setBackupResult(result);
                    getDatabaseInfo()
                      .then(setDbInfo)
                      .catch(() => {});
                  }
                }}
                type="button"
              >
                Ripristina
              </button>
            </div>
            {backupResult && (
              <div className="rounded-[10px] bg-[var(--success-soft)] px-3 py-2 text-[12px] font-medium text-[var(--success-base)]">
                {backupResult}
              </div>
            )}
            {isBackupRunning && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <ArrowsClockwise className="size-4 animate-spin" weight="bold" />
                Backup in corso...
              </div>
            )}
          </div>
        </BezelSurface>

        <BezelSurface className="xl:col-span-4" innerClassName="p-5">
          <SectionTitle eyebrow="Audit" icon={Clock} title="Registro attività" />
          <div className="mt-4 max-h-[320px] overflow-y-auto">
            {auditEntries.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-[var(--text-secondary)]">
                Nessuna attività registrata.
              </div>
            ) : (
              <div className="space-y-1">
                {auditEntries.map((entry) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--bg-muted)]/50 px-3 py-2 text-[12px]"
                    key={entry.id}
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {entry.action}
                      </span>
                      <span className="ml-1.5 text-[var(--text-secondary)]">
                        {entry.entityType}: {entry.entityId.slice(0, 12)}…
                      </span>
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                        {entry.details}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-[var(--text-secondary)]">
                      {new Date(entry.timestamp).toLocaleDateString("it-IT")}
                      <br />
                      {new Date(entry.timestamp).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {auditEntries.length > 0 && (
            <button
              className="mt-3 flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px] font-semibold text-[var(--danger-base)] transition-colors hover:bg-[var(--danger-soft)]"
              onClick={() => useAuditLogStore.getState().clearAll()}
              type="button"
            >
              <Trash className="size-4" />
              Cancella registro
            </button>
          )}
        </BezelSurface>
      </section>
    </main>
  );
}

function BezelSurface({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <motion.section
      className={cn(
        "rounded-[30px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]",
        className,
      )}
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      transition={{ duration: 0.72, ease: SPRING_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
    >
      <div
        className={cn(
          "h-full rounded-[24px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </motion.section>
  );
}

function SectionTitle({
  eyebrow,
  icon: Icon,
  title,
}: {
  eyebrow: string;
  icon: PhosphorIcon;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconOrb icon={Icon} tone="info" />
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          {eyebrow}
        </div>
        <h3 className="mt-1 text-[17px] font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
    </div>
  );
}

function IconOrb({ icon: Icon, tone }: { icon: PhosphorIcon; tone: Tone }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full ring-1",
        tone === "success" &&
          "bg-[var(--success-soft)] text-[var(--success-base)] ring-[color-mix(in_srgb,var(--success-base)_22%,transparent)]",
        tone === "warning" &&
          "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-[color-mix(in_srgb,var(--warning-base)_24%,transparent)]",
        tone === "danger" &&
          "bg-[var(--danger-soft)] text-[var(--danger-base)] ring-[color-mix(in_srgb,var(--danger-base)_24%,transparent)]",
        tone === "info" &&
          "bg-[var(--info-soft)] text-[var(--info-base)] ring-[color-mix(in_srgb,var(--info-base)_22%,transparent)]",
        tone === "neutral" &&
          "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] ring-[var(--border-subtle)]",
      )}
    >
      <Icon className="size-5" weight="light" />
    </span>
  );
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex w-max rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1",
        tone === "success" &&
          "bg-[var(--success-soft)] text-[var(--success-base)] ring-[color-mix(in_srgb,var(--success-base)_20%,transparent)]",
        tone === "warning" &&
          "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-[color-mix(in_srgb,var(--warning-base)_22%,transparent)]",
        tone === "danger" &&
          "bg-[var(--danger-soft)] text-[var(--danger-base)] ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)]",
        tone === "info" &&
          "bg-[var(--info-soft)] text-[var(--info-base)] ring-[color-mix(in_srgb,var(--info-base)_20%,transparent)]",
        tone === "neutral" &&
          "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] ring-[var(--border-subtle)]",
      )}
    >
      {label}
    </span>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="group inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[var(--accent-primary)] py-1 pl-5 pr-1 text-[13px] font-semibold text-[var(--text-inverse)] outline-none transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...(!disabled ? { whileHover: { y: -1 }, whileTap: { scale: 0.97 } } : {})}
    >
      <span>{children}</span>
      <span className="flex size-10 items-center justify-center rounded-full bg-white/16 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
        {disabled ? (
          <ArrowsClockwise className="size-4 animate-spin" weight="light" />
        ) : (
          <ArrowUpRight className="size-4" weight="light" />
        )}
      </span>
    </motion.button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--bg-muted)] px-3 py-3 ring-1 ring-[var(--border-subtle)]">
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
    icon: PhosphorIcon;
    label: string;
    value: TValue;
  }[];
  value: TValue;
}) {
  return (
    <div className="mt-5 grid gap-2">
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.icon;

        return (
          <motion.button
            aria-pressed={active}
            className={cn(
              "group flex min-h-16 items-center gap-3 rounded-[20px] p-2.5 text-left outline-none ring-1 transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              active
                ? "bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] ring-[color-mix(in_srgb,var(--accent-primary)_34%,transparent)]"
                : "bg-[var(--bg-muted)] ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                active
                  ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                  : "bg-[var(--surface-base)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]",
              )}
            >
              <Icon className="size-4.5" weight="light" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                {option.label}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {option.description}
              </div>
            </div>
            {active ? (
              <span className="rounded-full bg-[var(--accent-primary)]/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--accent-primary)]">
                Attivo
              </span>
            ) : null}
          </motion.button>
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
    <div className="flex items-start justify-between gap-4 rounded-[20px] bg-[var(--bg-muted)] px-4 py-3 ring-1 ring-[var(--border-subtle)]">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{description}</p>
      </div>
      <motion.button
        aria-checked={checked}
        className={cn(
          "relative mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 outline-none ring-1 transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          checked
            ? "bg-[var(--accent-primary)] ring-[var(--accent-primary)]"
            : "bg-[var(--surface-base)] ring-[var(--border-subtle)]",
        )}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
        whileTap={{ scale: 0.96 }}
      >
        <motion.span
          className="block size-5 rounded-full bg-[var(--surface-base)] shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          transition={{ duration: 0.45, ease: SPRING_EASE }}
          animate={{ x: checked ? 20 : 0 }}
        />
      </motion.button>
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

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
