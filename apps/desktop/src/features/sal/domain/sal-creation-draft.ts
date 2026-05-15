import type { SalEconomicRules, SalLineDraft, SalVoiceDraft } from "../types";
import type { SalDocument } from "./sal-workflow";

type SalCreationDraft = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  materialUsage: Record<string, number>;
  materials?: { code: string; description: string; id: string; unit: string }[];
  phase: "context" | "voices" | "review" | "confirm" | "completed";
  projectId: string;
  salTitle: string;
  selectedTariffBookIds: string[];
};

const SAL_DRAFT_STORAGE_KEY = "quantara.salCreationDraft.v1";

type StoredSalDraft = Omit<SalCreationDraft, "projectId">;

export function saveSalCreationDraft(projectId: string, data: StoredSalDraft) {
  try {
    const existing: Record<string, StoredSalDraft> = JSON.parse(
      localStorage.getItem(SAL_DRAFT_STORAGE_KEY) ?? "{}",
    );
    existing[projectId] = data;
    localStorage.setItem(SAL_DRAFT_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    /* no-op */
  }
}

export function saveSalCreationDraftBySalId(salId: string, data: StoredSalDraft) {
  saveSalCreationDraft(`sal:${salId}`, data);
}

export function loadSalCreationDraft(projectId: string): StoredSalDraft | null {
  try {
    const all: Record<string, StoredSalDraft> = JSON.parse(
      localStorage.getItem(SAL_DRAFT_STORAGE_KEY) ?? "{}",
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
    const all: Record<string, StoredSalDraft> = JSON.parse(
      localStorage.getItem(SAL_DRAFT_STORAGE_KEY) ?? "{}",
    );
    delete all[projectId];
    localStorage.setItem(SAL_DRAFT_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* no-op */
  }
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
