import type { QuantaraRoute } from "@/store/app-store";
import { AccountingScreen } from "@/features/accounting/AccountingScreen";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { MaterialsScreen } from "@/features/materials/MaterialsScreen";
import { ProjectsScreen } from "@/features/projects/ProjectsScreen";
import { SalScreen } from "@/features/sal/SalScreen";
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

  return <PlaceholderScreen title={activeRoute} />;
}
