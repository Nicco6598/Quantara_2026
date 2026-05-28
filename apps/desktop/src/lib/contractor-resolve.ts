import type { DesktopContract } from "@/lib/desktopData";
import { normalizeContractorName, readStringRecord } from "@/lib/shared-utils";
import { isTauriRuntime } from "@/lib/tauri-wrapper";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

/** SQLite is source of truth only in the desktop runtime after one-time migration. */
export function isContractorMigrationComplete(): boolean {
  if (typeof window === "undefined") return true;
  if (!isTauriRuntime()) return false;
  return window.localStorage.getItem(STORAGE_KEYS.contractorMigrationDone) === "done";
}

/** Prefer SQLite contractorName; legacy map only until migration completes. */
export function resolveContractorName(
  contract: DesktopContract,
  legacyByProjectId?: Record<string, string>,
): string {
  if (contract.contractorName?.trim()) {
    return normalizeContractorName(contract.contractorName);
  }

  if (!isContractorMigrationComplete() && legacyByProjectId) {
    const legacy = legacyByProjectId[contract.id];
    if (typeof legacy === "string" && legacy.trim()) {
      return normalizeContractorName(legacy);
    }
  }

  return "";
}

export function readLegacyProjectContractors(): Record<string, string> {
  if (isContractorMigrationComplete()) {
    return {};
  }
  return readStringRecord(STORAGE_KEYS.projectContractors);
}
