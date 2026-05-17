import { useCallback, useEffect, useRef, useState } from "react";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useAutoSave(options: {
  data: unknown;
  onSave: (data: unknown) => Promise<void> | void;
  intervalMs?: number;
  key: string;
}): {
  status: AutoSaveStatus;
  lastSaved: string | null;
} {
  const { data, onSave, intervalMs = 30000 } = options;

  void options.key;
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const savedDataRef = useRef<unknown>(data);
  const hasChangesRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current || !hasChangesRef.current) return;
    isSavingRef.current = true;
    setStatus("saving");
    try {
      await onSave(data);
      savedDataRef.current = JSON.parse(JSON.stringify(data));
      hasChangesRef.current = false;
      const now = new Date().toISOString();
      setLastSaved(now);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave]);

  useEffect(() => {
    const changed = !deepEqual(data, savedDataRef.current);
    if (changed) {
      hasChangesRef.current = true;
      setStatus((prev) => (prev === "saving" || prev === "error" ? prev : "unsaved"));
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void save();
      }, 2000);
    }
  }, [data, save]);

  useEffect(() => {
    intervalTimerRef.current = setInterval(() => {
      void save();
    }, intervalMs);
    return () => {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [intervalMs, save]);

  return { status, lastSaved };
}

export function loadAutoDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "data" in parsed && "timestamp" in parsed) {
      return parsed.data as T;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAutoDraft(key: string, data: unknown): void {
  try {
    const payload = {
      data,
      key,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* no-op */
  }
}

export function clearAutoDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}
