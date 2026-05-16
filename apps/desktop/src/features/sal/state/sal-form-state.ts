import type { DesktopMaterial } from "@/lib/desktopData";
import type { SalSurchargeKind } from "../domain/sal-workflow";
import type { SalEconomicRules, SalLineDraft } from "../types";
import type { SalWorkflowPhase } from "./workflow";

export const PHASE_ORDER: SalWorkflowPhase[] = [
  "context",
  "voices",
  "review",
  "confirm",
  "completed",
];

export function surchargeKindFromPercent(percent: number): SalSurchargeKind {
  return percent >= 20 ? "night" : percent > 0 ? "day" : "none";
}

export type SalFormState = {
  lines: SalLineDraft[];
  economicRules: SalEconomicRules;
  salTitle: string;
  salDate: string;
  phase: SalWorkflowPhase;
  materialUsage: Record<string, number>;
  materials: DesktopMaterial[];
};

export type SalFormAction =
  | { type: "LINES"; lines: SalLineDraft[] }
  | { type: "ECONOMIC_RULES"; economicRules: SalEconomicRules }
  | { type: "SAL_TITLE"; salTitle: string }
  | { type: "PHASE"; phase: SalWorkflowPhase }
  | { type: "MATERIAL_USAGE"; materialUsage: Record<string, number> }
  | { type: "ALL"; partial: Partial<SalFormState> };

export function salFormReducer(state: SalFormState, action: SalFormAction): SalFormState {
  switch (action.type) {
    case "LINES":
      return { ...state, lines: action.lines };
    case "ECONOMIC_RULES":
      return { ...state, economicRules: action.economicRules };
    case "SAL_TITLE":
      return { ...state, salTitle: action.salTitle };
    case "PHASE":
      return { ...state, phase: action.phase };
    case "MATERIAL_USAGE":
      return { ...state, materialUsage: action.materialUsage };
    case "ALL":
      return { ...state, ...action.partial };
  }
}
