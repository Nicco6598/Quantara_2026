import { STORAGE_KEYS } from "./storage-keys";

const TARIFF_IMPORT_KEY_FRAGMENT = "tariff-import";

export function collectTariffImportDraftStorage(): Record<string, string | null> {
  if (typeof window === "undefined") return {};

  const data: Record<string, string | null> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.includes(TARIFF_IMPORT_KEY_FRAGMENT)) continue;
    try {
      data[key] = window.localStorage.getItem(key);
    } catch {
      data[key] = null;
    }
  }

  if (!(STORAGE_KEYS.tariffImportDraftsIndex in data)) {
    data[STORAGE_KEYS.tariffImportDraftsIndex] = localStorage.getItem(
      STORAGE_KEYS.tariffImportDraftsIndex,
    );
  }

  return data;
}

export function restoreTariffImportDraftStorage(data: Record<string, string | null>): void {
  for (const [key, value] of Object.entries(data)) {
    if (!key.includes(TARIFF_IMPORT_KEY_FRAGMENT)) continue;
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }
}
