import { readJsonFromStorage, writeJsonToStorage } from "@/persistence/json-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import type {
  SalEconomicRules,
  SalLineDraft,
  SalMeasurementRowDraft,
  SalVoiceDraft,
} from "../types";
import type { SalWorkflowPhase } from "../state/workflow";
import type { SalDocument } from "./sal-workflow";

type SalCreationDraft = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  materialUsage: Record<string, number>;
  materials?: { code: string; description: string; id: string; unit: string }[];
  phase: SalWorkflowPhase;
  projectId: string;
  salDate: string;
  salTitle: string;
  selectedTariffBookIds: string[];
};

const SAL_DRAFT_STORAGE_KEY = STORAGE_KEYS.salCreationDraft;

type StoredSalDraft = Omit<SalCreationDraft, "projectId">;

export function saveSalCreationDraft(projectId: string, data: StoredSalDraft) {
  const existing = readJsonFromStorage<Record<string, StoredSalDraft>>(
    localStorage,
    SAL_DRAFT_STORAGE_KEY,
    {},
    isDraftRecord,
  );
  existing[projectId] = data;
  writeJsonToStorage(localStorage, SAL_DRAFT_STORAGE_KEY, existing);
}

export function saveSalCreationDraftBySalId(salId: string, data: StoredSalDraft) {
  saveSalCreationDraft(`sal:${salId}`, data);
}

export function loadSalCreationDraft(projectId: string): StoredSalDraft | null {
  try {
    const all = readJsonFromStorage<Record<string, StoredSalDraft>>(
      localStorage,
      SAL_DRAFT_STORAGE_KEY,
      {},
      isDraftRecord,
    );
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

export function loadSalCreationDraftBySalId(salId: string): StoredSalDraft | null {
  return loadSalCreationDraft(`sal:${salId}`);
}

export function clearSalCreationDraft(projectId: string) {
  const all = readJsonFromStorage<Record<string, StoredSalDraft>>(
    localStorage,
    SAL_DRAFT_STORAGE_KEY,
    {},
    isDraftRecord,
  );
  delete all[projectId];
  writeJsonToStorage(localStorage, SAL_DRAFT_STORAGE_KEY, all);
}

function isDraftRecord(value: unknown): value is Record<string, StoredSalDraft> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function clearSalCreationDraftBySalId(salId: string) {
  clearSalCreationDraft(`sal:${salId}`);
}

export function lineDraftsFromStoredSal(
  sal: SalDocument,
  voices: readonly SalVoiceDraft[],
): SalLineDraft[] {
  const voiceById = new Map(voices.map((voice) => [voice.id, voice]));

  return sal.lines.flatMap((line) => {
    const voice = voiceById.get(line.voiceId);
    if (!voice) return [];

    // Migration: if the saved line has measurementRows, use them
    if (line.measurementRows && line.measurementRows.length > 0) {
      const rows: SalMeasurementRowDraft[] = line.measurementRows.map((r, idx) => ({
        date: r.date,
        day: r.day,
        description: r.description,
        factor1: r.factor1,
        factor2: r.factor2,
        factor3: r.factor3,
        flag: r.flag,
        from: r.from,
        id: r.id,
        notes: r.notes ?? "",
        order: r.order ?? idx,
        partialQuantity: r.partialQuantity,
        station: r.station,
        section: r.section,
        unit: r.unit,
      }));
      return [
        {
          id: line.id,
          measurementRows: rows,
          notes: line.notes ?? "",
          sourceType: "voice",
          surchargePercent: line.surchargePercent ?? getSurchargePercentFromKind(line.surcharge),
          voice,
        },
      ];
    }

    // Legacy migration: create a single synthetic measurement row from the saved quantity
    const migratedRow: SalMeasurementRowDraft = {
      date: new Date().toISOString().slice(0, 10),
      description: "Misura corrente",
      factor1: line.quantity,
      factor2: 1,
      factor3: 1,
      id: `${line.id}-migrated`,
      notes: "",
      order: 0,
      partialQuantity: line.quantity,
      unit: voice.unit,
    };

    return [
      {
        id: line.id,
        measurementRows: [migratedRow],
        notes: "",
        sourceType: "voice",
        surchargePercent: line.surchargePercent ?? getSurchargePercentFromKind(line.surcharge),
        voice,
      },
    ];
  });
}

function getSurchargePercentFromKind(kind: string): number {
  return kind === "night" ? 20 : kind === "day" ? 10 : 0;
}
