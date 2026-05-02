import { useCallback } from "react";
import { useAuditLogStore } from "@/store/audit-log-store";

export function useAuditLog() {
  const addEntry = useAuditLogStore((state) => state.addEntry);

  const logAction = useCallback(
    (action: string, entityType: string, entityId: string, details: string) => {
      addEntry({ action, details, entityId, entityType });
    },
    [addEntry],
  );

  return { logAction };
}
