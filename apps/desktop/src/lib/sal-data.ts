import { invoke } from "@tauri-apps/api/core";
import { invokeWithFallback, isTauriRuntime } from "./tauri-wrapper";
import type { DesktopDataResult } from "./tauri-wrapper";
import type { SalDocument, SalProject } from "@/features/sal/types";

// Separato da quantara-sal-workflow (usato da zustand persist per UI state).
// Questo key contiene solo i documenti SAL, non sovrascritto da partialize.
const SAL_DATA_KEY = "quantara-sal-data-v1";

type SalDataStore = {
  projects: SalProject[];
  salDocuments: SalDocument[];
};

function readSalDataStore(): SalDataStore | null {
  try {
    const raw = window.localStorage.getItem(SAL_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SalDataStore;
  } catch {
    return null;
  }
}

function writeSalDataStore(data: SalDataStore): void {
  try {
    window.localStorage.setItem(SAL_DATA_KEY, JSON.stringify(data));
  } catch {
    /* no-op */
  }
}

export async function listDesktopSalDocuments(
  projectId: string | null,
): Promise<DesktopDataResult<SalDocument[]>> {
  if (!isTauriRuntime()) {
    const stored = readSalDataStore();
    const docs = stored?.salDocuments ?? [];
    const filtered = projectId ? docs.filter((d) => d.projectId === projectId) : docs;
    return { data: filtered, message: "Runtime browser: SAL localStorage.", source: "fallback" };
  }

  return invokeWithFallback<SalDocument[]>(
    "list_sal_documents",
    { projectId },
    [],
    "SAL dimostrative",
  );
}

export async function saveSalDocument(projectId: string, doc: SalDocument): Promise<void> {
  if (!isTauriRuntime()) {
    const stored = readSalDataStore();
    const existing = stored?.salDocuments ?? [];
    const docIndex = existing.findIndex((d) => d.id === doc.id);
    const updated =
      docIndex >= 0 ? existing.map((d, i) => (i === docIndex ? doc : d)) : [doc, ...existing];
    writeSalDataStore({
      projects: stored?.projects ?? [],
      salDocuments: updated,
    });
    return;
  }

  try {
    await invoke("save_sal_document", { projectId, data: doc as never });
  } catch {
    /* no-op */
  }
}

export async function updateSalDocument(id: string, doc: SalDocument): Promise<void> {
  if (!isTauriRuntime()) {
    const stored = readSalDataStore();
    const existing = stored?.salDocuments ?? [];
    const updated = existing.map((d) => (d.id === id ? doc : d));
    writeSalDataStore({
      projects: stored?.projects ?? [],
      salDocuments: updated,
    });
    return;
  }

  try {
    await invoke("update_sal_document", { id, data: doc as never });
  } catch {
    /* no-op */
  }
}

export async function deleteSalDocument(id: string): Promise<void> {
  if (!isTauriRuntime()) {
    const stored = readSalDataStore();
    const existing = stored?.salDocuments ?? [];
    const updated = existing.filter((d) => d.id !== id);
    writeSalDataStore({
      projects: stored?.projects ?? [],
      salDocuments: updated,
    });
    return;
  }

  try {
    await invoke("delete_sal_document", { id });
  } catch {
    /* no-op */
  }
}

export async function listDesktopSalProjects(): Promise<DesktopDataResult<SalProject[]>> {
  if (!isTauriRuntime()) {
    const stored = readSalDataStore();
    return {
      data: stored?.projects ?? [],
      message: "Runtime browser: progetti SAL localStorage.",
      source: "fallback",
    };
  }

  return invokeWithFallback<SalProject[]>("list_sal_projects", {}, [], "progetti SAL dimostrativi");
}

export async function saveSalProject(project: SalProject): Promise<void> {
  if (!isTauriRuntime()) {
    const stored = readSalDataStore();
    const existing = stored?.projects ?? [];
    const projIndex = existing.findIndex((p) => p.id === project.id);
    const updated =
      projIndex >= 0
        ? existing.map((p, i) => (i === projIndex ? project : p))
        : [project, ...existing];
    writeSalDataStore({
      projects: updated,
      salDocuments: stored?.salDocuments ?? [],
    });
    return;
  }

  try {
    await invoke("save_sal_project", { project: project as never });
  } catch {
    /* no-op */
  }
}

// Migrazione one-time: sposta i SAL dal vecchio zustand persist key (quantara-sal-workflow)
// al nuovo backend SQLite. Eseguita solo in Tauri mode e una sola volta.
const MIGRATION_FLAG_KEY = "quantara-sal-migration-to-sqlite-v1";
const OLD_ZUSTAND_KEY = "quantara-sal-workflow";

export async function migrateSalLocalStorageToBackend(): Promise<void> {
  if (!isTauriRuntime()) return;

  try {
    const alreadyDone = window.localStorage.getItem(MIGRATION_FLAG_KEY);
    if (alreadyDone) return;

    const raw = window.localStorage.getItem(OLD_ZUSTAND_KEY);
    if (!raw) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      return;
    }

    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? parsed;
    const docs: SalDocument[] = Array.isArray(state?.salDocuments) ? state.salDocuments : [];
    const projects: SalProject[] = Array.isArray(state?.projects) ? state.projects : [];

    if (docs.length === 0 && projects.length === 0) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      return;
    }

    for (const doc of docs) {
      try {
        await invoke("save_sal_document", { projectId: doc.projectId, data: doc as never });
      } catch {
        /* best-effort */
      }
    }

    for (const proj of projects) {
      try {
        await invoke("save_sal_project", { project: proj as never });
      } catch {
        /* best-effort */
      }
    }

    window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
  } catch {
    /* no-op */
  }
}
