import type { Money } from "@quantara/shared-types";
import type { StatusTone } from "@/components/shared/StatusBadge";

export type LaneTone = Extract<StatusTone, "success" | "warning" | "danger">;

export type PortfolioFocus = "all" | "critical" | "sal";

export type PortfolioProject = {
  budget: Money;
  contractor: string;
  forecastDeltaDays: number;
  healthLabel: string;
  id: string;
  location: string;
  lot: string;
  manager: string;
  materialRisk: string;
  nextMilestone: string;
  phase: string;
  progress: number;
  salDays: number;
  salState: string;
  salValue: Money;
  title: string;
  tone: LaneTone;
  variance: string;
};

export type ContractorFolder = {
  budget: number;
  contractor: string;
  criticalCount: number;
  id: string;
  projectCount: number;
  salCount: number;
  salExposure: number;
  salWindowCount: number;
};
