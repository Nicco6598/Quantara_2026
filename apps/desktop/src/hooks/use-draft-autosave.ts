import { useCallback, useEffect, useRef, useState } from "react";

export type DraftAutosaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

type UseDraftAutosaveOptions = {
  data: unknown;
  debounceMs?: number;
  enabled?: boolean;
  flushOnUnmount?: boolean;
  intervalMs?: number;
  onPersist: () => void | Promise<void>;
  skipInitialPersist?: boolean;
};

export function useDraftAutosave({
  data,
  debounceMs = 2000,
  enabled = true,
  intervalMs = 30000,
  onPersist,
  skipInitialPersist = true,
  flushOnUnmount = false,
}: UseDraftAutosaveOptions): {
  lastSaved: string | null;
  persistNow: (options?: { force?: boolean }) => Promise<void>;
  status: DraftAutosaveStatus;
} {
  const [status, setStatus] = useState<DraftAutosaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const savedDataRef = useRef<unknown>(data);
  const hasChangesRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);
  const didMountRef = useRef(false);
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;

  const dataRef = useRef(data);
  dataRef.current = data;

  const persistNow = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled || isSavingRef.current) return;
      if (!options?.force && !hasChangesRef.current) return;
      isSavingRef.current = true;
      setStatus("saving");
      try {
        await onPersistRef.current();
        const current = dataRef.current;
        savedDataRef.current = JSON.parse(JSON.stringify(current));
        hasChangesRef.current = false;
        setLastSaved(new Date().toISOString());
        setStatus("saved");
      } catch {
        setStatus("error");
      } finally {
        isSavingRef.current = false;
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    if (skipInitialPersist && !didMountRef.current) {
      didMountRef.current = true;
      savedDataRef.current = JSON.parse(JSON.stringify(data));
      return;
    }

    const changed = !deepEqual(data, savedDataRef.current);
    if (!changed) return;

    hasChangesRef.current = true;
    setStatus((prev) => (prev === "saving" || prev === "error" ? prev : "unsaved"));
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void persistNow();
    }, debounceMs);
  }, [data, debounceMs, enabled, persistNow, skipInitialPersist]);

  useEffect(() => {
    if (!enabled) return;

    intervalTimerRef.current = setInterval(() => {
      if (hasChangesRef.current) void persistNow();
    }, intervalMs);

    return () => {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [enabled, intervalMs, persistNow]);

  useEffect(() => {
    if (!enabled || !flushOnUnmount) return;

    return () => {
      if (hasChangesRef.current && !isSavingRef.current) {
        void onPersistRef.current();
      }
    };
  }, [enabled, flushOnUnmount]);

  return { lastSaved, persistNow, status };
}
