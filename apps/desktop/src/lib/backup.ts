import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { BACKUP_STORAGE_KEYS } from "@/persistence/registry";
import {
  collectTariffImportDraftStorage,
  restoreTariffImportDraftStorage,
} from "@/persistence/tariff-import-backup";

export type DatabaseInfo = {
  dataDirectory: string;
  databasePath: string;
  exists: boolean;
  sizeBytes: number;
};

export type BackupEncryptionStatus = {
  encrypted: boolean;
  algorithm: string | null;
};

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  return invoke<DatabaseInfo>("get_database_info");
}

export async function getBackupEncryptionStatus(filePath: string): Promise<BackupEncryptionStatus> {
  return invoke<BackupEncryptionStatus>("get_backup_encryption_status", { filePath });
}

function collectLocalStorage(): string {
  const lsData: Record<string, string | null> = {};
  for (const key of BACKUP_STORAGE_KEYS) {
    try {
      lsData[key] = localStorage.getItem(key);
    } catch {
      lsData[key] = null;
    }
  }
  Object.assign(lsData, collectTariffImportDraftStorage());
  return JSON.stringify(lsData);
}

function restoreLocalStorage(json: string): string {
  try {
    const lsData: Record<string, string | null> = JSON.parse(json);
    const tariffDrafts: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(lsData)) {
      if (key.includes("tariff-import")) {
        tariffDrafts[key] = value;
        continue;
      }
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    }
    restoreTariffImportDraftStorage(tariffDrafts);
  } catch {
    return "ripristino database OK, ma dati app non ripristinati";
  }
  return "";
}

export async function backupDatabase(passphrase?: string): Promise<string> {
  const path = await save({
    defaultPath: `quantara-backup-${new Date().toISOString().slice(0, 10)}.qbk`,
    filters: [{ name: "Quantara Backup", extensions: ["qbk"] }],
  });
  if (!path) return "annullato";

  const localstorageJson = collectLocalStorage();

  if (passphrase) {
    return invoke<string>("backup_database_encrypted", {
      destinationPath: path,
      localstorageJson,
      passphrase,
    });
  }

  return invoke<string>("backup_database", {
    destinationPath: path,
    localstorageJson,
  });
}

const RESTORE_NEEDS_PASSPHRASE_PREFIX = "richiede_passphrase:";

export async function restoreDatabase(): Promise<string> {
  const path = await open({
    filters: [{ name: "Quantara Backup", extensions: ["qbk"] }],
    multiple: false,
  });
  if (!path) return "annullato";

  const status = await getBackupEncryptionStatus(path);
  if (status.encrypted) {
    return `${RESTORE_NEEDS_PASSPHRASE_PREFIX}${path}`;
  }

  const result = await invoke<string>("restore_database", { sourcePath: path });
  const err = restoreLocalStorage(result);
  if (err) return err;
  window.location.reload();
  return "ripristino completato — ricarica in corso...";
}

export function isRestoreNeedsPassphrase(result: string): false | string {
  if (result.startsWith(RESTORE_NEEDS_PASSPHRASE_PREFIX)) {
    return result.slice(RESTORE_NEEDS_PASSPHRASE_PREFIX.length);
  }
  return false;
}

export async function restoreDatabaseWithPassphrase(
  path: string,
  passphrase: string,
): Promise<string> {
  const result = await invoke<string>("restore_database_encrypted", {
    sourcePath: path,
    passphrase,
  });
  const err = restoreLocalStorage(result);
  if (err) return err;
  window.location.reload();
  return "ripristino completato — ricarica in corso...";
}
