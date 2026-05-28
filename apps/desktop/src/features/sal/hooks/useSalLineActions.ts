import { useCallback, useRef } from "react";
import { remapMeasurementRowsForPaste } from "../domain/sal-clipboard";
import { parseMeasurementTarget } from "../domain/sal-measurement-target";
import type { SalLineDraft, SalMeasurementRowDraft, SalVoiceDraft } from "../types";
import {
  cloneMeasurementRowForDuplicate,
  createEmptyMeasurementRow,
  createMeasurementId,
} from "../types";

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
  // Keep a live ref to lines so callbacks below don't have to depend on it.
  // This avoids re-creating action callbacks on every keystroke, which in turn
  // prevents memoized children (MeasureStep, SelectedVoicesPanel) from
  // re-rendering whenever the user types a digit.
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const upsertLine = useCallback(
    (voice: SalVoiceDraft): string | null => {
      const exists = linesRef.current.some((line) => line.voice.id === voice.id);
      if (exists) {
        setLines((current) => current.filter((line) => line.voice.id !== voice.id));
        notify({
          message: `${voice.code} rimossa dalla bozza.`,
          title: "Voce rimossa",
          tone: "warning",
        });
        return null;
      }

      const lineId = `draft-${voice.id}`;
      setLines((current) => [
        ...current,
        {
          id: lineId,
          measurementRows: [createEmptyMeasurementRow(voice.unit, 0)],
          notes: "",
          sourceType: "voice",
          surchargePercent: 0,
          voice,
        },
      ]);
      notify({
        message: `${voice.code} aggiunta alla bozza.`,
        title: "Voce aggiunta",
        tone: "success",
      });
      return lineId;
    },
    [notify, setLines],
  );

  const addVoiceAsNewLine = useCallback(
    (voice: SalVoiceDraft): string => {
      const lineId = `draft-${voice.id}-${idCounter.current++}`;
      const draft: SalLineDraft = {
        id: lineId,
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
      return lineId;
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
              cloneMeasurementRowForDuplicate(source, line.voice.unit, line.measurementRows.length),
            ],
          };
        }),
      );
    },
    [setLines],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      const line = linesRef.current.find((item) => item.id === lineId);
      setLines((current) => current.filter((item) => item.id !== lineId));
      if (line) {
        notify({
          message: `${line.voice.code} eliminata dalla bozza.`,
          title: "Voce rimossa",
          tone: "warning",
        });
      }
    },
    [notify, setLines],
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
    (draft: SalLineDraft): string => {
      let newId = `draft-${draft.voice.id}-${idCounter.current++}`;
      while (linesRef.current.some((line) => line.id === newId)) {
        newId = `draft-${draft.voice.id}-${idCounter.current++}`;
      }
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
      return newId;
    },
    [notify, setLines],
  );

  const pasteMeasurementRowsAt = useCallback(
    (
      lineId: string,
      rows: readonly SalMeasurementRowDraft[],
      insertIndex: number,
      options?: { stationOnly?: boolean },
    ): string | null => {
      if (rows.length === 0) return null;
      const target = linesRef.current.find((line) => line.id === lineId);
      if (!target) return null;

      const remapped = remapMeasurementRowsForPaste(rows, target.voice.unit, 0, options);
      setLines((current) =>
        current.map((line) => {
          if (line.id !== lineId) return line;
          const nextRows = [...line.measurementRows];
          const index = Math.min(Math.max(0, insertIndex), nextRows.length);
          nextRows.splice(index, 0, ...remapped);
          return {
            ...line,
            measurementRows: nextRows.map((row, order) => ({ ...row, order })),
          };
        }),
      );
      notify({
        message:
          remapped.length === 1
            ? `Riga misura incollata in ${target.voice.code}.`
            : `${remapped.length} righe misura incollate in ${target.voice.code}.`,
        title: "Righe incollate",
        tone: "success",
      });
      return lineId;
    },
    [notify, setLines],
  );

  const pasteMeasurementRows = useCallback(
    (
      lineId: string,
      rows: readonly SalMeasurementRowDraft[],
      options?: { stationOnly?: boolean },
    ): string | null => {
      const target = linesRef.current.find((line) => line.id === lineId);
      if (!target) return null;
      return pasteMeasurementRowsAt(lineId, rows, target.measurementRows.length, options);
    },
    [pasteMeasurementRowsAt],
  );

  return {
    addMeasurementRow,
    addVoiceAsNewLine,
    duplicateMeasurementRow,
    pasteLine,
    pasteMeasurementRows,
    pasteMeasurementRowsAt,
    removeLine,
    removeMeasurementRow,
    setNotes,
    setSurcharge,
    updateMeasurementRow,
    upsertLine,
  };
}
