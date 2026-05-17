import { create } from "zustand";

type UndoEntry = {
  label: string;
  execute: () => void;
  undo: () => void;
  timestamp: string;
};

const MAX_HISTORY = 15;

type UndoStore = {
  history: UndoEntry[];
  index: number;
  push: (entry: Omit<UndoEntry, "timestamp">) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export const useUndoStore = create<UndoStore>()((set, get) => ({
  history: [],
  index: -1,

  push: (entry) =>
    set((state) => {
      const newEntry: UndoEntry = { ...entry, timestamp: new Date().toISOString() };
      const newHistory = [...state.history.slice(0, state.index + 1), newEntry].slice(-MAX_HISTORY);
      return { history: newHistory, index: newHistory.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.index < 0) return state;
      const entry = state.history[state.index];
      if (!entry) return state;
      entry.undo();
      return { index: state.index - 1 };
    }),

  redo: () =>
    set((state) => {
      if (state.index >= state.history.length - 1) return state;
      const nextIndex = state.index + 1;
      const entry = state.history[nextIndex];
      if (!entry) return state;
      entry.execute();
      return { index: nextIndex };
    }),

  clear: () => set({ history: [], index: -1 }),

  canUndo: () => get().index >= 0,

  canRedo: () => get().index < get().history.length - 1,
}));
