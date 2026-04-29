import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export type QuantaraRoute =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "sal-create"
  | "tariffs"
  | "materials"
  | "accounting"
  | "team"
  | "settings";
export type MotionMode = "full" | "reduced";
export type ThemeMode = "light" | "dark";

type WorkflowAction = "new-project" | "new-sal" | "import-tariff" | null;
export type PendingWorkflowAction = WorkflowAction;

type NavigationSlice = {
  activeRoute: QuantaraRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  navigateBack: () => void;
  navigateForward: () => void;
  pendingWorkflowAction: WorkflowAction;
  routeHistory: QuantaraRoute[];
  routeHistoryIndex: number;
  setActiveRoute: (route: QuantaraRoute) => void;
  setPendingWorkflowAction: (action: WorkflowAction) => void;
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
  selectedProjectId: string;
  setAutoCheckUpdatesOnLaunch: (enabled: boolean) => void;
  setHasHydratedPreferences: (value: boolean) => void;
  setMotionMode: (motionMode: MotionMode) => void;
  setSelectedProjectId: (projectId: string) => void;
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
      selectedProjectId: "",
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
      pendingWorkflowAction: null,
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
      setPendingWorkflowAction: (pendingWorkflowAction) =>
        set({
          pendingWorkflowAction,
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
      setSelectedProjectId: (selectedProjectId) =>
        set({
          selectedProjectId,
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
        selectedProjectId: state.selectedProjectId,
        showReleaseNotesAfterUpdate: state.showReleaseNotesAfterUpdate,
        themeMode: state.themeMode,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useNavigationState() {
  return useAppStore(
    useShallow((state) => ({
      activeRoute: state.activeRoute,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      navigateBack: state.navigateBack,
      navigateForward: state.navigateForward,
      pendingWorkflowAction: state.pendingWorkflowAction,
      setActiveRoute: state.setActiveRoute,
      setPendingWorkflowAction: state.setPendingWorkflowAction,
    })),
  );
}

export function usePreferenceState() {
  return useAppStore(
    useShallow((state) => ({
      autoCheckUpdatesOnLaunch: state.autoCheckUpdatesOnLaunch,
      hasHydratedPreferences: state.hasHydratedPreferences,
      motionMode: state.motionMode,
      selectedProjectId: state.selectedProjectId,
      setAutoCheckUpdatesOnLaunch: state.setAutoCheckUpdatesOnLaunch,
      setHasHydratedPreferences: state.setHasHydratedPreferences,
      setMotionMode: state.setMotionMode,
      setSelectedProjectId: state.setSelectedProjectId,
      setShowReleaseNotesAfterUpdate: state.setShowReleaseNotesAfterUpdate,
      showReleaseNotesAfterUpdate: state.showReleaseNotesAfterUpdate,
    })),
  );
}

export function useThemeState() {
  return useAppStore(
    useShallow((state) => ({
      setThemeMode: state.setThemeMode,
      themeMode: state.themeMode,
      toggleTheme: state.toggleTheme,
    })),
  );
}
