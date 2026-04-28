import { invoke } from "@tauri-apps/api/core";
import type { DesktopDataResult } from "./desktopData";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatDesktopError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function invokeWithFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T,
  fallbackMessage: string,
): Promise<DesktopDataResult<T>> {
  if (!isTauriRuntime()) {
    return {
      data: fallback,
      message: `Runtime browser: ${fallbackMessage}.`,
      source: "fallback",
    };
  }

  try {
    const data = await invoke<T>(command, args);
    return { data, source: "desktop" };
  } catch (error) {
    return {
      data: fallback,
      message: formatDesktopError(error),
      source: "fallback",
    };
  }
}
