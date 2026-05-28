import type { SalLineDraft, SalMeasurementRowDraft } from "../types";
import { createEmptyMeasurementRow, createMeasurementId } from "../types";

const VOICE_MARKER = "__salDraft";
const MEASUREMENTS_MARKER = "__salMeasurements";

export type SalClipboardVoicePayload = { __salDraft: true } & SalLineDraft;

export type SalClipboardMeasurementsPayload = {
  __salMeasurements: true;
  rows: SalMeasurementRowDraft[];
  sourceVoiceCode?: string;
  /** Incolla solo la stazione (Ctrl+C/V riga misura). */
  stationOnly?: boolean;
};

export function serializeSalVoiceClipboard(draft: SalLineDraft): string {
  return JSON.stringify({ [VOICE_MARKER]: true, ...draft });
}

export function serializeSalMeasurementsClipboard(
  rows: SalMeasurementRowDraft[],
  sourceVoiceCode?: string,
  options?: { stationOnly?: boolean },
): string {
  return JSON.stringify({
    [MEASUREMENTS_MARKER]: true,
    rows,
    sourceVoiceCode,
    ...(options?.stationOnly ? { stationOnly: true } : {}),
  });
}

export function parseSalClipboardText(
  text: string,
):
  | { kind: "voice"; draft: SalLineDraft }
  | { kind: "measurements"; rows: SalMeasurementRowDraft[]; stationOnly: boolean }
  | null {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (data[VOICE_MARKER] === true) {
      const { __salDraft: _marker, ...draft } = data as SalClipboardVoicePayload;
      if (!draft.voice?.id) return null;
      return { kind: "voice", draft: draft as SalLineDraft };
    }
    if (data[MEASUREMENTS_MARKER] === true && Array.isArray(data.rows)) {
      return {
        kind: "measurements",
        rows: data.rows as SalMeasurementRowDraft[],
        stationOnly: data.stationOnly === true,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function remapMeasurementRowsForPaste(
  rows: readonly SalMeasurementRowDraft[],
  unit: string,
  startOrder: number,
  options?: { stationOnly?: boolean },
): SalMeasurementRowDraft[] {
  if (options?.stationOnly) {
    return rows.map((row, index) => {
      const empty = createEmptyMeasurementRow(unit, startOrder + index);
      const station = row.station?.trim();
      if (station) {
        empty.station = station;
      }
      return empty;
    });
  }

  return rows.map((row, index) => ({
    ...row,
    id: createMeasurementId(),
    order: startOrder + index,
    unit: row.unit || unit,
  }));
}
