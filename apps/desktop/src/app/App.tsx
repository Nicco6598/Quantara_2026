import {
  ArrowsClockwise,
  CaretDown,
  MagnifyingGlass,
  Minus,
  Moon,
  SidebarSimple,
  Square,
  SunDim,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ShortcutHelpDialog } from "@/components/shared/ShortcutHelpDialog";
import { ToastProvider, useToast } from "@/components/shared/ToastProvider";
import { UpdateExperienceDialog } from "@/components/shared/UpdateExperienceDialog";
import { UpdateReleaseNotesDialog } from "@/components/shared/UpdateReleaseNotesDialog";
import { useGlobalEscapeListener } from "@/hooks/useEscapeStack";
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
  type QuantaraRoute,
  useAppStore,
  useNavigationState,
  usePreferenceState,
  useThemeState,
} from "@/store/app-store";

type TitlebarRoute = { label: string; route: QuantaraRoute; section: string };

const TITLEBAR_ROUTES: [TitlebarRoute, ...TitlebarRoute[]] = [
  { label: "Dashboard", route: "dashboard", section: "Operazioni" },
  { label: "Appaltatori", route: "projects", section: "Progetti" },
  { label: "Tariffario", route: "tariffs", section: "Dati" },
  { label: "Materiali", route: "materials", section: "Magazzino" },
  { label: "Contabilità", route: "accounting", section: "Gestione" },
  { label: "Team", route: "team", section: "Organizzazione" },
  { label: "Impostazioni", route: "settings", section: "Sistema" },
];

function ThemeApplier() {
  useEffect(() => {
    const state = useAppStore.getState();
    document.documentElement.dataset.theme = state.themeMode;
    document.documentElement.style.colorScheme = state.themeMode === "dark" ? "dark" : "light";

    const unsub = useAppStore.subscribe((current, prev) => {
      if (current.themeMode === prev.themeMode) return;
      document.documentElement.dataset.theme = current.themeMode;
      document.documentElement.style.colorScheme = current.themeMode === "dark" ? "dark" : "light";
    });

    return unsub;
  }, []);

  return null;
}

function WindowTitleBar({
  activeRoute,
  isSidebarCollapsed,
  onCheckUpdates,
  onOpenCommandPalette,
  onRouteChange,
  onToggleSidebar,
}: {
  activeRoute: QuantaraRoute;
  isSidebarCollapsed: boolean;
  onCheckUpdates: () => void;
  onOpenCommandPalette: (anchorRect: DOMRect) => void;
  onRouteChange: (route: QuantaraRoute) => void;
  onToggleSidebar: () => void;
}) {
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const { themeMode, toggleTheme } = useThemeState();
  const activeRouteItem =
    TITLEBAR_ROUTES.find((item) => item.route === activeRoute) ?? TITLEBAR_ROUTES[0];

  const handleWindowAction = useCallback(async (action: "close" | "maximize" | "minimize") => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const currentWindow = getCurrentWindow();

    if (action === "minimize") {
      await currentWindow.minimize();
      return;
    }

    if (action === "maximize") {
      await currentWindow.toggleMaximize();
      return;
    }

    await currentWindow.close();
  }, []);

  return (
    <div className="window-titlebar">
      <div className="window-titlebar-drag-strip" data-tauri-drag-region />
      <div className="window-titlebar-left">
        <button
          aria-label={isSidebarCollapsed ? "Espandi sidebar" : "Compatta sidebar"}
          className="window-titlebar-tool"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSidebar();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title={isSidebarCollapsed ? "Espandi sidebar" : "Compatta sidebar"}
          type="button"
        >
          <SidebarSimple
            className={isSidebarCollapsed ? "rotate-180" : undefined}
            size={15}
            weight="regular"
          />
        </button>

        <div className="window-titlebar-brand" data-tauri-drag-region>
          <span className="window-titlebar-mark" data-tauri-drag-region />
          <span data-tauri-drag-region>Quantara</span>
          <span className="window-titlebar-separator" data-tauri-drag-region />
          <span className="window-titlebar-subtitle" data-tauri-drag-region>
            Construction Suite
          </span>
        </div>
      </div>

      <div className="window-titlebar-center">
        <div className="window-titlebar-route-picker">
          <button
            aria-expanded={isRouteMenuOpen}
            className="window-titlebar-route-trigger"
            onClick={(event) => {
              event.stopPropagation();
              setIsRouteMenuOpen((current) => !current);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            title="Cambia sezione"
            type="button"
          >
            <span className="window-titlebar-route-section">{activeRouteItem.section}</span>
            <span className="window-titlebar-route-label">{activeRouteItem.label}</span>
            <CaretDown
              className={isRouteMenuOpen ? "rotate-180" : undefined}
              size={9}
              weight="bold"
            />
          </button>

          {isRouteMenuOpen ? (
            <>
              <button
                aria-label="Chiudi cambio sezione"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsRouteMenuOpen(false)}
                onMouseDown={(event) => event.stopPropagation()}
                type="button"
              />
              <div className="window-titlebar-route-menu">
                {TITLEBAR_ROUTES.map((item) => {
                  const isActive = item.route === activeRoute;
                  return (
                    <button
                      className="window-titlebar-route-item"
                      disabled={isActive}
                      key={item.route}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRouteChange(item.route);
                        setIsRouteMenuOpen(false);
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      <span>{item.label}</span>
                      <span>{item.section}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        <button
          className="window-titlebar-command"
          data-command-palette-anchor
          onClick={(event) => {
            event.stopPropagation();
            const anchorRect = commandButtonRef.current?.getBoundingClientRect();
            if (anchorRect) {
              onOpenCommandPalette(anchorRect);
            }
          }}
          onMouseDown={(event) => event.stopPropagation()}
          ref={commandButtonRef}
          title="Apri comandi"
          type="button"
        >
          <MagnifyingGlass size={13} weight="regular" />
          <span>Comandi</span>
          <kbd>Ctrl K</kbd>
        </button>

        <button
          className="window-titlebar-tool"
          onClick={(event) => {
            event.stopPropagation();
            toggleTheme();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title={themeMode === "light" ? "Modo scuro" : "Modo chiaro"}
          type="button"
        >
          {themeMode === "light" ? (
            <SunDim size={14} weight="regular" />
          ) : (
            <Moon size={14} weight="regular" />
          )}
        </button>

        <button
          className="window-titlebar-tool"
          onClick={(event) => {
            event.stopPropagation();
            onCheckUpdates();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title="Controlla aggiornamenti"
          type="button"
        >
          <ArrowsClockwise size={14} weight="regular" />
        </button>
      </div>

      <div className="window-titlebar-controls">
        <button
          aria-label="Minimizza finestra"
          className="window-titlebar-button"
          onClick={(event) => {
            event.stopPropagation();
            void handleWindowAction("minimize");
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          <Minus size={13} weight="bold" />
        </button>
        <button
          aria-label="Massimizza finestra"
          className="window-titlebar-button"
          onClick={(event) => {
            event.stopPropagation();
            void handleWindowAction("maximize");
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          <Square size={11} weight="bold" />
        </button>
        <button
          aria-label="Chiudi finestra"
          className="window-titlebar-button window-titlebar-button-danger"
          onClick={(event) => {
            event.stopPropagation();
            void handleWindowAction("close");
          }}
          onMouseDown={(event) => event.stopPropagation()}
          type="button"
        >
          <X size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <ThemeApplier />
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
  const { dismissPendingReleaseNotes, pendingReleaseNotes } = usePendingReleaseNotes();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    document.documentElement.dataset.motion = motionMode;
  }, [motionMode]);

  useGlobalEscapeListener();

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

      if (actionId.startsWith("sal-goto-step-")) {
        const step = Number.parseInt(actionId.replace("sal-goto-step-", ""), 10);
        if (step >= 1 && step <= 4) {
          useAppStore.getState().setSalPendingStep(step);
        }
        return;
      }

      if (actionId.startsWith("tariff-import-")) {
        window.dispatchEvent(new CustomEvent("tariff-preview-action", { detail: actionId }));
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

      if (event.key === "Escape") {
        const isAnyModalOpen =
          isCommandPaletteOpen ||
          isShortcutHelpOpen ||
          availableUpdate !== null ||
          pendingReleaseNotes !== null;
        if (!isAnyModalOpen && canGoBack && !isTyping) {
          event.preventDefault();
          navigateBack();
        }
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
    pendingReleaseNotes,
    isShortcutHelpOpen,
    availableUpdate,
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

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((current) => !current), []);

  return (
    <div
      className="app-window-frame relative flex h-screen overflow-hidden bg-[var(--bg-app-accent)] [font-family:var(--font-sans)] text-[var(--text-primary)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <WindowTitleBar
        activeRoute={activeRoute}
        isSidebarCollapsed={isSidebarCollapsed}
        onCheckUpdates={() => handleTopbarAction("check-updates")}
        onOpenCommandPalette={(anchorRect) => {
          setCommandPaletteAnchor(anchorRect);
          setIsCommandPaletteOpen(true);
        }}
        onRouteChange={navigate}
        onToggleSidebar={toggleSidebar}
      />

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
      />

      {isShortcutHelpOpen ? (
        <ShortcutHelpDialog onClose={() => setIsShortcutHelpOpen(false)} />
      ) : null}

      <AppSidebar
        activeRoute={activeRoute}
        collapsed={isSidebarCollapsed}
        onRouteChange={navigate}
      />

      <main className="min-w-0 flex-1 overflow-hidden p-0">
        <section className="main-content-shell flex h-full min-w-0 overflow-hidden rounded-l-[28px] rounded-r-none bg-[var(--surface-base)]">
          <div className="flex min-w-0 flex-1 flex-col">
            <TopToolbar onPageAction={handleTopbarAction} />

            <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8">
              <RouteRenderer activeRoute={activeRoute} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
