import { create } from "zustand";

type SelectionMode = "page" | "all";

type SelectionStore = {
  ids: Set<string>;
  mode: SelectionMode;
  lastToggled: string | null;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  invert: (allIds: string[]) => void;
  isSelected: (id: string) => boolean;
};

export const useSelectionStore = create<SelectionStore>()((set, get) => ({
  ids: new Set<string>(),
  mode: "page",
  lastToggled: null,

  toggle: (id) =>
    set((state) => {
      const next = new Set(state.ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ids: next, lastToggled: id };
    }),

  selectAll: (ids) => set({ ids: new Set(ids), mode: "page", lastToggled: null }),

  clear: () => set({ ids: new Set<string>(), mode: "page", lastToggled: null }),

  invert: (allIds) =>
    set((state) => {
      const next = new Set<string>();
      for (const id of allIds) {
        if (!state.ids.has(id)) {
          next.add(id);
        }
      }
      return { ids: next, lastToggled: null };
    }),

  isSelected: (id) => get().ids.has(id),
}));
