import { parseEuroAmount } from "@quantara/domain-utils";
import { CheckCircle2, FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectControlButton } from "@/features/projects/components/workspace-ui";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import { groupEditableTariffVoices } from "../utils/tariff-grouping";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
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
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/42 p-4">
      <div className="projects-surface flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-none">
        <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)]/70 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--info-soft)] text-[var(--info-base)] sm:flex">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="max-w-4xl text-[24px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[30px]">
                Preview importazione
              </h3>
              <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
                Controlla i dati estratti dal PDF prima di confermarli nel catalogo.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
                <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1">{metadata.name}</span>
                <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1">
                  {metadata.sourceName}
                </span>
                <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1">{metadata.year}</span>
              </div>
            </div>
          </div>
          <ProjectControlButton
            aria-label="Chiudi preview"
            className="size-10 px-0"
            onClick={onCancel}
            variant="icon"
          >
            <X className="size-4" />
          </ProjectControlButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-flow-dense gap-3 md:grid-cols-4">
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
              <div className="rounded-[20px] bg-[var(--bg-muted)]/65 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
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
                <div className="rounded-[20px] bg-[var(--warning-soft)] p-4 text-[12px] font-medium leading-5 text-[var(--warning-base)]">
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
                          className="projects-control-button projects-control-button-neutral rounded-full px-3 py-1 text-[11px] font-bold"
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
            <div className="mt-4 rounded-[20px] bg-[var(--warning-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--warning-base)]">
              Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento
              contenga codici, unita di misura e prezzi leggibili.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <ProjectControlButton onClick={onCancel} variant="neutral">
            Annulla
          </ProjectControlButton>
          <ProjectControlButton
            disabled={!canConfirm || isBusy}
            icon={CheckCircle2}
            onClick={() => onConfirm({ ...metadata, voices: editableVoices })}
            variant="primary"
          >
            Conferma importazione
          </ProjectControlButton>
        </div>
      </div>
    </div>
  );
}
