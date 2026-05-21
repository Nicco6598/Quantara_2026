import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { reportUserActionError } from "@/lib/user-action-error";
import { SelectedVoicesPanel } from "../components/SalCreationTables";
import type { SalEconomicRules, SalLineDraft, SalLineView, SalMeasurementRowDraft } from "../types";
import { createMeasurementId } from "../types";

export function MeasureStep({
  economicRules,
  lineViews,
  onAddMeasurementRow,
  onAllocateMg,
  onDuplicateMeasurementRow,
  onRemoveMeasurementRow,
  onUpdateMeasurementRow,
  onRemove,
  onNotesChange,
  onSurcharge,
  onPasteLine,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  onAddMeasurementRow: (lineId: string) => void;
  onAllocateMg: (mgLineId: string, targetLineIds: string[]) => void;
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
}) {
  const { notify } = useToast();
  const [copiedLine, setCopiedLine] = useState<SalLineDraft | null>(null);
  const lastInteractedRef = useRef<string | null>(null);

  const handleCopyLine = useCallback(
    (lineId: string) => {
      const line = lineViews.find((l) => l.id === lineId);
      if (!line) return;
      const draft: SalLineDraft = {
        id: line.id,
        measurementRows: line.measurementRows.map((r) => ({ ...r, id: createMeasurementId() })),
        notes: "",
        sourceType: line.sourceType,
        surchargePercent: line.surchargePercent,
        voice: line.voice,
      };
      setCopiedLine(draft);
      if (!navigator.clipboard?.writeText) {
        notify({
          message:
            "Clipboard di sistema non disponibile. Puoi usare il pulsante Incolla voce copiata.",
          title: "Copia locale",
          tone: "warning",
        });
        return;
      }
      navigator.clipboard.writeText(JSON.stringify({ __salDraft: true, ...draft })).catch((error) =>
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
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
          .then((text) => {
            try {
              const data = JSON.parse(text);
              if (data.__salDraft) {
                onPasteLine(data);
              }
            } catch {
              /* not our clipboard format */
            }
          })
          .catch((error) =>
            reportUserActionError(error, {
              action: "paste-line",
              area: "sal",
              notify,
              title: "Incolla non riuscito",
              userMessage: "Non sono riuscito a leggere gli appunti.",
            }),
          );
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [notify, onPasteLine]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        className="min-h-0 min-w-0 flex-1"
        role="none"
        onClick={(e) => {
          const row = (e.target as HTMLElement).closest("[data-line-id]");
          if (row) lastInteractedRef.current = row.getAttribute("data-line-id");
        }}
        onKeyDown={() => {}}
      >
        <SelectedVoicesPanel
          economicRules={economicRules}
          lines={lineViews}
          copiedVoiceId={copiedLine?.id ?? null}
          onAllocateMg={onAllocateMg}
          onCopyLine={handleCopyLine}
          onAddMeasurementRow={onAddMeasurementRow}
          onDuplicateMeasurementRow={onDuplicateMeasurementRow}
          onNotesChange={onNotesChange}
          onRemove={onRemove}
          onRemoveMeasurementRow={onRemoveMeasurementRow}
          onSurcharge={onSurcharge}
          onUpdateMeasurementRow={onUpdateMeasurementRow}
        />
      </div>

      <aside className="shrink-0 px-4 lg:px-6">
        {copiedLine ? (
          <Button
            className="w-full justify-between sm:w-auto"
            onClick={() => onPasteLine(copiedLine)}
            type="button"
            variant="secondary"
          >
            Incolla voce copiata
          </Button>
        ) : null}
      </aside>
    </div>
  );
}
