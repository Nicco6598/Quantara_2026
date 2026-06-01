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
    console.error(
      `[writeJsonToStorage] failed to save key="${key}"`,
      err,
      typeof value === "object" && value ? { keys: Object.keys(value as object) } : null,
    );
    throw err;
  }
}
