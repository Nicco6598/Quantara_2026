function handleQuotaExceeded(key: string, value: string, storage: Storage): void {
  console.warn(`[storage] Quota exceeded for key "${key}", clearing stale entries`);
  const keys = Object.keys(storage).filter((k) => k.startsWith("quantara:") && k !== key);
  for (const k of keys.slice(0, Math.min(3, keys.length))) {
    storage.removeItem(k);
  }
  try {
    storage.setItem(key, value);
  } catch {
    console.error(`[storage] Failed to write "${key}" even after cleanup`);
  }
}

export function createSafeLocalStorage(): Storage {
  return {
    clear: () => localStorage.clear(),
    getItem: (key: string) => localStorage.getItem(key),
    key: (index: number) => localStorage.key(index),
    get length() {
      return localStorage.length;
    },
    removeItem: (key: string) => localStorage.removeItem(key),
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
          handleQuotaExceeded(key, value, localStorage);
        }
      }
    },
  };
}
