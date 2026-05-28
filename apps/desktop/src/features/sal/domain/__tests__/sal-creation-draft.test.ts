import { describe, expect, it } from "vitest";
import type { SalDocument, SalEconomicRules, SalLineDraft } from "../../types";
import { defaultSalEconomicRules } from "../sal-calculations";
import {
  applyMgManualAllocation,
  buildSalResumeState,
  mergeResumeEconomicRules,
  mergeStoredSalDrafts,
  normalizeMgManualAllocations,
  prepareEconomicRulesForDraftPersist,
  rebuildMgLineAllocationsFromVoiceIds,
  remapMgManualAllocations,
  resolveMgLineAllocationsFromVoices,
  saveSalCreationDraftBySalId,
  syncMgVoiceAllocations,
} from "../sal-creation-draft";

function rules(overrides: Partial<SalEconomicRules> = {}): SalEconomicRules {
  return { ...defaultSalEconomicRules, ...overrides };
}

function line(id: string, voiceId: string, code = "FA.01.01"): SalLineDraft {
  return {
    id,
    measurementRows: [],
    notes: "",
    sourceType: "voice",
    surchargePercent: 0,
    voice: {
      category: "FA",
      code,
      description: "Voce",
      id: voiceId,
      isSafetyCost: false,
      laborPercentage: 0,
      source: {} as never,
      tariffBookId: "tb1",
      tariffBookName: "Tariffario",
      tariffYear: 2026,
      unit: "m",
      unitPrice: 10,
    },
  };
}

describe("sal-creation-draft resume helpers", () => {
  it("mergeResumeEconomicRules keeps non-empty mg allocations from any source", () => {
    const merged = mergeResumeEconomicRules(
      rules({ mgManualAllocations: { mg1: [] } }),
      rules({ mgManualAllocations: { mg1: ["fa1"], mg2: ["fa2"] } }),
    );
    expect(merged.mgManualAllocations).toEqual({ mg1: ["fa1"], mg2: ["fa2"] });
  });

  it("remapMgManualAllocations maps line ids by voice id", () => {
    const prior = [line("mg-old", "mg-voice", "FA.MG.01"), line("fa-old", "fa-voice")];
    const next = [line("mg-new", "mg-voice", "FA.MG.01"), line("fa-new", "fa-voice")];
    const remapped = remapMgManualAllocations(
      rules({ mgManualAllocations: { "mg-old": ["fa-old"] } }),
      prior,
      next,
    );
    expect(remapped.mgManualAllocations).toEqual({ "mg-new": ["fa-new"] });
  });

  it("resolveMgLineAllocationsFromVoices rebuilds line ids from voice ids", () => {
    const prior = [line("mg-old", "mg-voice", "FA.MG.01"), line("fa-old", "fa-voice")];
    const next = [line("mg-new", "mg-voice", "FA.MG.01"), line("fa-new", "fa-voice")];
    const resolved = resolveMgLineAllocationsFromVoices(
      rules({
        mgManualAllocations: { "mg-old": ["fa-old"] },
        mgManualAllocationsByVoiceId: { "mg-voice": ["fa-voice"] },
      }),
      next,
    );
    expect(resolved.mgManualAllocations).toEqual({ "mg-new": ["fa-new"] });
    expect(prior).toHaveLength(2);
  });

  it("normalizeMgManualAllocations keeps non-empty allocations for present MG lines", () => {
    const mgLine = line("mg1", "mg-voice", "FA.MG.01");
    const faLine = line("fa1", "fa-voice", "FA.01.01");
    const normalized = normalizeMgManualAllocations(
      rules({ mgManualAllocations: { mg1: ["fa1", "missing"] } }),
      [mgLine, faLine],
    );
    expect(normalized.mgManualAllocations?.mg1).toEqual(["fa1"]);
  });

  it("applyMgManualAllocation updates rules for immediate persist", () => {
    const mgLine = line("mg1", "mg-voice", "FA.MG.01");
    const faLine = line("fa1", "fa-voice", "FA.01.01");
    const next = applyMgManualAllocation(rules(), [mgLine, faLine], "mg1", ["fa1"]);
    expect(next.mgManualAllocations?.mg1).toEqual(["fa1"]);
    expect(next.mgManualAllocationsByVoiceId?.["mg-voice"]).toEqual(["fa1"]);
  });

  it("syncMgVoiceAllocations mirrors line allocations by line id", () => {
    const lines = [line("mg1", "mg-voice", "FA.MG.01"), line("fa1", "fa-voice")];
    const synced = syncMgVoiceAllocations(rules({ mgManualAllocations: { mg1: ["fa1"] } }), lines);
    expect(synced.mgManualAllocationsByVoiceId).toEqual({ "mg-voice": ["fa1"] });
  });

  it("applyMgManualAllocation targets only the selected duplicate line", () => {
    const mgLine = line("mg1", "mg-voice", "FA.MG.01");
    const faFirst = line("fa1", "fa-voice", "FA.01.01");
    const faSecond = line("fa2", "fa-voice", "FA.01.01");
    const next = applyMgManualAllocation(rules(), [mgLine, faFirst, faSecond], "mg1", ["fa2"]);
    expect(next.mgManualAllocations?.mg1).toEqual(["fa2"]);
    const rebuilt = rebuildMgLineAllocationsFromVoiceIds(next, [mgLine, faFirst, faSecond]);
    expect(rebuilt.mgManualAllocations?.mg1).toEqual(["fa2"]);
  });

  it("resolveMgLineAllocationsFromVoices does not expand ambiguous voice id to every duplicate line", () => {
    const mgLine = line("mg1", "mg-voice", "FA.MG.01");
    const faFirst = line("fa1", "fa-voice", "FA.01.01");
    const faSecond = line("fa2", "fa-voice", "FA.01.01");
    const resolved = resolveMgLineAllocationsFromVoices(
      rules({
        mgManualAllocations: {},
        mgManualAllocationsByVoiceId: { "mg-voice": ["fa-voice"] },
      }),
      [mgLine, faFirst, faSecond],
    );
    expect(resolved.mgManualAllocations?.mg1).toBeUndefined();
  });

  it("prepareEconomicRulesForDraftPersist prefers per-line MG selection over stale voice-id map", () => {
    const mgLine = line("mg1", "mg-voice", "FA.MG.01");
    const faFirst = line("fa1", "fa-voice", "FA.01.01");
    const faSecond = line("fa2", "fa-voice", "FA.01.01");
    const prepared = prepareEconomicRulesForDraftPersist(
      {
        applyDiscountToSafetyCosts: false,
        discountEnabled: true,
        discountPercent: 10,
        rounding: "cent",
        mgManualAllocations: { mg1: ["fa2"] },
        mgManualAllocationsByVoiceId: { "mg-voice": ["fa-voice"] },
      },
      [mgLine, faFirst, faSecond],
    );
    expect(prepared.mgManualAllocations?.mg1).toEqual(["fa2"]);
    expect(prepared.mgManualAllocationsByVoiceId?.["mg-voice"]).toEqual(["fa2"]);
  });

  it("prepareEconomicRulesForDraftPersist rebuilds line map from voice ids when line map was cleared", () => {
    const mgLine = line("draft-mg", "tb::mg-v", "FA.MG.A.0100.A");
    const faLine = line("draft-fa", "tb::fa-v", "FA.AU.A.3001.A");
    const prepared = prepareEconomicRulesForDraftPersist(
      {
        applyDiscountToSafetyCosts: false,
        discountEnabled: true,
        discountPercent: 10,
        rounding: "cent",
        mgManualAllocations: {},
        mgManualAllocationsByVoiceId: { "tb::mg-v": ["tb::fa-v"] },
      },
      [faLine, mgLine],
    );
    expect(prepared.mgManualAllocations?.["draft-mg"]).toEqual(["draft-fa"]);
    expect(prepared.mgManualAllocationsByVoiceId?.["tb::mg-v"]).toEqual(["draft-fa"]);
  });

  it("prepareEconomicRulesForDraftPersist ignores stale empty line slots and keeps byVoiceId", () => {
    const mgLine = line("draft-mg", "tb::mg-v", "FA.MG.A.0100.A");
    const faLine = line("draft-fa", "tb::fa-v", "FA.AU.A.3001.A");
    const prepared = prepareEconomicRulesForDraftPersist(
      {
        applyDiscountToSafetyCosts: false,
        discountEnabled: true,
        discountPercent: 10,
        rounding: "cent",
        mgManualAllocations: { "draft-mg": [] },
        mgManualAllocationsByVoiceId: { "tb::mg-v": ["tb::fa-v"] },
      },
      [faLine, mgLine],
    );
    expect(prepared.mgManualAllocations?.["draft-mg"]).toEqual(["draft-fa"]);
    expect(prepared.mgManualAllocationsByVoiceId?.["tb::mg-v"]).toEqual(["draft-fa"]);
  });

  it("syncMgVoiceAllocations keeps line targets when line map has no mg entry", () => {
    const lines = [line("mg1", "mg-voice", "FA.MG.01"), line("fa1", "fa-voice")];
    const synced = syncMgVoiceAllocations(
      rules({
        mgManualAllocations: {},
        mgManualAllocationsByVoiceId: { "mg-voice": ["fa1"] },
      }),
      lines,
    );
    expect(synced.mgManualAllocationsByVoiceId?.["mg-voice"]).toEqual(["fa1"]);
  });

  it("buildSalResumeState restores document lines when resume voices match", () => {
    const voice = line("fa1", "fa-voice").voice;
    const draftSal = {
      date: "2026-05-01",
      description: "SAL",
      id: "sal-1",
      lines: [
        {
          id: "fa1",
          quantity: 2,
          surcharge: "none" as const,
          voiceId: "fa-voice",
          measurementRows: [
            {
              id: "r1",
              voiceId: "fa-voice",
              date: "2026-05-01",
              description: "Misura",
              factor1: 2,
              factor2: 1,
              factor3: 1,
              partialQuantity: 2,
              unit: "m",
              order: 0,
            },
          ],
        },
      ],
      notes: "",
      projectId: "proj-1",
      status: "draft" as const,
      title: "SAL 01",
    } satisfies SalDocument;

    const state = buildSalResumeState({
      draftSal,
      projectId: "proj-1",
      projectSalTitle: "SAL",
      resumeSalId: "sal-1",
      resumeVoices: [voice],
    });

    expect(state?.lines).toHaveLength(1);
    expect(state?.lines[0]?.measurementRows[0]?.partialQuantity).toBe(2);
  });

  it("prefers SQLite title and merges MG rules from local sal draft supplement", () => {
    const voiceDraft = line("fa1", "fa-voice").voice;
    const draftSal = {
      date: "2026-05-01",
      description: "From DB",
      id: "sal-1",
      lines: [
        {
          id: "fa1",
          quantity: 5,
          surcharge: "none" as const,
          voiceId: "fa-voice",
        },
      ],
      notes: "",
      projectId: "proj-1",
      status: "draft" as const,
      title: "SAL DB",
    } satisfies SalDocument;

    const mgLine = line("mg-line", "mg-voice", "FA.MG.01");
    saveSalCreationDraftBySalId("sal-1", {
      economicRules: {
        applyDiscountToSafetyCosts: false,
        discountEnabled: false,
        discountPercent: 0,
        mgManualAllocations: { "mg-line": ["fa1"] },
        mgManualAllocationsByVoiceId: { "mg-voice": ["fa-voice"] },
        rounding: "cent",
      },
      lines: [line("fa1", "fa-voice"), mgLine],
      materialUsage: {},
      phase: "measure",
      salDate: "2026-05-01",
      salTitle: "Titolo locale errato",
      selectedTariffBookIds: ["tb1"],
    });

    const state = buildSalResumeState({
      draftSal: {
        ...draftSal,
        lines: [
          ...draftSal.lines,
          { id: "mg-line", quantity: 0, surcharge: "none" as const, voiceId: "mg-voice" },
        ],
      },
      projectId: "proj-1",
      projectSalTitle: "SAL generico progetto",
      resumeSalId: "sal-1",
      resumeVoices: [voiceDraft, mgLine.voice],
    });

    expect(state?.salTitle).toBe("SAL DB");
    expect(state?.economicRules.mgManualAllocations?.["mg-line"]).toEqual(["fa1"]);
    expect(state?.selectedTariffBookIds).toEqual(["tb1"]);
  });

  it("buildSalResumeState keeps MG from sal backup when SQLite economicRules are empty", () => {
    const fa = line("fa1", "fa-voice");
    const mg = line("mg-line", "mg-voice", "FA.MG.01");
    saveSalCreationDraftBySalId("sal-1", {
      economicRules: {
        applyDiscountToSafetyCosts: false,
        discountEnabled: true,
        discountPercent: 10,
        mgManualAllocations: { "mg-line": ["fa1"] },
        mgManualAllocationsByVoiceId: { "mg-voice": ["fa-voice"] },
        rounding: "cent",
      },
      lines: [fa, mg],
      materialUsage: {},
      phase: "measure",
      salDate: "2026-05-27",
      salTitle: "SAL locale",
      selectedTariffBookIds: [],
    });

    const draftSal = {
      date: "2026-05-27",
      description: "SAL",
      economicRules: {
        applyDiscountToSafetyCosts: false,
        discountEnabled: true,
        discountPercent: 10,
        mgManualAllocations: {},
        rounding: "cent",
      },
      id: "sal-1",
      lines: [
        {
          id: "fa1",
          quantity: 1,
          surcharge: "none" as const,
          voiceId: "fa-voice",
        },
      ],
      notes: "",
      projectId: "proj-1",
      status: "draft" as const,
      title: "SAL DB",
    } satisfies SalDocument;

    const state = buildSalResumeState({
      draftSal,
      projectId: "proj-1",
      projectSalTitle: "SAL",
      resumeSalId: "sal-1",
      resumeVoices: [fa.voice, mg.voice],
    });

    expect(state?.economicRules.mgManualAllocationsByVoiceId?.["mg-voice"]).toEqual(["fa1"]);
    expect(state?.economicRules.mgManualAllocations?.["mg-line"]).toEqual(["fa1"]);
  });

  it("mergeStoredSalDrafts prefers draft with lines and merges mg rules", () => {
    const merged = mergeStoredSalDrafts(
      {
        economicRules: rules({ mgManualAllocations: { mg1: ["fa1"] } }),
        lines: [],
        materialUsage: {},
        phase: "project",
        salDate: "2026-05-01",
        salTitle: "SAL 01",
        selectedTariffBookIds: [],
      },
      {
        economicRules: rules({ mgManualAllocations: { mg1: [] } }),
        lines: [line("fa1", "fa-voice")],
        materialUsage: {},
        phase: "measure",
        salDate: "2026-05-02",
        salTitle: "SAL 02",
        selectedTariffBookIds: ["tb1"],
      },
    );
    expect(merged?.lines).toHaveLength(1);
    expect(merged?.economicRules.mgManualAllocations).toEqual({ mg1: ["fa1"] });
    expect(merged?.phase).toBe("measure");
  });

  it("mergeStoredSalDrafts keeps the draft with the most lines when several exist", () => {
    const merged = mergeStoredSalDrafts(
      {
        economicRules: rules({ mgManualAllocations: {} }),
        lines: [line("fa1", "fa-voice")],
        materialUsage: {},
        phase: "measure",
        salDate: "2026-05-01",
        salTitle: "SAL vecchia",
        selectedTariffBookIds: [],
      },
      {
        economicRules: rules({ mgManualAllocations: {} }),
        lines: [line("fa1", "fa-voice"), line("fa2", "fa-voice")],
        materialUsage: {},
        phase: "measure",
        salDate: "2026-05-02",
        salTitle: "SAL aggiornata",
        selectedTariffBookIds: [],
      },
    );
    expect(merged?.lines.map((entry) => entry.id)).toEqual(["fa1", "fa2"]);
  });
});
