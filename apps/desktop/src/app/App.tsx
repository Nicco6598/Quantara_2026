import {
  ArrowsClockwise,
  CaretDown,
  MagnifyingGlass,
  Moon,
  SidebarSimple,
  SunDim,
} from "@phosphor-icons/react";
import { domAnimation, LazyMotion } from "framer-motion";
import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ShortcutHelpDialog } from "@/components/shared/ShortcutHelpDialog";
import { ToastProvider, useToast } from "@/components/shared/ToastProvider";
import { UpdateExperienceDialog } from "@/components/shared/UpdateExperienceDialog";
import { UpdateReleaseNotesDialog } from "@/components/shared/UpdateReleaseNotesDialog";
import { useUndoKeyboardShortcuts } from "@/hooks/use-undo-keyboard-shortcuts";
import { useActionHandler } from "@/hooks/useAction";
import { useGlobalEscapeListener } from "@/hooks/useEscapeStack";
import { useNavigate } from "@/hooks/useNavigate";
import type { AppAction } from "@/lib/action-registry";
import { actionRegistry } from "@/lib/action-registry";
import {
  APP_UPDATE_AVAILABLE_EVENT,
  type AvailableAppUpdate,
  dismissPendingAppUpdate,
  installPendingAppUpdate,
  runAppUpdateCheck,
  type UpdateInstallState,
} from "@/lib/appUpdater";
import { migrateLegacyContractorsToDb } from "@/lib/contractorMigration";
import { loadThemeCSS, resolveThemeName } from "@/lib/theme-loader";
import { storePendingReleaseNotes, usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { useAutomaticUpdater } from "@/lib/useAutomaticUpdater";
import { RouteRenderer } from "@/routes/RouteRenderer";
import {
  type QuantaraRoute,
  useAppShellNavigationState,
  useAppStore,
  usePreferenceState,
  useThemeState,
} from "@/store/app-store";

type TitlebarRoute = { label: string; route: QuantaraRoute; section: string };
type WindowFrameVariant = "frameless" | "macos" | "windows";
type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

const TITLEBAR_ROUTES: [TitlebarRoute, ...TitlebarRoute[]] = [
  { label: "Dashboard", route: "dashboard", section: "Operazioni" },
  { label: "Appaltatori", route: "projects", section: "Progetti" },
  { label: "Tariffario", route: "tariffs", section: "Dati" },
  { label: "Materiali", route: "materials", section: "Magazzino" },
  { label: "Contabilità", route: "accounting", section: "Gestione" },
  { label: "Team", route: "team", section: "Organizzazione" },
  { label: "Impostazioni", route: "settings", section: "Sistema" },
];

function detectWindowFrameVariant(): WindowFrameVariant {
  if (typeof navigator === "undefined") return "frameless";

  const platform = `${navigator.platform} ${navigator.userAgent}`.toLowerCase();
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";
  return "frameless";
}

function ThemeApplier() {
  const { themeMode } = useThemeState();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      const state = useAppStore.getState();
      const resolved = resolveThemeName(state.themeMode);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved.startsWith("dark") ? "dark" : "light";
      void loadThemeCSS(resolved);
      return;
    }

    const resolved = resolveThemeName(themeMode);
    const isDark = resolved.startsWith("dark");
    void loadThemeCSS(resolved).then(() => {
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    });
  }, [themeMode]);

  return null;
}

function StartupMigrations() {
  useEffect(() => {
    void migrateLegacyContractorsToDb();
  }, []);

  return null;
}

function WindowTitleBar({
  activeRoute,
  isFullscreen,
  isSidebarCollapsed,
  variant,
  onCheckUpdates,
  onOpenCommandPalette,
  onRouteChange,
  onToggleSidebar,
  closeRouteMenuKey,
}: {
  activeRoute: QuantaraRoute;
  isFullscreen: boolean;
  isSidebarCollapsed: boolean;
  variant: WindowFrameVariant;
  onCheckUpdates: () => void;
  onOpenCommandPalette: (anchorRect: DOMRect) => void;
  onRouteChange: (route: QuantaraRoute, context?: string) => void;
  onToggleSidebar: () => void;
  closeRouteMenuKey: number;
}) {
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const commandButtonRef = useRef<HTMLButtonElement>(null);
  const { themeMode, toggleTheme } = useThemeState();
  const activeRouteItem =
    TITLEBAR_ROUTES.find((item) => item.route === activeRoute) ?? TITLEBAR_ROUTES[0];

  useEffect(() => {
    setIsRouteMenuOpen(false);
    void closeRouteMenuKey;
  }, [closeRouteMenuKey]);

  const isMacOs = variant === "macos";
  const isWindows = variant === "windows";
  const isFrameless = variant === "frameless";

  return (
    <div
      className={
        isMacOs
          ? "window-titlebar window-titlebar-macos"
          : isWindows
            ? "window-titlebar window-titlebar-windows"
            : "window-titlebar"
      }
      data-fullscreen={isFullscreen && isMacOs ? "" : undefined}
    >
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
                className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
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
            setIsRouteMenuOpen(false);
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
          onClick={async (event) => {
            event.stopPropagation();
            const state = useAppStore.getState();
            const nextMode = state.themeMode.startsWith("light")
              ? state.darkThemePref
              : state.lightThemePref;
            await loadThemeCSS(nextMode);
            toggleTheme();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title="Cambia tema"
          type="button"
        >
          {themeMode.startsWith("dark") ? (
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

      {isFrameless || isWindows ? <FramelessWindowControls /> : null}
    </div>
  );
}

function FramelessWindowControls() {
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
    <div className="window-titlebar-controls">
      <button
        aria-label="Minimizza finestra"
        className="window-titlebar-button window-titlebar-button-minimize"
        onClick={(event) => {
          event.stopPropagation();
          void handleWindowAction("minimize");
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        <span aria-hidden="true" className="window-titlebar-minimize-mark" />
      </button>
      <button
        aria-label="Massimizza finestra"
        className="window-titlebar-button window-titlebar-button-maximize"
        onClick={(event) => {
          event.stopPropagation();
          void handleWindowAction("maximize");
        }}
        onMouseDown={(event) => event.stopPropagation()}
        type="button"
      >
        <span aria-hidden="true" className="window-titlebar-maximize-mark" />
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
        <span aria-hidden="true" className="window-titlebar-close-mark" />
      </button>
    </div>
  );
}

function WindowResizeHandles() {
  const startResize = useCallback(async (direction: ResizeDirection) => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startResizeDragging(direction);
  }, []);

  const handles: Array<{ className: string; direction: ResizeDirection }> = [
    { className: "window-resize-handle window-resize-handle-n", direction: "North" },
    { className: "window-resize-handle window-resize-handle-e", direction: "East" },
    { className: "window-resize-handle window-resize-handle-s", direction: "South" },
    { className: "window-resize-handle window-resize-handle-w", direction: "West" },
    { className: "window-resize-handle window-resize-handle-ne", direction: "NorthEast" },
    { className: "window-resize-handle window-resize-handle-nw", direction: "NorthWest" },
    { className: "window-resize-handle window-resize-handle-se", direction: "SouthEast" },
    { className: "window-resize-handle window-resize-handle-sw", direction: "SouthWest" },
  ];

  return (
    <>
      {handles.map((handle) => (
        <div
          aria-hidden="true"
          className={handle.className}
          key={handle.direction}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            void startResize(handle.direction);
          }}
        />
      ))}
    </>
  );
}

type CommandState = {
  isCommandPaletteOpen: boolean;
  commandPaletteAnchor: DOMRect | null;
  isShortcutHelpOpen: boolean;
};

type CommandAction =
  | { type: "OPEN_PALETTE"; anchor: DOMRect | null }
  | { type: "CLOSE_PALETTE" }
  | { type: "OPEN_SHORTCUT_HELP" }
  | { type: "CLOSE_SHORTCUT_HELP" }
  | { type: "CLOSE_ALL" };

function commandReducer(state: CommandState, action: CommandAction): CommandState {
  switch (action.type) {
    case "OPEN_PALETTE":
      return { ...state, isCommandPaletteOpen: true, commandPaletteAnchor: action.anchor };
    case "CLOSE_PALETTE":
      return { ...state, isCommandPaletteOpen: false, commandPaletteAnchor: null };
    case "OPEN_SHORTCUT_HELP":
      return { ...state, isShortcutHelpOpen: true };
    case "CLOSE_SHORTCUT_HELP":
      return { ...state, isShortcutHelpOpen: false };
    case "CLOSE_ALL":
      return {
        ...state,
        isCommandPaletteOpen: false,
        isShortcutHelpOpen: false,
        commandPaletteAnchor: null,
      };
  }
}

type UpdateState = {
  available: AvailableAppUpdate | null;
  install: UpdateInstallState | { message: string; phase: "error" } | { phase: "idle" };
};

function TitleBarSection({
  activeRoute,
  isSidebarCollapsed,
  onCheckUpdates,
  onOpenCommandPalette,
  onRouteChange,
  onToggleSidebar,
  closeRouteMenuKey,
}: {
  activeRoute: QuantaraRoute;
  isSidebarCollapsed: boolean;
  onCheckUpdates: () => void;
  onOpenCommandPalette: (anchorRect: DOMRect) => void;
  onRouteChange: (route: QuantaraRoute, context?: string) => void;
  onToggleSidebar: () => void;
  closeRouteMenuKey: number;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [frameVariant, setFrameVariant] = useState<WindowFrameVariant>(detectWindowFrameVariant);

  useEffect(() => {
    const nextVariant = detectWindowFrameVariant();
    setFrameVariant(nextVariant);
    document.documentElement.dataset.windowFrame = nextVariant;

    return () => {
      delete document.documentElement.dataset.windowFrame;
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      if (!("__TAURI_INTERNALS__" in window)) return;

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();

      const update = async () => {
        setIsFullscreen(await appWindow.isFullscreen());
      };

      await update();
      unlisten = await appWindow.onResized(update);
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <WindowTitleBar
      activeRoute={activeRoute}
      isFullscreen={isFullscreen}
      isSidebarCollapsed={isSidebarCollapsed}
      variant={frameVariant}
      onCheckUpdates={onCheckUpdates}
      onOpenCommandPalette={onOpenCommandPalette}
      onRouteChange={onRouteChange}
      onToggleSidebar={onToggleSidebar}
      closeRouteMenuKey={closeRouteMenuKey}
    />
  );
}

function topbarActionToAppAction(actionId: string): AppAction | null {
  if (actionId === "sal-save-draft") return { type: "sal.saveDraft" };
  if (actionId === "sal-confirm") return { type: "sal.confirm" };
  if (actionId.startsWith("sal-goto-step-")) {
    const step = Number.parseInt(actionId.replace("sal-goto-step-", ""), 10);
    if (step >= 1 && step <= 4) return { type: "sal.gotoStep", step };
    return null;
  }
  if (actionId === "project-submit") return { type: "project.submit" };
  if (actionId.startsWith("project-goto-step-")) {
    const step = Number.parseInt(actionId.replace("project-goto-step-", ""), 10);
    if (step >= 1 && step <= 2) return { type: "project.gotoStep", step };
    return null;
  }
  if (actionId === "tariff-import-select-") return { type: "tariff.preview.select", index: 0 };
  if (actionId.startsWith("tariff-import-select-")) {
    const index = Number.parseInt(actionId.replace("tariff-import-select-", ""), 10);
    if (Number.isInteger(index)) return { type: "tariff.preview.select", index };
    return null;
  }
  if (actionId === "tariff-import-save-draft") return { type: "tariff.draft.save" };
  if (actionId === "tariff-import-confirm") return { type: "tariff.draft.confirm" };
  if (actionId === "tariff-import-toggle-reviewed") return { type: "tariff.draft.toggleReviewed" };
  if (actionId === "tariff-import-delete-file") return { type: "tariff.draft.deleteFile" };
  if (actionId === "check-updates") return { type: "update.check" };
  return null;
}

export function App() {
  return (
    <LazyMotion features={domAnimation}>
      <ToastProvider>
        <ThemeApplier />
        <StartupMigrations />
        <AppShell />
      </ToastProvider>
    </LazyMotion>
  );
}

function AppShell() {
  useAutomaticUpdater();

  const { activeRoute, canGoBack, canGoForward, navigateBack, navigateForward } =
    useAppShellNavigationState();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { motionMode, showReleaseNotesAfterUpdate } = usePreferenceState();
  const { dismissPendingReleaseNotes, pendingReleaseNotes, refresh } = usePendingReleaseNotes();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [closeRouteMenuKey, setCloseRouteMenuKey] = useState(0);

  const [commandState, dispatchCommand] = useReducer(commandReducer, {
    isCommandPaletteOpen: false,
    commandPaletteAnchor: null,
    isShortcutHelpOpen: false,
  });

  const [updateState, setUpdateState] = useState<UpdateState>({
    available: null,
    install: { phase: "idle" },
  });

  useEffect(() => {
    document.documentElement.dataset.motion = motionMode;
  }, [motionMode]);

  useGlobalEscapeListener();
  useUndoKeyboardShortcuts();

  useActionHandler(
    "sal.gotoStep",
    useCallback((action) => {
      if (action.type === "sal.gotoStep" && action.step >= 1 && action.step <= 4) {
        useAppStore.getState().setSalPendingStep(action.step);
      }
    }, []),
  );

  useActionHandler(
    "project.gotoStep",
    useCallback((action) => {
      if (action.type === "project.gotoStep" && (action.step === 1 || action.step === 2)) {
        useAppStore.getState().setProjectPendingStep(action.step);
      }
    }, []),
  );

  useActionHandler(
    "update.check",
    useCallback(() => {
      notify({
        message: "Verifica aggiornamenti in corso...",
        sound: "none",
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
          setUpdateState({
            available: result,
            install: { phase: "idle" },
          });
          notify({
            actionLabel: "Apri dettagli",
            message: `${result.version} disponibile per installazione.`,
            onAction: () => {
              setUpdateState({
                available: result,
                install: { phase: "idle" },
              });
            },
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
    }, [notify]),
  );

  const handleTopbarAction = useCallback(
    (actionId: string) => {
      if (actionId === "new-project") {
        useAppStore.getState().setPendingWorkflowAction("new-project");
        navigate("projects");
        notify({
          message: "Aperta la creazione guidata del progetto.",
          sound: "none",
          title: "Nuovo progetto",
          tone: "success",
        });
        return;
      }

      if (actionId === "new-sal") {
        useAppStore.getState().setPendingWorkflowAction("new-sal");
        navigate("sal-create");
        notify({
          message: "Aperta la creazione guidata del SAL.",
          sound: "none",
          title: "Nuovo SAL",
          tone: "success",
        });
        return;
      }

      if (actionId === "import-tariff") {
        useAppStore.getState().setPendingWorkflowAction("import-tariff");
        navigate("tariffs");
        notify({
          message: "Pronta la schermata di importazione tariffario.",
          sound: "none",
          title: "Import tariffario",
          tone: "info",
        });
        return;
      }

      if (actionId === "notifications") {
        notify({
          message: "Pannello notifiche in arrivo con una delle prossime release.",
          sound: "none",
          title: "Notifiche",
          tone: "info",
        });
        return;
      }

      const mapped = topbarActionToAppAction(actionId);
      if (mapped) {
        actionRegistry.dispatch(mapped);
      }
    },
    [navigate, notify],
  );

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable === true;
    const key = event.key.toLowerCase();

    if (import.meta.env.DEV && event.ctrlKey && event.shiftKey && key === "u") {
      event.preventDefault();
      setUpdateState({
        available: {
          checkedAt: new Date().toISOString(),
          currentVersion: "0.2.6",
          notes: `## 0.3.1 — 2026-05-15

### SAL — bozze e tariffari
- **Tariffari persi ripristinati** — quando una SAL salvata in bozza veniva riaperta i tariffari selezionati andavano persi, causando la scomparsa di righe e importi. Ora la bozza ripristina esattamente i tariffari originali.

### Ricerca voci — prestazioni e design
- **Ricerca voci virtualizzata** — il dropdown renderizza solo le righe visibili. Con migliaia di voci la digitazione resta fluida e lo scrolling istantaneo.
- **Dropdown sempre nel viewport** — overlay fisso sotto il campo di ricerca, 520px massimi, mai tagliato.

### Temi e contrasti
- **Contrasti WCAG AA su tutti gli 8 temi** — \`text-tertiary\` ricalibrato su ogni tema per superare 4.5:1.
- **Bordi e sfondi più leggibili** — \`border-subtle\` e \`bg-muted\` con contrasto migliorato.
- **Logo adattivo al tema** — invertito sui temi scuri con filtro CSS.

### Popup di aggiornamento — struttura ad albero
- **Changelog navigabile** — note di rilascio in albero, rami collassabili al click.
- **Post-update visibile anche su Windows** — \`localStorage\` come storage primario, attraversa il riavvio su tutti i sistemi.

## 0.3.0 — 2026-05-14

### Materiali in magazzino
- **Nuovo cruscotto materiali** — stock, impegno in SAL e soglia critica con barra rossa.
- **Si scalano dall'inventario** — materiali scalati alla conferma SAL, ripristinati se cancelli.

### 8 temi, non solo chiaro/scuro
- **4 temi chiari** — Naturale, Caldo, Freddo, Soft. **4 temi scuri** — Notte, Ambra, Midnight, Foresta.
- **Scegli i tuoi due preferiti** — in Impostazioni scegli tema chiaro e scuro, alterni con un click dalla titlebar.

### Cosa abbiamo sistemato
- **Campi che non si lasciavano scrivere** — click su campi funzionante in finestre creazione.
- **Materiali fantasma** — cancellazione multipla ora elimina davvero.
- **Stati SAL fermi** — cambiando stato di una SAL tutte le schermate si aggiornano.
- **Dati non allineati tra schermate** — ora tutto si aggiorna da solo.`,
          version: "0.3.1",
        },
        install: { phase: "idle" },
      });
      return;
    }

    if (import.meta.env.DEV && event.ctrlKey && event.shiftKey && key === "i") {
      event.preventDefault();
      storePendingReleaseNotes({
        body: `## 0.3.1 — 2026-05-15

### SAL — bozze e tariffari
- **Tariffari persi ripristinati** — quando una SAL salvata in bozza veniva riaperta i tariffari selezionati andavano persi. Ora la bozza ripristina esattamente i tariffari originali.

### Ricerca voci — prestazioni e design
- **Ricerca voci virtualizzata** — il dropdown renderizza solo le righe visibili.

### Popup di aggiornamento — struttura ad albero
- **Changelog navigabile** — note di rilascio in albero, rami collassabili al click.
- **Post-update visibile anche su Windows** — localStorage come storage primario.`,
        currentVersion: "0.3.0",
        installedAt: new Date().toISOString(),
        version: "0.3.1",
      });
      refresh();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      setCloseRouteMenuKey((k) => k + 1);
      const searchTrigger = document.querySelector<HTMLButtonElement>(
        "[data-command-palette-anchor]",
      );
      dispatchCommand({
        type: "OPEN_PALETTE",
        anchor: searchTrigger?.getBoundingClientRect() ?? null,
      });
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "/" &&
      !commandState.isCommandPaletteOpen
    ) {
      event.preventDefault();
      dispatchCommand({ type: "OPEN_SHORTCUT_HELP" });
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
        commandState.isCommandPaletteOpen ||
        commandState.isShortcutHelpOpen ||
        updateState.available !== null ||
        pendingReleaseNotes !== null;
      if (!isAnyModalOpen && canGoBack && !isTyping) {
        event.preventDefault();
        navigateBack();
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUpdateAvailable = useEffectEvent((event: Event) => {
    const customEvent = event as CustomEvent<AvailableAppUpdate>;
    setUpdateState({
      available: customEvent.detail,
      install: { phase: "idle" },
    });
  });

  useEffect(() => {
    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
    return () => window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
  }, []);

  const handleCloseUpdater = () => {
    if (updateState.install.phase === "downloading" || updateState.install.phase === "installing") {
      return;
    }

    dismissPendingAppUpdate();
    setUpdateState({
      available: null,
      install: { phase: "idle" },
    });
  };

  const handleInstallUpdate = async () => {
    setUpdateState((prev) => ({
      ...prev,
      install: { phase: "installing" as const },
    }));

    try {
      await installPendingAppUpdate({
        onStateChange: (install) => {
          setUpdateState((prev) => ({ ...prev, install }));
        },
        showReleaseNotesAfterUpdate,
      });
    } catch (error) {
      setUpdateState((prev) => ({
        ...prev,
        install: {
          message:
            error instanceof Error
              ? error.message
              : "Installazione update non completata correttamente.",
          phase: "error" as const,
        },
      }));
    }
  };

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((current) => !current), []);
  const windowFrameVariant = detectWindowFrameVariant();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(max-width: 899px)");
    const syncSidebarForViewport = () => {
      if (media.matches) {
        setIsSidebarCollapsed(true);
      }
    };

    syncSidebarForViewport();
    media.addEventListener("change", syncSidebarForViewport);
    return () => media.removeEventListener("change", syncSidebarForViewport);
  }, []);

  return (
    <div
      className="app-window-frame relative flex h-screen overflow-hidden bg-[var(--bg-app-accent)] [font-family:var(--font-sans)] text-[var(--text-primary)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <TitleBarSection
        activeRoute={activeRoute}
        isSidebarCollapsed={isSidebarCollapsed}
        onCheckUpdates={() => handleTopbarAction("check-updates")}
        onOpenCommandPalette={(anchorRect) => {
          dispatchCommand({ type: "OPEN_PALETTE", anchor: anchorRect });
        }}
        onRouteChange={navigate}
        onToggleSidebar={toggleSidebar}
        closeRouteMenuKey={closeRouteMenuKey}
      />
      {windowFrameVariant !== "macos" ? <WindowResizeHandles /> : null}

      {updateState.available ? (
        <UpdateExperienceDialog
          installState={updateState.install}
          onClose={handleCloseUpdater}
          onInstall={handleInstallUpdate}
          update={updateState.available}
        />
      ) : null}

      {pendingReleaseNotes ? (
        <UpdateReleaseNotesDialog
          notes={pendingReleaseNotes}
          onClose={dismissPendingReleaseNotes}
        />
      ) : null}

      <CommandPalette
        anchorRect={commandState.commandPaletteAnchor}
        isOpen={commandState.isCommandPaletteOpen}
        onClose={() => dispatchCommand({ type: "CLOSE_PALETTE" })}
        onPageAction={handleTopbarAction}
        onRouteChange={navigate}
      />

      {commandState.isShortcutHelpOpen ? (
        <ShortcutHelpDialog onClose={() => dispatchCommand({ type: "CLOSE_SHORTCUT_HELP" })} />
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8">
              <RouteRenderer activeRoute={activeRoute} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
