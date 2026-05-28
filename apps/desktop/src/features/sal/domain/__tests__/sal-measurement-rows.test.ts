import { describe, expect, it } from "vitest";
import {
  buildStationOnlyMeasurementClipboardRow,
  cloneMeasurementRowForDuplicate,
} from "../../types";

describe("measurement row clone helpers", () => {
  const source = {
    date: "2026-04-10",
    description: "Scavo",
    factor1: 2,
    factor2: 3,
    factor3: 1,
    id: "mr_source",
    notes: "n",
    order: 0,
    partialQuantity: 6,
    station: "Km 12+400",
    unit: "m3",
  };

  it("cloneMeasurementRowForDuplicate copies all fields with new id", () => {
    const cloned = cloneMeasurementRowForDuplicate(source, "m3", 1);
    expect(cloned.id).not.toBe(source.id);
    expect(cloned.order).toBe(1);
    expect(cloned.description).toBe("Scavo");
    expect(cloned.factor1).toBe(2);
    expect(cloned.station).toBe("Km 12+400");
    expect(cloned.partialQuantity).toBe(6);
  });

  it("buildStationOnlyMeasurementClipboardRow keeps only station", () => {
    const row = buildStationOnlyMeasurementClipboardRow(source, "m3");
    expect(row.station).toBe("Km 12+400");
    expect(row.description).toBe("");
    expect(row.factor1).toBe(0);
    expect(row.partialQuantity).toBe(0);
    expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
