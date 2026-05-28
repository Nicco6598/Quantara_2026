import {
  mergeContractorRegistry,
  readStringList,
  writeJson,
} from "@/features/projects/utils/projects-helpers";
import { isContractorMigrationComplete } from "@/lib/contractor-resolve";
import {
  type DesktopContractor,
  ensureDesktopContractor,
  listDesktopContractors,
} from "@/lib/desktopData";
import { normalizeContractorName } from "@/lib/shared-utils";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

function uniqueNormalizedNames(names: Iterable<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of names) {
    const normalized = normalizeContractorName(raw);
    if (!normalized || normalized === "Senza appaltatore" || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result.sort((left, right) => left.localeCompare(right, "it-IT"));
}

export async function loadContractorRegistryNames(): Promise<string[]> {
  if (!isContractorMigrationComplete()) {
    return uniqueNormalizedNames(readStringList(STORAGE_KEYS.contractorRegistry));
  }

  const contractors = await listDesktopContractors([]);
  return uniqueNormalizedNames(contractors.data.map((contractor) => contractor.name));
}

export async function persistContractorRegistryName(name: string): Promise<void> {
  const normalized = normalizeContractorName(name);
  if (!normalized || normalized.length < 2) {
    return;
  }

  if (isContractorMigrationComplete()) {
    await ensureDesktopContractor(normalized);
    return;
  }

  const current = readStringList(STORAGE_KEYS.contractorRegistry);
  writeJson(STORAGE_KEYS.contractorRegistry, mergeContractorRegistry(current, normalized));
}

export function readLegacyContractorRegistryNames(): string[] {
  return uniqueNormalizedNames(readStringList(STORAGE_KEYS.contractorRegistry));
}

export function contractorRecordsToNames(records: DesktopContractor[]): string[] {
  return uniqueNormalizedNames(records.map((record) => record.name));
}
