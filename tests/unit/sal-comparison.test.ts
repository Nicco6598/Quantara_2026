import { describe, expect, it } from "vitest";
import { diffSalLines } from "../../apps/desktop/src/features/sal/domain/sal-comparison";
import type { SalLineView } from "../../apps/desktop/src/features/sal/types";

const baseLine: SalLineView = {
  id: "line-1",
  factor1: 2,
  factor2: 3,
  factor3: 4,
  quantity: 24,
  surchargePercent: 10,
  notes: "",
  voice: {
    category: "Opere",
    code: "OP-001",
    description: "Scavo",
    id: "voice-1",
    isSafetyCost: false,
    laborPercentage: 50,
    source: null as never,
    tariffBookId: "book-1",
    tariffBookName: "Tariffario 2025",
    tariffYear: 2025,
    unit: "m",
    unitPrice: 100,
  },
  discountAmount: 100,
  discountableAmount: 2400,
  grossAmount: 2400,
  linkedCharges: [
    {
      baseAmount: 2400,
      code: "MAG",
      description: "Maggiorazione",
      id: "ch-1",
      percent: 10,
      total: 120,
    },
  ],
  measurementRows: [],
  netAmount: 2520,
  status: "complete",
  totalAmount: 2420,
};

describe("SAL diff/comparison", () => {
  it("detects added lines in the new version", () => {
    const result = diffSalLines(
      [baseLine],
      [
        baseLine,
        { ...baseLine, id: "line-2", voice: { ...baseLine.voice, id: "voice-2", code: "OP-002" } },
      ],
    );
    expect(result.totals.addedCount).toBe(1);
    expect(result.diffs.find((d) => d.status === "added")?.code).toBe("OP-002");
  });

  it("detects removed lines in the new version", () => {
    const result = diffSalLines(
      [
        baseLine,
        { ...baseLine, id: "line-2", voice: { ...baseLine.voice, id: "voice-2", code: "OP-002" } },
      ],
      [baseLine],
    );
    expect(result.totals.removedCount).toBe(1);
    expect(result.diffs.find((d) => d.status === "removed")?.code).toBe("OP-002");
  });

  it("detects modified lines (quantity change)", () => {
    const after = { ...baseLine, quantity: 30 };
    const result = diffSalLines([baseLine], [after]);
    expect(result.totals.modifiedCount).toBe(1);
    const modified = result.diffs.find((d) => d.status === "modified");
    expect(modified?.qtyDiff).toBe(6);
  });

  it("marks unchanged lines", () => {
    const result = diffSalLines([baseLine], [baseLine]);
    expect(result.totals.modifiedCount).toBe(0);
    expect(result.totals.addedCount).toBe(0);
    expect(result.totals.removedCount).toBe(0);
    expect(result.diffs.every((d) => d.status === "unchanged")).toBe(true);
  });

  it("detects surcharge changes", () => {
    const after = { ...baseLine, surchargePercent: 20 };
    const result = diffSalLines([baseLine], [after]);
    expect(result.diffs.find((d) => d.surchargeChanged)?.status).toBe("modified");
  });

  it("computes correct aggregate totals", () => {
    const after = { ...baseLine, quantity: 30, totalAmount: 3020 };
    const result = diffSalLines([baseLine], [after]);
    expect(result.totals.oldTotal).toBe(2420);
    expect(result.totals.newTotal).toBe(3020);
    expect(result.totals.diff).toBe(600);
  });
});
