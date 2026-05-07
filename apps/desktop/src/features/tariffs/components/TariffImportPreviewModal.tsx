import { parseEuroAmount } from "@quantara/domain-utils";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ListChecks, Trash2, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import { ProjectControlButton } from "@/features/projects/components/workspace-ui";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import { groupEditableTariffVoices } from "../utils/tariff-grouping";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
import { EditableTariffVoicesGrid } from "./EditableTariffVoicesGrid";
import { ImportMetric } from "./ImportMetric";
import { ValidationLine } from "./ValidationLine";

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;
const BUTTER_EASE = [0.22, 1, 0.36, 1] as const;

export function TariffImportPreviewModal({
  activeIndex = 0,
  isBusy,
  metadatas,
  onCancel,
  onConfirm,
  onPageCanConfirmChange,
  pageView = false,
}: {
  activeIndex?: number;
  isBusy: boolean;
  metadatas: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffPdfMetadata[]) => void;
  onPageCanConfirmChange?: (canConfirm: boolean) => void;
  pageView?: boolean;
}) {
  const { notify } = useToast();
  const [editableVoicesList, setEditableVoicesList] = useState(metadatas.map((m) => m.voices));
  const [deleteTarget, setDeleteTarget] = useState<{
    code: string;
    description: string;
    index: number;
  } | null>(null);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [modalReviewedFiles, setModalReviewedFiles] = useState<Set<number>>(
    () => new Set(metadatas.length === 1 ? [0] : []),
  );
  const localActiveIndex = pageView ? activeIndex : modalActiveIndex;
  const activeMetadata = metadatas[localActiveIndex];
  const activeVoices = editableVoicesList[localActiveIndex] ?? [];

  const validations = useMemo(
    () => metadatas.map((_, i) => getImportValidation(editableVoicesList[i] ?? [])),
    [metadatas, editableVoicesList],
  );
  const activeValidation =
    validations[localActiveIndex] ??
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
  const blockingIssueCount = activeValidation.invalidCount + activeValidation.duplicateCount;
  const completionPercent =
    activeVoices.length > 0
      ? Math.round((activeValidation.validCount / activeVoices.length) * 100)
      : 0;
  const isReviewReady = hasVoices && blockingIssueCount === 0;
  const canConfirm =
    metadatas.length > 0 &&
    metadatas.every((_, i) => {
      const voices = editableVoicesList[i];
      const v = validations[i];
      return (
        voices &&
        voices.length > 0 &&
        v &&
        v.invalidCount === 0 &&
        (pageView || modalReviewedFiles.has(i))
      );
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

  const updateVoice = useCallback(
    (index: number, field: keyof DesktopTariffVoice, value: string) => {
      setEditableVoicesList((current) =>
        current.map((voices, listIndex) =>
          listIndex !== localActiveIndex
            ? voices
            : voices.map((voice, voiceIndex) =>
                voiceIndex === index
                  ? {
                      ...voice,
                      [field]:
                        field === "unitPrice"
                          ? value.trim() === ""
                            ? Number.NaN
                            : parseEuroAmount(value)
                          : field === "laborPercentage"
                            ? value.trim() === ""
                              ? null
                              : parseOptionalPercent(value)
                            : value,
                    }
                  : voice,
              ),
        ),
      );
    },
    [localActiveIndex],
  );

  const askDeleteVoice = useCallback(
    (index: number) => {
      const voice = activeVoices[index];
      if (!voice) return;
      setDeleteTarget({
        code: voice.officialCode || `Riga ${index + 1}`,
        description: voice.description,
        index,
      });
    },
    [activeVoices],
  );

  const confirmDeleteVoice = useCallback(() => {
    if (!deleteTarget) return;
    setEditableVoicesList((current) =>
      current.map((voices, listIndex) =>
        listIndex !== localActiveIndex
          ? voices
          : voices.filter((_, voiceIndex) => voiceIndex !== deleteTarget.index),
      ),
    );
    notify({
      message: `${deleteTarget.code} eliminata dalla preview.`,
      tone: "success",
    });
    setDeleteTarget(null);
  }, [deleteTarget, localActiveIndex, notify]);

  useEffect(() => {
    if (pageView) {
      onPageCanConfirmChange?.(canConfirm);
    }
  }, [canConfirm, onPageCanConfirmChange, pageView]);

  useEffect(() => {
    if (!pageView) {
      return;
    }

    const handleToolbarAction = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      if (actionId !== "tariff-import-confirm" || !canConfirm) {
        return;
      }

      onConfirm(metadatas.map((meta, i) => ({ ...meta, voices: editableVoicesList[i] ?? [] })));
    };

    window.addEventListener("tariff-preview-action", handleToolbarAction);
    return () => window.removeEventListener("tariff-preview-action", handleToolbarAction);
  }, [canConfirm, editableVoicesList, metadatas, onConfirm, pageView]);

  function focusImportCell(rowIndex: number, field: string) {
    const cell = document.getElementById(`import-cell-${rowIndex}-${field}`);
    if (cell) {
      cell.scrollIntoView({ block: "center", inline: "nearest" });
      cell.focus();
    }
  }

  const deleteDialog = deleteTarget ? (
    <DeleteVoiceDialog
      code={deleteTarget.code}
      description={deleteTarget.description}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDeleteVoice}
    />
  ) : null;

  return pageView ? (
    <>
      <div className="flex w-full flex-col gap-5 pb-[56dvh] xl:pb-0 xl:pr-[360px]">
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

        <div className="min-w-0">
          <div className="min-w-0 self-start">
            <EditableTariffVoicesGrid
              duplicateCodes={duplicateCodes}
              groups={editableGroups}
              onChange={updateVoice}
              onDelete={askDeleteVoice}
              validation={activeValidation}
            />
          </div>
        </div>

        {!hasVoices ? (
          <div className="mt-4 rounded-[20px] bg-[var(--warning-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--warning-base)]">
            Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento contenga
            codici, unita di misura e prezzi leggibili.
          </div>
        ) : null}
      </div>
      <FloatingControlDock>
        <ControlPanel
          activeMetadata={activeMetadata}
          activeValidation={activeValidation}
          blockingIssueCount={blockingIssueCount}
          completionPercent={completionPercent}
          hasVoices={hasVoices}
          isReviewReady={isReviewReady}
        />
        <InterventionPanel
          activeValidation={activeValidation}
          invalidRows={invalidRows}
          onFocusCell={focusImportCell}
        />
      </FloatingControlDock>
      {deleteDialog}
    </>
  ) : (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <motion.button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
            <motion.button
              aria-label="Chiudi"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
              onClick={onCancel}
              type="button"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.42, ease: BUTTER_EASE }}
            >
              <X className="size-4" />
            </motion.button>
          </div>

          {metadatas.length > 1 ? (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/25 px-5 py-3">
              {metadatas.map((meta, i) => {
                const v = validations[i];
                const voices = editableVoicesList[i];
                const hasErrors = (v?.invalidCount ?? 0) > 0 || (v?.duplicateCount ?? 0) > 0;
                const isValid = (voices?.length ?? 0) > 0 && !hasErrors;
                const isReviewed = modalReviewedFiles.has(i);
                return (
                  <motion.button
                    className={cn(
                      "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all duration-200",
                      i === localActiveIndex
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm"
                        : isReviewed
                          ? "bg-[var(--success-soft)] text-[var(--success-base)] ring-1 ring-[var(--success-base)]/30"
                          : "bg-[var(--surface-base)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                    )}
                    key={meta.name}
                    onClick={() => setModalActiveIndex(i)}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.42, ease: BUTTER_EASE }}
                  >
                    {isReviewed ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : isValid ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success-base)]" />
                    ) : hasErrors ? (
                      <span className="size-3.5 shrink-0 rounded-full bg-[var(--warning-base)]" />
                    ) : null}
                    {meta.name}
                  </motion.button>
                );
              })}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-0 overflow-y-auto p-5" data-tariff-preview-scroll>
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

              <div className="mt-4 min-w-0">
                <EditableTariffVoicesGrid
                  duplicateCodes={duplicateCodes}
                  groups={editableGroups}
                  onChange={updateVoice}
                  onDelete={askDeleteVoice}
                  validation={activeValidation}
                />
              </div>

              {!hasVoices ? (
                <div className="mt-4 rounded-[20px] bg-[var(--warning-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--warning-base)]">
                  Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento
                  contenga codici, unita di misura e prezzi leggibili.
                </div>
              ) : null}
            </div>
            <aside className="hidden min-h-0 overflow-y-auto border-l border-[var(--border-subtle)]/70 bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-4 lg:block">
              <div className="space-y-3">
                <ControlPanel
                  activeMetadata={activeMetadata}
                  activeValidation={activeValidation}
                  blockingIssueCount={blockingIssueCount}
                  completionPercent={completionPercent}
                  hasVoices={hasVoices}
                  isReviewReady={isReviewReady}
                />
                <InterventionPanel
                  activeValidation={activeValidation}
                  invalidRows={invalidRows}
                  onFocusCell={focusImportCell}
                />
              </div>
            </aside>
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ProjectControlButton onClick={onCancel} variant="neutral">
                Annulla
              </ProjectControlButton>
              {metadatas.length > 1 && !modalReviewedFiles.has(localActiveIndex) ? (
                <ProjectControlButton
                  icon={CheckCircle2}
                  onClick={() =>
                    setModalReviewedFiles((current) => {
                      const next = new Set(current);
                      next.add(localActiveIndex);
                      return next;
                    })
                  }
                  variant="soft"
                >
                  Segna come revisionato
                </ProjectControlButton>
              ) : null}
              {metadatas.length > 1 && modalReviewedFiles.size > 0 ? (
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {modalReviewedFiles.size}/{metadatas.length} revisionati
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
                ? modalReviewedFiles.size === metadatas.length
                  ? `Conferma tutti (${metadatas.length})`
                  : `Revisiona prima di confermare (${modalReviewedFiles.size}/${metadatas.length})`
                : "Conferma importazione"}
            </ProjectControlButton>
          </div>
        </div>
      </motion.div>
      {deleteDialog}
    </div>
  );
}

function FloatingControlDock({ children }: { children: ReactNode }) {
  return (
    <aside className="fixed inset-x-4 bottom-4 z-20 xl:bottom-auto xl:left-auto xl:right-8 xl:top-[300px] xl:w-[336px]">
      <div className="max-h-[52dvh] overflow-hidden rounded-[24px] xl:max-h-[calc(100dvh-324px)]">
        <div className="max-h-[52dvh] overflow-y-auto rounded-[24px] p-1 xl:max-h-[calc(100dvh-324px)]">
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </aside>
  );
}

function InterventionPanel({
  activeValidation,
  invalidRows,
  onFocusCell,
}: {
  activeValidation: ImportValidation;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  onFocusCell: (rowIndex: number, field: string) => void;
}) {
  if (
    activeValidation.duplicateExamples.length === 0 &&
    activeValidation.invalidExamples.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-[18px] bg-[var(--warning-soft)] p-4 text-[12px] font-medium leading-5 text-[var(--warning-base)] ring-1 ring-[var(--warning-base)]/15">
      <div className="flex items-center gap-2 font-bold">
        <AlertTriangle className="size-4 shrink-0" />
        Interventi rapidi
      </div>
      {activeValidation.duplicateExamples.length > 0 ? (
        <div className="mt-2">Duplicati: {activeValidation.duplicateExamples.join(", ")}</div>
      ) : null}
      {activeValidation.invalidExamples.length > 0 ? (
        <div className="mt-1">Dati mancanti: {activeValidation.invalidExamples.join(", ")}</div>
      ) : null}
      {invalidRows.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {invalidRows.map((row) => (
            <motion.button
              className="rounded-full bg-[var(--warning-base)]/15 px-3 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--warning-base)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              key={`${row.index}-${row.field}`}
              onClick={() => onFocusCell(row.index, row.field)}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.42, ease: BUTTER_EASE }}
            >
              Riga {row.index + 1}: {row.label}
            </motion.button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ControlPanel({
  activeMetadata,
  activeValidation,
  blockingIssueCount,
  completionPercent,
  hasVoices,
  isReviewReady,
}: {
  activeMetadata: TariffPdfMetadata | undefined;
  activeValidation: ImportValidation;
  blockingIssueCount: number;
  completionPercent: number;
  hasVoices: boolean;
  isReviewReady: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-[color-mix(in_srgb,var(--surface-base)_88%,var(--bg-muted)_12%)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)] shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
      <div
        className={cn(
          "border-b px-4 py-3",
          isReviewReady
            ? "border-[var(--success-base)]/20 bg-[var(--success-soft)]/40"
            : "border-[var(--warning-base)]/20 bg-[var(--warning-soft)]/55",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              <ListChecks className="size-3.5" />
              Centro controllo
            </div>
            <div className="mt-2 text-[15px] font-bold leading-tight text-[var(--text-primary)]">
              {isReviewReady ? "Import pronto" : "Verifiche richieste"}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
              isReviewReady
                ? "bg-[var(--success-base)] text-[var(--text-inverse)]"
                : "bg-[var(--warning-base)] text-[var(--text-inverse)]",
            )}
          >
            {completionPercent}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-base)]/75">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              isReviewReady ? "bg-[var(--success-base)]" : "bg-[var(--warning-base)]",
            )}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]/70 border-b border-[var(--border-subtle)]/70">
        <ControlStat label="Valide" tone="success" value={activeValidation.validCount} />
        <ControlStat label="Warning" tone="warning" value={activeValidation.warningCount} />
        <ControlStat
          label="Blocchi"
          tone={blockingIssueCount > 0 ? "warning" : "neutral"}
          value={blockingIssueCount}
        />
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2 text-[12px] font-medium text-[var(--text-secondary)]">
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
            ok={(activeMetadata?.year ?? 0) >= 1900 && (activeMetadata?.year ?? 0) <= 2200}
            text="Anno coerente"
          />
        </div>
      </div>
    </div>
  );
}

function DeleteVoiceDialog({
  code,
  description,
  onCancel,
  onConfirm,
}: {
  code: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <button
        aria-label="Annulla eliminazione"
        className="absolute inset-0"
        onClick={onCancel}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-[22px] bg-[var(--surface-base)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ring-1 ring-[var(--border-subtle)]">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
            <Trash2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold leading-tight text-[var(--text-primary)]">
              Eliminare questa voce?
            </h3>
            <p className="mt-2 text-[13px] font-medium leading-5 text-[var(--text-secondary)]">
              {code}
              {description ? ` - ${description}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <ProjectControlButton onClick={onCancel} variant="neutral">
            Annulla
          </ProjectControlButton>
          <ProjectControlButton icon={Trash2} onClick={onConfirm} variant="soft">
            Elimina
          </ProjectControlButton>
        </div>
      </div>
    </div>
  );
}

function ControlStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "neutral" | "success" | "warning";
  value: number;
}) {
  return (
    <div className="px-3 py-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[18px] font-bold leading-none tabular-nums",
          tone === "success" && "text-[var(--success-base)]",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "neutral" && "text-[var(--text-primary)]",
        )}
      >
        {value.toLocaleString("it-IT")}
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
