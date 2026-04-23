import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type QuantaraRoute =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "sal"
  | "tariffs"
  | "materials"
  | "accounting"
  | "team"
  | "settings";
export type MotionMode = "full" | "reduced";
export type ThemeMode = "light" | "dark";

type NavigationSlice = {
  activeRoute: QuantaraRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  navigateBack: () => void;
  navigateForward: () => void;
  routeHistory: QuantaraRoute[];
  routeHistoryIndex: number;
  setActiveRoute: (route: QuantaraRoute) => void;
};

type ThemeSlice = {
  setThemeMode: (themeMode: ThemeMode) => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
};

type PreferenceSlice = {
  autoCheckUpdatesOnLaunch: boolean;
  hasHydratedPreferences: boolean;
  motionMode: MotionMode;
  setAutoCheckUpdatesOnLaunch: (enabled: boolean) => void;
  setHasHydratedPreferences: (value: boolean) => void;
  setMotionMode: (motionMode: MotionMode) => void;
  setShowReleaseNotesAfterUpdate: (enabled: boolean) => void;
  showReleaseNotesAfterUpdate: boolean;
};

export type AppStore = NavigationSlice & PreferenceSlice & ThemeSlice;

const initialRouteHistory: QuantaraRoute[] = ["dashboard"];

function createNavigationState(routeHistory: QuantaraRoute[], routeHistoryIndex: number) {
  return {
    activeRoute: routeHistory[routeHistoryIndex] ?? "dashboard",
    canGoBack: routeHistoryIndex > 0,
    canGoForward: routeHistoryIndex < routeHistory.length - 1,
    routeHistory,
    routeHistoryIndex,
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...createNavigationState(initialRouteHistory, 0),
      autoCheckUpdatesOnLaunch: true,
      hasHydratedPreferences: false,
      motionMode: "full",
      navigateBack: () =>
        set((state) => {
          if (!state.canGoBack) {
            return state;
          }

          return {
            ...createNavigationState(state.routeHistory, state.routeHistoryIndex - 1),
          };
        }),
      navigateForward: () =>
        set((state) => {
          if (!state.canGoForward) {
            return state;
          }

          return {
            ...createNavigationState(state.routeHistory, state.routeHistoryIndex + 1),
          };
        }),
      setActiveRoute: (route) =>
        set((state) => {
          const currentRoute = state.routeHistory[state.routeHistoryIndex];

          if (route === currentRoute) {
            return state;
          }

          const nextHistory = state.routeHistory.slice(0, state.routeHistoryIndex + 1);
          nextHistory.push(route);

          return {
            ...createNavigationState(nextHistory, nextHistory.length - 1),
          };
        }),
      setAutoCheckUpdatesOnLaunch: (autoCheckUpdatesOnLaunch) =>
        set({
          autoCheckUpdatesOnLaunch,
        }),
      setHasHydratedPreferences: (hasHydratedPreferences) =>
        set({
          hasHydratedPreferences,
        }),
      setMotionMode: (motionMode) =>
        set({
          motionMode,
        }),
      setShowReleaseNotesAfterUpdate: (showReleaseNotesAfterUpdate) =>
        set({
          showReleaseNotesAfterUpdate,
        }),
      setThemeMode: (themeMode) =>
        set({
          themeMode,
        }),
      showReleaseNotesAfterUpdate: true,
      themeMode: "light",
      toggleTheme: () =>
        set((state) => ({
          themeMode: state.themeMode === "light" ? "dark" : "light",
        })),
    }),
    {
      name: "quantara-shell-preferences",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydratedPreferences(true);
      },
      partialize: (state) => ({
        autoCheckUpdatesOnLaunch: state.autoCheckUpdatesOnLaunch,
        motionMode: state.motionMode,
        showReleaseNotesAfterUpdate: state.showReleaseNotesAfterUpdate,
        themeMode: state.themeMode,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
