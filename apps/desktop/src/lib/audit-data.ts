import { invoke } from "@tauri-apps/api/core";
import type { AuditEntry } from "@/store/audit-log-store";
import { isTauriRuntime } from "./tauri-wrapper";

export type AuditEventRecord = {
  action: string;
  actorId: string | null;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
  payload: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  create: "Creazione",
  update: "Aggiornamento",
  delete: "Eliminazione",
  save: "Salvataggio",
  confirm: "Conferma",
  deduct: "Scarico magazzino",
  stock_adjust: "Rettifica giacenza",
};

const ENTITY_LABELS: Record<string, string> = {
  contract: "Contratto",
  sal: "SAL",
  project: "Progetto SAL",
  material: "Materiale",
  tariff_book: "Tariffario",
  member: "Membro team",
};

function formatAuditDetails(record: AuditEventRecord): string {
  const entity = ENTITY_LABELS[record.entityType] ?? record.entityType;
  const action = ACTION_LABELS[record.action] ?? record.action;
  return `${entity} · ${action} (${record.entityId})`;
}

export function mapAuditEventToEntry(record: AuditEventRecord): AuditEntry {
  return {
    action: ACTION_LABELS[record.action] ?? record.action,
    details: formatAuditDetails(record),
    entityId: record.entityId,
    entityType: record.entityType,
    id: record.id,
    timestamp: record.createdAt,
  };
}

export async function listDesktopAuditEvents(limit = 100): Promise<AuditEntry[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  const records = await invoke<AuditEventRecord[]>("list_audit_events", { limit });
  return records.map(mapAuditEventToEntry);
}
