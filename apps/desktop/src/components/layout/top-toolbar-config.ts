import { Briefcase, FileText, Plus, UploadSimple } from "@phosphor-icons/react";
import type { QuantaraRoute } from "@/store/app-store";

export type RouteMeta = {
  dateLabel: string;
  title: string;
};

export type PageAction = {
  actionId: string;
  hasDropdown?: boolean;
  label: string;
  mark: string;
  menuItems?: PageActionMenuItem[];
  variant: "outline" | "primary";
};

export type PageActionMenuItem = {
  actionId: string;
  description: string;
  label: string;
  mark: string;
};

export const routeMetaMap: Record<QuantaraRoute, RouteMeta> = {
  accounting: { dateLabel: "", title: "Contabilità" },
  dashboard: { dateLabel: "", title: "Panoramica operativa" },
  materials: { dateLabel: "", title: "Materiali" },
  "project-create": { dateLabel: "", title: "Nuovo progetto" },
  "project-detail": { dateLabel: "", title: "Dettaglio progetto" },
  projects: { dateLabel: "", title: "Progetti" },
  "sal-create": { dateLabel: "", title: "Nuova SAL" },
  settings: { dateLabel: "", title: "Impostazioni" },
  tariffs: { dateLabel: "", title: "Tariffario" },
  team: { dateLabel: "", title: "Team" },
};

const createMenuItems: PageActionMenuItem[] = [
  {
    actionId: "new-project",
    description: "Crea contratto, importo e tariffario principale",
    label: "Progetto",
    mark: "PR",
  },
  {
    actionId: "new-sal",
    description: "Apri la creazione guidata di uno stato avanzamento",
    label: "SAL",
    mark: "+",
  },
  {
    actionId: "import-tariff",
    description: "Importa o prepara un tariffario da PDF",
    label: "Tariffario",
    mark: "TF",
  },
];

export const commonPageActions: PageAction[] = [
  {
    actionId: "new",
    hasDropdown: true,
    label: "Nuovo",
    mark: "+",
    menuItems: createMenuItems,
    variant: "primary",
  },
];

export const routeActionOverrides: Partial<Record<QuantaraRoute, PageAction[]>> = {
  tariffs: [{ actionId: "import-tariff", label: "Importa", mark: "UP", variant: "primary" }],
};

export const markIconMap: Record<string, React.ElementType> = {
  "+": Plus,
  PR: Briefcase,
  TF: FileText,
  UP: UploadSimple,
};
