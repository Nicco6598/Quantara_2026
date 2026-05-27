import { SESSION_STORAGE_KEYS } from "@/persistence/storage-keys";
import { useAppStore } from "@/store/app-store";

export type ProjectEditSession = {
  contractId: string;
  form: unknown;
};

function readSessionProjectId(): string | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedProjectDetail);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

/** One-time import of legacy sessionStorage navigation keys into the app store. */
export function migrateWorkflowNavigationFromSession(): void {
  if (typeof window === "undefined") return;

  const store = useAppStore.getState();

  if (!store.selectedProjectId) {
    const projectId = readSessionProjectId();
    if (projectId) {
      store.setSelectedProjectId(projectId);
    }
  }

  if (!store.resumeSalDraftId) {
    const resumeSalId = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.salResumeDraft);
    if (resumeSalId) {
      store.setResumeSalDraftId(resumeSalId);
    }
  }

  if (!store.editingContractId) {
    const contractId = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.editingContractId);
    if (contractId) {
      store.setEditingContractId(contractId);
    }
  }

  if (!store.editingProjectForm) {
    const rawForm = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.editingProject);
    if (rawForm) {
      try {
        store.setEditingProjectForm(JSON.parse(rawForm) as unknown);
      } catch {
        /* ignore corrupt payload */
      }
    }
  }

  if (window.sessionStorage.getItem(SESSION_STORAGE_KEYS.salCreated) === "1") {
    store.setSalCreatedRedirectPending(true);
  }

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.selectedProjectDetail);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.salResumeDraft);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.editingProject);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.editingContractId);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.salCreated);
  } catch {
    /* best-effort */
  }
}

export function selectProjectForWorkflow(projectId: string): void {
  useAppStore.getState().setSelectedProjectId(projectId);
}

export function getWorkflowProjectId(): string | null {
  const id = useAppStore.getState().selectedProjectId;
  return id.length > 0 ? id : null;
}

export function setResumeSalDraftId(salId: string): void {
  useAppStore.getState().setResumeSalDraftId(salId);
}

export function clearResumeSalDraftId(): void {
  useAppStore.getState().clearResumeSalDraftId();
}

export function getResumeSalDraftId(): string | null {
  const id = useAppStore.getState().resumeSalDraftId;
  return id.length > 0 ? id : null;
}

/** Read once and clear (e.g. after successful resume). */
export function takeResumeSalDraftId(): string | null {
  return useAppStore.getState().takeResumeSalDraftId();
}

export function markSalCreatedRedirect(): void {
  useAppStore.getState().setSalCreatedRedirectPending(true);
}

export function consumeSalCreatedRedirect(): boolean {
  return useAppStore.getState().consumeSalCreatedRedirect();
}

export function beginProjectEditSession(form: unknown, contractId: string): void {
  const store = useAppStore.getState();
  store.setEditingProjectForm(form);
  store.setEditingContractId(contractId);
}

export function takeProjectEditSession(): ProjectEditSession | null {
  return useAppStore.getState().takeProjectEditSession();
}
