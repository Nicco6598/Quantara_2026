import { describe, it, expect } from "vitest";
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
