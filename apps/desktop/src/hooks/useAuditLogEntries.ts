import { useCallback, useEffect, useState } from "react";
import { listDesktopAuditEvents } from "@/lib/audit-data";
import { isTauriRuntime } from "@/lib/tauri-wrapper";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import type { AuditEntry } from "@/store/audit-log-store";
import { useAuditLogStore } from "@/store/audit-log-store";

export function useAuditLogEntries(limit = 100): AuditEntry[] {
  const legacyEntries = useAuditLogStore((state) => state.entries);
  const [entries, setEntries] = useState<AuditEntry[]>(legacyEntries);

  const reload = useCallback(async () => {
    if (!isTauriRuntime()) {
      setEntries(useAuditLogStore.getState().entries);
      return;
    }

    try {
      const fromDb = await listDesktopAuditEvents(limit);
      setEntries(fromDb);
    } catch {
      setEntries(useAuditLogStore.getState().entries);
    }
  }, [limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useDataChangedListener(() => {
    void reload();
  });

  return entries;
}
