import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { RouteRenderer } from "@/routes/RouteRenderer";
import { useAppStore } from "@/store/app-store";

export function App() {
  const activeRoute = useAppStore((state) => state.activeRoute);
  const setActiveRoute = useAppStore((state) => state.setActiveRoute);
  const themeMode = useAppStore((state) => state.themeMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar activeRoute={activeRoute} onRouteChange={setActiveRoute} />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <TopToolbar activeRoute={activeRoute} onToggleTheme={toggleTheme} themeMode={themeMode} />
        <RouteRenderer activeRoute={activeRoute} />
      </div>
    </div>
  );
}
