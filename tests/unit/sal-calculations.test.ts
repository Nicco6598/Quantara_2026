import { describe, expect, it } from "vitest";
import {
  buildLineViews,
  buildVerificationChecks,
  computeMgOnLaborPortion,
  defaultSalEconomicRules,
  getMgAssignableTargetLines,
  summarizeSalLines,
} from "../../apps/desktop/src/features/sal/domain/sal-calculations";
import { isSafetyVoice } from "../../apps/desktop/src/features/sal/domain/sal-safety";
import {
  buildSalDocumentView,
  buildSalDocumentViews,
  type SalDocument,
  type SalTariffVoice,
} from "../../apps/desktop/src/features/sal/domain/sal-workflow";
import type {
  SalLineDraft,
  SalMeasurementRowDraft,
} from "../../apps/desktop/src/features/sal/types";

function row(overrides?: Partial<SalMeasurementRowDraft>): SalMeasurementRowDraft {
  return {
    date: "2026-01-15",
    description: "Misura",
    factor1: 1,
    factor2: 1,
    factor3: 1,
    id: "mr-default",
    notes: "",
    order: 1,
    partialQuantity: 1,
    unit: "m",
    ...overrides,
  };
}

const ordinaryLine: SalLineDraft = {
  id: "line-ordinary",
  measurementRows: [row({ factor1: 2, factor2: 3, factor3: 4 })],
  notes: "test",
  sourceType: "voice",
  surchargePercent: 10,
  voice: {
    category: "Opere",
    code: "OP-001",
    description: "Voce ordinaria",
    id: "voice-ordinary",
    isSafetyCost: false,
    laborPercentage: 100,
    unit: "m",
    unitPrice: 100,
  },
};

const safetyLine: SalLineDraft = {
  id: "line-safety",
  measurementRows: [row({ id: "mr-safety-1", factor1: 1, factor2: 5, factor3: 2, unit: "cad" })],
  notes: "",
  sourceType: "voice",
  surchargePercent: 0,
  voice: {
    category: "Sicurezza",
    code: "OS-001",
    description: "Oneri sicurezza",
    id: "voice-safety",
    isSafetyCost: true,
    laborPercentage: 0,
    unit: "cad",
    unitPrice: 50,
  },
};

describe("SAL calculations", () => {
  it("builds line totals with discount, surcharge, and safety-cost rules", () => {
    const views = buildLineViews([ordinaryLine, safetyLine], defaultSalEconomicRules);

    expect(views[0]).toMatchObject({
      discountAmount: 481.8,
      discountableAmount: 2640,
      grossAmount: 2400,
      netAmount: 2640,
      quantity: 24,
      totalAmount: 2158.2,
    });
    expect(views[0]?.linkedCharges[0]?.total).toBe(240);
    expect(views[1]).toMatchObject({
      discountAmount: 0,
      discountableAmount: 0,
      grossAmount: 500,
      netAmount: 500,
      quantity: 10,
      totalAmount: 500,
    });
  });

  it("summarizes progressive totals and flags budget overflow", () => {
    const views = buildLineViews([ordinaryLine, safetyLine], defaultSalEconomicRules);
    const summary = summarizeSalLines(views, 2500, 100);
    const checks = buildVerificationChecks(views, summary, defaultSalEconomicRules);

    expect(summary).toMatchObject({
      budgetResidual: -258.2,
      discountAmount: 481.8,
      discountableAmount: 2640,
      discountedVoiceCount: 1,
      excludedSafetyVoiceCount: 1,
      grossAmount: 2900,
      linkedChargeAmount: 240,
      safetyAmount: 500,
      total: 2658.2,
    });
    expect(checks.find((check) => check.id === "budget-overflow")?.tone).toBe("danger");
  });

  it("marks zero or invalid quantities as incomplete without negative totals", () => {
    const views = buildLineViews(
      [
        {
          ...ordinaryLine,
          measurementRows: [row({ factor1: Number.NaN, factor2: 1, factor3: 1 })],
        },
      ],
      defaultSalEconomicRules,
    );

    expect(views[0]).toMatchObject({
      grossAmount: 0,
      quantity: 0,
      status: "incomplete",
      totalAmount: 0,
    });
    expect(views[0]?.measurementRows).toHaveLength(1);
  });

  it("reapplies the tender discount to every added line and quantity update", () => {
    const tenPercentRules = {
      ...defaultSalEconomicRules,
      discountPercent: 10,
    };
    const firstLine: SalLineDraft = {
      ...ordinaryLine,
      measurementRows: [row({ factor1: 2, factor2: 1, factor3: 1 })],
      surchargePercent: 0,
      voice: { ...ordinaryLine.voice, id: "voice-a", unitPrice: 100 },
    };
    const secondLine: SalLineDraft = {
      ...ordinaryLine,
      measurementRows: [row({ factor1: 3, factor2: 1, factor3: 1 })],
      id: "line-second",
      surchargePercent: 0,
      voice: { ...ordinaryLine.voice, id: "voice-b", unitPrice: 50 },
    };

    const initialViews = buildLineViews([firstLine, secondLine], tenPercentRules);
    const initialSummary = summarizeSalLines(initialViews, 1_000, 0);

    expect(initialViews.map((view) => view.discountAmount)).toEqual([20, 15]);
    expect(initialSummary).toMatchObject({
      discountAmount: 35,
      grossAmount: 350,
      total: 315,
    });

    const updatedViews = buildLineViews(
      [
        firstLine,
        { ...secondLine, measurementRows: [row({ factor1: 4, factor2: 1, factor3: 1 })] },
      ],
      tenPercentRules,
    );
    const updatedSummary = summarizeSalLines(updatedViews, 1_000, 0);

    expect(updatedViews.map((view) => view.discountAmount)).toEqual([20, 20]);
    expect(updatedSummary).toMatchObject({
      discountAmount: 40,
      grossAmount: 400,
      total: 360,
    });
  });

  it("applies tender discount to every discountable line in the same SAL", () => {
    const views = buildLineViews(
      [
        { ...ordinaryLine, id: "line-1", voice: { ...ordinaryLine.voice, id: "voice-1" } },
        { ...ordinaryLine, id: "line-2", voice: { ...ordinaryLine.voice, id: "voice-2" } },
        { ...ordinaryLine, id: "line-3", voice: { ...ordinaryLine.voice, id: "voice-3" } },
      ],
      defaultSalEconomicRules,
    );

    expect(views).toHaveLength(3);
    expect(views.every((view) => view.discountAmount > 0)).toBe(true);
  });

  it("can include safety costs in discount calculation when explicitly configured", () => {
    const views = buildLineViews([safetyLine], {
      ...defaultSalEconomicRules,
      applyDiscountToSafetyCosts: true,
    });

    expect(views[0]?.discountAmount).toBeGreaterThan(0);
  });

  it("does not create fake discounts for zero quantity or zero price", () => {
    const views = buildLineViews(
      [
        { ...ordinaryLine, measurementRows: [row({ factor1: 0, factor2: 1, factor3: 1 })] },
        { ...ordinaryLine, id: "zero-price", voice: { ...ordinaryLine.voice, unitPrice: 0 } },
      ],
      defaultSalEconomicRules,
    );

    expect(views.map((view) => view.discountAmount)).toEqual([0, 0]);
  });

  it("keeps verification check output stable for mixed line states", () => {
    const lines = [
      { ...ordinaryLine, surchargePercent: 30 },
      safetyLine,
      {
        ...ordinaryLine,
        id: "zero-qty",
        measurementRows: [row({ factor1: 0, factor2: 1, factor3: 1 })],
      },
      { ...ordinaryLine, id: "zero-price", voice: { ...ordinaryLine.voice, unitPrice: 0 } },
    ];
    const views = buildLineViews(lines, {
      ...defaultSalEconomicRules,
      discountPercent: 35,
    });
    const summary = summarizeSalLines(views, 500, 0);

    expect(
      buildVerificationChecks(views, summary, {
        ...defaultSalEconomicRules,
        discountPercent: 35,
      }).map((check) => check.id),
    ).toEqual([
      "total",
      "count",
      "measurements",
      "zero-qty",
      "zero-price",
      "high-surcharge",
      "linked",
      "safety",
      "budget-overflow",
      "high-discount",
      "discount",
    ]);
  });

  it("builds batch SAL document views equivalent to individual views", () => {
    const voices: SalTariffVoice[] = [
      {
        category: "Opere",
        code: "OP-001",
        description: "Voce ordinaria",
        id: "voice-ordinary",
        isSafetyCost: false,
        projectYear: 2026,
        unit: "m",
        unitPrice: 100,
      },
      {
        category: "Sicurezza",
        code: "OS-001",
        description: "Oneri sicurezza",
        id: "voice-safety",
        isSafetyCost: true,
        projectYear: 2026,
        unit: "cad",
        unitPrice: 50,
      },
    ];
    const documents: SalDocument[] = [
      {
        date: "2026-05-01",
        description: "SAL ordinaria",
        id: "sal-1",
        lines: [
          { id: "line-1", quantity: 2, surcharge: "day", voiceId: "voice-ordinary" },
          { id: "line-2", quantity: 1, surcharge: "none", voiceId: "voice-safety" },
        ],
        notes: "",
        projectId: "project-1",
        status: "closed",
        title: "SAL 1",
      },
      {
        date: "2026-05-02",
        description: "SAL economica",
        economicRules: defaultSalEconomicRules,
        id: "sal-2",
        lines: [{ id: "line-3", quantity: 3, surcharge: "none", voiceId: "voice-ordinary" }],
        notes: "",
        projectId: "project-1",
        status: "draft",
        title: "SAL 2",
      },
    ];

    expect(buildSalDocumentViews(documents, voices)).toEqual(
      documents.map((document) => buildSalDocumentView(document, voices)),
    );
  });
});

describe("isSafetyVoice", () => {
  it("detects OS codes and explicit safety-cost phrases", () => {
    expect(isSafetyVoice({ category: "Oneri", code: "OS.001", description: "" })).toBe(true);
    expect(
      isSafetyVoice({
        category: "Opere civili",
        code: "01.A01",
        description: "Oneri della sicurezza per cantiere",
      }),
    ).toBe(true);
  });

  it("does not classify generic oneri text as safety cost", () => {
    expect(
      isSafetyVoice({
        category: "Opere civili",
        code: "01.A01",
        description: "Compenso per oneri di trasporto e movimentazione",
      }),
    ).toBe(false);
  });
});

describe("SAL edge cases - regression tests", () => {
  it("handles empty line list gracefully", () => {
    const views = buildLineViews([], defaultSalEconomicRules);
    expect(views).toHaveLength(0);
  });

  it("summarizes empty line list to zeros", () => {
    const summary = summarizeSalLines([], 1000, 0);
    expect(summary.total).toBe(0);
    expect(summary.discountAmount).toBe(0);
    expect(summary.budgetResidual).toBe(1000);
  });

  it("handles very large quantities without overflow", () => {
    const largeLine: SalLineDraft = {
      id: "line-large",
      measurementRows: [row({ id: "mr-large", factor1: 1000000, factor2: 1, factor3: 1 })],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Opere",
        code: "OP-LARGE",
        description: "Grande quantita",
        id: "voice-large",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "m",
        unitPrice: 999.99,
      },
    };
    const views = buildLineViews([largeLine], defaultSalEconomicRules);
    expect(views[0]?.grossAmount).toBe(999990000);
    expect(views[0]?.totalAmount).toBeGreaterThan(0);
  });

  it("handles negative contract amount for budget comparison", () => {
    const views = buildLineViews(
      [
        {
          id: "line-1",
          measurementRows: [row({ factor1: 1, factor2: 1, factor3: 1 })],
          notes: "",
          sourceType: "voice",
          surchargePercent: 0,
          voice: {
            category: "Opere",
            code: "OP-001",
            description: "Test",
            id: "voice-1",
            isSafetyCost: false,
            laborPercentage: 0,
            unit: "m",
            unitPrice: 100,
          },
        },
      ],
      defaultSalEconomicRules,
    );
    const summary = summarizeSalLines(views, -500, 0);
    expect(summary.budgetResidual).toBeLessThan(0);
  });

  it("zero percent discount produces zero discount amounts", () => {
    const views = buildLineViews(
      [
        {
          id: "line-1",
          measurementRows: [row({ factor1: 1, factor2: 1, factor3: 1 })],
          notes: "",
          sourceType: "voice",
          surchargePercent: 0,
          voice: {
            category: "Opere",
            code: "OP-001",
            description: "Test",
            id: "voice-1",
            isSafetyCost: false,
            laborPercentage: 0,
            unit: "m",
            unitPrice: 100,
          },
        },
      ],
      { ...defaultSalEconomicRules, discountPercent: 0 },
    );
    expect(views[0]?.discountAmount).toBe(0);
    expect(views[0]?.totalAmount).toBe(views[0]?.netAmount);
  });

  it("surcharge without labor percentage produces zero linked charge", () => {
    const line: SalLineDraft = {
      id: "line-1",
      measurementRows: [row({ factor1: 1, factor2: 1, factor3: 1 })],
      notes: "",
      sourceType: "voice",
      surchargePercent: 10,
      voice: {
        category: "Opere",
        code: "OP-001",
        description: "Test",
        id: "voice-1",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "m",
        unitPrice: 100,
      },
    };
    const views = buildLineViews([line], defaultSalEconomicRules);
    expect(views[0]?.linkedCharges).toHaveLength(1);
    expect(views[0]?.linkedCharges[0]?.total).toBe(0);
  });

  it("lists all non-MG SAL lines as MG assignable targets regardless of gross amount", () => {
    const zeroGrossLine: SalLineDraft = {
      id: "line-zero",
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Opere",
        code: "FA.01.001",
        description: "Senza misure",
        id: "voice-zero",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "m",
        unitPrice: 50,
      },
    };
    const mgLine: SalLineDraft = {
      id: "line-mg",
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Maggiorazioni",
        code: "FA.MG.01",
        description: "MG 10%",
        id: "voice-mg",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "%",
        unitPrice: 10,
        source: { isMaggiorazione: true },
      },
    };
    const views = buildLineViews([zeroGrossLine, mgLine], {
      ...defaultSalEconomicRules,
      mgManualAllocations: { "line-mg": ["line-zero"] },
    });
    const assignable = getMgAssignableTargetLines(views);

    expect(assignable.map((line) => line.id)).toEqual(["line-zero"]);
    expect(views.find((line) => line.id === "line-mg")?.grossAmount).toBe(0);
  });

  it("applies manual MG on labor portion of gross (lordo × %MG × %manodopera)", () => {
    const targetLine: SalLineDraft = {
      id: "line-target",
      measurementRows: [row({ factor1: 10, factor2: 1, factor3: 1 })],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Opere",
        code: "FA.01.100",
        description: "Voce con manodopera",
        id: "voice-target",
        isSafetyCost: false,
        laborPercentage: 40,
        unit: "m",
        unitPrice: 100,
      },
    };
    const mgLine: SalLineDraft = {
      id: "line-mg",
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Maggiorazioni",
        code: "FA.MG.01",
        description: "MG 10%",
        id: "voice-mg",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "%",
        unitPrice: 10,
        source: { isMaggiorazione: true },
      },
    };
    const views = buildLineViews([targetLine, mgLine], {
      ...defaultSalEconomicRules,
      discountEnabled: false,
      mgManualAllocations: { "line-mg": ["line-target"] },
    });
    const target = views.find((line) => line.id === "line-target");
    const mgCharge = target?.linkedCharges.find((charge) => charge.code.startsWith("MG."));

    expect(target?.grossAmount).toBe(1000);
    expect(mgCharge?.total).toBe(40);
    expect(target?.netAmount).toBe(1040);
  });

  it("applies manual MG with 100% manodopera as full MG% on lordo", () => {
    const targetLine: SalLineDraft = {
      id: "line-target",
      measurementRows: [row({ factor1: 7, factor2: 1, factor3: 1 })],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Opere",
        code: "ad.al.a.2102.c",
        description: "Voce piena manodopera",
        id: "voice-target",
        isSafetyCost: false,
        laborPercentage: 100,
        unit: "m",
        unitPrice: 472.52,
      },
    };
    const mgLine: SalLineDraft = {
      id: "line-mg",
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Maggiorazioni",
        code: "AS.MG.B.0101.F",
        description: "MG 11%",
        id: "voice-mg",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "%",
        unitPrice: 11,
        source: { isMaggiorazione: true },
      },
    };
    const views = buildLineViews([targetLine, mgLine], {
      ...defaultSalEconomicRules,
      discountEnabled: false,
      mgManualAllocations: { "line-mg": ["line-target"] },
    });
    const target = views.find((line) => line.id === "line-target");
    const mgCharge = target?.linkedCharges.find((charge) => charge.code.startsWith("MG."));

    expect(target?.grossAmount).toBeCloseTo(3307.64, 2);
    expect(mgCharge?.total).toBeCloseTo(363.84, 2);
  });

  it("applies manual MG on BA-style voice (14% × 77,9% × lordo)", () => {
    const _gross = 42.5 * 18.67;
    const targetLine: SalLineDraft = {
      id: "line-ba",
      measurementRows: [row({ factor1: 42.5, factor2: 1, factor3: 1 })],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Opere",
        code: "BA.cz.c.2104.b",
        description: "Posa cunicolo",
        id: "voice-ba",
        isSafetyCost: false,
        laborPercentage: 77.9,
        unit: "m",
        unitPrice: 18.67,
      },
    };
    const mgLine: SalLineDraft = {
      id: "line-mg-ba",
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Maggiorazioni",
        code: "BA.MG.01",
        description: "MG 14%",
        id: "voice-mg-ba",
        isSafetyCost: false,
        laborPercentage: 0,
        unit: "%",
        unitPrice: 14,
        source: { isMaggiorazione: true },
      },
    };
    const views = buildLineViews([targetLine, mgLine], {
      ...defaultSalEconomicRules,
      discountEnabled: false,
      mgManualAllocations: { "line-mg-ba": ["line-ba"] },
    });
    const target = views.find((line) => line.id === "line-ba");
    const mgCharge = target?.linkedCharges.find((charge) => charge.code.startsWith("MG."));

    expect(target?.grossAmount).toBeGreaterThan(0);
    expect(mgCharge?.total).toBe(computeMgOnLaborPortion(target?.grossAmount ?? 0, 14, 77.9));
    expect(mgCharge?.total).toBeGreaterThan(86);
    expect(mgCharge?.total).toBeLessThan(87);
  });
});
