import { useAppStore } from "@/store/app-store";

export const DATA_CHANGED_EVENT = "quantara:data-changed";

export function dispatchDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  useAppStore.getState().bumpDataVersion();
}
