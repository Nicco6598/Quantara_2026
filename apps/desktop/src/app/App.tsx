import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ShortcutHelpDialog } from "@/components/shared/ShortcutHelpDialog";
import { ToastProvider, useToast } from "@/components/shared/ToastProvider";
import { UpdateExperienceDialog } from "@/components/shared/UpdateExperienceDialog";
import { UpdateReleaseNotesDialog } from "@/components/shared/UpdateReleaseNotesDialog";
import { useNavigate } from "@/hooks/useNavigate";
import {
  APP_UPDATE_AVAILABLE_EVENT,
  type AvailableAppUpdate,
  dismissPendingAppUpdate,
  installPendingAppUpdate,
  runAppUpdateCheck,
  type UpdateInstallState,
} from "@/lib/appUpdater";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { useAutomaticUpdater } from "@/lib/useAutomaticUpdater";
import { RouteRenderer } from "@/routes/RouteRenderer";
import {
  useAppStore,
  useNavigationState,
  usePreferenceState,
  useThemeState,
} from "@/store/app-store";

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
  useAutomaticUpdater();

  const { activeRoute, canGoBack, canGoForward, navigateBack, navigateForward } =
    useNavigationState();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { motionMode, showReleaseNotesAfterUpdate } = usePreferenceState();
  const { themeMode, toggleTheme } = useThemeState();
  const { dismissPendingReleaseNotes, pendingReleaseNotes } = usePendingReleaseNotes();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteAnchor, setCommandPaletteAnchor] = useState<DOMRect | null>(null);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);
  const [installState, setInstallState] = useState<
    UpdateInstallState | { message: string; phase: "error" } | { phase: "idle" }
  >({
    phase: "idle",
  });

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode === "dark" ? "dark" : "light";
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionMode;
  }, [motionMode]);

  const handleTopbarAction = useCallback(
    (actionId: string) => {
      if (actionId === "new-project") {
        navigate("projects");
        window.setTimeout(() => {
          useAppStore.getState().setPendingWorkflowAction("new-project");
        }, 0);
        notify({
          message: "Aperta la creazione guidata del progetto.",
          title: "Nuovo progetto",
          tone: "success",
        });
        return;
      }

      if (actionId === "new-sal") {
        if (activeRoute !== "projects") {
          navigate("projects");
        }
        window.setTimeout(() => {
          useAppStore.getState().setPendingWorkflowAction("new-sal");
        }, 0);
        notify({
          message: "Aperta la creazione guidata del SAL.",
          title: "Nuovo SAL",
          tone: "success",
        });
        return;
      }

      if (actionId === "import-tariff") {
        navigate("tariffs");
        window.setTimeout(() => {
          useAppStore.getState().setPendingWorkflowAction("import-tariff");
        }, 0);
        notify({
          message: "Pronta la schermata di importazione tariffario.",
          title: "Import tariffario",
          tone: "info",
        });
        return;
      }

      if (actionId === "notifications") {
        notify({
          message: "Pannello notifiche in arrivo con una delle prossime release.",
          title: "Notifiche",
          tone: "info",
        });
        return;
      }

      if (actionId === "check-updates") {
        notify({
          message: "Verifica aggiornamenti in corso...",
          title: "Aggiornamenti",
          tone: "info",
        });
        runAppUpdateCheck({ promptForInstall: false }).then((result) => {
          if (result.kind === "up-to-date") {
            notify({
              message: "Build allineata all'ultima release disponibile.",
              title: "Aggiornato",
              tone: "success",
            });
          } else if (result.kind === "available") {
            notify({
              message: `${result.version} disponibile per installazione.`,
              title: "Nuova release",
              tone: "warning",
            });
          } else if (result.kind === "error" || result.kind === "unsupported") {
            notify({
              message: result.message,
              title: "Controllo non riuscito",
              tone: "danger",
            });
          }
        });
        return;
      }
    },
    [activeRoute, navigate, notify],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      const key = event.key.toLowerCase();

      if (import.meta.env.DEV && event.ctrlKey && event.shiftKey && key === "u") {
        event.preventDefault();
        setAvailableUpdate({
          checkedAt: new Date().toISOString(),
          currentVersion: "0.1.43",
          notes: [
            "Rework update modal theme-aware per tema chiaro e scuro.",
            "Command palette agganciata alla searchbar della topbar.",
            "Dashboard e dettaglio progetto collegati ai dati reali disponibili.",
          ].join("\n"),
          version: "0.1.44",
        });
        setInstallState({
          phase: "idle",
        });
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        const searchTrigger = document.querySelector<HTMLButtonElement>(
          "[data-command-palette-anchor]",
        );
        setCommandPaletteAnchor(searchTrigger?.getBoundingClientRect() ?? null);
        setIsCommandPaletteOpen(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "/" && !isCommandPaletteOpen) {
        event.preventDefault();
        setIsShortcutHelpOpen(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "n") {
        event.preventDefault();
        handleTopbarAction("new-project");
        return;
      }

      if (event.altKey && event.key === "ArrowLeft" && canGoBack && !isTyping) {
        event.preventDefault();
        navigateBack();
        return;
      }

      if (event.altKey && event.key === "ArrowRight" && canGoForward && !isTyping) {
        event.preventDefault();
        navigateForward();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoBack,
    canGoForward,
    handleTopbarAction,
    isCommandPaletteOpen,
    navigateBack,
    navigateForward,
  ]);

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent<AvailableAppUpdate>;
      setAvailableUpdate(customEvent.detail);
      setInstallState({
        phase: "idle",
      });
    };

    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
    return () => window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
  }, []);

  const handleCloseUpdater = () => {
    if (installState.phase === "downloading" || installState.phase === "installing") {
      return;
    }

    dismissPendingAppUpdate();
    setAvailableUpdate(null);
    setInstallState({
      phase: "idle",
    });
  };

  const handleInstallUpdate = async () => {
    setInstallState({
      phase: "installing",
    });

    try {
      await installPendingAppUpdate({
        onStateChange: setInstallState,
        showReleaseNotesAfterUpdate,
      });
    } catch (error) {
      setInstallState({
        message:
          error instanceof Error
            ? error.message
            : "Installazione update non completata correttamente.",
        phase: "error",
      });
    }
  };

  return (
    <div
      className="relative flex h-screen overflow-hidden bg-[var(--bg-app-accent)] [font-family:var(--font-sans)] text-[var(--text-primary)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {availableUpdate ? (
        <UpdateExperienceDialog
          installState={installState}
          onClose={handleCloseUpdater}
          onInstall={handleInstallUpdate}
          update={availableUpdate}
        />
      ) : null}

      {pendingReleaseNotes ? (
        <UpdateReleaseNotesDialog
          notes={pendingReleaseNotes}
          onClose={dismissPendingReleaseNotes}
        />
      ) : null}

      <CommandPalette
        anchorRect={commandPaletteAnchor}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onPageAction={handleTopbarAction}
        onRouteChange={navigate}
        onToggleTheme={toggleTheme}
        themeMode={themeMode}
      />

      {isShortcutHelpOpen ? (
        <ShortcutHelpDialog onClose={() => setIsShortcutHelpOpen(false)} />
      ) : null}

      <AppSidebar activeRoute={activeRoute} onRouteChange={navigate} />

      <main className="min-w-0 flex-1 overflow-hidden p-0">
        <section className="main-content-shell flex h-full min-w-0 overflow-hidden rounded-l-[28px] rounded-r-none bg-[var(--surface-base)]">
          <div className="flex min-w-0 flex-1 flex-col">
            <TopToolbar
              onOpenCommandPalette={(anchorRect) => {
                setCommandPaletteAnchor(anchorRect);
                setIsCommandPaletteOpen(true);
              }}
              onPageAction={handleTopbarAction}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
              <RouteRenderer activeRoute={activeRoute} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
