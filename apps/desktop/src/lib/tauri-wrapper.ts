import { invoke } from "@tauri-apps/api/core";

export type DesktopDataResult<T> =
  | { data: T; source: "desktop" }
  | { data: T; message: string; source: "fallback" };

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatDesktopError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function invokeForRead<T>(
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

export async function invokeForWrite<T>(
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("Write operations require Tauri runtime");
  }
  return await invoke<T>(command, args);
}
