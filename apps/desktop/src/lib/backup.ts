import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export type DatabaseInfo = {
  dataDirectory: string;
  databasePath: string;
  exists: boolean;
  sizeBytes: number;
};

// All Zustand persist keys + app-specific storage keys
const STORAGE_KEYS = [
  "quantara-shell-preferences",
  "quantara-key",
  "quantara-sal-workflow-store",
  "quantara-sal-templates-v1",
  "quantara-audit-log-v1",
  "quantara.projectContractors.v1",
  "quantara.contractorRegistry.v1",
];

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  return invoke<DatabaseInfo>("get_database_info");
}

export async function backupDatabase(): Promise<string> {
  const path = await save({
    defaultPath: `quantara-backup-${new Date().toISOString().slice(0, 10)}.qbk`,
    filters: [{ name: "Quantara Backup", extensions: ["qbk"] }],
  });
  if (!path) return "annullato";

  // Collect all localStorage data
  const lsData: Record<string, string | null> = {};
  for (const key of STORAGE_KEYS) {
    try {
      lsData[key] = localStorage.getItem(key);
    } catch {
      lsData[key] = null;
    }
  }
  const localstorageJson = JSON.stringify(lsData);

  return invoke<string>("backup_database", {
    destinationPath: path,
    localstorageJson,
  });
}

export async function restoreDatabase(): Promise<string> {
  const path = await open({
    filters: [{ name: "Quantara Backup", extensions: ["qbk"] }],
    multiple: false,
  });
  if (!path) return "annullato";

  const result = await invoke<string>("restore_database", { sourcePath: path });

  // The result is the localStorage JSON — write it back
  try {
    const lsData: Record<string, string | null> = JSON.parse(result);
    for (const [key, value] of Object.entries(lsData)) {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    }
  } catch {
    return "ripristino database OK, ma dati app non ripristinati";
  }

  // Force reload to pick up restored localStorage
  window.location.reload();
  return "ripristino completato — ricarica in corso...";
}
