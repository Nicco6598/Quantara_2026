import { CaretRight } from "@phosphor-icons/react";
import { type QuantaraRoute, useNavigationState } from "@/store/app-store";

const ROUTE_LABELS: Record<QuantaraRoute, string> = {
  accounting: "Contabilità",
  dashboard: "Panoramica",
  materials: "Materiali",
  "project-detail": "Dettaglio",
  projects: "Appaltatori",
  "sal-create": "SAL",
  settings: "Impostazioni",
  tariffs: "Tariffario",
  team: "Team",
};

const ROUTE_SECTIONS: Record<QuantaraRoute, string> = {
  accounting: "Gestione",
  dashboard: "Operazioni",
  materials: "Magazzino",
  "project-detail": "Progetti",
  projects: "Progetti",
  "sal-create": "Produzione",
  settings: "Sistema",
  tariffs: "Dati",
  team: "Organizzazione",
};

export function Breadcrumbs() {
  const { activeContext, activeRoute } = useNavigationState();
  const section = ROUTE_SECTIONS[activeRoute];
  const label = activeContext ?? ROUTE_LABELS[activeRoute];

  return (
    <nav aria-label="Posizione corrente" className="breadcrumb-rail">
      <span className="breadcrumb-section">{section}</span>
      <CaretRight className="breadcrumb-separator" size={10} weight="bold" />
      <span className="breadcrumb-current">{label}</span>
    </nav>
  );
}
