import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import {
  loadSalCreationDraft,
  loadSalCreationDraftBySalId,
  persistSalCreationLocalDraft,
} from "../sal-creation-draft";
import type { SalLineDraft } from "../../types";

function line(id: string, voiceId: string, code = "FA.MG.01"): SalLineDraft {
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
      unit: "%",
      unitPrice: 12,
    },
  };
}

describe("persistSalCreationLocalDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes project and sal-scoped keys with synced MG rules", () => {
    const mgLine = line("mg1", "mg-voice", "FA.MG.01");
    const faLine = line("fa1", "fa-voice", "FA.01.01");

    persistSalCreationLocalDraft({
      projectId: "proj-1",
      salId: "sal-1",
      draft: {
        economicRules: {
          applyDiscountToSafetyCosts: false,
          discountEnabled: false,
          discountPercent: 0,
          mgManualAllocations: { mg1: ["fa1"] },
          rounding: "cent",
        },
        lines: [mgLine, faLine],
        materialUsage: {},
        phase: "measure",
        salDate: "2026-05-01",
        salTitle: "SAL 01",
        selectedTariffBookIds: ["tb1"],
      },
    });

    const byProject = loadSalCreationDraft("proj-1");
    const bySal = loadSalCreationDraftBySalId("sal-1");

    expect(byProject?.economicRules.mgManualAllocations?.mg1).toEqual(["fa1"]);
    expect(bySal?.economicRules.mgManualAllocationsByVoiceId?.["mg-voice"]).toEqual(["fa1"]);
    expect(localStorage.getItem(STORAGE_KEYS.salCreationDraft)).toContain("sal:sal-1");
  });
});
