import { clearDraft, loadDraft, saveDraft } from "@/persistence/draft-service";
import { useDraftAutosave } from "./use-draft-autosave";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

export function useAutoSave(options: {
  data: unknown;
  onSave: (data: unknown) => Promise<void> | void;
  intervalMs?: number;
  key: string;
}): {
  status: AutoSaveStatus;
  lastSaved: string | null;
} {
  const { data, onSave, intervalMs = 30000, key } = options;

  const { lastSaved, status } = useDraftAutosave({
    data,
    intervalMs,
    onPersist: () => onSave(data),
    skipInitialPersist: true,
  });

  void key;

  return { status, lastSaved };
}

export function loadAutoDraft<T>(key: string): T | null {
  return loadDraft<T>(key);
}

export function saveAutoDraft(key: string, data: unknown): void {
  saveDraft(key, data);
}

export function clearAutoDraft(key: string): void {
  clearDraft(key);
}
