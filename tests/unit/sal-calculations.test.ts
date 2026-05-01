import { describe, expect, it } from "vitest";
import {
  buildLineViews,
  buildVerificationChecks,
  defaultSalEconomicRules,
  summarizeSalLines,
} from "../../apps/desktop/src/features/sal/domain/sal-calculations";
import type { SalLineDraft } from "../../apps/desktop/src/features/sal/types";

const ordinaryLine: SalLineDraft = {
  factor1: 2,
  factor2: 3,
  factor3: 4,
  id: "line-ordinary",
  notes: "test",
  quantity: 24,
  surchargePercent: 10,
  voice: {
    category: "Opere",
    code: "OP-001",
    description: "Voce ordinaria",
    id: "voice-ordinary",
    isSafetyCost: false,
    unit: "m",
    unitPrice: 100,
  },
};

const safetyLine: SalLineDraft = {
  factor1: 1,
  factor2: 5,
  factor3: 2,
  id: "line-safety",
  notes: "",
  quantity: 10,
  surchargePercent: 0,
  voice: {
    category: "Sicurezza",
    code: "OS-001",
    description: "Oneri sicurezza",
    id: "voice-safety",
    isSafetyCost: true,
    unit: "cad",
    unitPrice: 50,
  },
};

describe("SAL calculations", () => {
  it("builds line totals with discount, surcharge, and safety-cost rules", () => {
    const views = buildLineViews([ordinaryLine, safetyLine], defaultSalEconomicRules);

    expect(views[0]).toMatchObject({
      discountAmount: 438,
      grossAmount: 2400,
      netAmount: 1962,
      quantity: 24,
      totalAmount: 2202,
    });
    expect(views[0]?.linkedCharges[0]?.total).toBe(240);
    expect(views[1]).toMatchObject({
      discountAmount: 0,
      grossAmount: 500,
      netAmount: 500,
      quantity: 10,
      totalAmount: 500,
    });
  });

  it("summarizes progressive totals and flags budget overflow", () => {
    const views = buildLineViews([ordinaryLine, safetyLine], defaultSalEconomicRules);
    const summary = summarizeSalLines(views, 2500, 100);
    const checks = buildVerificationChecks(views, summary);

    expect(summary).toMatchObject({
      budgetResidual: -302,
      discountAmount: 438,
      grossAmount: 2900,
      linkedChargeAmount: 240,
      safetyAmount: 500,
      total: 2702,
    });
    expect(checks.find((check) => check.id === "budget")?.tone).toBe("danger");
  });

  it("marks zero or invalid quantities as incomplete without negative totals", () => {
    const views = buildLineViews(
      [{ ...ordinaryLine, factor1: Number.NaN, factor2: 1, factor3: 1 }],
      defaultSalEconomicRules,
    );

    expect(views[0]).toMatchObject({
      grossAmount: 0,
      quantity: 0,
      status: "incomplete",
      totalAmount: 0,
    });
    expect(views[0]?.measurementRows).toHaveLength(0);
  });
});
