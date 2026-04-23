import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { UpdateReleaseNotesDialog } from "@/components/shared/UpdateReleaseNotesDialog";
import { RouteRenderer } from "@/routes/RouteRenderer";
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
  const themeMode = useAppStore((state) => state.themeMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const { dismissPendingReleaseNotes, pendingReleaseNotes } = usePendingReleaseNotes();

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

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
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
