import { create } from "zustand";

type SelectionMode = "page" | "all";

type SelectionStore = {
  ids: Set<string>;
  mode: SelectionMode;
  lastToggled: string | null;
  toggle: (id: string) => void;
  toggleRange: (id: string, allIds: string[]) => void;
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

  toggleRange: (id, allIds) =>
    set((state) => {
      const last = state.lastToggled;
      if (!last || !state.ids.has(last)) {
        const next = new Set(state.ids);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return { ids: next, lastToggled: id };
      }

      const startIndex = allIds.indexOf(last);
      const endIndex = allIds.indexOf(id);
      if (startIndex === -1 || endIndex === -1) {
        const next = new Set(state.ids);
        next.add(id);
        return { ids: next, lastToggled: id };
      }

      const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
      const next = new Set(state.ids);
      for (let i = from; i <= to; i++) {
        const item = allIds[i];
        if (item) next.add(item);
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
