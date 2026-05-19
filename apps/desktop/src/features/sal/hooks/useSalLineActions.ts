import { useCallback, useRef } from "react";
import { parseMeasurementTarget } from "../domain/sal-measurement-target";
import type { SalLineDraft, SalMeasurementRowDraft, SalVoiceDraft } from "../types";
import { createEmptyMeasurementRow, createMeasurementId } from "../types";

type Notify = (options: {
  message: string;
  title?: string;
  tone?: "info" | "success" | "warning" | "danger";
}) => void;

export function useSalLineActions({
  lines,
  notify,
  setLines,
}: {
  lines: SalLineDraft[];
  notify: Notify;
  setLines: (updater: SalLineDraft[] | ((prev: SalLineDraft[]) => SalLineDraft[])) => void;
}) {
  const idCounter = useRef(0);

  const upsertLine = useCallback(
    (voice: SalVoiceDraft) => {
      const exists = lines.some((line) => line.voice.id === voice.id);
      setLines((current) => {
        if (exists) return current.filter((line) => line.voice.id !== voice.id);
        return [
          ...current,
          {
            id: `draft-${voice.id}`,
            measurementRows: [createEmptyMeasurementRow(voice.unit, 0)],
            notes: "",
            sourceType: "voice",
            surchargePercent: 0,
            voice,
          },
        ];
      });
      notify({
        message: `${voice.code} ${exists ? "rimossa dalla" : "aggiunta alla"} bozza.`,
        title: exists ? "Voce rimossa" : "Voce aggiunta",
        tone: exists ? "warning" : "success",
      });
    },
    [lines, notify, setLines],
  );

  const addVoiceAsNewLine = useCallback(
    (voice: SalVoiceDraft) => {
      const draft: SalLineDraft = {
        id: `draft-${voice.id}-${idCounter.current++}`,
        measurementRows: [createEmptyMeasurementRow(voice.unit, 0)],
        notes: "",
        sourceType: "voice",
        surchargePercent: 0,
        voice,
      };
      setLines((current) => [...current, draft]);
      notify({
        message: `${voice.code} aggiunta come nuova riga.`,
        title: "Voce aggiunta",
        tone: "success",
      });
    },
    [notify, setLines],
  );

  const setSurcharge = useCallback(
    (lineId: string, pct: number) => {
      setLines((current) =>
        current.map((line) => (line.id === lineId ? { ...line, surchargePercent: pct } : line)),
      );
    },
    [setLines],
  );

  const updateMeasurementRow = useCallback(
    (lineId: string, measurementId: string, updates: Partial<SalMeasurementRowDraft>) => {
      setLines((current) =>
        current.map((line) => {
          if (line.id !== lineId) return line;
          const { id, index } = parseMeasurementTarget(measurementId);
          const targetIndex =
            index !== null && line.measurementRows[index]?.id === id
              ? index
              : line.measurementRows.findIndex((row) => row.id === id);
          if (targetIndex < 0) return line;
          const rows = line.measurementRows.map((row, rowIndex) => {
            if (rowIndex !== targetIndex) return row;
            const updated = { ...row, ...updates };
            if ("factor1" in updates || "factor2" in updates || "factor3" in updates) {
              const f1 =
                Number.isFinite(updated.factor1) && updated.factor1 >= 0 ? updated.factor1 : 0;
              const f2 =
                Number.isFinite(updated.factor2) && updated.factor2 >= 0 ? updated.factor2 : 0;
              const f3 =
                Number.isFinite(updated.factor3) && updated.factor3 >= 0 ? updated.factor3 : 0;
              updated.partialQuantity = f1 * f2 * f3;
            }
            return updated;
          });
          return { ...line, measurementRows: rows };
        }),
      );
    },
    [setLines],
  );

  const addMeasurementRow = useCallback(
    (lineId: string) => {
      setLines((current) =>
        current.map((line) =>
          line.id === lineId
            ? {
                ...line,
                measurementRows: [
                  ...line.measurementRows,
                  createEmptyMeasurementRow(line.voice.unit, line.measurementRows.length),
                ],
              }
            : line,
        ),
      );
    },
    [setLines],
  );

  const removeMeasurementRow = useCallback(
    (lineId: string, measurementId: string) => {
      setLines((current) =>
        current.map((line) => {
          if (line.id !== lineId) return line;
          const { id, index } = parseMeasurementTarget(measurementId);
          const targetIndex =
            index !== null && line.measurementRows[index]?.id === id
              ? index
              : line.measurementRows.findIndex((row) => row.id === id);
          if (targetIndex < 0 || line.measurementRows.length <= 1) return line;
          return {
            ...line,
            measurementRows: line.measurementRows.filter((_, rowIndex) => rowIndex !== targetIndex),
          };
        }),
      );
    },
    [setLines],
  );

  const duplicateMeasurementRow = useCallback(
    (lineId: string, measurementId: string) => {
      setLines((current) =>
        current.map((line) => {
          if (line.id !== lineId) return line;
          const { id, index } = parseMeasurementTarget(measurementId);
          const targetIndex =
            index !== null && line.measurementRows[index]?.id === id
              ? index
              : line.measurementRows.findIndex((row) => row.id === id);
          const source = targetIndex >= 0 ? line.measurementRows[targetIndex] : undefined;
          if (!source) return line;
          return {
            ...line,
            measurementRows: [
              ...line.measurementRows,
              { ...source, id: createMeasurementId(), order: line.measurementRows.length },
            ],
          };
        }),
      );
    },
    [setLines],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      const line = lines.find((item) => item.id === lineId);
      setLines((current) => current.filter((item) => item.id !== lineId));
      if (line) {
        notify({
          message: `${line.voice.code} eliminata dalla bozza.`,
          title: "Voce rimossa",
          tone: "warning",
        });
      }
    },
    [lines, notify, setLines],
  );

  const setNotes = useCallback(
    (lineId: string, notes: string) => {
      setLines((current) =>
        current.map((line) => (line.id === lineId ? { ...line, notes } : line)),
      );
    },
    [setLines],
  );

  const pasteLine = useCallback(
    (draft: SalLineDraft) => {
      const newId = `draft-${draft.voice.id}-${idCounter.current++}`;
      const remappedRows = draft.measurementRows.map((row) => ({
        ...row,
        id: createMeasurementId(),
      }));
      setLines((current) => [...current, { ...draft, id: newId, measurementRows: remappedRows }]);
      notify({
        message: `${draft.voice.code} duplicata via incolla.`,
        title: "Voce incollata",
        tone: "success",
      });
    },
    [notify, setLines],
  );

  return {
    addMeasurementRow,
    addVoiceAsNewLine,
    duplicateMeasurementRow,
    pasteLine,
    removeLine,
    removeMeasurementRow,
    setNotes,
    setSurcharge,
    updateMeasurementRow,
    upsertLine,
  };
}
