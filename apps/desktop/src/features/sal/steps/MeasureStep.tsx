import { Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { reportUserActionError } from "@/lib/user-action-error";
import type { SalTemplate } from "@/store/template-store";
import { SelectedVoicesPanel } from "../components/SalCreationTables";
import type {
  SalEconomicRules,
  SalLineDraft,
  SalLineView,
  SalMeasurementRowDraft,
  SalVoiceDraft,
} from "../types";
import { createMeasurementId } from "../types";

export const MeasureStep = memo(function MeasureStep({
  economicRules,
  lineViews,
  voices,
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
  onSurcharge,
  onPasteLine,
  selectedLineId,
  onSelectLine,
  onSearchSelectVoice,
  onApplyTemplate,
  onOpenTemplateDialog,
  tariffBookIds,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  voices: SalVoiceDraft[];
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
  selectedLineId?: string | null | undefined;
  onSelectLine?: ((lineId: string | null) => void) | undefined;
  onSearchSelectVoice?: (voice: SalVoiceDraft) => void;
  onApplyTemplate?: (template: SalTemplate) => void;
  onOpenTemplateDialog?: () => void;
  tariffBookIds?: string[];
}) {
  const { notify } = useToast();
  const [copiedLine, setCopiedLine] = useState<SalLineDraft | null>(null);
  const lastInteractedRef = useRef<string | null>(null);
  const searchConfig = useMemo(
    () =>
      onSearchSelectVoice && onApplyTemplate && tariffBookIds
        ? {
            voices,
            tariffBookIds,
            isLoading,
            onSelectVoice: onSearchSelectVoice,
            onApplyTemplate,
            onOpenTemplateDialog: onOpenTemplateDialog ?? (() => {}),
          }
        : undefined,
    [voices, tariffBookIds, isLoading, onSearchSelectVoice, onApplyTemplate, onOpenTemplateDialog],
  );

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
    if (!isActive) return;
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
  }, [isActive, notify, onPasteLine]);

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
          availableVoices={voices}
          copiedVoiceId={copiedLine?.id ?? null}
          selectedLineId={selectedLineId}
          onAllocateMg={onAllocateMg}
          onAddMgVoice={onAddMgVoice}
          onCopyLine={handleCopyLine}
          onAddMeasurementRow={onAddMeasurementRow}
          onDuplicateMeasurementRow={onDuplicateMeasurementRow}
          onNotesChange={onNotesChange}
          onRemove={onRemove}
          onRemoveMeasurementRow={onRemoveMeasurementRow}
          onSurcharge={onSurcharge}
          onSelectLine={onSelectLine}
          onUpdateMeasurementRow={onUpdateMeasurementRow}
          {...(searchConfig ? { search: searchConfig } : {})}
        />

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--surface-base)]/75">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-base)] px-4 py-2 text-13px font-bold text-[var(--text-tertiary)] shadow-sm ring-1 ring-[var(--border-subtle)]">
              <Loader2 className="size-4 animate-spin" />
              Caricamento voci tariffarie...
            </span>
          </div>
        )}
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
});
