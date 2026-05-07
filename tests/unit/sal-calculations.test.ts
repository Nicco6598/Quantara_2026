import { describe, expect, it } from "vitest";
import {
  buildLineViews,
  buildVerificationChecks,
  defaultSalEconomicRules,
  summarizeSalLines,
} from "../../apps/desktop/src/features/sal/domain/sal-calculations";
import { isSafetyVoice } from "../../apps/desktop/src/features/sal/domain/sal-safety";
import {
  buildSalDocumentView,
  buildSalDocumentViews,
  type SalDocument,
  type SalTariffVoice,
} from "../../apps/desktop/src/features/sal/domain/sal-workflow";
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
    laborPercentage: 100,
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

  it("reapplies the tender discount to every added line and quantity update", () => {
    const tenPercentRules = {
      ...defaultSalEconomicRules,
      discountPercent: 10,
    };
    const firstLine = {
      ...ordinaryLine,
      factor1: 2,
      factor2: 1,
      factor3: 1,
      surchargePercent: 0,
      voice: { ...ordinaryLine.voice, id: "voice-a", unitPrice: 100 },
    };
    const secondLine = {
      ...ordinaryLine,
      factor1: 3,
      factor2: 1,
      factor3: 1,
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
      [firstLine, { ...secondLine, factor1: 4 }],
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
        { ...ordinaryLine, factor1: 0, factor2: 1, factor3: 1 },
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
      { ...ordinaryLine, id: "zero-qty", factor1: 0, factor2: 1, factor3: 1 },
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
