import { describe, expect, it } from "vitest";
import {
  parseSalClipboardText,
  remapMeasurementRowsForPaste,
  serializeSalMeasurementsClipboard,
  serializeSalVoiceClipboard,
} from "../sal-clipboard";
import type { SalLineDraft, SalMeasurementRowDraft } from "../../types";

describe("sal-clipboard", () => {
  it("round-trips voice and measurement payloads", () => {
    const draft: SalLineDraft = {
      id: "line-1",
      measurementRows: [],
      notes: "",
      sourceType: "voice",
      surchargePercent: 0,
      voice: {
        category: "Opere",
        code: "FA.01",
        description: "Test",
        id: "voice-1",
        isSafetyCost: false,
        laborPercentage: 25,
        source: {} as never,
        tariffBookId: "tb1",
        tariffBookName: "Tariffario",
        tariffYear: 2026,
        unit: "m",
        unitPrice: 10,
      },
    };
    const voiceParsed = parseSalClipboardText(serializeSalVoiceClipboard(draft));
    expect(voiceParsed?.kind).toBe("voice");
    if (voiceParsed?.kind === "voice") {
      expect(voiceParsed.draft.voice.code).toBe("FA.01");
    }

    const rows: SalMeasurementRowDraft[] = [
      {
        date: "2026-05-01",
        description: "R1",
        factor1: 2,
        factor2: 1,
        factor3: 1,
        id: "m1",
        notes: "",
        order: 0,
        partialQuantity: 2,
        unit: "m",
      },
    ];
    const measurementsParsed = parseSalClipboardText(
      serializeSalMeasurementsClipboard(rows, "FA.01"),
    );
    expect(measurementsParsed?.kind).toBe("measurements");
    if (measurementsParsed?.kind === "measurements") {
      const remapped = remapMeasurementRowsForPaste(measurementsParsed.rows, "m", 3);
      expect(remapped).toHaveLength(1);
      expect(remapped[0]?.id).not.toBe("m1");
      expect(remapped[0]?.order).toBe(3);
    }
  });
});
