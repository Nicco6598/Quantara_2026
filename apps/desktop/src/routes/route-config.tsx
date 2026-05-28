import { type ComponentType, lazy } from "react";
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
const ProjectCreateScreen = lazy(() =>
  import("@/features/projects/screens/ProjectCreateScreen").then((m) => ({
    default: m.ProjectCreateScreen,
  })),
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

export const routeScreens = {
  accounting: AccountingScreen,
  dashboard: DashboardScreen,
  materials: MaterialsScreen,
  "project-create": ProjectCreateScreen,
  "project-detail": ProjectDetailScreen,
  projects: ProjectsScreen,
  "sal-create": SalCreationScreen,
  settings: SettingsScreen,
  tariffs: TariffsScreen,
  team: TeamScreen,
} as const satisfies Record<QuantaraRoute, ComponentType>;
