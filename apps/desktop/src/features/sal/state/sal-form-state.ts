import type { DesktopMaterial } from "@/lib/desktopData";
import type { SalSurchargeKind } from "../domain/sal-workflow";
import type { SalEconomicRules, SalLineDraft, SalMeasurementRowDraft } from "../types";
import type { SalWorkflowPhase } from "./workflow";

export const PHASE_ORDER: SalWorkflowPhase[] = [
  "project",
  "measure",
  "verify",
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
  | { type: "ALL"; partial: Partial<SalFormState> }
  | { type: "ADD_MEASUREMENT_ROW"; lineId: string; row: SalMeasurementRowDraft }
  | { type: "REMOVE_MEASUREMENT_ROW"; lineId: string; measurementId: string }
  | {
      type: "DUPLICATE_MEASUREMENT_ROW";
      lineId: string;
      measurementId: string;
      newRow: SalMeasurementRowDraft;
    }
  | {
      type: "UPDATE_MEASUREMENT_ROW";
      lineId: string;
      measurementId: string;
      updates: Partial<SalMeasurementRowDraft>;
    };

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
    case "ADD_MEASUREMENT_ROW":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId
            ? { ...l, measurementRows: [...l.measurementRows, action.row] }
            : l,
        ),
      };
    case "REMOVE_MEASUREMENT_ROW":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId
            ? {
                ...l,
                measurementRows: l.measurementRows.filter((r) => r.id !== action.measurementId),
              }
            : l,
        ),
      };
    case "DUPLICATE_MEASUREMENT_ROW":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId
            ? { ...l, measurementRows: [...l.measurementRows, action.newRow] }
            : l,
        ),
      };
    case "UPDATE_MEASUREMENT_ROW":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.lineId
            ? {
                ...l,
                measurementRows: l.measurementRows.map((r) =>
                  r.id === action.measurementId ? { ...r, ...action.updates } : r,
                ),
              }
            : l,
        ),
      };
  }
}
