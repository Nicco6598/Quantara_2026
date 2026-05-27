import { readJsonFromStorage, writeJsonToStorage } from "./json-storage";

const AUTO_DRAFT_WRAPPER_VERSION = 1;

type AutoDraftEnvelope<T> = {
  data: T;
  key: string;
  timestamp: string;
  version: number;
};

export function loadDraft<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutoDraftEnvelope<T> | T;
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      "timestamp" in parsed &&
      (parsed as AutoDraftEnvelope<T>).version === AUTO_DRAFT_WRAPPER_VERSION
    ) {
      return (parsed as AutoDraftEnvelope<T>).data;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDraft(storageKey: string, data: unknown): void {
  try {
    const payload: AutoDraftEnvelope<unknown> = {
      data,
      key: storageKey,
      timestamp: new Date().toISOString(),
      version: AUTO_DRAFT_WRAPPER_VERSION,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    /* best-effort */
  }
}

export function clearDraft(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* best-effort */
  }
}

export function loadDraftRecord<T>(
  storage: Storage,
  storageKey: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  return readJsonFromStorage(storage, storageKey, fallback, validate);
}

export function saveDraftRecord(storage: Storage, storageKey: string, value: unknown): void {
  writeJsonToStorage(storage, storageKey, value);
}
