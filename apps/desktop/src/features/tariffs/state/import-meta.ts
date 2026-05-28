import type { ImportFileProgress, TariffPdfMetadata } from "@/lib/desktopData";

export type ImportFile = ImportFileProgress;

export type ImportMetaState = {
  phase: "idle" | "loading" | "preview";
  previews: TariffPdfMetadata[];
  previewIndex: number;
  files: ImportFile[];
};

export const initialImportMeta: ImportMetaState = {
  phase: "idle",
  previews: [],
  previewIndex: 0,
  files: [],
};

export type ImportMetaAction =
  | { type: "START_LOADING" }
  | { type: "UPDATE_FILE"; file: ImportFile }
  | { type: "SHOW_PREVIEW"; previews: TariffPdfMetadata[] }
  | { type: "SET_PREVIEWS"; previews: TariffPdfMetadata[] }
  | { type: "SET_INDEX"; index: number }
  | { type: "SET_PHASE"; phase: ImportMetaState["phase"] }
  | { type: "CLEAR" };

export function importMetaReducer(
  state: ImportMetaState,
  action: ImportMetaAction,
): ImportMetaState {
  switch (action.type) {
    case "START_LOADING":
      return { ...state, phase: "loading", files: [] };
    case "UPDATE_FILE":
      return {
        ...state,
        files: state.files.some((file) => file.index === action.file.index)
          ? state.files.map((file) =>
              file.index === action.file.index ? { ...file, ...action.file } : file,
            )
          : [...state.files, action.file],
      };
    case "SHOW_PREVIEW":
      return { ...state, phase: "preview", previews: action.previews, previewIndex: 0 };
    case "SET_PREVIEWS":
      return { ...state, previews: action.previews };
    case "SET_INDEX":
      return { ...state, previewIndex: action.index };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "CLEAR":
      return { ...initialImportMeta };
  }
}

export function areNumberSetsEqual(left: Set<number>, right: Set<number>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function getScrollableAncestor(element: HTMLElement | null) {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const canScroll =
      /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;
    if (canScroll) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}
