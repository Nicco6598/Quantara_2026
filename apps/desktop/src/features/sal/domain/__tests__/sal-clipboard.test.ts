import { describe, expect, it } from "vitest";
import type { SalLineDraft, SalMeasurementRowDraft } from "../../types";
import {
  parseSalClipboardText,
  remapMeasurementRowsForPaste,
  serializeSalMeasurementsClipboard,
  serializeSalVoiceClipboard,
} from "../sal-clipboard";

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
        station: "Km 1",
      },
    ];
    const measurementsParsed = parseSalClipboardText(
      serializeSalMeasurementsClipboard(rows, "FA.01"),
    );
    expect(measurementsParsed?.kind).toBe("measurements");
    if (measurementsParsed?.kind === "measurements") {
      expect(measurementsParsed.stationOnly).toBe(false);
      const remapped = remapMeasurementRowsForPaste(measurementsParsed.rows, "m", 3);
      expect(remapped).toHaveLength(1);
      expect(remapped[0]?.id).not.toBe("m1");
      expect(remapped[0]?.order).toBe(3);
      expect(remapped[0]?.description).toBe("R1");
    }
  });

  it("round-trips station-only measurement clipboard", () => {
    const rows: SalMeasurementRowDraft[] = [
      {
        date: "2026-05-01",
        description: "ignored",
        factor1: 9,
        factor2: 9,
        factor3: 9,
        id: "m1",
        notes: "x",
        order: 0,
        partialQuantity: 99,
        unit: "m",
        station: "Km 12+400",
      },
    ];
    const parsed = parseSalClipboardText(
      serializeSalMeasurementsClipboard(rows, "SS.AC.A.2 02.A", { stationOnly: true }),
    );
    expect(parsed?.kind).toBe("measurements");
    if (parsed?.kind !== "measurements") return;

    expect(parsed.stationOnly).toBe(true);
    const pasted = remapMeasurementRowsForPaste(parsed.rows, "m3", 2, { stationOnly: true });
    expect(pasted[0]?.station).toBe("Km 12+400");
    expect(pasted[0]?.description).toBe("");
    expect(pasted[0]?.factor1).toBe(0);
    expect(pasted[0]?.partialQuantity).toBe(0);
    expect(pasted[0]?.order).toBe(2);
  });

  it("ignores invalid clipboard json", () => {
    expect(parseSalClipboardText("hello")).toBeNull();
    expect(parseSalClipboardText('{"foo":1}')).toBeNull();
  });
});
