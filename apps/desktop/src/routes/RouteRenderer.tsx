import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { QuantaraRoute } from "@/store/app-store";

const AccountingScreen = lazy(() =>
  import("@/features/accounting/AccountingScreen").then((m) => ({ default: m.AccountingScreen })),
);
const DashboardScreen = lazy(() =>
  import("@/features/dashboard/DashboardScreen").then((m) => ({ default: m.DashboardScreen })),
);
const MaterialsScreen = lazy(() =>
  import("@/features/materials/MaterialsScreen").then((m) => ({ default: m.MaterialsScreen })),
);
const ProjectDetailScreen = lazy(() =>
  import("@/features/project-detail/ProjectDetailScreen").then((m) => ({
    default: m.ProjectDetailScreen,
  })),
);
const ProjectsScreen = lazy(() =>
  import("@/features/projects/ProjectsScreen").then((m) => ({ default: m.ProjectsScreen })),
);
const SalCreationScreen = lazy(() =>
  import("@/features/sal/SalCreationScreen").then((m) => ({ default: m.SalCreationScreen })),
);
const SettingsScreen = lazy(() =>
  import("@/features/settings/SettingsScreen").then((m) => ({ default: m.SettingsScreen })),
);
const TariffsScreen = lazy(() =>
  import("@/features/tariffs/TariffsScreen").then((m) => ({ default: m.TariffsScreen })),
);
const TeamScreen = lazy(() =>
  import("@/features/team/TeamScreen").then((m) => ({ default: m.TeamScreen })),
);
const PlaceholderScreen = lazy(() =>
  import("@/routes/PlaceholderScreen").then((m) => ({ default: m.PlaceholderScreen })),
);

type RouteRendererProps = {
  activeRoute: QuantaraRoute;
};

function ScreenSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-6 animate-pulse rounded-full bg-[var(--bg-muted-strong)]" />
    </div>
  );
}

function ScreenGuard({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<ScreenSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export function RouteRenderer({ activeRoute }: RouteRendererProps) {
  return (
    <ScreenGuard>
      {activeRoute === "dashboard" && <DashboardScreen />}
      {activeRoute === "projects" && <ProjectsScreen />}
      {activeRoute === "project-detail" && <ProjectDetailScreen />}
      {activeRoute === "sal-create" && <SalCreationScreen />}
      {activeRoute === "tariffs" && <TariffsScreen />}
      {activeRoute === "accounting" && <AccountingScreen />}
      {activeRoute === "materials" && <MaterialsScreen />}
      {activeRoute === "team" && <TeamScreen />}
      {activeRoute === "settings" && <SettingsScreen />}
      {activeRoute !== "dashboard" &&
        activeRoute !== "projects" &&
        activeRoute !== "project-detail" &&
        activeRoute !== "sal-create" &&
        activeRoute !== "tariffs" &&
        activeRoute !== "accounting" &&
        activeRoute !== "materials" &&
        activeRoute !== "team" &&
        activeRoute !== "settings" && <PlaceholderScreen title={activeRoute} />}
    </ScreenGuard>
  );
}
