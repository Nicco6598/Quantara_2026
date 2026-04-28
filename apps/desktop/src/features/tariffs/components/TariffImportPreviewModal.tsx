import { parseEuroAmount } from "@quantara/domain-utils";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
import { groupEditableTariffVoices } from "../utils/tariff-grouping";
import { EditableTariffVoicesGrid } from "./EditableTariffVoicesGrid";
import { ImportMetric } from "./ImportMetric";
import { ValidationLine } from "./ValidationLine";

export function TariffImportPreviewModal({
  isBusy,
  metadata,
  onCancel,
  onConfirm,
}: {
  isBusy: boolean;
  metadata: TariffPdfMetadata;
  onCancel: () => void;
  onConfirm: (metadata: TariffPdfMetadata) => void;
}) {
  const [editableVoices, setEditableVoices] = useState(metadata.voices);
  const validation = getImportValidation(editableVoices);
  const hasVoices = editableVoices.length > 0;
  const canConfirm = hasVoices && validation.invalidCount === 0;
  const duplicateCodes = useMemo(() => new Set<string>(validation.duplicateExamples), [validation]);
  const editableGroups = useMemo(() => groupEditableTariffVoices(editableVoices), [editableVoices]);
  const invalidRows = useMemo(
    () =>
      validation.invalidRows
        .concat(
          validation.duplicateRows.map((r) => ({
            ...r,
            field: r.field as keyof DesktopTariffVoice,
          })),
        )
        .slice(0, 8),
    [validation],
  );

  function updateVoice(index: number, field: keyof DesktopTariffVoice, value: string) {
    setEditableVoices((current) =>
      current.map((voice, voiceIndex) =>
        voiceIndex === index
          ? {
              ...voice,
              [field]:
                field === "unitPrice"
                  ? parseEuroAmount(value)
                  : field === "laborPercentage"
                    ? parseOptionalPercent(value)
                    : value,
            }
          : voice,
      ),
    );
  }

  function focusImportCell(rowIndex: number, field: string) {
    const cell = document.getElementById(`import-cell-${rowIndex}-${field}`);
    cell?.scrollIntoView({ block: "center", inline: "nearest" });
    cell?.focus();
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-xl">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-[21px] font-bold leading-tight text-[var(--text-primary)]">
              Preview importazione
            </h3>
            <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
              Controlla i dati estratti dal PDF prima di confermarli nel catalogo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 py-1">
                {metadata.name}
              </span>
              <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 py-1">
                {metadata.sourceName}
              </span>
              <span className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 py-1">
                {metadata.year}
              </span>
            </div>
          </div>
          <Button
            aria-label="Chiudi preview"
            onClick={onCancel}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <ImportMetric
              label="Righe rilevate"
              value={metadata.voices.length.toLocaleString("it-IT")}
            />
            <ImportMetric
              label="Valide"
              tone={validation.validCount > 0 ? "success" : "warning"}
              value={validation.validCount.toLocaleString("it-IT")}
            />
            <ImportMetric
              label="Warning"
              tone={validation.warningCount > 0 ? "warning" : "neutral"}
              value={validation.warningCount.toLocaleString("it-IT")}
            />
            <ImportMetric
              label="Duplicati"
              tone={validation.duplicateCount > 0 ? "warning" : "neutral"}
              value={validation.duplicateCount.toLocaleString("it-IT")}
            />
          </div>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
            <EditableTariffVoicesGrid
              duplicateCodes={duplicateCodes}
              groups={editableGroups}
              onChange={updateVoice}
              validation={validation}
            />
            <div className="space-y-3 lg:sticky lg:top-0">
              <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Validazioni
                </div>
                <div className="mt-3 space-y-2 text-[12px] font-medium text-[var(--text-secondary)]">
                  <ValidationLine ok={hasVoices} text="Voci prezzo rilevate" />
                  <ValidationLine
                    ok={validation.invalidCount === 0}
                    text={`${validation.invalidCount.toLocaleString("it-IT")} voci con dati mancanti`}
                  />
                  <ValidationLine
                    ok={validation.duplicateCount === 0}
                    text={`${validation.duplicateCount.toLocaleString("it-IT")} codici duplicati`}
                  />
                  <ValidationLine
                    ok={metadata.sourceName !== "Ente da confermare"}
                    text="Ente riconosciuto"
                  />
                  <ValidationLine
                    ok={metadata.year >= 1900 && metadata.year <= 2200}
                    text="Anno coerente"
                  />
                </div>
              </div>
              {validation.duplicateExamples.length > 0 || validation.invalidExamples.length > 0 ? (
                <div className="rounded-lg border border-[var(--warning-soft)] bg-[var(--warning-soft)] p-3 text-[12px] font-medium leading-5 text-[var(--warning-base)]">
                  {validation.duplicateExamples.length > 0 ? (
                    <div>Duplicati: {validation.duplicateExamples.join(", ")}</div>
                  ) : null}
                  {validation.invalidExamples.length > 0 ? (
                    <div>Dati mancanti: {validation.invalidExamples.join(", ")}</div>
                  ) : null}
                  {invalidRows.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {invalidRows.map((row) => (
                        <button
                          className="rounded-md border border-current/25 bg-[var(--surface-base)] px-2 py-1 text-[11px] font-bold"
                          key={`${row.index}-${row.field}`}
                          onClick={() => focusImportCell(row.index, row.field)}
                          type="button"
                        >
                          Riga {row.index + 1}: {row.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {!hasVoices ? (
            <div className="mt-4 rounded-lg border border-[var(--warning-soft)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--warning-base)]">
              Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento
              contenga codici, unita di misura e prezzi leggibili.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onCancel} type="button" variant="outline">
            Annulla
          </Button>
          <Button
            disabled={!canConfirm || isBusy}
            onClick={() => onConfirm({ ...metadata, voices: editableVoices })}
            type="button"
          >
            Conferma importazione
          </Button>
        </div>
      </div>
    </div>
  );
}
