import { create } from "zustand";

type SavedViewFilters = Record<string, string>;

type SavedView = {
  createdAt: string;
  filters: SavedViewFilters;
  id: string;
  name: string;
  route: string;
};

type SavedViewsStore = {
  deleteView: (id: string) => void;
  saveView: (name: string, route: string, filters: SavedViewFilters) => SavedView;
  views: SavedView[];
};

export const useSavedViewsStore = create<SavedViewsStore>()((set) => ({
  views: [],

  saveView: (name, route, filters) => {
    const id = `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const view: SavedView = { createdAt: new Date().toISOString(), filters, id, name, route };
    set((state) => ({ views: [view, ...state.views].slice(0, 30) }));
    return view;
  },

  deleteView: (id) => set((state) => ({ views: state.views.filter((v) => v.id !== id) })),
}));
