import type { QuantaraRoute } from "@/store/app-store";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { PlaceholderScreen } from "@/routes/PlaceholderScreen";

type RouteRendererProps = {
  activeRoute: QuantaraRoute;
};

export function RouteRenderer({ activeRoute }: RouteRendererProps) {
  if (activeRoute === "dashboard") {
    return <DashboardScreen />;
  }

  const titles: Record<Exclude<QuantaraRoute, "dashboard">, string> = {
    accounting: "Contabilita",
    materials: "Materiali",
    projects: "Panorama progetti",
    sal: "Dettaglio SAL",
    tariffs: "Tariffari",
  };

  return <PlaceholderScreen title={titles[activeRoute]} />;
}
