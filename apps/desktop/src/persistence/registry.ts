import { STORAGE_KEYS, type StorageKey } from "./storage-keys";

export type PersistedStateCategory =
  | "durable-business-data"
  | "durable-app-preference"
  | "recoverable-draft"
  | "ephemeral-ui-state"
  | "cache-derived-state";

export type PersistedStateRegistryEntry = {
  category: PersistedStateCategory;
  includeInBackup: boolean;
  intendedStorage: "sqlite" | "localStorage" | "sessionStorage" | "memory";
  key: StorageKey;
  owner: string;
  reason: string;
};

export const PERSISTED_STATE_REGISTRY = [
  {
    category: "durable-app-preference",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.shellPreferences,
    owner: "app shell",
    reason: "Theme, update, release-note, selection, and motion preferences (Zustand persist).",
  },
  {
    category: "ephemeral-ui-state",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.salWorkflow,
    owner: "SAL workflow",
    reason: "Active project/SAL selection only; SAL documents live in SQLite.",
  },
  {
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.salTemplates,
    owner: "SAL workflow",
    reason: "User-created SAL templates.",
  },
  {
    category: "cache-derived-state",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.auditLog,
    owner: "audit log",
    reason: "Legacy UI cache; runtime Tauri reads audit_events from SQLite.",
  },
  {
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.tariffImportDraftsIndex,
    owner: "tariffs import",
    reason:
      "Index of tariff PDF import drafts; draft bodies use quantara:tariff-import-preview:* keys.",
  },
  {
    category: "durable-app-preference",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.tariffFavoriteBookIds,
    owner: "tariffs",
    reason: "Favorite tariff-book preference.",
  },
  {
    category: "durable-app-preference",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.filterTemplates,
    owner: "filters",
    reason: "Saved filter templates (Zustand persist).",
  },
  {
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.salCreationDraft,
    owner: "SAL creation",
    reason: "Autosaved SAL work-in-progress (per project and per sal id).",
  },
  {
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.projectAutoDraft,
    owner: "project creation",
    reason: "Autosaved project creation form (active key).",
  },
  {
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.projectDraft,
    owner: "project creation",
    reason: "Legacy draft key; kept in backup for restore compatibility only.",
  },
  {
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.projectContractors,
    owner: "projects",
    reason: "Legacy contractor assignment until fully on contract records.",
  },
  {
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.contractorRegistry,
    owner: "projects",
    reason: "Legacy contractor registry.",
  },
  {
    category: "cache-derived-state",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.previewContracts,
    owner: "desktop data browser preview",
    reason: "Browser-runtime preview data; Tauri runtime uses SQLite.",
  },
  {
    category: "cache-derived-state",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.previewMaterials,
    owner: "desktop data browser preview",
    reason: "Browser-runtime preview data; Tauri runtime uses SQLite.",
  },
  {
    category: "ephemeral-ui-state",
    includeInBackup: false,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.contractorMigrationDone,
    owner: "contractor migration",
    reason: "One-time migration guard.",
  },
  {
    category: "ephemeral-ui-state",
    includeInBackup: false,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.salMigrationToSqlite,
    owner: "SAL migration",
    reason: "One-time localStorage → SQLite SAL migration guard.",
  },
  {
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.releaseNotesAfterUpdate,
    owner: "updater",
    reason: "Post-update notification payload must survive restart.",
  },
] as const satisfies readonly PersistedStateRegistryEntry[];

export const BACKUP_STORAGE_KEYS = PERSISTED_STATE_REGISTRY.filter(
  (entry) => entry.includeInBackup,
).map((entry) => entry.key);
