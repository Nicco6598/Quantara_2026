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
  } catch {
    // Browser preview persistence is best-effort.
  }
}
