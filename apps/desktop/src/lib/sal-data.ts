import { invoke } from "@tauri-apps/api/core";
import type { SalDocument, SalProject } from "@/features/sal/types";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import type { DesktopDataResult } from "./tauri-wrapper";
import { invokeForRead, invokeForWrite, isTauriRuntime } from "./tauri-wrapper";

// Separato da quantara-sal-workflow (usato da zustand persist per UI state).
// Questo key contiene solo i documenti SAL, non sovrascritto da partialize.
const SAL_DATA_KEY = "quantara-sal-data-v1";

type SalDataStore = {
  projects: SalProject[];
  salDocuments: SalDocument[];
};

export type SerializableSalDocument = SalDocument & {
  lineCount?: number;
  measurementRowCount?: number;
  totalCents?: number;
  voices?: Array<{
    category: string;
    code: string;
    description: string;
    id: string;
    laborPercentage?: number;
    projectYear: number;
    unit: string;
    unitPrice: number;
  }>;
};

export function toSalDocumentPayload(
  doc: SalDocument,
  voices?: SerializableSalDocument["voices"],
): SerializableSalDocument {
  const payload: SerializableSalDocument = {
    ...doc,
    ...(voices && voices.length > 0 ? { voices } : {}),
  };
  const existingVoices = (doc as SerializableSalDocument).voices;
  if (!payload.voices && existingVoices && existingVoices.length > 0) {
    payload.voices = existingVoices;
  }
  if (doc.lines) {
    payload.lineCount = doc.lines.length;
    payload.measurementRowCount = doc.lines.reduce(
      (sum, line) => sum + (line.measurementRows?.length ?? 0),
      0,
    );
  }
  if (doc.total != null) {
    payload.totalCents = Math.round(doc.total * 100);
  }
  return payload;
}

function readSalDataStore(): SalDataStore | null {
  try {
    const raw = window.localStorage.getItem(SAL_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SalDataStore;
  } catch {
    return null;
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

  return invokeForRead<SalDocument[]>("list_sal_documents", { projectId }, [], "SAL dimostrative");
}

export async function saveSalDocument(projectId: string, doc: SalDocument): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("SAL save requires Tauri desktop runtime");
  }

  await invokeForWrite("save_sal_document", { projectId, data: toSalDocumentPayload(doc) });
}

export async function updateSalDocument(id: string, doc: SalDocument): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("SAL update requires Tauri desktop runtime");
  }

  await invokeForWrite("update_sal_document", { id, data: toSalDocumentPayload(doc) });
}

export async function deleteSalDocument(id: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("SAL delete requires Tauri desktop runtime");
  }

  await invokeForWrite("delete_sal_document", { id });
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

  return invokeForRead<SalProject[]>("list_sal_projects", {}, [], "progetti SAL dimostrativi");
}

export async function saveSalProject(project: SalProject): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("SAL project save requires Tauri desktop runtime");
  }

  await invokeForWrite("save_sal_project", { project });
}

export type MaterialDeductionInput = {
  materialId: string;
  quantity: number;
  description?: string;
};

export async function confirmSalTransaction(
  projectId: string,
  salData: SalDocument,
  materialDeductions: MaterialDeductionInput[],
): Promise<SalDocument> {
  if (!isTauriRuntime()) {
    await saveSalDocument(projectId, salData);
    const { updateDesktopMaterial, listDesktopMaterials } = await import("./desktopData");
    const { data: all } = await listDesktopMaterials([]);
    for (const d of materialDeductions) {
      const mat = all.find((m: { id: string }) => m.id === d.materialId);
      if (mat) {
        await updateDesktopMaterial(d.materialId, {
          id: mat.id,
          code: mat.code,
          description: mat.description,
          category: mat.category,
          unit: mat.unit,
          minQuantity: mat.minQuantity,
          notes: mat.notes,
          quantity: Math.max(0, mat.quantity - d.quantity),
        });
      }
    }
    return salData;
  }

  const payload = toSalDocumentPayload(salData);

  return invoke<SalDocument>("confirm_sal_transaction", {
    projectId,
    salData: payload,
    materialDeductions,
  });
}

// Migrazione one-time: sposta i SAL dal vecchio zustand persist key (quantara-sal-workflow)
// al nuovo backend SQLite. Eseguita solo in Tauri mode e una sola volta.
const MIGRATION_FLAG_KEY = STORAGE_KEYS.salMigrationToSqlite;
const OLD_ZUSTAND_KEY = STORAGE_KEYS.salWorkflow;

export async function migrateSalLocalStorageToBackend(): Promise<void> {
  if (!isTauriRuntime()) return;

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
    await invokeForWrite("save_sal_document", {
      projectId: doc.projectId,
      data: toSalDocumentPayload(doc),
    });
  }

  for (const proj of projects) {
    await invokeForWrite("save_sal_project", { project: proj });
  }

  window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
}
