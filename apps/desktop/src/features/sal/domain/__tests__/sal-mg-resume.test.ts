import { describe, expect, it } from "vitest";
import { defaultSalEconomicRules } from "../sal-calculations";
import {
  ensureMgLinesForRules,
  mergeResumeLineDrafts,
  rebuildMgLineAllocationsFromVoiceIds,
  restoreMgRulesForLines,
} from "../sal-creation-draft";
import type { SalLineDraft, SalVoiceDraft, SalEconomicRules } from "../../types";

function rules(overrides: Partial<SalEconomicRules> = {}): SalEconomicRules {
  return { ...defaultSalEconomicRules, ...overrides };
}

function voice(id: string, code: string): SalVoiceDraft {
  return {
    category: "FA",
    code,
    description: code,
    id,
    isSafetyCost: false,
    laborPercentage: 0,
    source: { isMaggiorazione: code.includes(".MG.") } as never,
    tariffBookId: "tb1",
    tariffBookName: "T",
    tariffYear: 2026,
    unit: "%",
    unitPrice: 12,
  };
}

function line(id: string, v: SalVoiceDraft): SalLineDraft {
  return {
    id,
    measurementRows: [],
    notes: "",
    sourceType: "voice",
    surchargePercent: 0,
    voice: v,
  };
}

describe("MG resume", () => {
  it("mergeResumeLineDrafts keeps MG lines from local supplement when SQLite lacks them", () => {
    const fa = line("fa-sql", voice("fa-v", "FA.01"));
    const mg = line("mg-local", voice("mg-v", "FA.MG.01"));
    const merged = mergeResumeLineDrafts([fa], [mg]);
    expect(merged).toHaveLength(2);
    expect(merged.some((entry) => entry.voice.code.includes("MG"))).toBe(true);
  });

  it("rebuildMgLineAllocationsFromVoiceIds maps stable voice ids to current line ids", () => {
    const fa = line("fa-new", voice("fa-v", "FA.01"));
    const mg = line("mg-new", voice("mg-v", "FA.MG.01"));
    const rebuilt = rebuildMgLineAllocationsFromVoiceIds(
      rules({ mgManualAllocationsByVoiceId: { "mg-v": ["fa-v"] } }),
      [mg, fa],
    );
    expect(rebuilt.mgManualAllocations?.["mg-new"]).toEqual(["fa-new"]);
  });

  it("rebuildMgLineAllocationsFromVoiceIds matches tariff book prefixed voice ids", () => {
    const fa = line("fa-new", voice("tb1::fa-v", "FA.01"));
    const mg = line("mg-new", voice("tb1::mg-v", "FA.MG.01"));
    const rebuilt = rebuildMgLineAllocationsFromVoiceIds(
      rules({ mgManualAllocationsByVoiceId: { "mg-v": ["fa-v"] } }),
      [mg, fa],
    );
    expect(rebuilt.mgManualAllocations?.["mg-new"]).toEqual(["fa-new"]);
  });

  it("ensureMgLinesForRules adds MG row from catalog when only voice alloc was saved", () => {
    const fa = line("fa1", voice("fa-v", "FA.01"));
    const catalog = [voice("mg-v", "FA.MG.01")];
    const withMg = ensureMgLinesForRules(
      [fa],
      rules({ mgManualAllocationsByVoiceId: { "mg-v": ["fa-v"] } }),
      catalog,
    );
    expect(withMg).toHaveLength(2);
    const restored = restoreMgRulesForLines(
      rules({ mgManualAllocationsByVoiceId: { "mg-v": ["fa-v"] } }),
      withMg,
    );
    const mgRow = withMg[1];
    expect(mgRow).toBeDefined();
    if (mgRow) {
      expect(restored.mgManualAllocations?.[mgRow.id]).toEqual(["fa1"]);
    }
  });
});
