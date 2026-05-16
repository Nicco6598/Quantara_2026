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
    reason: "Theme, update, release-note, selection, and motion preferences.",
  },
  {
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.salWorkflow,
    owner: "SAL workflow",
    reason: "Existing persisted SAL documents/workflow data until a SQLite SAL schema exists.",
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
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.auditLog,
    owner: "audit log",
    reason: "Bounded local history used in settings and dashboards.",
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
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.salCreationDraft,
    owner: "SAL creation",
    reason: "Autosaved SAL work-in-progress.",
  },
  {
    category: "recoverable-draft",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.projectDraft,
    owner: "project creation",
    reason: "Autosaved project creation work-in-progress.",
  },
  {
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.projectContractors,
    owner: "projects",
    reason: "Legacy contractor assignment metadata used across project workflows.",
  },
  {
    category: "durable-business-data",
    includeInBackup: true,
    intendedStorage: "localStorage",
    key: STORAGE_KEYS.contractorRegistry,
    owner: "projects",
    reason: "Legacy contractor registry until contractor persistence is fully backend-owned.",
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
    reason: "Internal one-time migration guard.",
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
