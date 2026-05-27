import { describe, expect, it } from "vitest";
import { buildLineViews, summarizeSalLines } from "../../domain/sal-calculations";
import type { SalEconomicRules, SalLineDraft, SalLineView, SalVoiceDraft } from "../../types";

const defaultRules: SalEconomicRules = {
  applyDiscountToSafetyCosts: false,
  discountEnabled: true,
  discountPercent: 18.25,
  rounding: "cent",
};

const noDiscountRules: SalEconomicRules = {
  applyDiscountToSafetyCosts: false,
  discountEnabled: false,
  discountPercent: 0,
  rounding: "cent",
};

function makeVoice(overrides: Partial<SalVoiceDraft> = {}): SalVoiceDraft {
  return {
    id: "v1",
    code: "C001",
    description: "Test voice",
    category: "A",
    unit: "m²",
    unitPrice: 100,
    isSafetyCost: false,
    laborPercentage: 0,
    tariffBookId: "tb1",
    tariffBookName: "Test Book",
    tariffYear: 2026,
    source: {} as never,
    ...overrides,
  };
}

function makeMeasurementRow(
  factor1: number,
  factor2 = 1,
  factor3 = 1,
): import("../../types").SalMeasurementRowDraft {
  return {
    date: "2026-01-15",
    description: "Misura",
    factor1,
    factor2,
    factor3,
    id: "mr1",
    notes: "",
    order: 0,
    partialQuantity: 0,
    unit: "m²",
  };
}

function makeLine(
  overrides: Partial<SalLineDraft> & { measurementRows: SalLineDraft["measurementRows"] },
): SalLineDraft {
  return {
    id: "line1",
    notes: "",
    sourceType: "voice",
    surchargePercent: 0,
    voice: makeVoice(),
    ...overrides,
  };
}

describe("buildLineViews", () => {
  it("computes line totals correctly", () => {
    const lines = [
      makeLine({
        id: "line1",
        measurementRows: [makeMeasurementRow(5), makeMeasurementRow(5)],
        voice: makeVoice({ unitPrice: 100 }),
      }),
    ];

    const views = buildLineViews(lines, defaultRules);
    expect(views.length).toBe(1);
    const v0 = views[0] as SalLineView;
    expect(v0.quantity).toBe(10);
    expect(v0.grossAmount).toBe(1000);
    expect(v0.measurementRows.length).toBe(2);
  });

  it("returns empty for empty lines", () => {
    expect(buildLineViews([], defaultRules)).toEqual([]);
  });

  it("applies discount correctly", () => {
    const lines = [
      makeLine({
        id: "line1",
        measurementRows: [makeMeasurementRow(10)],
        voice: makeVoice({ unitPrice: 100, isSafetyCost: false }),
      }),
    ];

    const views = buildLineViews(lines, defaultRules);
    const v0 = views[0] as SalLineView;
    // gross = 10 * 100 = 1000, no surcharge, discountable = 1000, discount = 1000 * 0.1825 = 182.5
    expect(v0.grossAmount).toBe(1000);
    expect(v0.discountableAmount).toBe(1000);
    expect(v0.discountAmount).toBe(182.5);
    expect(v0.totalAmount).toBe(817.5);
  });

  it("excludes safety costs from discount when configured", () => {
    const lines = [
      makeLine({
        id: "line1",
        measurementRows: [makeMeasurementRow(10)],
        voice: makeVoice({ unitPrice: 100, isSafetyCost: true }),
      }),
    ];

    const views = buildLineViews(lines, defaultRules);
    const v0 = views[0] as SalLineView;
    // gross = 1000, but safety cost so discountable = 0 (applyDiscountToSafetyCosts = false)
    expect(v0.grossAmount).toBe(1000);
    expect(v0.discountableAmount).toBe(0);
    expect(v0.discountAmount).toBe(0);
    expect(v0.totalAmount).toBe(1000);
  });
});

describe("MG distribution", () => {
  function makeMgLine(mgCode: string, mgPercent: number): SalLineDraft {
    return makeLine({
      id: `mg-${mgCode}`,
      measurementRows: [],
      voice: makeVoice({
        id: `v-${mgCode}`,
        code: mgCode,
        description: `MG ${mgCode}`,
        unitPrice: mgPercent,
      }),
    });
  }

  function makeFaLine(id: string, code: string, qty: number): SalLineDraft {
    return makeLine({
      id,
      measurementRows: [makeMeasurementRow(qty)],
      voice: makeVoice({
        id: `v-${code}`,
        code,
        description: `Voce ${code}`,
        unitPrice: 100,
      }),
    });
  }

  it("does not apply MG until manual allocation is configured", () => {
    const lines = [
      makeFaLine("fa1", "FA.001-US", 10),
      makeFaLine("fa2", "FA.002-TLS", 5),
      makeFaLine("ac1", "AC.001", 4),
      makeMgLine("FA.MG.01", 2),
    ];

    const views = buildLineViews(lines, defaultRules);
    expect(views.find((v) => v.id === "fa1")?.netAmount).toBe(1000);
    expect(views.find((v) => v.id === "fa2")?.netAmount).toBe(500);
    expect(views.find((v) => v.id === "ac1")?.netAmount).toBe(400);
    expect(views.find((v) => v.id === "mg-FA.MG.01")?.netAmount).toBe(0);
  });

  it("applies MG only to manually selected voices", () => {
    const lines = [
      makeFaLine("fa1", "FA.001-US", 10),
      makeFaLine("fa2", "FA.002-TLS", 5),
      makeFaLine("ac1", "AC.001", 4),
      makeMgLine("FA.MG.01", 2),
    ];

    const views = buildLineViews(lines, {
      ...defaultRules,
      mgManualAllocations: {
        "mg-FA.MG.01": ["fa1", "ac1"],
      },
    });

    expect(views.find((v) => v.id === "fa1")?.netAmount).toBe(1000 + 20);
    expect(views.find((v) => v.id === "fa2")?.netAmount).toBe(500);
    expect(views.find((v) => v.id === "ac1")?.netAmount).toBe(400 + 8);
    expect(views.find((v) => v.id === "mg-FA.MG.01")?.netAmount).toBe(28);
  });

  it("respects mgManualAllocations — limits to selected voices", () => {
    const lines = [
      makeFaLine("fa1", "FA.001-US", 10), // gross = 1000
      makeFaLine("fa2", "FA.002-TLS", 5), // gross = 500
      makeMgLine("FA.MG.01", 2), // MG 2%
    ];

    const rules: SalEconomicRules = {
      ...defaultRules,
      mgManualAllocations: {
        "mg-FA.MG.01": ["fa1"], // only apply to FA.001
      },
    };

    const views = buildLineViews(lines, rules);
    const fa1 = views.find((v) => v.id === "fa1");
    const fa2 = views.find((v) => v.id === "fa2");
    const mg = views.find((v) => v.id === "mg-FA.MG.01");
    expect(fa1).toBeDefined();
    expect(fa2).toBeDefined();
    expect(mg).toBeDefined();

    // FA.001 gets MG (1000 * 0.02 = 20)
    expect(fa1?.netAmount).toBe(1000 + 20);
    // FA.002 does NOT get MG
    expect(fa2?.netAmount).toBe(500);
    // MG line total based only on selected voices
    expect(mg?.netAmount).toBe(20);
  });

  it("skips MG when manual allocation references non-existent IDs", () => {
    const lines = [makeFaLine("fa1", "FA.001-US", 10), makeMgLine("FA.MG.01", 2)];

    const rules: SalEconomicRules = {
      ...defaultRules,
      mgManualAllocations: {
        "mg-FA.MG.01": ["nonexistent-id", "also-gone"],
      },
    };

    const views = buildLineViews(lines, rules);
    const fa1 = views.find((v) => v.id === "fa1");
    const mg = views.find((v) => v.id === "mg-FA.MG.01");
    expect(fa1).toBeDefined();
    expect(mg).toBeDefined();

    // Stale IDs — no valid target → MG skipped
    expect(fa1?.netAmount).toBe(1000);
    expect(mg?.netAmount).toBe(0);
  });

  it("re-applies MG correctly after removing a voice from manual allocation", () => {
    const lines = [
      makeFaLine("fa1", "FA.001-US", 10), // gross = 1000
      makeFaLine("fa2", "FA.002-TLS", 5), // gross = 500
      makeMgLine("FA.MG.01", 2), // MG 2%
    ];

    // Step 1: manual allocation to both voices
    const rulesBoth: SalEconomicRules = {
      ...defaultRules,
      mgManualAllocations: { "mg-FA.MG.01": ["fa1", "fa2"] },
    };
    const viewsBoth = buildLineViews(lines, rulesBoth);
    expect(viewsBoth.find((v) => v.id === "fa1")?.netAmount).toBe(1000 + 20);
    expect(viewsBoth.find((v) => v.id === "fa2")?.netAmount).toBe(500 + 10);
    expect(viewsBoth.find((v) => v.id === "mg-FA.MG.01")?.netAmount).toBe(30);

    // Step 2: remove fa2 from manual allocation
    const rulesOne: SalEconomicRules = {
      ...defaultRules,
      mgManualAllocations: { "mg-FA.MG.01": ["fa1"] },
    };
    const viewsOne = buildLineViews(lines, rulesOne);
    expect(viewsOne.find((v) => v.id === "fa1")?.netAmount).toBe(1000 + 20);
    expect(viewsOne.find((v) => v.id === "fa2")?.netAmount).toBe(500);
    expect(viewsOne.find((v) => v.id === "mg-FA.MG.01")?.netAmount).toBe(20);
  });

  it("disables MG when manual allocation has empty array", () => {
    const lines = [
      makeFaLine("fa1", "FA.001-US", 10), // gross = 1000
      makeFaLine("fa2", "FA.002-TLS", 5), // gross = 500
      makeMgLine("FA.MG.01", 2), // MG 2%
    ];

    const rules: SalEconomicRules = {
      ...defaultRules,
      mgManualAllocations: { "mg-FA.MG.01": [] },
    };

    const views = buildLineViews(lines, rules);
    const fa1 = views.find((v) => v.id === "fa1");
    const fa2 = views.find((v) => v.id === "fa2");
    const mg = views.find((v) => v.id === "mg-FA.MG.01");
    expect(fa1).toBeDefined();
    expect(fa2).toBeDefined();
    expect(mg).toBeDefined();

    // Empty array = disabled → no MG applied to any voice
    expect(fa1?.netAmount).toBe(1000);
    expect(fa2?.netAmount).toBe(500);
    expect(mg?.netAmount).toBe(0);
  });

  it("skips MG when manual allocation key is missing", () => {
    const lines = [
      makeFaLine("fa1", "FA.001-US", 10), // gross = 1000
      makeFaLine("fa2", "FA.002-TLS", 5), // gross = 500
      makeMgLine("FA.MG.01", 2), // MG 2%
    ];

    // Empty mgManualAllocations object — key doesn't exist
    const rules: SalEconomicRules = {
      ...defaultRules,
      mgManualAllocations: {},
    };

    const views = buildLineViews(lines, rules);
    const fa1 = views.find((v) => v.id === "fa1");
    const fa2 = views.find((v) => v.id === "fa2");
    expect(fa1).toBeDefined();
    expect(fa2).toBeDefined();

    // No entry → MG not applied until user assigns targets
    expect(fa1?.netAmount).toBe(1000);
    expect(fa2?.netAmount).toBe(500);
  });
});

describe("summarizeSalLines", () => {
  it("computes summary correctly with discounts", () => {
    const lines = [
      makeLine({
        id: "l1",
        measurementRows: [makeMeasurementRow(10)],
        voice: makeVoice({ unitPrice: 50 }),
      }),
      makeLine({
        id: "l2",
        measurementRows: [makeMeasurementRow(5)],
        voice: makeVoice({ unitPrice: 100, id: "v2", code: "C002", isSafetyCost: true }),
      }),
    ];

    const views = buildLineViews(lines, defaultRules);
    // Line 1: 10 * 50 = 500 gross, 500 discountable, discount = 91.25, total = 408.75
    // Line 2 (safety): 5 * 100 = 500 gross, 0 discountable, discount = 0, total = 500
    // Total = 408.75 + 500 = 908.75
    const summary = summarizeSalLines(views, 10000, 2000);
    expect(summary.total).toBe(908.75);
    expect(summary.grossAmount).toBe(1000);
    expect(summary.voiceCount).toBe(2);
  });

  it("computes summary with no discount", () => {
    const lines = [
      makeLine({
        id: "l1",
        measurementRows: [makeMeasurementRow(10)],
        voice: makeVoice({ unitPrice: 50 }),
      }),
    ];

    const views = buildLineViews(lines, noDiscountRules);
    const summary = summarizeSalLines(views, 10000, 0);
    expect(summary.total).toBe(500);
    expect(summary.discountAmount).toBe(0);
    expect(summary.budgetResidual).toBe(9500);
  });

  it("returns zero totals for empty line views", () => {
    const summary = summarizeSalLines([], 10000, 0);
    expect(summary.total).toBe(0);
    expect(summary.voiceCount).toBe(0);
    expect(summary.grossAmount).toBe(0);
    expect(summary.discountAmount).toBe(0);
  });
});
