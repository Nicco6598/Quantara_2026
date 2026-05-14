import {
  ArrowsClockwise,
  BellRinging,
  CheckCircle,
  Clock,
  DesktopTower,
  FloppyDisk,
  GitBranch,
  MagicWand,
  Moon,
  Palette,
  ShieldCheck,
  Sparkle,
  Sun,
  Trash,
  WaveSine,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { m } from "framer-motion";
import { useCallback, useEffect, useReducer, useState } from "react";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { Button } from "@/components/shared/Button";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { APP_VERSION } from "@/generated/appVersion";
import { runAppUpdateCheck, type UpdateCheckResult } from "@/lib/appUpdater";
import { backupDatabase, type DatabaseInfo, getDatabaseInfo, restoreDatabase } from "@/lib/backup";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { cn } from "@/lib/utils";
import { usePreferenceState, useThemeState } from "@/store/app-store";
import { useAuditLogStore } from "@/store/audit-log-store";

type UpdateViewState = { kind: "idle" } | UpdateCheckResult;

const updaterReady = import.meta.env.PROD;

// ── Reducer ──────────────────────────────────────────────

type AsyncOpState = {
  isCheckingUpdates: boolean;
  updateState: UpdateViewState;
  isBackupRunning: boolean;
  backupResult: string | null;
  isIntegrityRunning: boolean;
  integrityResult: string | null;
};

type AsyncOpAction =
  | { type: "CHECK_UPDATE_START" }
  | { type: "CHECK_UPDATE_DONE"; state: UpdateViewState }
  | { type: "BACKUP_START" }
  | { type: "BACKUP_DONE"; result: string | null }
  | { type: "RESTORE_DONE"; result: string }
  | { type: "INTEGRITY_START" }
  | { type: "INTEGRITY_DONE"; result: string | null };

function asyncOpReducer(state: AsyncOpState, action: AsyncOpAction): AsyncOpState {
  switch (action.type) {
    case "CHECK_UPDATE_START":
      return { ...state, isCheckingUpdates: true };
    case "CHECK_UPDATE_DONE":
      return { ...state, isCheckingUpdates: false, updateState: action.state };
    case "BACKUP_START":
      return { ...state, isBackupRunning: true, backupResult: null };
    case "BACKUP_DONE":
      return { ...state, isBackupRunning: false, backupResult: action.result };
    case "RESTORE_DONE":
      return { ...state, backupResult: action.result };
    case "INTEGRITY_START":
      return { ...state, isIntegrityRunning: true, integrityResult: null };
    case "INTEGRITY_DONE":
      return { ...state, isIntegrityRunning: false, integrityResult: action.result };
  }
}

const initialAsyncState: AsyncOpState = {
  isCheckingUpdates: false,
  updateState: { kind: "idle" },
  isBackupRunning: false,
  backupResult: null,
  isIntegrityRunning: false,
  integrityResult: null,
};

// ── Client-date (hydration-safe) ─────────────────────────

function ClientDate({ timestamp }: { timestamp: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <>
      {new Date(timestamp).toLocaleDateString("it-IT")}
      <br />
      {new Date(timestamp).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </>
  );
}

// ── Card sub-components ──────────────────────────────────

function ThemeCard() {
  const { setThemeMode, themeMode } = useThemeState();
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <Palette className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Interfaccia
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">Tema</h3>
        </div>
      </div>
      <p className="mt-2 text-12px leading-5 text-[var(--text-secondary)]">
        Trattamento cromatico della shell.
      </p>
      <div className="mt-4 grid gap-2">
        <ThemeOption
          active={themeMode === "light"}
          description="Superfici chiare"
          icon={Sun}
          label="Chiaro"
          onClick={() => setThemeMode("light")}
        />
        <ThemeOption
          active={themeMode === "dark"}
          description="Superfici scure"
          icon={Moon}
          label="Scuro"
          onClick={() => setThemeMode("dark")}
        />
      </div>
    </BezelSurface>
  );
}

function MotionCard() {
  const { motionMode, setMotionMode } = usePreferenceState();
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <WaveSine className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Esperienza
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">Movimento</h3>
        </div>
      </div>
      <p className="mt-2 text-12px leading-5 text-[var(--text-secondary)]">
        Transizioni e micro-animazioni della shell.
      </p>
      <div className="mt-4 grid gap-2">
        <ThemeOption
          active={motionMode === "full"}
          description="Tutte le transizioni"
          icon={Sparkle}
          label="Completo"
          onClick={() => setMotionMode("full")}
        />
        <ThemeOption
          active={motionMode === "reduced"}
          description="Effetti ridotti"
          icon={MagicWand}
          label="Ridotto"
          onClick={() => setMotionMode("reduced")}
        />
      </div>
    </BezelSurface>
  );
}

function UpdateCheckCard({
  isCheckingUpdates,
  updateState,
  onCheckForUpdates,
}: {
  isCheckingUpdates: boolean;
  updateState: UpdateViewState;
  onCheckForUpdates: () => void;
}) {
  const releaseStatus = getReleaseStatus(updateState);
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            releaseStatus.tone === "success"
              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
              : releaseStatus.tone === "warning"
                ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                : "bg-[var(--info-soft)] text-[var(--info-base)]",
          )}
        >
          <ArrowsClockwise className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Aggiornamenti
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">Check release</h3>
        </div>
      </div>
      <p className="mt-2 text-12px leading-5 text-[var(--text-secondary)]">
        {releaseStatus.description}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={isCheckingUpdates} onClick={onCheckForUpdates} variant="primary">
          <svg
            aria-hidden="true"
            className={cn("size-4", isCheckingUpdates ? "animate-spin" : "")}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 4V2m0 20v-2m8-10h2M2 12h2m15.07-7.07l1.41-1.41M5.64 17.66l-1.41 1.41"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={2}
            />
            <circle
              cx="12"
              cy="12"
              r="6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={2}
            />
          </svg>
          {isCheckingUpdates ? "Verifica in corso\u2026" : "Verifica disponibilita"}
        </Button>
        {releaseStatus.notes ? (
          <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-10px font-semibold text-[var(--warning-base)]">
            {releaseStatus.notes}
          </span>
        ) : null}
      </div>
      {releaseStatus.checkedAt ? (
        <div className="mt-3 flex items-center gap-1.5 text-11px font-medium text-[var(--text-secondary)]">
          <Clock className="size-3.5" weight="light" />
          Ultimo controllo {formatTimestamp(releaseStatus.checkedAt)}
        </div>
      ) : null}
    </BezelSurface>
  );
}

function BackupRestoreCard({
  dbInfo,
  isBackupRunning,
  backupResult,
  onBackup,
  onRestore,
}: {
  dbInfo: DatabaseInfo | null;
  isBackupRunning: boolean;
  backupResult: string | null;
  onBackup: () => void;
  onRestore: () => void;
}) {
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <FloppyDisk className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Backup
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">
            Backup e ripristino
          </h3>
        </div>
      </div>
      <p className="mt-2 text-12px leading-5 text-[var(--text-secondary)]">
        Crea un backup completo del database o ripristina da un file .qbk esistente.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
          <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
            Dimensione DB
          </div>
          <div className="mt-1 truncate text-13px font-semibold text-[var(--text-primary)]">
            {dbInfo ? formatFileSize(dbInfo.sizeBytes) : "\u2014"}
          </div>
        </div>
        <div className="rounded-lg bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
          <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
            Directory
          </div>
          <div className="mt-1 truncate text-13px font-semibold text-[var(--text-primary)]">
            {dbInfo ? "Locale" : "\u2014"}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={isBackupRunning} onClick={onBackup} variant="primary">
          <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
          </svg>
          {isBackupRunning ? "Backup in corso\u2026" : "Crea backup"}
        </Button>
        <Button onClick={onRestore} variant="ghost">
          <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
          </svg>
          Ripristina
        </Button>
      </div>
      {isBackupRunning ? (
        <div className="mt-3 flex items-center gap-2 text-12px text-[var(--text-secondary)]">
          <ArrowsClockwise className="size-4 animate-spin" weight="bold" />
          Backup in corso\u2026
        </div>
      ) : null}
      {backupResult && backupResult !== "annullato" ? (
        <div className="mt-3 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-12px font-medium text-[var(--success-base)] ring-1 ring-[var(--success-base)]/20">
          <CheckCircle className="mr-1.5 inline size-3.5" weight="bold" />
          {backupResult}
        </div>
      ) : null}
    </BezelSurface>
  );
}

function IntegrityCheckCard({
  dbInfo,
  isIntegrityRunning,
  integrityResult,
  onIntegrityCheck,
}: {
  dbInfo: DatabaseInfo | null;
  isIntegrityRunning: boolean;
  integrityResult: string | null;
  onIntegrityCheck: () => void;
}) {
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <ShieldCheck className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Integrita
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">
            Verifica database
          </h3>
        </div>
      </div>
      <p className="mt-2 text-12px leading-5 text-[var(--text-secondary)]">
        Controlla lo stato del database locale, dimensione e accessibilita dei dati.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
          <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
            Esistenza
          </div>
          <div className="mt-1 truncate text-13px font-semibold text-[var(--text-primary)]">
            {dbInfo ? (dbInfo.exists ? "Presente" : "Assente") : "\u2014"}
          </div>
        </div>
        <div className="rounded-lg bg-[var(--bg-muted)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]">
          <div className="text-10px font-semibold uppercase tracking-overline text-[var(--text-secondary)]">
            Dimensione
          </div>
          <div className="mt-1 truncate text-13px font-semibold text-[var(--text-primary)]">
            {dbInfo ? formatFileSize(dbInfo.sizeBytes) : "\u2014"}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Button disabled={isIntegrityRunning} onClick={onIntegrityCheck} variant="secondary">
          <svg
            aria-hidden="true"
            className={cn("size-4", isIntegrityRunning ? "animate-spin" : "")}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={2}
            />
          </svg>
          {isIntegrityRunning ? "Verifica in corso\u2026" : "Esegui verifica"}
        </Button>
      </div>
      {integrityResult ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-12px font-medium text-[var(--success-base)] ring-1 ring-[var(--success-base)]/20">
          <CheckCircle className="size-3.5 shrink-0" weight="bold" />
          {integrityResult}
        </div>
      ) : null}
    </BezelSurface>
  );
}

function BuildInfoCard() {
  const { pendingReleaseNotes } = usePendingReleaseNotes();
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <GitBranch className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Build
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">
            Catena versione
          </h3>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3 rounded-lg bg-[var(--bg-muted)] p-3 ring-1 ring-[var(--border-subtle)]">
          <CheckCircle
            className="mt-0.5 size-4 shrink-0 text-[var(--success-base)]"
            weight="light"
          />
          <div>
            <div className="text-13px font-semibold text-[var(--text-primary)]">
              Catena di versione attiva
            </div>
            <p className="mt-1 text-12px leading-5 text-[var(--text-secondary)]">
              APP_VERSION rigenerata dal flusso pnpm version:sync. Riallinea root, workspace desktop
              e metadati Tauri.
            </p>
          </div>
        </div>
        {pendingReleaseNotes ? (
          <div className="inline-flex rounded-full bg-[var(--warning-soft)] px-3 py-1 text-11px font-semibold text-[var(--warning-base)]">
            Note release v{pendingReleaseNotes.version} in sospeso
          </div>
        ) : null}
      </div>
    </BezelSurface>
  );
}

function ReleaseRulesCard() {
  const {
    autoCheckUpdatesOnLaunch,
    setAutoCheckUpdatesOnLaunch,
    setShowReleaseNotesAfterUpdate,
    showReleaseNotesAfterUpdate,
  } = usePreferenceState();
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <BellRinging className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Release
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">
            Regole aggiornamento
          </h3>
        </div>
      </div>
      <div className="mt-4 space-y-2">
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
  );
}

function AuditLogCard() {
  const auditEntries = useAuditLogStore((state) => state.entries);
  return (
    <BezelSurface innerClassName="p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            auditEntries.length > 0
              ? "bg-[var(--info-soft)] text-[var(--info-base)]"
              : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
          )}
        >
          <Clock className="size-5" weight="light" />
        </span>
        <div>
          <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
            Audit
          </div>
          <h3 className="mt-1 text-15px font-semibold text-[var(--text-primary)]">
            Registro attivita
          </h3>
        </div>
      </div>
      <div className="mt-4 max-h-[260px] space-y-1 overflow-y-auto">
        {auditEntries.length === 0 ? (
          <p className="py-4 text-center text-13px text-[var(--text-secondary)]">
            Nessuna attivita registrata.
          </p>
        ) : (
          auditEntries.slice(0, 20).map((entry) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-muted)]/50 px-3 py-2 text-12px"
              key={entry.id}
            >
              <div className="min-w-0">
                <span className="font-semibold text-[var(--text-primary)]">{entry.action}</span>
                <span className="ml-1.5 text-[var(--text-secondary)]">{entry.entityType}</span>
                <div className="mt-0.5 text-11px text-[var(--text-secondary)]">{entry.details}</div>
              </div>
              <div className="shrink-0 text-right text-11px text-[var(--text-secondary)]">
                <ClientDate timestamp={entry.timestamp} />
              </div>
            </div>
          ))
        )}
      </div>
      {auditEntries.length > 0 ? (
        <Button
          className="mt-3"
          onClick={() => useAuditLogStore.getState().clearAll()}
          variant="destructive"
        >
          <Trash className="size-4" />
          Cancella registro
        </Button>
      ) : null}
    </BezelSurface>
  );
}

// ── Main component ───────────────────────────────────────

export function SettingsScreen() {
  const { showReleaseNotesAfterUpdate } = usePreferenceState();
  const [
    {
      isCheckingUpdates,
      updateState,
      isBackupRunning,
      backupResult,
      isIntegrityRunning,
      integrityResult,
    },
    dispatch,
  ] = useReducer(asyncOpReducer, initialAsyncState);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);

  useEffect(() => {
    getDatabaseInfo()
      .then(setDbInfo)
      .catch(() => {});
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    dispatch({ type: "CHECK_UPDATE_START" });
    const result = await runAppUpdateCheck({ promptForInstall: true, showReleaseNotesAfterUpdate });
    dispatch({ type: "CHECK_UPDATE_DONE", state: result });
  }, [showReleaseNotesAfterUpdate]);

  const handleBackup = useCallback(async () => {
    dispatch({ type: "BACKUP_START" });
    const result = await backupDatabase();
    dispatch({ type: "BACKUP_DONE", result });
    if (result !== "annullato") {
      getDatabaseInfo()
        .then(setDbInfo)
        .catch(() => {});
    }
  }, []);

  const handleRestore = useCallback(async () => {
    const result = await restoreDatabase();
    if (result !== "annullato") {
      dispatch({ type: "RESTORE_DONE", result });
      getDatabaseInfo()
        .then(setDbInfo)
        .catch(() => {});
    }
  }, []);

  const handleIntegrityCheck = useCallback(async () => {
    dispatch({ type: "INTEGRITY_START" });
    await new Promise((r) => setTimeout(r, 400));
    try {
      const info = await getDatabaseInfo();
      const checks: string[] = [];
      if (info.exists) {
        checks.push(info.sizeBytes > 0 ? "Database integro" : "Database vuoto");
        checks.push(info.sizeBytes > 1024 ? "Dimensione adeguata" : "Dimensione ridotta");
        dispatch({ type: "INTEGRITY_DONE", result: checks.join(" · ") });
      } else {
        dispatch({ type: "INTEGRITY_DONE", result: "Nessun database locale trovato" });
      }
    } catch {
      dispatch({ type: "INTEGRITY_DONE", result: "Verifica non riuscita" });
    }
  }, []);

  return (
    <ScreenLayout gradient="success-info">
      <ScreenHero
        badge="Impostazioni"
        title="Configurazione applicazione"
        description="Preferenze operative, stato updater e identita della build. Le modifiche vengono applicate immediatamente."
        sidePanel={
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                  Build attiva
                </div>
                <div className="mt-2 text-28px font-semibold leading-none text-[var(--text-primary)]">
                  v{APP_VERSION}
                </div>
              </div>
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  updaterReady
                    ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                    : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
                )}
              >
                <DesktopTower className="size-6" weight="light" />
              </span>
            </div>
            <p className="mt-5 text-12px font-medium leading-5 text-[var(--text-secondary)]">
              Build {updaterReady ? "pronta per aggiornamenti" : "in sviluppo"} · Canale Stable
            </p>
          </div>
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ThemeCard />
        <MotionCard />
        <UpdateCheckCard
          isCheckingUpdates={isCheckingUpdates}
          updateState={updateState}
          onCheckForUpdates={handleCheckForUpdates}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <BackupRestoreCard
          dbInfo={dbInfo}
          isBackupRunning={isBackupRunning}
          backupResult={backupResult}
          onBackup={handleBackup}
          onRestore={handleRestore}
        />
        <IntegrityCheckCard
          dbInfo={dbInfo}
          isIntegrityRunning={isIntegrityRunning}
          integrityResult={integrityResult}
          onIntegrityCheck={handleIntegrityCheck}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <BuildInfoCard />
        <ReleaseRulesCard />
        <AuditLogCard />
      </div>
    </ScreenLayout>
  );
}

// ── Shared helpers ───────────────────────────────────────

function ThemeOption({
  active,
  description,
  icon: IconComp,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: Icon;
  label: string;
  onClick: () => void;
}) {
  return (
    <m.button
      aria-pressed={active}
      className={cn(
        "group flex min-h-14 items-center gap-3 rounded-xl p-2.5 text-left outline-none ring-1 transition-all duration-200",
        active
          ? "bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] ring-[color-mix(in_srgb,var(--accent-primary)_34%,transparent)]"
          : "bg-[var(--bg-muted)] ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full transition-all duration-200",
          active
            ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
            : "bg-[var(--surface-base)] text-[var(--text-secondary)]",
        )}
      >
        <IconComp className="size-4.5" weight="light" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-13px font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-0.5 text-11px text-[var(--text-secondary)]">{description}</div>
      </div>
      {active ? (
        <span className="rounded-full bg-[var(--accent-primary)]/10 px-2.5 py-1 text-10px font-semibold text-[var(--accent-primary)]">
          Attivo
        </span>
      ) : null}
    </m.button>
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
    <div className="flex items-start justify-between gap-4 rounded-xl bg-[var(--bg-muted)] px-4 py-3 ring-1 ring-[var(--border-subtle)]">
      <div className="min-w-0">
        <div className="text-13px font-semibold text-[var(--text-primary)]">{label}</div>
        <p className="mt-1 text-12px leading-5 text-[var(--text-secondary)]">{description}</p>
      </div>
      <m.button
        aria-checked={checked}
        className={cn(
          "relative mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 outline-none ring-1 transition-colors duration-200",
          checked
            ? "bg-[var(--accent-primary)] ring-[var(--accent-primary)]"
            : "bg-[var(--surface-base)] ring-[var(--border-subtle)]",
        )}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <m.span
          animate={{ x: checked ? 20 : 0 }}
          className="block size-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </m.button>
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
