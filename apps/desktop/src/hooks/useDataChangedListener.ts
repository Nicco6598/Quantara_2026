import { useEffect, useRef } from "react";
import { DATA_CHANGED_EVENT } from "@/lib/sync-events";

type Cleanup = undefined | (() => void);

export function useDataChangedListener(onDataChanged: () => Cleanup, delayMs = 150) {
  const cleanupRef = useRef<Cleanup>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const run = () => {
      cleanupRef.current?.();
      cleanupRef.current = onDataChanged() ?? undefined;
    };

    const handleChange = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(run, delayMs);
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleChange);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleChange);
      clearTimeout(timeoutRef.current);
      cleanupRef.current?.();
    };
  }, [delayMs, onDataChanged]);
}
