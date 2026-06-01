import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-wrapper";

type ImportDraftSummaryInvoke = {
  fileCount: number;
  id: string;
  name: string;
  reviewedCount: number;
  savedAt: string;
  totalVoices: number;
};

function buildSummaryPayload(summary: ImportDraftSummaryInvoke) {
  return {
    fileCount: summary.fileCount,
    id: summary.id,
    name: summary.name,
    reviewedCount: summary.reviewedCount,
    savedAt: summary.savedAt,
    totalVoices: summary.totalVoices,
  };
}

export async function readImportDraftPayload(storageKey: string): Promise<string | null> {
  if (isTauriRuntime()) {
    try {
      const fromDisk = await invoke<string | null>("load_tariff_import_draft", {
        draftId: storageKey,
      });
      if (fromDisk) return fromDisk;
    } catch {
      /* fall through to legacy localStorage */
    }

    try {
      const legacy = window.localStorage.getItem(storageKey);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as {
            editableVoicesList?: unknown[][];
            id?: string;
            metadatas?: unknown[];
            name?: string;
            reviewedFiles?: unknown[];
            savedAt?: string;
          };
          const totalVoices = Array.isArray(parsed.editableVoicesList)
            ? parsed.editableVoicesList.reduce(
                (total, voices) => total + (Array.isArray(voices) ? voices.length : 0),
                0,
              )
            : 0;
          await invoke("save_tariff_import_draft", {
            draftId: storageKey,
            payload: legacy,
            summary: {
              fileCount: Array.isArray(parsed.metadatas) ? parsed.metadatas.length : 0,
              id: parsed.id ?? storageKey,
              name: parsed.name ?? "Bozza import",
              reviewedCount: Array.isArray(parsed.reviewedFiles) ? parsed.reviewedFiles.length : 0,
              savedAt: parsed.savedAt ?? new Date().toISOString(),
              totalVoices,
            },
          });
          window.localStorage.removeItem(storageKey);
        } catch {
          return legacy;
        }
        return legacy;
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export async function writeImportDraftPayload(
  storageKey: string,
  json: string,
  summary: ImportDraftSummaryInvoke,
): Promise<void> {
  if (isTauriRuntime()) {
    try {
      await invoke("save_tariff_import_draft", {
        draftId: storageKey,
        payload: json,
        summary: buildSummaryPayload(summary),
      });
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Salvataggio bozza su disco non riuscito: ${message}`);
    }
  }

  try {
    window.localStorage.setItem(storageKey, json);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22)
    ) {
      throw new Error(
        "Spazio locale del browser insufficiente. Usa l'app desktop (pnpm tauri:dev) per salvare la bozza su disco, oppure riduci i file in import e approva direttamente.",
      );
    }
    throw error;
  }
}

export async function removeImportDraftPayload(storageKey: string): Promise<void> {
  if (isTauriRuntime()) {
    try {
      await invoke("delete_tariff_import_draft_file", { draftId: storageKey });
    } catch {
      /* ignore */
    }
  }
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}
