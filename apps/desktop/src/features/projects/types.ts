import type { Money } from "@quantara/shared-types";
import type { LucideIcon } from "lucide-react";
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
  recentSal: { date: string; projectName: string; status: string; title: string } | null;
  salCount: number;
  salExposure: number;
  salWindowCount: number;
};

export type MigrationAction = "commit" | "export" | "idle" | "import" | "template";

export type PriorityItem = {
  deadline: string;
  detail: string;
  owner: string;
  projectId: string;
  title: string;
  tone: StatusTone;
};

export type ApprovalItem = {
  amount: Money;
  dueDays: number;
  label: string;
  owner: string;
  projectId: string;
  tone: StatusTone;
};

export type ControlSignal = {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: StatusTone;
  value: string;
};

export type ActivityItem = {
  detail: string;
  icon: LucideIcon;
  label: string;
  projectId: string;
  tone: StatusTone;
};

export type RecentSalItem = {
  closedAt?: string;
  date: string;
  description: string;
  id: string;
  lines: { id: string; quantity: number; surcharge: "day" | "night" | "none"; voiceId: string }[];
  notes: string;
  projectId: string;
  status: string;
  title: string;
};
