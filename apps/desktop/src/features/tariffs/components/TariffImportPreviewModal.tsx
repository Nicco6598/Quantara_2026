import { parseEuroAmount } from "@quantara/domain-utils";
import { motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectControlButton } from "@/features/projects/components/workspace-ui";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import { groupEditableTariffVoices } from "../utils/tariff-grouping";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
import { EditableTariffVoicesGrid } from "./EditableTariffVoicesGrid";
import { ImportMetric } from "./ImportMetric";
import { ValidationLine } from "./ValidationLine";

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

export function TariffImportPreviewModal({
  isBusy,
  metadatas,
  onCancel,
  onConfirm,
}: {
  isBusy: boolean;
  metadatas: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffPdfMetadata[]) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [editableVoicesList, setEditableVoicesList] = useState(metadatas.map((m) => m.voices));
  const [reviewedFiles, setReviewedFiles] = useState<Set<number>>(
    () => new Set(metadatas.length === 1 ? [0] : []),
  );
  const activeMetadata = metadatas[activeIndex];
  const activeVoices = editableVoicesList[activeIndex] ?? [];

  const validations = useMemo(
    () => metadatas.map((_, i) => getImportValidation(editableVoicesList[i] ?? [])),
    [metadatas, editableVoicesList],
  );
  const activeValidation =
    validations[activeIndex] ??
    ({
      canSubmit: false,
      checks: {
        amount: false,
        identity: false,
        safetyCosts: false,
        safetyCostsWithinBudget: false,
      },
      identityError: null,
      invalidCount: 0,
      invalidExamples: [],
      invalidRows: [],
      duplicateCount: 0,
      duplicateExamples: [],
      duplicateRows: [],
      validCount: 0,
      warningCount: 0,
      submitError: null,
    } as ImportValidation);
  const hasVoices = activeVoices.length > 0;
  const canConfirm =
    metadatas.length > 0 &&
    metadatas.every((_, i) => {
      const voices = editableVoicesList[i];
      const v = validations[i];
      return voices && voices.length > 0 && v && v.invalidCount === 0 && reviewedFiles.has(i);
    });
  const duplicateCodes = useMemo(
    () => new Set<string>(activeValidation.duplicateExamples),
    [activeValidation],
  );
  const editableGroups = useMemo(() => groupEditableTariffVoices(activeVoices), [activeVoices]);
  const invalidRows = useMemo(
    () =>
      activeValidation.invalidRows
        .concat(
          activeValidation.duplicateRows.map((r) => ({
            ...r,
            field: r.field as keyof DesktopTariffVoice,
          })),
        )
        .slice(0, 8),
    [activeValidation],
  );

  function updateVoice(index: number, field: keyof DesktopTariffVoice, value: string) {
    setEditableVoicesList((current) =>
      current.map((voices, listIndex) =>
        listIndex !== activeIndex
          ? voices
          : voices.map((voice, voiceIndex) =>
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
      ),
    );
  }

  function focusImportCell(rowIndex: number, field: string) {
    const cell = document.getElementById(`import-cell-${rowIndex}-${field}`);
    cell?.scrollIntoView({ block: "center", inline: "nearest" });
    cell?.focus();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <button
        aria-label="Chiudi preview"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        type="button"
      />
      <motion.div
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SPRING_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex min-h-0 flex-col rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                Preview importazione
              </div>
              <h3 className="mt-2 text-[24px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)] md:text-[30px]">
                {metadatas.length > 1
                  ? `${metadatas.length} tariffari da importare`
                  : (activeMetadata?.name ?? "Preview importazione")}
              </h3>
              <p className="mt-1 text-[13px] font-medium text-[var(--text-secondary)]">
                Controlla i dati estratti prima di confermarli nel catalogo.
              </p>
            </div>
            <button
              aria-label="Chiudi"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
              onClick={onCancel}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {metadatas.length > 1 ? (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/25 px-5 py-3">
              {metadatas.map((meta, i) => {
                const v = validations[i];
                const voices = editableVoicesList[i];
                const hasErrors = (v?.invalidCount ?? 0) > 0 || (v?.duplicateCount ?? 0) > 0;
                const isValid = (voices?.length ?? 0) > 0 && !hasErrors;
                const isReviewed = reviewedFiles.has(i);
                return (
                  <button
                    className={cn(
                      "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all duration-200",
                      i === activeIndex
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm"
                        : isReviewed
                          ? "bg-[var(--success-soft)] text-[var(--success-base)] ring-1 ring-[var(--success-base)]/30"
                          : "bg-[var(--surface-base)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                    )}
                    key={meta.name}
                    onClick={() => setActiveIndex(i)}
                    type="button"
                  >
                    {isReviewed ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : isValid ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success-base)]" />
                    ) : hasErrors ? (
                      <span className="size-3.5 shrink-0 rounded-full bg-[var(--warning-base)]" />
                    ) : null}
                    {meta.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-5">
              <div className="grid grid-flow-dense gap-3 md:grid-cols-4">
                <ImportMetric
                  label="Righe rilevate"
                  value={activeVoices.length.toLocaleString("it-IT")}
                />
                <ImportMetric
                  label="Valide"
                  tone={activeValidation.validCount > 0 ? "success" : "warning"}
                  value={activeValidation.validCount.toLocaleString("it-IT")}
                />
                <ImportMetric
                  label="Warning"
                  tone={activeValidation.warningCount > 0 ? "warning" : "neutral"}
                  value={activeValidation.warningCount.toLocaleString("it-IT")}
                />
                <ImportMetric
                  label="Duplicati"
                  tone={activeValidation.duplicateCount > 0 ? "warning" : "neutral"}
                  value={activeValidation.duplicateCount.toLocaleString("it-IT")}
                />
              </div>

              <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
                <EditableTariffVoicesGrid
                  duplicateCodes={duplicateCodes}
                  groups={editableGroups}
                  onChange={updateVoice}
                  validation={activeValidation}
                />
                <div className="space-y-3 lg:sticky lg:top-0">
                  <div className="rounded-[20px] bg-[var(--bg-muted)]/65 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      Validazioni
                    </div>
                    <div className="mt-3 space-y-2 text-[12px] font-medium text-[var(--text-secondary)]">
                      <ValidationLine ok={hasVoices} text="Voci prezzo rilevate" />
                      <ValidationLine
                        ok={activeValidation.invalidCount === 0}
                        text={`${activeValidation.invalidCount.toLocaleString("it-IT")} voci con dati mancanti`}
                      />
                      <ValidationLine
                        ok={activeValidation.duplicateCount === 0}
                        text={`${activeValidation.duplicateCount.toLocaleString("it-IT")} codici duplicati`}
                      />
                      <ValidationLine
                        ok={activeMetadata?.sourceName !== "Ente da confermare"}
                        text="Ente riconosciuto"
                      />
                      <ValidationLine
                        ok={
                          (activeMetadata?.year ?? 0) >= 1900 && (activeMetadata?.year ?? 0) <= 2200
                        }
                        text="Anno coerente"
                      />
                    </div>
                  </div>
                  {activeValidation.duplicateExamples.length > 0 ||
                  activeValidation.invalidExamples.length > 0 ? (
                    <div className="rounded-[20px] bg-[var(--warning-soft)] p-4 text-[12px] font-medium leading-5 text-[var(--warning-base)]">
                      {activeValidation.duplicateExamples.length > 0 ? (
                        <div>Duplicati: {activeValidation.duplicateExamples.join(", ")}</div>
                      ) : null}
                      {activeValidation.invalidExamples.length > 0 ? (
                        <div>Dati mancanti: {activeValidation.invalidExamples.join(", ")}</div>
                      ) : null}
                      {invalidRows.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {invalidRows.map((row) => (
                            <button
                              className="rounded-full bg-[var(--warning-base)]/15 px-3 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--warning-base)]/25"
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
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ProjectControlButton onClick={onCancel} variant="neutral">
                Annulla
              </ProjectControlButton>
              {metadatas.length > 1 && !reviewedFiles.has(activeIndex) ? (
                <ProjectControlButton
                  icon={CheckCircle2}
                  onClick={() => setReviewedFiles((current) => new Set([...current, activeIndex]))}
                  variant="soft"
                >
                  Segna come revisionato
                </ProjectControlButton>
              ) : null}
              {metadatas.length > 1 && reviewedFiles.size > 0 ? (
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {reviewedFiles.size}/{metadatas.length} revisionati
                </span>
              ) : null}
            </div>
            <ProjectControlButton
              disabled={!canConfirm || isBusy}
              icon={CheckCircle2}
              onClick={() =>
                onConfirm(
                  metadatas.map((meta, i) => ({ ...meta, voices: editableVoicesList[i] ?? [] })),
                )
              }
              variant="primary"
            >
              {metadatas.length > 1
                ? reviewedFiles.size === metadatas.length
                  ? `Conferma tutti (${metadatas.length})`
                  : `Revisiona prima di confermare (${reviewedFiles.size}/${metadatas.length})`
                : "Conferma importazione"}
            </ProjectControlButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
