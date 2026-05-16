import type { DesktopMaterial } from "@/lib/desktopData";

export type StockTone = "danger" | "success" | "warning";
export type CategoryTone = "blue" | "green" | "orange" | "purple";

export const categoryColorMap: Record<string, CategoryTone> = {
  Armamento: "blue",
  Sottofondo: "orange",
  "Opere civili": "purple",
  Impianti: "green",
};

export const categoryToneLabel: Record<CategoryTone, string> = {
  blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
  green: "bg-[var(--success-soft)] text-[var(--success-base)]",
  orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  purple: "bg-[var(--bg-muted-strong)] text-[var(--accent-secondary)]",
};

export const CATEGORIES = ["Armamento", "Sottofondo", "Opere civili", "Impianti"];

export function toneForQuantity(quantity: number, minQuantity: number): StockTone {
  if (minQuantity <= 0) return "success";
  if (quantity < minQuantity) return "danger";
  if (quantity <= minQuantity * 1.5) return "warning";
  return "success";
}

export function formatQuantity(value: number, unit: string): string {
  const n = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return `${n} ${unit}`;
}

export type ScreenState = {
  searchQuery: string;
  selectedCategory: string | null;
  selectedMaterialId: string | null;
  isCreateModalOpen: boolean;
  deleteConfirmId: string | null;
};

export type ScreenAction =
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_CATEGORY"; payload: string | null }
  | { type: "SET_SELECTED_MATERIAL_ID"; payload: string | null }
  | { type: "SET_CREATE_MODAL"; payload: boolean }
  | { type: "SET_DELETE_CONFIRM_ID"; payload: string | null };

export function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SET_SELECTED_CATEGORY":
      return { ...state, selectedCategory: action.payload };
    case "SET_SELECTED_MATERIAL_ID":
      return { ...state, selectedMaterialId: action.payload };
    case "SET_CREATE_MODAL":
      return { ...state, isCreateModalOpen: action.payload };
    case "SET_DELETE_CONFIRM_ID":
      return { ...state, deleteConfirmId: action.payload };
  }
}

export type FormField = "code" | "description" | "category" | "unit" | "quantity" | "minQuantity";

export type MaterialFormState = {
  code: string;
  description: string;
  category: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  saving: boolean;
};

export type FormAction =
  | { type: "SET_FIELD"; field: FormField; value: string }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "RESET"; payload?: DesktopMaterial | null };

export function formReducer(state: MaterialFormState, action: FormAction): MaterialFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SAVING":
      return { ...state, saving: action.payload };
    case "RESET":
      return {
        code: action.payload?.code ?? "",
        description: action.payload?.description ?? "",
        category: action.payload?.category ?? "Armamento",
        unit: action.payload?.unit ?? "m",
        quantity: String(action.payload?.quantity ?? 0),
        minQuantity: String(action.payload?.minQuantity ?? 0),
        saving: false,
      };
  }
}
