import type { QuantaraRoute } from "@/store/app-store";
import { AccountingScreen } from "@/features/accounting/AccountingScreen";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { MaterialsScreen } from "@/features/materials/MaterialsScreen";
import { ProjectsScreen } from "@/features/projects/ProjectsScreen";
import { ProjectDetailScreen } from "@/features/project-detail/ProjectDetailScreen";
import { SalScreen } from "@/features/sal/SalScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { TariffsScreen } from "@/features/tariffs/TariffsScreen";
import { PlaceholderScreen } from "@/routes/PlaceholderScreen";

type RouteRendererProps = {
  activeRoute: QuantaraRoute;
};

export function RouteRenderer({ activeRoute }: RouteRendererProps) {
  if (activeRoute === "dashboard") {
    return <DashboardScreen />;
  }

  if (activeRoute === "projects") {
    return <ProjectsScreen />;
  }

  if (activeRoute === "project-detail") {
    return <ProjectDetailScreen />;
  }

  if (activeRoute === "sal") {
    return <SalScreen />;
  }

  if (activeRoute === "tariffs") {
    return <TariffsScreen />;
  }

  if (activeRoute === "accounting") {
    return <AccountingScreen />;
  }

  if (activeRoute === "materials") {
    return <MaterialsScreen />;
  }

  if (activeRoute === "team") {
    return <PlaceholderScreen title="Team" />;
  }

  if (activeRoute === "settings") {
    return <SettingsScreen />;
  }

  return <PlaceholderScreen title={activeRoute} />;
}
