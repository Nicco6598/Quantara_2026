import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { UpdateExperienceDialog } from "@/components/shared/UpdateExperienceDialog";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { UpdateReleaseNotesDialog } from "@/components/shared/UpdateReleaseNotesDialog";
import { RouteRenderer } from "@/routes/RouteRenderer";
import {
  APP_UPDATE_AVAILABLE_EVENT,
  dismissPendingAppUpdate,
  installPendingAppUpdate,
  type AvailableAppUpdate,
  type UpdateInstallState,
} from "@/lib/appUpdater";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { useAppStore, type QuantaraRoute } from "@/store/app-store";
import { useAutomaticUpdater } from "@/lib/useAutomaticUpdater";

export function App() {
  useAutomaticUpdater();
  const activeRoute = useAppStore((state) => state.activeRoute);
  const canGoBack = useAppStore((state) => state.canGoBack);
  const canGoForward = useAppStore((state) => state.canGoForward);
  const navigateBack = useAppStore((state) => state.navigateBack);
  const navigateForward = useAppStore((state) => state.navigateForward);
  const setActiveRoute = useAppStore((state) => state.setActiveRoute);
  const motionMode = useAppStore((state) => state.motionMode);
  const showReleaseNotesAfterUpdate = useAppStore((state) => state.showReleaseNotesAfterUpdate);
  const themeMode = useAppStore((state) => state.themeMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const { dismissPendingReleaseNotes, pendingReleaseNotes } = usePendingReleaseNotes();
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

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<QuantaraRoute>;
      setActiveRoute(customEvent.detail);
    };
    window.addEventListener("navigate", handleNavigate);
    return () => window.removeEventListener("navigate", handleNavigate);
  }, [setActiveRoute]);

  useEffect(() => {
    const handleTopbarAction = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "new-project") {
        setActiveRoute("projects");
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("project-workflow-action", { detail: "new-project" }),
          );
        }, 0);
      }

      if (customEvent.detail === "new-sal") {
        setActiveRoute("sal");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("sal-workflow-action", { detail: "new-sal" }));
        }, 0);
      }

      if (customEvent.detail === "import-tariff") {
        setActiveRoute("tariffs");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("tariff-workflow-action", { detail: "import" }));
        }, 0);
      }
    };

    window.addEventListener("topbar-action", handleTopbarAction);
    return () => window.removeEventListener("topbar-action", handleTopbarAction);
  }, [setActiveRoute]);

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
    <div className="app-aura relative flex h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
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
      <AppSidebar activeRoute={activeRoute} onRouteChange={setActiveRoute} />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <TopToolbar
          activeRoute={activeRoute}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onNavigateBack={navigateBack}
          onNavigateForward={navigateForward}
          onToggleTheme={toggleTheme}
          themeMode={themeMode}
        />
        <RouteRenderer activeRoute={activeRoute} />
      </div>
    </div>
  );
}
