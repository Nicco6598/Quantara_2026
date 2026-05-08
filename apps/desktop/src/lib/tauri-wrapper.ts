import { invoke } from "@tauri-apps/api/core";

export type DesktopDataResult<T> =
  | { data: T; source: "desktop" }
  | { data: T; message: string; source: "fallback" };

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function formatDesktopError(error: unknown): string {
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

export async function invokeWithValidation<T>(
  command: string,
  args: Record<string, unknown>,
  schema?: {
    safeParse(data: unknown): { success: boolean; error?: { issues: Array<{ message: string }> } };
  },
): Promise<T> {
  if (schema) {
    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      throw new Error(
        `Dati non validi per ${command}: ${parsed.error?.issues.map((issue) => issue.message).join("; ") ?? ""}`,
      );
    }
  }
  return invoke<T>(command, args);
}
