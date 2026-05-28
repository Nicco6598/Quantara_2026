import { readJsonFromStorage, writeJsonToStorage } from "@/persistence/json-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import type { SalWorkflowPhase } from "../state/workflow";
import type {
  SalEconomicRules,
  SalLineDraft,
  SalMeasurementRowDraft,
  SalVoiceDraft,
} from "../types";
import { defaultSalEconomicRules, isMgVoice } from "./sal-calculations";
import {
  extractSnapshotVoicesFromSal,
  resolveVoiceForSalLine,
  voiceIdsMatch,
  voicesFromSalLines,
} from "./sal-voice-resolve";
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

export type StoredSalDraft = Omit<SalCreationDraft, "projectId">;

export function mgEconomicRulesScore(rules: SalEconomicRules | undefined): number {
  const alloc = rules?.mgManualAllocations ?? {};
  let nonEmpty = 0;
  let keys = 0;
  for (const targets of Object.values(alloc)) {
    keys += 1;
    if (targets.length > 0) nonEmpty += 1;
  }
  return nonEmpty * 1000 + keys;
}

export function countMgNonEmptyAllocations(rules: SalEconomicRules | undefined): number {
  return Object.values(rules?.mgManualAllocations ?? {}).filter((targets) => targets.length > 0)
    .length;
}

function countMgNonEmptyVoiceAllocations(rules: SalEconomicRules | undefined): number {
  return Object.values(rules?.mgManualAllocationsByVoiceId ?? {}).filter(
    (targets) => targets.length > 0,
  ).length;
}

export function mgRulesQualityScore(rules: SalEconomicRules | undefined): number {
  return (
    countMgNonEmptyVoiceAllocations(rules) * 10_000 +
    countMgNonEmptyAllocations(rules) * 1_000 +
    mgEconomicRulesScore(rules)
  );
}

/** Document lines win per id; supplement adds MG rows and extra SAL line instances (duplicates). */
export function mergeResumeLineDrafts(
  primary: readonly SalLineDraft[],
  supplement: readonly SalLineDraft[],
): SalLineDraft[] {
  const byLineId = new Map<string, SalLineDraft>();
  for (const line of primary) {
    byLineId.set(line.id, line);
  }
  for (const line of supplement) {
    const existing = byLineId.get(line.id);
    if (!existing) {
      byLineId.set(line.id, line);
      continue;
    }
    if (isMgVoice(line.voice)) {
      byLineId.set(line.id, line);
    }
  }
  return [...byLineId.values()];
}

function lookupVoiceAllocTargets(
  alloc: Record<string, string[]>,
  voiceId: string,
): string[] | undefined {
  if (alloc[voiceId]?.length) return alloc[voiceId];
  const suffix = voiceId.split("::").pop();
  if (suffix && suffix !== voiceId && alloc[suffix]?.length) return alloc[suffix];
  for (const [key, targets] of Object.entries(alloc)) {
    if (targets.length > 0 && voiceIdsMatch(key, voiceId)) return targets;
  }
  return undefined;
}

/** Resolve allocation targets: prefer SAL line ids; legacy voice ids only when unambiguous (never all duplicates). */
export function resolveTargetLineIdsFromRefs(
  refs: readonly string[],
  lines: readonly SalLineDraft[],
): string[] {
  const lineIds = new Set(lines.map((line) => line.id));
  const resolved: string[] = [];
  for (const ref of refs) {
    if (lineIds.has(ref)) {
      resolved.push(ref);
      continue;
    }
    const matches = lines.filter(
      (line) => !isMgVoice(line.voice) && voiceIdsMatch(line.voice.id, ref),
    );
    if (matches.length === 1) {
      const match = matches[0];
      if (match) resolved.push(match.id);
    }
  }
  return [...new Set(resolved)];
}

/** Rebuild line-id map from voice-id map (stable across resume). */
export function rebuildMgLineAllocationsFromVoiceIds(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
): SalEconomicRules {
  const voiceAlloc = rules.mgManualAllocationsByVoiceId ?? {};
  const lineIds = new Set(lines.map((line) => line.id));
  const mgLines = lines.filter((line) => isMgVoice(line.voice));
  const allocs: Record<string, string[]> = {};

  for (const mgLine of mgLines) {
    const fromVoice = lookupVoiceAllocTargets(voiceAlloc, mgLine.voice.id);
    if (fromVoice && fromVoice.length > 0) {
      const mapped = resolveTargetLineIdsFromRefs(fromVoice, lines);
      if (mapped.length > 0) {
        allocs[mgLine.id] = mapped;
        continue;
      }
    }

    const fromLine = rules.mgManualAllocations?.[mgLine.id];
    if (fromLine && fromLine.length > 0) {
      allocs[mgLine.id] = fromLine.filter((lineId) => lineIds.has(lineId));
      continue;
    }

    for (const [mgLineId, targetLineIds] of Object.entries(rules.mgManualAllocations ?? {})) {
      if (!targetLineIds.length) continue;
      const priorMg = lines.find((line) => line.id === mgLineId);
      if (priorMg && voiceIdsMatch(priorMg.voice.id, mgLine.voice.id)) {
        allocs[mgLine.id] = targetLineIds.filter((lineId) => lineIds.has(lineId));
        break;
      }
    }
  }

  return { ...rules, mgManualAllocations: allocs };
}

export function restoreMgRulesForLines(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
  priorLines: readonly SalLineDraft[] = [],
): SalEconomicRules {
  const remapped = remapMgManualAllocations(rules, priorLines, lines);
  const rebuilt = rebuildMgLineAllocationsFromVoiceIds(remapped, lines);
  return resolveMgLineAllocationsFromVoices(rebuilt, lines);
}

/** Add MG tariff lines when allocations exist but the MG row was not in the SQLite snapshot. */
export function ensureMgLinesForRules(
  lines: readonly SalLineDraft[],
  rules: SalEconomicRules,
  catalog: readonly SalVoiceDraft[],
): SalLineDraft[] {
  const voiceAlloc = rules.mgManualAllocationsByVoiceId ?? {};
  const hasTargets = Object.values(voiceAlloc).some((targets) => targets.length > 0);
  if (!hasTargets) return [...lines];

  const byVoiceId = new Map(lines.map((line) => [line.voice.id, line]));
  const result = [...lines];

  for (const mgVoiceId of Object.keys(voiceAlloc)) {
    if (!voiceAlloc[mgVoiceId]?.length || byVoiceId.has(mgVoiceId)) continue;
    const voice =
      catalog.find((entry) => entry.id === mgVoiceId) ??
      catalog.find((entry) => isMgVoice(entry) && voiceIdsMatch(entry.id, mgVoiceId));
    if (!voice || !isMgVoice(voice)) continue;
    result.push({
      id: `draft-${voice.id}`,
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice,
    });
  }

  return result;
}

export function applyMgManualAllocation(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
  mgLineId: string,
  targetLineIds: string[],
): SalEconomicRules {
  const mgLine = lines.find((line) => line.id === mgLineId);
  const nextAlloc = { ...(rules.mgManualAllocations ?? {}) };
  const nextByVoice = { ...(rules.mgManualAllocationsByVoiceId ?? {}) };
  const normalizedTargets = resolveTargetLineIdsFromRefs(targetLineIds, lines);

  if (normalizedTargets.length === 0) {
    delete nextAlloc[mgLineId];
    if (mgLine && isMgVoice(mgLine.voice)) {
      for (const key of Object.keys(nextByVoice)) {
        if (voiceIdsMatch(key, mgLine.voice.id)) {
          delete nextByVoice[key];
        }
      }
    }
  } else {
    nextAlloc[mgLineId] = normalizedTargets;
  }

  return syncMgVoiceAllocations(
    {
      ...rules,
      mgManualAllocations: nextAlloc,
      mgManualAllocationsByVoiceId: nextByVoice,
    },
    lines,
  );
}

export function mergeResumeEconomicRules(
  ...sources: (SalEconomicRules | undefined)[]
): SalEconomicRules {
  const present = sources.filter((rules): rules is SalEconomicRules => rules != null);
  if (present.length === 0) {
    return defaultSalEconomicRules;
  }

  const richest = present.reduce((best, current) =>
    mgRulesQualityScore(current) > mgRulesQualityScore(best) ? current : best,
  );

  const mergedAlloc: Record<string, string[]> = {};
  const mergedVoiceAlloc: Record<string, string[]> = {};
  for (const rules of present) {
    for (const [lineId, targets] of Object.entries(rules.mgManualAllocations ?? {})) {
      if (targets.length === 0) continue;
      const existing = mergedAlloc[lineId];
      if (!existing || existing.length === 0) {
        mergedAlloc[lineId] = [...targets];
      }
    }
    for (const [voiceId, targets] of Object.entries(rules.mgManualAllocationsByVoiceId ?? {})) {
      if (targets.length === 0) continue;
      const existing = mergedVoiceAlloc[voiceId];
      if (!existing || existing.length === 0) {
        mergedVoiceAlloc[voiceId] = [...targets];
      }
    }
  }

  const result: SalEconomicRules = { ...richest };
  if (Object.keys(mergedAlloc).length > 0) {
    result.mgManualAllocations = mergedAlloc;
  }
  if (Object.keys(mergedVoiceAlloc).length > 0) {
    result.mgManualAllocationsByVoiceId = mergedVoiceAlloc;
  }
  return result;
}

export function collectPriorLinesForRemap(
  ...drafts: (StoredSalDraft | null | undefined)[]
): SalLineDraft[] {
  const byVoiceId = new Map<string, SalLineDraft>();
  for (const draft of drafts) {
    if (!draft) continue;
    for (const line of draft.lines) {
      byVoiceId.set(line.voice.id, line);
    }
  }
  return [...byVoiceId.values()];
}

export function remapMgManualAllocations(
  rules: SalEconomicRules,
  priorLines: readonly SalLineDraft[],
  nextLines: readonly SalLineDraft[],
): SalEconomicRules {
  const allocations = rules.mgManualAllocations;
  if (!allocations || Object.keys(allocations).length === 0) {
    return rules;
  }

  const priorLineById = new Map(priorLines.map((line) => [line.id, line]));
  const nextIdByVoiceId = new Map(nextLines.map((line) => [line.voice.id, line.id]));

  const resolveNextLineId = (lineId: string): string | undefined => {
    if (nextLines.some((line) => line.id === lineId)) {
      return lineId;
    }
    const prior = priorLineById.get(lineId);
    if (prior) {
      return nextIdByVoiceId.get(prior.voice.id);
    }
    return undefined;
  };

  const remapped: Record<string, string[]> = {};
  for (const [mgLineId, targetIds] of Object.entries(allocations)) {
    const nextMgLineId = resolveNextLineId(mgLineId);
    if (!nextMgLineId) continue;
    remapped[nextMgLineId] = targetIds
      .map((targetId) => resolveNextLineId(targetId))
      .filter((targetId): targetId is string => Boolean(targetId));
  }

  return { ...rules, mgManualAllocations: remapped };
}

function stripEmptyMgLineAllocations(rules: SalEconomicRules): SalEconomicRules {
  const mgManualAllocations = Object.fromEntries(
    Object.entries(rules.mgManualAllocations ?? {}).filter(([, targets]) => targets.length > 0),
  );
  if (Object.keys(mgManualAllocations).length === 0) {
    if (!rules.mgManualAllocations) {
      return rules;
    }
    const { mgManualAllocations: _removed, ...rest } = rules;
    return rest;
  }
  return { ...rules, mgManualAllocations };
}

export function syncMgVoiceAllocations(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
): SalEconomicRules {
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const byVoice: Record<string, string[]> = { ...(rules.mgManualAllocationsByVoiceId ?? {}) };

  for (const [mgLineId, targetLineIds] of Object.entries(rules.mgManualAllocations ?? {})) {
    const mgLine = lineById.get(mgLineId);
    if (!mgLine || !isMgVoice(mgLine.voice)) continue;
    if (targetLineIds.length === 0) {
      const preserved = lookupVoiceAllocTargets(byVoice, mgLine.voice.id);
      if (preserved && preserved.length > 0) {
        continue;
      }
      delete byVoice[mgLine.voice.id];
      continue;
    }
    byVoice[mgLine.voice.id] = resolveTargetLineIdsFromRefs(targetLineIds, lines);
  }

  const result: SalEconomicRules = { ...rules };
  if (Object.keys(byVoice).length > 0) {
    result.mgManualAllocationsByVoiceId = byVoice;
  }
  return result;
}

export function resolveMgLineAllocationsFromVoices(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
): SalEconomicRules {
  const voiceAlloc = rules.mgManualAllocationsByVoiceId;
  const lineIds = new Set(lines.map((line) => line.id));
  const mgLines = lines.filter((line) => isMgVoice(line.voice));
  const lineAlloc = rules.mgManualAllocations ?? {};

  const allocs: Record<string, string[]> = {};

  for (const mgLine of mgLines) {
    const fromLine = lineAlloc[mgLine.id];
    if (fromLine && fromLine.length > 0) {
      allocs[mgLine.id] = fromLine.filter((lineId) => lineIds.has(lineId));
      continue;
    }

    if (voiceAlloc && Object.keys(voiceAlloc).length > 0) {
      const fromVoice = lookupVoiceAllocTargets(voiceAlloc, mgLine.voice.id);
      if (fromVoice && fromVoice.length > 0) {
        const mapped = resolveTargetLineIdsFromRefs(fromVoice, lines);
        if (mapped.length > 0) {
          allocs[mgLine.id] = mapped;
        }
      }
    }
  }

  return normalizeMgManualAllocations({ ...rules, mgManualAllocations: allocs }, lines);
}

export function normalizeMgManualAllocations(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
): SalEconomicRules {
  const lineIds = new Set(lines.map((line) => line.id));
  const mgLines = lines.filter((line) => isMgVoice(line.voice));
  const allocs: Record<string, string[]> = {};

  for (const [mgLineId, targets] of Object.entries(rules.mgManualAllocations ?? {})) {
    if (targets.length === 0) continue;
    const filtered = targets.filter((lineId) => lineIds.has(lineId));
    if (filtered.length > 0) {
      allocs[mgLineId] = filtered;
    }
  }

  for (const mgLine of mgLines) {
    if (mgLine.id in allocs) continue;
    const fromVoice = lookupVoiceAllocTargets(
      rules.mgManualAllocationsByVoiceId ?? {},
      mgLine.voice.id,
    );
    if (fromVoice && fromVoice.length > 0) {
      const mapped = resolveTargetLineIdsFromRefs(fromVoice, lines);
      if (mapped.length > 0) {
        allocs[mgLine.id] = mapped;
        continue;
      }
    }
    const existing = rules.mgManualAllocations?.[mgLine.id] ?? [];
    const filtered = existing.filter((lineId) => lineIds.has(lineId));
    if (filtered.length > 0) {
      allocs[mgLine.id] = filtered;
    }
  }

  return syncMgVoiceAllocations({ ...rules, mgManualAllocations: allocs }, lines);
}

function mergeVoiceDraftsById(...groups: readonly (readonly SalVoiceDraft[])[]): SalVoiceDraft[] {
  const byId = new Map<string, SalVoiceDraft>();
  for (const group of groups) {
    for (const voice of group) {
      byId.set(voice.id, voice);
    }
  }
  return [...byId.values()];
}

export function buildSalResumeState(input: {
  draftSal?: SalDocument | null;
  projectId: string;
  projectSalTitle: string;
  resumeSalId: string;
  resumeVoices: SalVoiceDraft[];
}): StoredSalDraft | null {
  const { draftSal, projectId, projectSalTitle, resumeSalId, resumeVoices } = input;
  const draftBySal = loadSalCreationDraftBySalId(resumeSalId);
  const draftByProject = loadSalCreationDraft(projectId);
  const mergedLocal = mergeStoredSalDrafts(draftBySal, draftByProject);

  if (!mergedLocal && !draftSal) {
    return null;
  }

  const priorLines = collectPriorLinesForRemap(draftBySal, draftByProject);
  const mergedRules = mergeResumeEconomicRules(
    mergedLocal?.economicRules,
    draftBySal?.economicRules,
    draftByProject?.economicRules,
    draftSal?.economicRules,
  );

  const snapshotVoices = draftSal ? extractSnapshotVoicesFromSal(draftSal) : [];
  const embeddedVoices = mergeVoiceDraftsById(
    resumeVoices,
    snapshotVoices,
    voicesFromSalLines(draftSal?.lines ?? [], resumeVoices),
    draftBySal?.lines.map((line) => line.voice) ?? [],
    draftByProject?.lines.map((line) => line.voice) ?? [],
    mergedLocal?.lines.map((line) => line.voice) ?? [],
  );

  const fromDocument =
    draftSal && draftSal.lines.length > 0 ? lineDraftsFromStoredSal(draftSal, embeddedVoices) : [];

  const supplementLines: SalLineDraft[] = [];
  const supplementLineIds = new Set<string>();
  for (const line of [...(mergedLocal?.lines ?? []), ...(draftBySal?.lines ?? []), ...priorLines]) {
    if (supplementLineIds.has(line.id)) continue;
    supplementLineIds.add(line.id);
    supplementLines.push(line);
  }

  const loadedLines =
    fromDocument.length > 0
      ? mergeResumeLineDrafts(fromDocument, supplementLines)
      : supplementLines.length > 0
        ? supplementLines
        : [];

  // Wait only when the document has lines but we cannot resolve them yet and no local fallback exists.
  if (
    loadedLines.length === 0 &&
    draftSal &&
    draftSal.lines.length > 0 &&
    embeddedVoices.length === 0
  ) {
    return null;
  }

  if (loadedLines.length === 0) {
    return null;
  }

  const linesWithMg = ensureMgLinesForRules(loadedLines, mergedRules, embeddedVoices);
  const economicRules = finalizeResumeEconomicRules(mergedRules, linesWithMg, priorLines);

  const resolvedTitle =
    draftSal?.title?.trim() ||
    mergedLocal?.salTitle?.trim() ||
    draftBySal?.salTitle?.trim() ||
    projectSalTitle;

  return {
    economicRules,
    lines: linesWithMg,
    materialUsage: mergedLocal?.materialUsage ?? draftBySal?.materialUsage ?? {},
    phase:
      mergedLocal?.phase ?? draftBySal?.phase ?? (loadedLines.length > 0 ? "measure" : "project"),
    salDate:
      mergedLocal?.salDate ??
      draftBySal?.salDate ??
      draftSal?.date ??
      new Date().toISOString().slice(0, 10),
    salTitle: resolvedTitle,
    selectedTariffBookIds:
      mergedLocal?.selectedTariffBookIds ?? draftBySal?.selectedTariffBookIds ?? [],
  };
}

export function mergeStoredSalDrafts(
  ...drafts: (StoredSalDraft | null | undefined)[]
): StoredSalDraft | null {
  const present = drafts.filter((draft): draft is StoredSalDraft => draft != null);
  if (present.length === 0) return null;

  const baseDraft = present.at(0);
  if (!baseDraft) return null;

  const lines = present.reduce<SalLineDraft[]>(
    (longest, draft) => (draft.lines.length > longest.length ? draft.lines : longest),
    [],
  );

  const economicRules = mergeResumeEconomicRules(...present.map((draft) => draft.economicRules));
  const materialUsage = present.reduce<Record<string, number>>((acc, draft) => {
    for (const [materialId, quantity] of Object.entries(draft.materialUsage)) {
      acc[materialId] = quantity;
    }
    return acc;
  }, {});
  const selectedTariffBookIds =
    present.find((draft) => draft.selectedTariffBookIds.length > 0)?.selectedTariffBookIds ?? [];

  const salDate = present.find((draft) => draft.salDate)?.salDate ?? baseDraft.salDate;
  const salTitle =
    present.find((draft) => draft.salTitle.trim().length > 0)?.salTitle ?? baseDraft.salTitle;
  const phase = present.reduce(
    (best, draft) => (getPhaseRank(draft.phase) > getPhaseRank(best) ? draft.phase : best),
    baseDraft.phase,
  );

  return {
    economicRules,
    lines,
    materialUsage,
    phase,
    salDate,
    salTitle,
    selectedTariffBookIds,
  };
}

function getPhaseRank(phase: SalWorkflowPhase): number {
  switch (phase) {
    case "confirm":
      return 4;
    case "verify":
      return 3;
    case "measure":
      return 2;
    case "project":
      return 1;
    default:
      return 0;
  }
}

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

/** Resume path: restore MG maps without letting normalize shrink richer rules. */
export function finalizeResumeEconomicRules(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
  priorLines: readonly SalLineDraft[] = [],
): SalEconomicRules {
  const restored = restoreMgRulesForLines(rules, lines, priorLines);
  const prepared = prepareEconomicRulesForDraftPersist(restored, lines);
  return mgRulesQualityScore(prepared) >= mgRulesQualityScore(restored) ? prepared : restored;
}

/** Normalize MG maps and sync voice ids before any draft write. */
export function prepareEconomicRulesForDraftPersist(
  rules: SalEconomicRules,
  lines: readonly SalLineDraft[],
): SalEconomicRules {
  const cleaned = stripEmptyMgLineAllocations(rules);
  const resolved = resolveMgLineAllocationsFromVoices(cleaned, lines);
  return syncMgVoiceAllocations(resolved, lines);
}

/** Persist creation draft to project key and optionally sal:{id} backup. */
export function persistSalCreationLocalDraft(input: {
  draft: StoredSalDraft;
  projectId: string;
  salId?: string | null;
}): void {
  const existing = input.salId
    ? loadSalCreationDraftBySalId(input.salId)
    : loadSalCreationDraft(input.projectId);
  const economicRules = prepareEconomicRulesForDraftPersist(
    mergeResumeEconomicRules(input.draft.economicRules, existing?.economicRules),
    input.draft.lines,
  );
  const payload: StoredSalDraft = { ...input.draft, economicRules };
  saveSalCreationDraft(input.projectId, payload);
  if (input.salId) {
    saveSalCreationDraftBySalId(input.salId, payload);
  }
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
  return sal.lines.flatMap((line) => {
    const voice = resolveVoiceForSalLine(line.voiceId, voices);
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
