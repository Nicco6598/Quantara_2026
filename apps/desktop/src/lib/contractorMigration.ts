import { listDesktopContracts, updateDesktopContract } from "@/lib/desktopData";
import { readStringRecord } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";

const contractorMigrationStorageKey = "quantara.contractorsDbMigration.v1";
const legacyProjectContractorStorageKey = "quantara.projectContractors.v1";

let migrationPromise: Promise<void> | null = null;

export function migrateLegacyContractorsToDb(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.localStorage.getItem(contractorMigrationStorageKey) === "done") {
    return Promise.resolve();
  }

  migrationPromise ??= runLegacyContractorMigration().finally(() => {
    migrationPromise = null;
  });

  return migrationPromise;
}

async function runLegacyContractorMigration(): Promise<void> {
  const legacyContractors = readStringRecord(legacyProjectContractorStorageKey);
  const legacyEntries = Object.entries(legacyContractors).filter(
    ([, contractorName]) => contractorName.trim().length > 0,
  );

  if (legacyEntries.length === 0) {
    markMigrationDone();
    return;
  }

  const contractsResult = await listDesktopContracts([]);
  const legacyByContractId = new Map(legacyEntries);
  const contractsToMigrate = contractsResult.data.filter(
    (contract) => !contract.contractorName && legacyByContractId.has(contract.id),
  );

  if (contractsToMigrate.length === 0) {
    markMigrationDone();
    return;
  }

  await Promise.all(
    contractsToMigrate.map((contract) =>
      updateDesktopContract(contract.id, {
        applicationContractCode: contract.applicationContractCode,
        contractorName: legacyByContractId.get(contract.id) ?? null,
        contractualAmount: contract.contractualAmount.amount,
        frameworkAgreementCode: contract.frameworkAgreementCode,
        id: contract.id,
        osExcludedAmount: contract.osExcludedAmount ?? null,
        tenderDiscountPercent: contract.tenderDiscountPercent,
        tariffPriorities: contract.tariffPriorities,
        title: contract.title,
      }),
    ),
  );

  markMigrationDone();
  dispatchDataChanged();
}

function markMigrationDone(): void {
  try {
    window.localStorage.setItem(contractorMigrationStorageKey, "done");
  } catch {
    // Persistence is best-effort; a failed write just retries on next launch.
  }
}
