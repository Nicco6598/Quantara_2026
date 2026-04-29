import { AccountingScreen } from "@/features/accounting/AccountingScreen";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { MaterialsScreen } from "@/features/materials/MaterialsScreen";
import { ProjectDetailScreen } from "@/features/project-detail/ProjectDetailScreen";
import { ProjectsScreen } from "@/features/projects/ProjectsScreen";
import { SalCreationScreen } from "@/features/sal/SalCreationScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { TariffsScreen } from "@/features/tariffs/TariffsScreen";
import { TeamScreen } from "@/features/team/TeamScreen";
import { PlaceholderScreen } from "@/routes/PlaceholderScreen";
import type { QuantaraRoute } from "@/store/app-store";

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

  if (activeRoute === "sal-create") {
    return <SalCreationScreen />;
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
    return <TeamScreen />;
  }

  if (activeRoute === "settings") {
    return <SettingsScreen />;
  }

  return <PlaceholderScreen title={activeRoute} />;
}
