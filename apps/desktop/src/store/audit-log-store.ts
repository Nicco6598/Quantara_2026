import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSafeLocalStorage } from "@/lib/safe-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

type AuditEntry = {
  action: string;
  details: string;
  entityId: string;
  entityType: string;
  id: string;
  timestamp: string;
};

const MAX_ENTRIES = 500;

type AuditLogStore = {
  addEntry: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
  clearAll: () => void;
  entries: AuditEntry[];
  getEntriesForEntity: (entityType: string, entityId: string) => AuditEntry[];
};

export const useAuditLogStore = create<AuditLogStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => {
          const newEntry: AuditEntry = {
            ...entry,
            id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
          };
          return { entries: [newEntry, ...state.entries].slice(0, MAX_ENTRIES) };
        }),

      clearAll: () => set({ entries: [] }),

      getEntriesForEntity: (entityType, entityId) =>
        get().entries.filter((e) => e.entityType === entityType && e.entityId === entityId),
    }),
    { name: STORAGE_KEYS.auditLog, storage: createJSONStorage(() => createSafeLocalStorage()) },
  ),
);

export type { AuditEntry };
