export function readJsonFromStorage<T>(
  storage: Storage,
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "null");
    if (parsed === null) return fallback;
    return validate && !validate(parsed) ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function writeJsonToStorage(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      console.warn(`[storage] Quota exceeded for key "${key}", clearing oldest entries`);
      try {
        const keys = Object.keys(storage).filter((k) => k.startsWith("quantara:"));
        for (const k of keys.slice(0, Math.min(3, keys.length))) {
          storage.removeItem(k);
        }
        storage.setItem(key, JSON.stringify(value));
      } catch {
        console.error(`[storage] Failed to write "${key}" even after cleanup`);
      }
    }
  }
}
