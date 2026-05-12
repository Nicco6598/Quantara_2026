import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export type QuantaraRoute =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "project-create"
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

export type TariffImportToolbarState = {
  activeIndex: number;
  activeDrafted: boolean;
  activeReviewed: boolean;
  canConfirm: boolean;
  draftedCount: number;
  fileLabels: string[];
  phase: "idle" | "preview";
  reviewedCount: number;
  reviewedVoiceCount: number;
  totalVoices: number;
};

export type SalToolbarState = {
  budgetResidual: number;
  discountAmount: number;
  lineCount: number;
  salTitle: string;
  total: number;
  voicesCount: number;
};

export type ProjectToolbarState = {
  currentStep: number;
  canGoNext: boolean;
  canSubmit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  error: string;
  totalSteps: number;
};

type NavEntry = {
  route: QuantaraRoute;
  context?: string;
};

type NavigationSlice = {
  activeContext: string | undefined;
  activeRoute: QuantaraRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateToHistoryIndex: (index: number) => void;
  pendingWorkflowAction: WorkflowAction;
  projectToolbar: ProjectToolbarState;
  projectPendingStep: number | null;
  routeHistory: NavEntry[];
  routeHistoryIndex: number;
  salToolbar: SalToolbarState;
  salPendingStep: number | null;
  setSalToolbar: (state: SalToolbarState) => void;
  setProjectToolbar: (state: ProjectToolbarState) => void;
  setProjectPendingStep: (step: number | null) => void;
  setTariffImportToolbar: (state: TariffImportToolbarState) => void;
  setActiveRoute: (route: QuantaraRoute, context?: string, replace?: boolean) => void;
  setPendingWorkflowAction: (action: WorkflowAction) => void;
  setSalPendingStep: (step: number | null) => void;
  tariffImportToolbar: TariffImportToolbarState;
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
  salCurrentStep: number;
  selectedProjectId: string;
  setAutoCheckUpdatesOnLaunch: (enabled: boolean) => void;
  setHasHydratedPreferences: (value: boolean) => void;
  setMotionMode: (motionMode: MotionMode) => void;
  setSalCurrentStep: (step: number) => void;
  setSelectedProjectId: (projectId: string) => void;
  setShowReleaseNotesAfterUpdate: (enabled: boolean) => void;
  showReleaseNotesAfterUpdate: boolean;
};

export type AppStore = NavigationSlice & PreferenceSlice & ThemeSlice;

const initialRouteHistory: NavEntry[] = [{ route: "dashboard" }];

function createNavigationState(routeHistory: NavEntry[], routeHistoryIndex: number) {
  const entry = routeHistory[routeHistoryIndex];
  return {
    activeContext: entry?.context,
    activeRoute: entry?.route ?? "dashboard",
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
      salCurrentStep: 1,
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
      navigateToHistoryIndex: (index) =>
        set((state) => {
          if (
            index < 0 ||
            index >= state.routeHistory.length ||
            index === state.routeHistoryIndex
          ) {
            return state;
          }

          return {
            ...createNavigationState(state.routeHistory, index),
          };
        }),
      pendingWorkflowAction: null,
      projectPendingStep: null,
      projectToolbar: {
        canGoNext: false,
        canSubmit: false,
        currentStep: 1,
        error: "",
        isEditing: false,
        isSaving: false,
        totalSteps: 2,
      },
      salPendingStep: null,
      salToolbar: {
        budgetResidual: 0,
        discountAmount: 0,
        lineCount: 0,
        salTitle: "Nuovo SAL",
        total: 0,
        voicesCount: 0,
      },
      tariffImportToolbar: {
        activeIndex: 0,
        activeDrafted: false,
        activeReviewed: false,
        canConfirm: false,
        draftedCount: 0,
        fileLabels: [],
        phase: "idle",
        reviewedCount: 0,
        reviewedVoiceCount: 0,
        totalVoices: 0,
      },
      setActiveRoute: (route, context, replace) =>
        set((state) => {
          const currentEntry = state.routeHistory[state.routeHistoryIndex];

          if (route === currentEntry?.route && context === currentEntry?.context) {
            return state;
          }

          if (replace) {
            const nextHistory = state.routeHistory.slice(0, state.routeHistoryIndex);
            nextHistory.push(context !== undefined ? { route, context } : { route });
            return {
              ...createNavigationState(nextHistory, nextHistory.length - 1),
            };
          }

          const nextHistory = state.routeHistory.slice(0, state.routeHistoryIndex + 1);
          nextHistory.push(context !== undefined ? { route, context } : { route });

          return {
            ...createNavigationState(nextHistory, nextHistory.length - 1),
          };
        }),
      setPendingWorkflowAction: (pendingWorkflowAction) =>
        set({
          pendingWorkflowAction,
        }),
      setProjectPendingStep: (projectPendingStep) =>
        set({
          projectPendingStep,
        }),
      setProjectToolbar: (projectToolbar) =>
        set({
          projectToolbar,
        }),
      setSalPendingStep: (salPendingStep) =>
        set({
          salPendingStep,
        }),
      setSalToolbar: (salToolbar) =>
        set({
          salToolbar,
        }),
      setTariffImportToolbar: (tariffImportToolbar) =>
        set({
          tariffImportToolbar,
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
      setSalCurrentStep: (salCurrentStep) =>
        set({
          salCurrentStep,
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
        salCurrentStep: state.salCurrentStep,
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
      activeContext: state.activeContext,
      activeRoute: state.activeRoute,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      navigateBack: state.navigateBack,
      navigateForward: state.navigateForward,
      navigateToHistoryIndex: state.navigateToHistoryIndex,
      pendingWorkflowAction: state.pendingWorkflowAction,
      projectToolbar: state.projectToolbar,
      routeHistory: state.routeHistory,
      routeHistoryIndex: state.routeHistoryIndex,
      setActiveRoute: state.setActiveRoute,
      setPendingWorkflowAction: state.setPendingWorkflowAction,
      setProjectToolbar: state.setProjectToolbar,
      salToolbar: state.salToolbar,
      setSalToolbar: state.setSalToolbar,
      setTariffImportToolbar: state.setTariffImportToolbar,
      tariffImportToolbar: state.tariffImportToolbar,
    })),
  );
}

export function usePreferenceState() {
  return useAppStore(
    useShallow((state) => ({
      autoCheckUpdatesOnLaunch: state.autoCheckUpdatesOnLaunch,
      hasHydratedPreferences: state.hasHydratedPreferences,
      motionMode: state.motionMode,
      salCurrentStep: state.salCurrentStep,
      selectedProjectId: state.selectedProjectId,
      setAutoCheckUpdatesOnLaunch: state.setAutoCheckUpdatesOnLaunch,
      setHasHydratedPreferences: state.setHasHydratedPreferences,
      setMotionMode: state.setMotionMode,
      setSalCurrentStep: state.setSalCurrentStep,
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
