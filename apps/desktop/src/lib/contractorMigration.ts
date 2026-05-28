import {
  ensureDesktopContractor,
  listDesktopContracts,
  updateDesktopContract,
} from "@/lib/desktopData";
import { normalizeContractorName } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { isTauriRuntime } from "@/lib/tauri-wrapper";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

const contractorMigrationStorageKey = STORAGE_KEYS.contractorMigrationDone;
const contractorRepairStorageKey = STORAGE_KEYS.contractorRepairDone;
const legacyProjectContractorStorageKey = STORAGE_KEYS.projectContractors;
const legacyContractorRegistryStorageKey = STORAGE_KEYS.contractorRegistry;

let migrationPromise: Promise<void> | null = null;

export function migrateLegacyContractorsToDb(): Promise<void> {
  if (typeof window === "undefined" || !isTauriRuntime()) {
    return Promise.resolve();
  }

  const v1Done = window.localStorage.getItem(contractorMigrationStorageKey) === "done";
  const v2Done = window.localStorage.getItem(contractorRepairStorageKey) === "done";
  if (v1Done && v2Done) {
    return Promise.resolve();
  }

  migrationPromise ??= runContractorMigrations().finally(() => {
    migrationPromise = null;
  });

  return migrationPromise;
}

async function runContractorMigrations(): Promise<void> {
  const v1Done = window.localStorage.getItem(contractorMigrationStorageKey) === "done";

  if (!v1Done) {
    await runLegacyContractorMigration();
    markRepairDone();
    dispatchDataChanged();
    return;
  }

  if (window.localStorage.getItem(contractorRepairStorageKey) !== "done") {
    await runContractorRepairMigration();
    markRepairDone();
    dispatchDataChanged();
  }
}

async function runLegacyContractorMigration(): Promise<void> {
  await migrateLegacyProjectContractorMapFromStorage();
  await importLegacyContractorRegistryFromStorage();
  await syncContractorsFromContracts();
  markMigrationDone();
}

/** One-time repair for clients that already ran the partial 0.5.0 migration. */
async function runContractorRepairMigration(): Promise<void> {
  await repairContractsFromLegacyProjectMap();
  await importLegacyContractorRegistryFromStorage();
  await syncContractorsFromContracts();
}

/**
 * Prefer the legacy label when SQLite holds an over-shortened contractor
 * (e.g. "RFI" after includes("rfi") normalization vs "RFI TEST 5.0.1").
 */
export function preferLegacyContractorNameForRepair(
  databaseName: string | null | undefined,
  legacyName: string,
): boolean {
  const database = databaseName?.trim() ?? "";
  const legacy = legacyName.trim();

  if (!legacy || legacy === "Senza appaltatore" || legacy === "Appaltatore da assegnare") {
    return false;
  }
  if (!database) {
    return true;
  }
  if (database === legacy) {
    return false;
  }
  if (legacy.length > database.length && legacy.toLowerCase().startsWith(database.toLowerCase())) {
    return true;
  }

  return false;
}

async function migrateLegacyProjectContractorMapFromStorage(): Promise<void> {
  const legacyContractors = readRawStringRecord(legacyProjectContractorStorageKey);
  await applyLegacyProjectContractorMap(legacyContractors, { repairOnly: false });
}

async function repairContractsFromLegacyProjectMap(): Promise<void> {
  const legacyContractors = readRawStringRecord(legacyProjectContractorStorageKey);
  await applyLegacyProjectContractorMap(legacyContractors, { repairOnly: true });
}

async function applyLegacyProjectContractorMap(
  legacyContractors: Record<string, string>,
  options: { repairOnly: boolean },
): Promise<void> {
  const legacyEntries = Object.entries(legacyContractors).filter(
    ([, contractorName]) => contractorName.trim().length > 0,
  );

  if (legacyEntries.length === 0) {
    return;
  }

  const contractsResult = await listDesktopContracts([]);
  const legacyByContractId = new Map(legacyEntries);

  const contractsToUpdate = contractsResult.data.filter((contract) => {
    const legacyName = legacyByContractId.get(contract.id);
    if (!legacyName) {
      return false;
    }

    if (options.repairOnly) {
      return preferLegacyContractorNameForRepair(contract.contractorName, legacyName);
    }

    return !contract.contractorName?.trim();
  });

  if (contractsToUpdate.length === 0) {
    return;
  }

  await Promise.all(
    contractsToUpdate.map((contract) => {
      const legacyName = legacyByContractId.get(contract.id)?.trim() ?? "";
      const contractorName = legacyName || null;

      return updateDesktopContract(contract.id, {
        applicationContractCode: contract.applicationContractCode,
        contractorName,
        contractualAmount: contract.contractualAmount.amount,
        frameworkAgreementCode: contract.frameworkAgreementCode,
        id: contract.id,
        osExcludedAmount: contract.osExcludedAmount ?? null,
        tenderDiscountPercent: contract.tenderDiscountPercent,
        tariffPriorities: contract.tariffPriorities,
        title: contract.title,
      });
    }),
  );
}

async function importLegacyContractorRegistryFromStorage(): Promise<void> {
  const registry = readRawStringList(legacyContractorRegistryStorageKey);
  await Promise.all(
    registry
      .map((name) => name.trim())
      .filter((name) => name.length >= 2)
      .map((name) => ensureDesktopContractor(normalizeContractorName(name))),
  );
}

async function syncContractorsFromContracts(): Promise<void> {
  const contractsResult = await listDesktopContracts([]);
  const names = new Set<string>();

  for (const contract of contractsResult.data) {
    const raw = contract.contractorName?.trim();
    if (!raw) {
      continue;
    }
    names.add(normalizeContractorName(raw));
  }

  await Promise.all([...names].map((name) => ensureDesktopContractor(name)));
}

function readRawStringRecord(key: string): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function readRawStringList(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function markMigrationDone(): void {
  try {
    window.localStorage.setItem(contractorMigrationStorageKey, "done");
  } catch {
    // Persistence is best-effort; a failed write just retries on next launch.
  }
}

function markRepairDone(): void {
  try {
    window.localStorage.setItem(contractorRepairStorageKey, "done");
    window.localStorage.removeItem(legacyProjectContractorStorageKey);
    window.localStorage.removeItem(legacyContractorRegistryStorageKey);
  } catch {
    // Persistence is best-effort; a failed write just retries on next launch.
  }
}
