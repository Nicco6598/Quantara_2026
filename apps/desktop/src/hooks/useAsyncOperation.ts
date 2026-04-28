import { useCallback, useRef, useState } from "react";

export type AsyncOperationState = "idle" | "saving" | "saved" | "error";

export function useAsyncOperation() {
  const [state, setState] = useState<AsyncOperationState>("idle");
  const [message, setMessage] = useState("");
  const mountedRef = useRef(true);

  const run = useCallback(async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    setState("saving");
    setMessage("");

    try {
      const result = await operation();
      if (mountedRef.current) {
        setState("saved");
      }
      return result;
    } catch (error) {
      if (mountedRef.current) {
        setState("error");
        setMessage(error instanceof Error ? error.message : String(error));
      }
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setMessage("");
  }, []);

  return { message, reset, run, state };
}
