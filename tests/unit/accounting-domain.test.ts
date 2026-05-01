import {
  calculateAccountingRowFinalPrice,
  eur,
  resolveTariffVoice,
  summarizeSal,
} from "@quantara/domain-utils";
import type { ContractRecord, SalRecord, TariffVoice } from "@quantara/shared-types";
import { describe, expect, it } from "vitest";

const contract: ContractRecord = {
  applicationContractCode: "CA-001",
  contractualAmount: eur(100000),
  frameworkAgreementCode: "AQ-001",
  id: "contract_test",
  tariffPriorities: [
    { priority: 1, reason: "Contratto", tariffBookId: "tariff_primary" },
    { priority: 2, reason: "Fallback", tariffBookId: "tariff_fallback" },
  ],
  title: "Contratto test",
};

const voices: readonly TariffVoice[] = [
  {
    category: "civil-works",
    description: "Voce fallback",
    id: "voice_fallback",
    isSafetyCost: false,
    laborSharePercent: 30,
    officialCode: "OP-001",
    tariffBookId: "tariff_fallback",
    unitOfMeasure: "m",
    unitPrice: eur(10),
  },
];
const fallbackVoice = voices[0] as TariffVoice;

describe("accounting domain", () => {
  it("resolves tariff voices by contract priority and fallback", () => {
    const resolution = resolveTariffVoice(contract, voices, "OP-001");

    expect(resolution?.source).toBe("fallback");
    expect(resolution?.voice.id).toBe("voice_fallback");
    expect(resolution?.trace).toHaveLength(2);
  });

  it("resolves the priority tariff before fallback when both books contain a voice", () => {
    const resolution = resolveTariffVoice(
      contract,
      [
        ...voices,
        {
          ...fallbackVoice,
          id: "voice_primary",
          tariffBookId: "tariff_primary",
          unitPrice: eur(12),
        },
      ],
      "op-001",
    );

    expect(resolution?.source).toBe("priority");
    expect(resolution?.voice.id).toBe("voice_primary");
    expect(resolution?.trace).toEqual(["Checked tariff_primary for op-001: hit"]);
  });

  it("returns null when no tariff priority contains the requested official code", () => {
    const resolution = resolveTariffVoice(contract, voices, "MISSING");

    expect(resolution).toBeNull();
  });

  it("guards accounting row totals against invalid or negative factors", () => {
    expect(calculateAccountingRowFinalPrice(10, 2, 3, 4, 5)).toBe(1200);
    expect(calculateAccountingRowFinalPrice(10, -1, 3, 4, 5)).toBe(0);
    expect(calculateAccountingRowFinalPrice(10, 1, Number.NaN, 4, 5)).toBe(0);
  });

  it("keeps OS safety costs outside tender and subcontract discounts", () => {
    const sal: SalRecord = {
      contractId: "contract_test",
      id: "sal_test",
      number: 1,
      periodEnd: "2026-01-31",
      periodStart: "2026-01-01",
      rows: [
        {
          activityDescription: "Lavorazione ribassabile",
          factors: { f1: 1, f2: 1, f3: 1, quantityReference: 1 },
          finalPrice: eur(100000),
          id: "row_1",
          isSafetyCost: false,
          salId: "sal_test",
          unitOfMeasure: "cad",
          unitPrice: eur(100000),
          voiceDescription: "Voce ordinaria",
          voiceId: "voice_fallback",
        },
        {
          activityDescription: "Oneri sicurezza",
          factors: { f1: 1, f2: 1, f3: 1, quantityReference: 1 },
          finalPrice: eur(5000),
          id: "row_2",
          isSafetyCost: true,
          salId: "sal_test",
          unitOfMeasure: "cad",
          unitPrice: eur(5000),
          voiceDescription: "OS",
          voiceId: "voice_fallback",
        },
      ],
      status: "approved",
      subcontractAdjustmentPercent: -5,
      tenderAdjustmentPercent: -10,
    };

    expect(summarizeSal(sal).finalTotal.amount).toBe(90500);
  });
});
