import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwise,
  BellRinging,
  CheckCircle,
  Clock,
  DesktopTower,
  Eye,
  EyeSlash,
  FloppyDisk,
  GitBranch,
  LockSimple,
  MagicWand,
  Palette,
  ShieldCheck,
  Sparkle,
  Trash,
  WaveSine,
  WarningCircle,
} from "@phosphor-icons/react";
import { m } from "framer-motion";
import { useCallback, useEffect, useReducer, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { APP_VERSION } from "@/generated/appVersion";
import { runAppUpdateCheck, type UpdateCheckResult } from "@/lib/appUpdater";
import {
  backupDatabase,
  type DatabaseInfo,
  getDatabaseInfo,
  isRestoreNeedsPassphrase,
  restoreDatabase,
  restoreDatabaseWithPassphrase,
} from "@/lib/backup";
import { loadThemeCSS } from "@/lib/theme-loader";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { getErrorMessage, reportUserActionError } from "@/lib/user-action-error";
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
  const {
    setThemeMode,
    themeMode,
    lightThemePref,
    darkThemePref,
    setLightThemePref,
    setDarkThemePref,
  } = useThemeState();
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

      <div className="mt-4">
        <div className="mb-3 text-13px font-semibold text-[var(--text-primary)]">
          Tema chiaro preferito
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "light-cool" as const,
              label: "Freddo",
              desc: "Teal minimal",
              previewAccent: "#2a9a8a",
            },
            {
              id: "light" as const,
              label: "Naturale",
              desc: "Neutro predefinito",
              previewAccent: "#3b7dd8",
            },
            {
              id: "light-soft" as const,
              label: "Soft",
              desc: "Rosa pastello",
              previewAccent: "#c87a9a",
            },
            {
              id: "light-warm" as const,
              label: "Caldo",
              desc: "Terra e ambra",
              previewAccent: "#c97a28",
            },
          ].map((t) => (
            <button
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-left transition-all min-w-[160px]",
                lightThemePref === t.id
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                  : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40",
              )}
              key={t.id}
              onClick={async () => {
                setLightThemePref(t.id);
                if (themeMode.startsWith("light")) {
                  await loadThemeCSS(t.id);
                  setThemeMode(t.id);
                }
              }}
              type="button"
            >
              <div className="w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-sm">
                <div className="h-2" style={{ backgroundColor: t.previewAccent }} />
                <div className="p-3">
                  <div className="mb-2 flex justify-between">
                    <div className="h-2 w-12 rounded bg-[var(--text-tertiary)]/40" />
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: t.previewAccent }}
                    />
                  </div>
                  <div className="mb-1.5 h-2.5 w-3/4 rounded bg-[var(--text-primary)]/60" />
                  <div className="mb-3 h-2 w-1/2 rounded bg-[var(--text-secondary)]/40" />
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-5 flex-1 rounded-md"
                      style={{ backgroundColor: t.previewAccent }}
                    />
                    <div className="h-5 w-5 rounded-md border border-[var(--border-subtle)]" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-13px font-bold text-[var(--text-primary)]">{t.label}</div>
                <div className="text-11px text-[var(--text-secondary)]">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 mb-3 text-13px font-semibold text-[var(--text-primary)]">
          Tema scuro preferito
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "dark" as const,
              label: "Notte",
              desc: "Blu navy scuro",
              previewAccent: "#4a8ae0",
              previewBg: "#0e1017",
              previewCard: "#161822",
              previewTextPri: "#e6e8ef",
              previewTextSec: "#a8adb8",
              previewBorder: "#30333e",
            },
            {
              id: "dark-forest" as const,
              label: "Foresta",
              desc: "Verde scuro naturale",
              previewAccent: "#4aaa6a",
              previewBg: "#0c100e",
              previewCard: "#141c18",
              previewTextPri: "#e0e8e4",
              previewTextSec: "#98a89e",
              previewBorder: "#2a322e",
            },
            {
              id: "dark-midnight" as const,
              label: "Midnight",
              desc: "Viola profondo",
              previewAccent: "#7c6ac8",
              previewBg: "#0c0b14",
              previewCard: "#141320",
              previewTextPri: "#e4e2ee",
              previewTextSec: "#a09cb8",
              previewBorder: "#2c2a42",
            },
            {
              id: "dark-amber" as const,
              label: "Ambra",
              desc: "Carbon caldo",
              previewAccent: "#d4903a",
              previewBg: "#12100c",
              previewCard: "#1c1a16",
              previewTextPri: "#e8e4de",
              previewTextSec: "#a69e94",
              previewBorder: "#32302c",
            },
          ].map((t) => (
            <button
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-left transition-all min-w-[160px]",
                darkThemePref === t.id
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                  : "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40",
              )}
              key={t.id}
              onClick={async () => {
                setDarkThemePref(t.id);
                if (themeMode.startsWith("dark")) {
                  await loadThemeCSS(t.id);
                  setThemeMode(t.id);
                }
              }}
              type="button"
            >
              <div
                className="w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-sm"
                style={{ backgroundColor: t.previewBg }}
              >
                <div className="h-2" style={{ backgroundColor: t.previewAccent }} />
                <div className="p-3" style={{ backgroundColor: t.previewCard }}>
                  <div className="mb-2 flex justify-between">
                    <div
                      className="h-2 w-12 rounded"
                      style={{ backgroundColor: t.previewTextSec }}
                    />
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: t.previewAccent }}
                    />
                  </div>
                  <div
                    className="mb-1.5 h-2.5 w-3/4 rounded"
                    style={{ backgroundColor: t.previewTextPri }}
                  />
                  <div
                    className="mb-3 h-2 w-1/2 rounded"
                    style={{ backgroundColor: t.previewTextSec }}
                  />
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-5 flex-1 rounded-md"
                      style={{ backgroundColor: t.previewAccent }}
                    />
                    <div
                      className="h-5 w-5 rounded-md border"
                      style={{ borderColor: t.previewBorder }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-13px font-bold text-[var(--text-primary)]">{t.label}</div>
                <div className="text-11px text-[var(--text-secondary)]">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
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
  dbInfoError,
  isBackupRunning,
  backupResult,
  onBackup,
  onRestore,
  passphrase,
  onPassphraseChange,
  showPassphrase,
  onTogglePassphrase,
  showPassphraseText,
  onTogglePassphraseText,
}: {
  dbInfo: DatabaseInfo | null;
  dbInfoError: string | null;
  isBackupRunning: boolean;
  backupResult: string | null;
  onBackup: () => void;
  onRestore: () => void;
  passphrase: string;
  onPassphraseChange: (value: string) => void;
  showPassphrase: boolean;
  onTogglePassphrase: () => void;
  showPassphraseText: boolean;
  onTogglePassphraseText: () => void;
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
      {dbInfoError ? <DatabaseInfoWarning message={dbInfoError} /> : null}
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
      <div className="mt-3">
        <button
          type="button"
          onClick={onTogglePassphrase}
          className="flex items-center gap-1.5 text-11px font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <LockSimple className="size-3.5" weight="bold" />
          {showPassphrase ? "Rimuovi passphrase" : "Proteggi con passphrase"}
        </button>
        {showPassphrase ? (
          <div className="mt-2">
            <div className="relative">
              <input
                type={showPassphraseText ? "text" : "password"}
                value={passphrase}
                onChange={(e) => onPassphraseChange(e.target.value)}
                placeholder="Inserisci una passphrase"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] pr-9 pl-3 py-2 text-13px text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent-base)] focus:ring-1 focus:ring-[var(--accent-base)]/30 transition-colors"
              />
              <button
                type="button"
                onClick={onTogglePassphraseText}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                tabIndex={-1}
              >
                {showPassphraseText ? (
                  <EyeSlash className="size-4" weight="bold" />
                ) : (
                  <Eye className="size-4" weight="bold" />
                )}
              </button>
            </div>
            <p className="mt-1 text-10px text-[var(--text-tertiary)]">
              Se imposti una passphrase, il backup sarà crittografato. Durante il ripristino ti
              verrà chiesta automaticamente.
            </p>
          </div>
        ) : null}
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
  dbInfoError,
  isIntegrityRunning,
  integrityResult,
  onIntegrityCheck,
}: {
  dbInfo: DatabaseInfo | null;
  dbInfoError: string | null;
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
      {dbInfoError ? <DatabaseInfoWarning message={dbInfoError} /> : null}
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

function DatabaseInfoWarning({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-12px font-medium text-[var(--warning-base)] ring-1 ring-[var(--warning-base)]/20">
      <WarningCircle className="mt-0.5 size-3.5 shrink-0" weight="bold" />
      <span>Info database non disponibile: {message}</span>
    </div>
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
  const { notify } = useToast();
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
  const [dbInfoError, setDbInfoError] = useState<string | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [showBackupPassphrase, setShowBackupPassphrase] = useState(false);
  const [restorePassphrasePath, setRestorePassphrasePath] = useState<string | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restorePassphraseError, setRestorePassphraseError] = useState<string | null>(null);
  const [showBackupPassphraseText, setShowBackupPassphraseText] = useState(false);
  const [showRestorePassphraseText, setShowRestorePassphraseText] = useState(false);

  const refreshDatabaseInfo = useCallback(
    async (action: string) => {
      try {
        const info = await getDatabaseInfo();
        setDbInfo(info);
        setDbInfoError(null);
        return info;
      } catch (error) {
        setDbInfo(null);
        setDbInfoError(getErrorMessage(error));
        reportUserActionError(error, {
          action,
          area: "settings",
          notify,
          title: "Info database non disponibile",
          userMessage: "Non sono riuscito a leggere le informazioni del database.",
        });
        return null;
      }
    },
    [notify],
  );

  useEffect(() => {
    void refreshDatabaseInfo("load-database-info");
  }, [refreshDatabaseInfo]);

  const handleCheckForUpdates = useCallback(async () => {
    dispatch({ type: "CHECK_UPDATE_START" });
    const result = await runAppUpdateCheck({ promptForInstall: true, showReleaseNotesAfterUpdate });
    dispatch({ type: "CHECK_UPDATE_DONE", state: result });
  }, [showReleaseNotesAfterUpdate]);

  const handleBackup = useCallback(async () => {
    dispatch({ type: "BACKUP_START" });
    try {
      const passphrase = backupPassphrase.trim() || undefined;
      const result = await backupDatabase(passphrase);
      dispatch({ type: "BACKUP_DONE", result });
      if (result !== "annullato") {
        await refreshDatabaseInfo("refresh-after-backup");
      }
    } catch (error) {
      dispatch({ type: "BACKUP_DONE", result: null });
      reportUserActionError(error, {
        action: "backup",
        area: "settings",
        notify,
        title: "Backup non riuscito",
        userMessage: "Non sono riuscito a creare il backup.",
      });
    }
  }, [backupPassphrase, notify, refreshDatabaseInfo]);

  const handleRestore = useCallback(async () => {
    try {
      const result = await restoreDatabase();
      if (result === "annullato") return;
      const encryptedPath = isRestoreNeedsPassphrase(result);
      if (encryptedPath) {
        setRestorePassphrasePath(encryptedPath);
        setRestorePassphrase("");
        return;
      }
      dispatch({ type: "RESTORE_DONE", result });
      await refreshDatabaseInfo("refresh-after-restore");
    } catch (error) {
      reportUserActionError(error, {
        action: "restore",
        area: "settings",
        notify,
        title: "Ripristino non riuscito",
        userMessage: "Non sono riuscito a ripristinare il database.",
      });
    }
  }, [notify, refreshDatabaseInfo]);

  const handleRestoreWithPassphrase = useCallback(async () => {
    if (!restorePassphrasePath || !restorePassphrase.trim()) return;
    setRestorePassphraseError(null);
    try {
      const result = await restoreDatabaseWithPassphrase(
        restorePassphrasePath,
        restorePassphrase.trim(),
      );
      setRestorePassphrasePath(null);
      setRestorePassphrase("");
      if (result !== "annullato") {
        dispatch({ type: "RESTORE_DONE", result });
        await refreshDatabaseInfo("refresh-after-encrypted-restore");
      }
    } catch (err) {
      setRestorePassphraseError(
        typeof err === "string" ? err : "Passphrase errata o file non valido",
      );
      reportUserActionError(err, {
        action: "encrypted-restore",
        area: "settings",
        notify,
        title: "Ripristino non riuscito",
        userMessage: "Non sono riuscito a ripristinare il backup crittografato.",
      });
    }
  }, [notify, refreshDatabaseInfo, restorePassphrasePath, restorePassphrase]);

  const handleIntegrityCheck = useCallback(async () => {
    dispatch({ type: "INTEGRITY_START" });
    await new Promise((r) => setTimeout(r, 400));
    try {
      const info = await refreshDatabaseInfo("integrity-database-info");
      if (!info) {
        dispatch({ type: "INTEGRITY_DONE", result: "Info database non disponibile" });
        return;
      }
      const checks: string[] = [];
      if (info.exists) {
        checks.push(info.sizeBytes > 0 ? "Database integro" : "Database vuoto");
        checks.push(info.sizeBytes > 1024 ? "Dimensione adeguata" : "Dimensione ridotta");
        dispatch({ type: "INTEGRITY_DONE", result: checks.join(" · ") });
      } else {
        dispatch({ type: "INTEGRITY_DONE", result: "Nessun database locale trovato" });
      }
    } catch (error) {
      reportUserActionError(error, {
        action: "integrity-check",
        area: "settings",
        notify,
        title: "Verifica non riuscita",
        userMessage: "Non sono riuscito a verificare il database.",
      });
      dispatch({ type: "INTEGRITY_DONE", result: "Verifica non riuscita" });
    }
  }, [notify, refreshDatabaseInfo]);

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
          dbInfoError={dbInfoError}
          isBackupRunning={isBackupRunning}
          backupResult={backupResult}
          onBackup={handleBackup}
          onRestore={handleRestore}
          passphrase={backupPassphrase}
          onPassphraseChange={setBackupPassphrase}
          showPassphrase={showBackupPassphrase}
          onTogglePassphrase={() => setShowBackupPassphrase((v) => !v)}
          showPassphraseText={showBackupPassphraseText}
          onTogglePassphraseText={() => setShowBackupPassphraseText((v) => !v)}
        />
        <IntegrityCheckCard
          dbInfo={dbInfo}
          dbInfoError={dbInfoError}
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

      <Dialog
        isOpen={!!restorePassphrasePath}
        onClose={() => {
          setRestorePassphrasePath(null);
          setRestorePassphraseError(null);
        }}
        title="Backup crittografato"
      >
        <p className="mt-3 text-13px leading-5 text-[var(--text-secondary)]">
          Il file di backup selezionato è protetto da passphrase. Inseriscila per ripristinare i
          dati.
        </p>
        <div className="relative mt-4">
          <input
            type={showRestorePassphraseText ? "text" : "password"}
            value={restorePassphrase}
            onChange={(e) => {
              setRestorePassphrase(e.target.value);
              setRestorePassphraseError(null);
            }}
            placeholder="Passphrase"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] pr-9 pl-3 py-2 text-13px text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent-base)] focus:ring-1 focus:ring-[var(--accent-base)]/30 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && restorePassphrase.trim()) handleRestoreWithPassphrase();
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowRestorePassphraseText((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            tabIndex={-1}
          >
            {showRestorePassphraseText ? (
              <EyeSlash className="size-4" weight="bold" />
            ) : (
              <Eye className="size-4" weight="bold" />
            )}
          </button>
        </div>
        {restorePassphraseError ? (
          <p className="mt-2 text-12px font-medium text-[var(--danger-base)]">
            {restorePassphraseError}
          </p>
        ) : null}
        <DialogActions>
          <Button
            variant="ghost"
            onClick={() => {
              setRestorePassphrasePath(null);
              setRestorePassphraseError(null);
            }}
          >
            Annulla
          </Button>
          <Button
            variant="primary"
            disabled={!restorePassphrase.trim()}
            onClick={handleRestoreWithPassphrase}
          >
            Ripristina
          </Button>
        </DialogActions>
      </Dialog>
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
        "group flex min-h-14 items-center gap-3 rounded-xl p-2.5 text-left outline-none ring-1 transition-all duration-[var(--duration-fast)]",
        active
          ? "bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] ring-[color-mix(in_srgb,var(--accent-primary)_34%,transparent)]"
          : "bg-[var(--bg-muted)] ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full transition-all duration-[var(--duration-fast)]",
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
          "relative mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 outline-none ring-1 transition-colors duration-[var(--duration-fast)]",
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
          className="block size-5 rounded-full bg-[var(--surface-raised)] shadow-soft"
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
