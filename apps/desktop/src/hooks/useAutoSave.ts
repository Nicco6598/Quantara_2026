import { useEffect, useRef, useState } from "react";

type SaveStatus = "saved" | "saving" | "dirty";

type UseAutoSaveOptions<T> = {
  data: T;
  intervalMs: number;
  onSave: () => void | Promise<void>;
  enabled?: boolean;
};

export function useAutoSave<T>({
  data: _data,
  intervalMs,
  onSave,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!enabled) return;

    pendingSaveRef.current = true;
    setStatus("dirty");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      pendingSaveRef.current = false;
      setStatus("saving");

      try {
        await onSaveRef.current();
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch {
        setStatus("dirty");
      } finally {
        isSavingRef.current = false;
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [intervalMs, enabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { status, lastSavedAt };
}
