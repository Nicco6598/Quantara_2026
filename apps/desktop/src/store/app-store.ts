import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { createSafeLocalStorage } from "@/lib/safe-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

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
type MotionMode = "full" | "reduced";
type ThemeMode =
  | "light"
  | "light-warm"
  | "light-cool"
  | "light-soft"
  | "dark"
  | "dark-amber"
  | "dark-midnight"
  | "dark-forest";
type LightThemePref = "light" | "light-warm" | "light-cool" | "light-soft";
type DarkThemePref = "dark" | "dark-amber" | "dark-midnight" | "dark-forest";

type WorkflowAction = "new-project" | "new-sal" | "import-tariff" | null;
export type PendingWorkflowAction = WorkflowAction;

type TariffImportToolbarState = {
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

type SalToolbarState = {
  autoSaveLastSaved: string | null;
  autoSaveStatus: "idle" | "saving" | "saved" | "error" | "unsaved";
  budgetResidual: number;
  discountAmount: number;
  lineCount: number;
  salTitle: string;
  total: number;
  voicesCount: number;
};

type ProjectToolbarState = {
  autoSaveLastSaved: string | null;
  autoSaveStatus: "idle" | "saving" | "saved" | "error" | "unsaved";
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

function areTariffImportToolbarsEqual(
  left: TariffImportToolbarState,
  right: TariffImportToolbarState,
) {
  return (
    left.activeIndex === right.activeIndex &&
    left.activeDrafted === right.activeDrafted &&
    left.activeReviewed === right.activeReviewed &&
    left.canConfirm === right.canConfirm &&
    left.draftedCount === right.draftedCount &&
    left.phase === right.phase &&
    left.reviewedCount === right.reviewedCount &&
    left.reviewedVoiceCount === right.reviewedVoiceCount &&
    left.totalVoices === right.totalVoices &&
    left.fileLabels.length === right.fileLabels.length &&
    left.fileLabels.every((label, index) => label === right.fileLabels[index])
  );
}

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
  lightThemePref: LightThemePref;
  darkThemePref: DarkThemePref;
  setLightThemePref: (pref: LightThemePref) => void;
  setDarkThemePref: (pref: DarkThemePref) => void;
};

type PreferenceSlice = {
  autoCheckUpdatesOnLaunch: boolean;
  bumpDataVersion: () => void;
  dataVersion: number;
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

export type WorkspaceMemberRole =
  | "owner"
  | "admin"
  | "project_manager"
  | "engineer"
  | "accountant"
  | "viewer";

export type WorkspaceMemberStatus = "active" | "invited" | "disabled";

export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  lastAccessAt?: string;
  avatar?: string;
};

export type TeamSlice = {
  members: WorkspaceMember[];
  loading: boolean;
  setMembers: (members: WorkspaceMember[]) => void;
  addMember: (member: WorkspaceMember) => void;
  updateMember: (id: string, updates: Partial<WorkspaceMember>) => void;
  removeMember: (id: string) => void;
};

export type AppStore = NavigationSlice & PreferenceSlice & ThemeSlice & TeamSlice;

const initialRouteHistory: NavEntry[] = [{ route: "dashboard" }];

const seedMembers: WorkspaceMember[] = [
  {
    id: "1",
    name: "Marco Bianchi",
    email: "marco.bianchi@azienda.it",
    role: "owner",
    status: "active",
    lastAccessAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Laura Rossi",
    email: "laura.rossi@azienda.it",
    role: "admin",
    status: "active",
    lastAccessAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    name: "Giuseppe Verdi",
    email: "giuseppe.verdi@azienda.it",
    role: "project_manager",
    status: "active",
    lastAccessAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    name: "Anna Neri",
    email: "anna.neri@azienda.it",
    role: "engineer",
    status: "active",
    lastAccessAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "5",
    name: "Paolo Gialli",
    email: "paolo.gialli@azienda.it",
    role: "accountant",
    status: "active",
    lastAccessAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

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
      bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
      dataVersion: 0,
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
        autoSaveLastSaved: null,
        autoSaveStatus: "idle",
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
        autoSaveLastSaved: null,
        autoSaveStatus: "idle",
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
      members: seedMembers,
      loading: false,
      setMembers: (members) => set({ members }),
      addMember: (member) => set((state) => ({ members: [...state.members, member] })),
      updateMember: (id, updates) =>
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      removeMember: (id) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        })),
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

          const MAX_HISTORY = 100;
          if (nextHistory.length > MAX_HISTORY) {
            nextHistory.splice(0, nextHistory.length - MAX_HISTORY);
          }

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
        set((state) => {
          if (areTariffImportToolbarsEqual(state.tariffImportToolbar, tariffImportToolbar)) {
            return state;
          }

          return { tariffImportToolbar };
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
      lightThemePref: "light",
      darkThemePref: "dark",
      toggleTheme: () =>
        set((state) => {
          const currentIsLight =
            state.themeMode === "light" ||
            state.themeMode === "light-warm" ||
            state.themeMode === "light-cool" ||
            state.themeMode === "light-soft";
          return {
            themeMode: currentIsLight ? state.darkThemePref : state.lightThemePref,
          };
        }),
      setLightThemePref: (lightThemePref) =>
        set({
          lightThemePref,
        }),
      setDarkThemePref: (darkThemePref) =>
        set({
          darkThemePref,
        }),
    }),
    {
      name: STORAGE_KEYS.shellPreferences,
      version: 1,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydratedPreferences(true);
      },
      partialize: (state) => ({
        autoCheckUpdatesOnLaunch: state.autoCheckUpdatesOnLaunch,
        dataVersion: state.dataVersion,
        motionMode: state.motionMode,
        salCurrentStep: state.salCurrentStep,
        selectedProjectId: state.selectedProjectId,
        showReleaseNotesAfterUpdate: state.showReleaseNotesAfterUpdate,
        themeMode: state.themeMode,
        lightThemePref: state.lightThemePref,
        darkThemePref: state.darkThemePref,
      }),
      storage: createJSONStorage(() => createSafeLocalStorage()),
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
      lightThemePref: state.lightThemePref,
      darkThemePref: state.darkThemePref,
      setLightThemePref: state.setLightThemePref,
      setDarkThemePref: state.setDarkThemePref,
    })),
  );
}

export function useActiveRouteState() {
  return useAppStore(
    useShallow((state) => ({
      activeRoute: state.activeRoute,
      tariffImportPhase: state.tariffImportToolbar.phase,
    })),
  );
}

export function useTariffImportToolbarState() {
  return useAppStore((state) => state.tariffImportToolbar);
}

export function useSalToolbarState() {
  return useAppStore((state) => state.salToolbar);
}

export function useProjectToolbarState() {
  return useAppStore((state) => state.projectToolbar);
}

export function useSalCurrentStep() {
  return useAppStore((state) => state.salCurrentStep);
}

export function useHistoryNavigationState() {
  return useAppStore(
    useShallow((state) => ({
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      navigateBack: state.navigateBack,
      navigateForward: state.navigateForward,
      navigateToHistoryIndex: state.navigateToHistoryIndex,
      routeHistory: state.routeHistory,
      routeHistoryIndex: state.routeHistoryIndex,
    })),
  );
}

export function useAppShellNavigationState() {
  return useAppStore(
    useShallow((state) => ({
      activeRoute: state.activeRoute,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      navigateBack: state.navigateBack,
      navigateForward: state.navigateForward,
      pendingWorkflowAction: state.pendingWorkflowAction,
    })),
  );
}

export function useActiveContext() {
  return useAppStore((state) => state.activeContext);
}

export function useProjectsNavigationState() {
  return useAppStore(
    useShallow((state) => ({
      activeContext: state.activeContext,
      activeRoute: state.activeRoute,
      navigateBack: state.navigateBack,
    })),
  );
}

export function useTeamState() {
  return useAppStore(
    useShallow((state) => ({
      members: state.members,
      loading: state.loading,
      setMembers: state.setMembers,
      addMember: state.addMember,
      updateMember: state.updateMember,
      removeMember: state.removeMember,
    })),
  );
}
