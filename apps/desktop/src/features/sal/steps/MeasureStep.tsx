import { Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import { reportUserActionError } from "@/lib/user-action-error";
import type { SalTemplate } from "@/store/template-store";
import { SelectedVoicesPanel } from "../components/SalCreationTables";
import {
  parseSalClipboardText,
  serializeSalMeasurementsClipboard,
  serializeSalVoiceClipboard,
} from "../domain/sal-clipboard";
import type { SalVoiceSearchIndex } from "../hooks/useSalVoiceSearchIndex";
import type {
  SalEconomicRules,
  SalLineDraft,
  SalLineView,
  SalMeasurementRowDraft,
  SalVoiceDraft,
} from "../types";
import { buildStationOnlyMeasurementClipboardRow, createMeasurementId } from "../types";

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable === true;
}

export const MeasureStep = memo(function MeasureStep({
  economicRules,
  lineViews,
  mgAvailableVoices,
  voiceSearchIndex,
  isLoading = false,
  isActive = false,
  onAddMeasurementRow,
  onAllocateMg,
  onAddMgVoice,
  onDuplicateMeasurementRow,
  onRemoveMeasurementRow,
  onUpdateMeasurementRow,
  onRemove,
  onNotesChange,
  onPasteLine,
  onPasteMeasurementRows,
  onPasteMeasurementRowsAt,
  onSearchSelectVoice,
  onScrollToLineHandled,
  scrollToLineId,
  onApplyTemplate,
  onOpenTemplateDialog,
  tariffBookIds,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  mgAvailableVoices: SalVoiceDraft[];
  voiceSearchIndex: SalVoiceSearchIndex;
  isLoading?: boolean;
  isActive?: boolean;
  onAddMeasurementRow: (lineId: string) => void;
  onAllocateMg: (mgLineId: string, targetLineIds: string[]) => void;
  onAddMgVoice: (voice: SalVoiceDraft) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
  onUpdateMeasurementRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
  onRemove: (lineId: string) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onSurcharge: (lineId: string, p: number) => void;
  onPasteLine: (d: SalLineDraft) => void;
  onPasteMeasurementRows: (
    lineId: string,
    rows: SalMeasurementRowDraft[],
    options?: { stationOnly?: boolean },
  ) => string | null;
  onPasteMeasurementRowsAt: (
    lineId: string,
    rows: SalMeasurementRowDraft[],
    insertIndex: number,
    options?: { stationOnly?: boolean },
  ) => string | null;
  onSearchSelectVoice?: (voice: SalVoiceDraft) => void;
  onScrollToLineHandled?: () => void;
  scrollToLineId?: string | null;
  onApplyTemplate?: (template: SalTemplate) => void;
  onOpenTemplateDialog?: () => void;
  tariffBookIds?: string[];
}) {
  const { notify } = useToast();
  const [copiedLine, setCopiedLine] = useState<SalLineDraft | null>(null);
  const [copiedMeasurements, setCopiedMeasurements] = useState<{
    rows: SalMeasurementRowDraft[];
    stationOnly: boolean;
  } | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [clipboardScope, setClipboardScope] = useState<"voice" | "measurement">("voice");
  const [selectedMeasurementRow, setSelectedMeasurementRow] = useState<{
    lineId: string;
    rowIndex: number;
  } | null>(null);
  const lastInteractedRef = useRef<string | null>(null);

  const handleActiveLineChange = useCallback((lineId: string) => {
    setActiveLineId(lineId);
    lastInteractedRef.current = lineId;
    setClipboardScope("voice");
    setSelectedMeasurementRow(null);
  }, []);

  const handleSelectMeasurementRow = useCallback((lineId: string, rowIndex: number) => {
    setSelectedMeasurementRow({ lineId, rowIndex });
    setActiveLineId(lineId);
    lastInteractedRef.current = lineId;
    setClipboardScope("measurement");
  }, []);

  const searchConfig = useMemo(
    () =>
      onSearchSelectVoice && onApplyTemplate && tariffBookIds
        ? {
            isLoading,
            onSelectVoice: onSearchSelectVoice,
            onApplyTemplate,
            onOpenTemplateDialog: onOpenTemplateDialog ?? (() => {}),
            searchIndex: voiceSearchIndex,
            tariffBookIds,
            voicesCount: voiceSearchIndex.voiceById.size,
          }
        : undefined,
    [
      isLoading,
      onApplyTemplate,
      onOpenTemplateDialog,
      onSearchSelectVoice,
      tariffBookIds,
      voiceSearchIndex,
    ],
  );

  const handleCopyLine = useCallback(
    (lineId: string) => {
      const line = lineViews.find((l) => l.id === lineId);
      if (!line) return;
      const draft: SalLineDraft = {
        id: `__sal-clip__${line.id}`,
        measurementRows: line.measurementRows.map((r) => ({ ...r, id: createMeasurementId() })),
        notes: "",
        sourceType: line.sourceType,
        surchargePercent: line.surchargePercent,
        voice: line.voice,
      };
      setCopiedLine(draft);
      setCopiedMeasurements(null);
      setClipboardScope("voice");
      setSelectedMeasurementRow(null);
      setActiveLineId(lineId);
      lastInteractedRef.current = lineId;
      if (!navigator.clipboard?.writeText) {
        notify({
          message:
            "Clipboard di sistema non disponibile. Puoi usare il pulsante Incolla voce copiata.",
          title: "Copia locale",
          tone: "warning",
        });
        return;
      }
      navigator.clipboard.writeText(serializeSalVoiceClipboard(draft)).catch((error) =>
        reportUserActionError(error, {
          action: "copy-line",
          area: "sal",
          notify,
          title: "Copia non riuscita",
          userMessage: "Non sono riuscito a copiare la voce negli appunti.",
        }),
      );
    },
    [lineViews, notify],
  );

  const handleCopyMeasurementRow = useCallback(
    (lineId: string, rowIndex: number) => {
      const line = lineViews.find((l) => l.id === lineId);
      const row = line?.measurementRows[rowIndex];
      if (!line || !row) return;
      const rows = [buildStationOnlyMeasurementClipboardRow(row, line.voice.unit)];
      setCopiedMeasurements({ rows, stationOnly: true });
      setCopiedLine(null);
      setClipboardScope("measurement");
      setSelectedMeasurementRow({ lineId, rowIndex });
      setActiveLineId(lineId);
      lastInteractedRef.current = lineId;
      if (!navigator.clipboard?.writeText) return;
      navigator.clipboard
        .writeText(serializeSalMeasurementsClipboard(rows, line.voice.code, { stationOnly: true }))
        .catch(() => {});
    },
    [lineViews],
  );

  const handleCopyMeasurements = useCallback(
    (lineId: string) => {
      const line = lineViews.find((l) => l.id === lineId);
      if (!line || line.measurementRows.length === 0) return;
      const rows = line.measurementRows.map((row) => ({ ...row }));
      setCopiedMeasurements({ rows, stationOnly: false });
      setCopiedLine(null);
      setActiveLineId(lineId);
      lastInteractedRef.current = lineId;
      if (!navigator.clipboard?.writeText) {
        notify({
          message: "Righe copiate in memoria. Incolla su un'altra voce dal menu contestuale.",
          title: "Copia righe misura",
          tone: "info",
        });
        return;
      }
      navigator.clipboard
        .writeText(serializeSalMeasurementsClipboard(rows, line.voice.code))
        .catch((error) =>
          reportUserActionError(error, {
            action: "copy-measurements",
            area: "sal",
            notify,
            title: "Copia non riuscita",
            userMessage: "Non sono riuscito a copiare le righe misura.",
          }),
        );
    },
    [lineViews, notify],
  );

  const handlePasteMeasurementRowAt = useCallback(
    (lineId: string, insertIndex: number) => {
      if (!copiedMeasurements || copiedMeasurements.rows.length === 0) return;
      onPasteMeasurementRowsAt(lineId, copiedMeasurements.rows, insertIndex, {
        stationOnly: copiedMeasurements.stationOnly,
      });
    },
    [copiedMeasurements, onPasteMeasurementRowsAt],
  );

  const handlePasteMeasurements = useCallback(
    (lineId: string) => {
      const insertIndex =
        selectedMeasurementRow?.lineId === lineId ? selectedMeasurementRow.rowIndex + 1 : undefined;
      if (copiedMeasurements && copiedMeasurements.rows.length > 0) {
        const pasteOpts = { stationOnly: copiedMeasurements.stationOnly };
        if (insertIndex != null) {
          onPasteMeasurementRowsAt(lineId, copiedMeasurements.rows, insertIndex, pasteOpts);
        } else {
          onPasteMeasurementRows(lineId, copiedMeasurements.rows, pasteOpts);
        }
        return;
      }
      if (!navigator.clipboard?.readText) {
        notify({
          message: "Nessuna riga misura in memoria.",
          title: "Incolla righe",
          tone: "warning",
        });
        return;
      }
      navigator.clipboard
        .readText()
        .then((text) => {
          const parsed = parseSalClipboardText(text);
          if (parsed?.kind === "measurements") {
            setCopiedMeasurements({ rows: parsed.rows, stationOnly: parsed.stationOnly });
            onPasteMeasurementRows(lineId, parsed.rows, {
              stationOnly: parsed.stationOnly,
            });
          }
        })
        .catch((error) =>
          reportUserActionError(error, {
            action: "paste-measurements",
            area: "sal",
            notify,
            title: "Incolla non riuscito",
            userMessage: "Non sono riuscito a incollare le righe misura.",
          }),
        );
    },
    [
      copiedMeasurements,
      notify,
      onPasteMeasurementRows,
      onPasteMeasurementRowsAt,
      selectedMeasurementRow,
    ],
  );

  const getVoiceClipboardText = useCallback(
    (lineId: string) => {
      const line = lineViews.find((l) => l.id === lineId);
      if (!line) return null;
      const draft: SalLineDraft = {
        id: `__sal-clip__${line.id}`,
        measurementRows: line.measurementRows.map((r) => ({ ...r, id: createMeasurementId() })),
        notes: "",
        sourceType: line.sourceType,
        surchargePercent: line.surchargePercent,
        voice: line.voice,
      };
      return serializeSalVoiceClipboard(draft);
    },
    [lineViews],
  );

  const getMeasurementsClipboardText = useCallback(
    (lineId: string) => {
      const line = lineViews.find((l) => l.id === lineId);
      if (!line || line.measurementRows.length === 0) return null;
      return serializeSalMeasurementsClipboard(
        line.measurementRows.map((row) => ({ ...row })),
        line.voice.code,
      );
    },
    [lineViews],
  );

  const getMeasurementRowClipboardText = useCallback(
    (lineId: string, rowIndex: number) => {
      const line = lineViews.find((l) => l.id === lineId);
      const row = line?.measurementRows[rowIndex];
      if (!line || !row) return null;
      const rows = [buildStationOnlyMeasurementClipboardRow(row, line.voice.unit)];
      return serializeSalMeasurementsClipboard(rows, line.voice.code, { stationOnly: true });
    },
    [lineViews],
  );

  const handlePasteClipboardText = useCallback(
    (lineId: string, text: string) => {
      const parsed = parseSalClipboardText(text);
      if (!parsed) {
        if (copiedLine) {
          onPasteLine(copiedLine);
          return;
        }
        if (copiedMeasurements && copiedMeasurements.rows.length > 0) {
          onPasteMeasurementRows(lineId, copiedMeasurements.rows, {
            stationOnly: copiedMeasurements.stationOnly,
          });
        }
        return;
      }
      if (parsed.kind === "voice") {
        setCopiedLine(parsed.draft);
        setCopiedMeasurements(null);
        onPasteLine(parsed.draft);
        return;
      }
      setCopiedMeasurements({ rows: parsed.rows, stationOnly: parsed.stationOnly });
      setCopiedLine(null);
      onPasteMeasurementRows(lineId, parsed.rows, { stationOnly: parsed.stationOnly });
    },
    [copiedLine, copiedMeasurements, onPasteLine, onPasteMeasurementRows],
  );

  const handlePasteVoice = useCallback(() => {
    if (copiedLine) {
      onPasteLine(copiedLine);
      return;
    }
    if (!navigator.clipboard?.readText) {
      notify({
        message: "Clipboard di sistema non disponibile.",
        title: "Incolla non disponibile",
        tone: "warning",
      });
      return;
    }
    navigator.clipboard
      .readText()
      .then((text) =>
        handlePasteClipboardText(activeLineId ?? lastInteractedRef.current ?? "", text),
      )
      .catch((error) =>
        reportUserActionError(error, {
          action: "paste-line",
          area: "sal",
          notify,
          title: "Incolla non riuscito",
          userMessage: "Non sono riuscito a leggere gli appunti.",
        }),
      );
  }, [activeLineId, copiedLine, handlePasteClipboardText, notify, onPasteLine]);

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();

      if (key === "c") {
        const lineId = activeLineId ?? lastInteractedRef.current;
        if (!lineId) return;
        e.preventDefault();
        if (
          clipboardScope === "measurement" &&
          selectedMeasurementRow?.lineId === lineId &&
          lineViews.find((line) => line.id === lineId)?.measurementRows[
            selectedMeasurementRow.rowIndex
          ]
        ) {
          handleCopyMeasurementRow(lineId, selectedMeasurementRow.rowIndex);
          return;
        }
        handleCopyLine(lineId);
        return;
      }

      if (key === "v") {
        e.preventDefault();
        const lineId = activeLineId ?? lastInteractedRef.current;
        if (!lineId) return;
        if (copiedMeasurements && copiedMeasurements.rows.length > 0) {
          handlePasteMeasurements(lineId);
          return;
        }
        handlePasteVoice();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    activeLineId,
    copiedMeasurements,
    handleCopyLine,
    handleCopyMeasurementRow,
    handlePasteMeasurements,
    handlePasteVoice,
    isActive,
    lineViews,
    clipboardScope,
    selectedMeasurementRow,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        role="none"
        onClick={(e) => {
          const measurementRow = (e.target as HTMLElement).closest("[data-measurement-row]");
          if (measurementRow) return;
          const row = (e.target as HTMLElement).closest("[data-line-id]");
          const lineId = row?.getAttribute("data-line-id") ?? null;
          if (lineId) handleActiveLineChange(lineId);
        }}
        onKeyDown={() => {}}
      >
        <SelectedVoicesPanel
          economicRules={economicRules}
          lines={lineViews}
          availableVoices={mgAvailableVoices}
          activeLineId={activeLineId}
          copiedVoiceId={copiedLine?.id ?? null}
          onAllocateMg={onAllocateMg}
          onAddMgVoice={onAddMgVoice}
          onActiveLineChange={handleActiveLineChange}
          canPasteMeasurements={(copiedMeasurements?.rows.length ?? 0) > 0}
          canPasteVoice={!!copiedLine}
          onCopyLine={handleCopyLine}
          onCopyMeasurements={handleCopyMeasurements}
          onCopyMeasurementRow={handleCopyMeasurementRow}
          onPasteMeasurementRowAt={handlePasteMeasurementRowAt}
          selectedMeasurementRow={selectedMeasurementRow}
          onSelectMeasurementRow={handleSelectMeasurementRow}
          onPasteVoice={handlePasteVoice}
          onPasteMeasurements={handlePasteMeasurements}
          getVoiceClipboardText={getVoiceClipboardText}
          getMeasurementsClipboardText={getMeasurementsClipboardText}
          getMeasurementRowClipboardText={getMeasurementRowClipboardText}
          onPasteClipboardText={handlePasteClipboardText}
          {...(onScrollToLineHandled ? { onScrollToLineHandled } : {})}
          scrollToLineId={scrollToLineId ?? null}
          onAddMeasurementRow={onAddMeasurementRow}
          onDuplicateMeasurementRow={onDuplicateMeasurementRow}
          onNotesChange={onNotesChange}
          onRemove={onRemove}
          onRemoveMeasurementRow={onRemoveMeasurementRow}
          onUpdateMeasurementRow={onUpdateMeasurementRow}
          {...(searchConfig ? { search: searchConfig } : {})}
        />

        {isLoading && lineViews.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--surface-base)]/75">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-base)] px-4 py-2 text-13px font-bold text-[var(--text-tertiary)] shadow-sm ring-1 ring-[var(--border-subtle)]">
              <Loader2 className="size-4 animate-spin" />
              Caricamento voci tariffarie...
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
