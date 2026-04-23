import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { UpdateReleaseNotesDialog } from "@/components/shared/UpdateReleaseNotesDialog";
import { RouteRenderer } from "@/routes/RouteRenderer";
import { usePendingReleaseNotes } from "@/lib/updateReleaseNotes";
import { useAppStore } from "@/store/app-store";
import { useAutomaticUpdater } from "@/lib/useAutomaticUpdater";

export function App() {
  useAutomaticUpdater();
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setActiveRoute = useAppStore((state) => state.setActiveRoute);
  const themeMode = useAppStore((state) => state.themeMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const { dismissPendingReleaseNotes, pendingReleaseNotes } = usePendingReleaseNotes();

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setActiveRoute(customEvent.detail as typeof activeRoute);
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
        <TopToolbar activeRoute={activeRoute} onToggleTheme={toggleTheme} themeMode={themeMode} />
        <RouteRenderer activeRoute={activeRoute} />
      </div>
    </div>
  );
}
