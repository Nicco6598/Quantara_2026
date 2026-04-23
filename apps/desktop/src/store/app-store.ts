import { create } from "zustand";

export type QuantaraRoute =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "sal"
  | "tariffs"
  | "materials"
  | "accounting";
export type ThemeMode = "light" | "dark";

type NavigationSlice = {
  activeRoute: QuantaraRoute;
  setActiveRoute: (route: QuantaraRoute) => void;
};

type ThemeSlice = {
  themeMode: ThemeMode;
  toggleTheme: () => void;
};

export type AppStore = NavigationSlice & ThemeSlice;

export const useAppStore = create<AppStore>((set) => ({
  activeRoute: "dashboard",
  setActiveRoute: (route) => set({ activeRoute: route }),
  themeMode: "light",
  toggleTheme: () =>
    set((state) => ({
      themeMode: state.themeMode === "light" ? "dark" : "light",
    })),
}));
