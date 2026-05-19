import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, Gauge, WalletCards } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import { SelectedVoicesPanel } from "../components/SalCreationTables";
import type {
  SalEconomicSummary,
  SalLineDraft,
  SalLineView,
  SalMeasurementRowDraft,
  SalVerificationCheck,
} from "../types";
import { createMeasurementId } from "../types";

export function MeasureStep({
  lineViews,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onRemoveMeasurementRow,
  onUpdateMeasurementRow,
  onRemove,
  onNotesChange,
  onSurcharge,
  onPasteLine,
  checks,
  summary,
}: {
  lineViews: SalLineView[];
  checks: SalVerificationCheck[];
  summary: SalEconomicSummary;
  onAddMeasurementRow: (lineId: string) => void;
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
  const [copiedLine, setCopiedLine] = useState<SalLineDraft | null>(null);
  const lastInteractedRef = useRef<string | null>(null);
  const incompleteCount = lineViews.filter((line) => line.status !== "complete").length;
  const dangerChecks = checks.filter((check) => check.tone === "danger");
  const warningChecks = checks.filter((check) => check.tone === "warning");

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
      navigator.clipboard.writeText(JSON.stringify({ __salDraft: true, ...draft })).catch(() => {});
    },
    [lineViews],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
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
          .catch(() => {});
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onPasteLine]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div
        className="min-w-0"
        role="none"
        onClick={(e) => {
          const row = (e.target as HTMLElement).closest("[data-line-id]");
          if (row) lastInteractedRef.current = row.getAttribute("data-line-id");
        }}
        onKeyDown={() => {}}
      >
        <SelectedVoicesPanel
          lines={lineViews}
          copiedVoiceId={copiedLine?.id ?? null}
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

      <aside className="space-y-3 xl:sticky xl:top-[172px] xl:self-start">
        <div className="rounded-xl bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="flex items-center gap-2 text-11px font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            <Gauge className="size-4" />
            Cockpit SAL
          </div>
          <div className="mt-4 grid gap-2">
            <CockpitMetric
              icon={<WalletCards className="size-4" />}
              label="Totale corrente"
              value={<Currency value={summary.total} />}
              accent
            />
            <CockpitMetric
              icon={<FileText className="size-4" />}
              label="Voci"
              value={`${summary.voiceCount}`}
              detail={`${incompleteCount} da completare`}
              tone={incompleteCount > 0 ? "warning" : "success"}
            />
            <CockpitMetric
              icon={<WalletCards className="size-4" />}
              label="Residuo"
              value={<Currency value={summary.budgetResidual} />}
              tone={summary.budgetResidual < 0 ? "danger" : "success"}
            />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="flex items-center justify-between gap-3">
            <div className="text-11px font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Verifica rapida
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-1 text-10px font-black",
                dangerChecks.length > 0
                  ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
                  : warningChecks.length > 0
                    ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                    : "bg-[var(--success-soft)] text-[var(--success-base)]",
              )}
            >
              {dangerChecks.length > 0
                ? `${dangerChecks.length} blocchi`
                : warningChecks.length > 0
                  ? `${warningChecks.length} warning`
                  : "OK"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {(dangerChecks.length > 0 ? dangerChecks : warningChecks).slice(0, 5).map((check) => (
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-11px leading-snug",
                  check.tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
                  check.tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
                )}
                key={check.id}
                title={check.detail}
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {check.label}
                </div>
                <div className="mt-0.5 opacity-80">{check.result}</div>
              </div>
            ))}
            {dangerChecks.length === 0 && warningChecks.length === 0 ? (
              <div className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-11px font-semibold text-[var(--success-base)]">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-3.5" />
                  Tutte le misure sono coerenti.
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {copiedLine ? (
          <Button
            className="w-full justify-between"
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

function CockpitMetric({
  accent,
  detail,
  icon,
  label,
  tone,
  value,
}: {
  accent?: boolean;
  detail?: string;
  icon: ReactNode;
  label: string;
  tone?: "success" | "warning" | "danger";
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[var(--bg-muted)]/35 p-3">
      <div className="flex items-center gap-2 text-10px font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-17px font-black tabular-nums",
          accent && "text-[var(--accent-primary)]",
          tone === "success" && "text-[var(--success-base)]",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "danger" && "text-[var(--danger-base)]",
          !accent && !tone && "text-[var(--text-primary)]",
        )}
      >
        {value}
      </div>
      {detail ? <div className="mt-1 text-10px text-[var(--text-tertiary)]">{detail}</div> : null}
    </div>
  );
}

function Currency({ value }: { value: number }) {
  return (
    <span className="tabular-nums">
      {value.toLocaleString("it-IT", {
        currency: "EUR",
        minimumFractionDigits: 2,
        style: "currency",
      })}
    </span>
  );
}
