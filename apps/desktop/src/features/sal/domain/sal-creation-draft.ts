import { readJsonFromStorage, STORAGE_KEYS, writeJsonToStorage } from "@/persistence";
import type { SalEconomicRules, SalLineDraft, SalVoiceDraft } from "../types";
import type { SalDocument } from "./sal-workflow";

type SalCreationDraft = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  materialUsage: Record<string, number>;
  materials?: { code: string; description: string; id: string; unit: string }[];
  phase: "context" | "voices" | "review" | "confirm" | "completed";
  projectId: string;
  salDate: string;
  salTitle: string;
  selectedTariffBookIds: string[];
};

const SAL_DRAFT_STORAGE_KEY = STORAGE_KEYS.salCreationDraft;

type StoredSalDraft = Omit<SalCreationDraft, "projectId">;

export function saveSalCreationDraft(projectId: string, data: StoredSalDraft) {
  try {
    const existing = readJsonFromStorage<Record<string, StoredSalDraft>>(
      localStorage,
      SAL_DRAFT_STORAGE_KEY,
      {},
      isDraftRecord,
    );
    existing[projectId] = data;
    writeJsonToStorage(localStorage, SAL_DRAFT_STORAGE_KEY, existing);
  } catch {
    /* no-op */
  }
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
  try {
    const all = readJsonFromStorage<Record<string, StoredSalDraft>>(
      localStorage,
      SAL_DRAFT_STORAGE_KEY,
      {},
      isDraftRecord,
    );
    delete all[projectId];
    writeJsonToStorage(localStorage, SAL_DRAFT_STORAGE_KEY, all);
  } catch {
    /* no-op */
  }
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

    return [
      {
        id: line.id,
        factor1: line.quantity,
        factor2: 1,
        factor3: 1,
        notes: "",
        quantity: line.quantity,
        sourceType: "voice",
        surchargePercent: line.surcharge === "night" ? 20 : line.surcharge === "day" ? 10 : 0,
        voice,
      },
    ];
  });
}
