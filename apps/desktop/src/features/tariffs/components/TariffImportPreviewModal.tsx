import { parseEuroAmount } from "@quantara/domain-utils";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownToLine, CheckCircle2, ListChecks, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [editableVoicesList, setEditableVoicesList] = useState(metadatas.map((m) => m.voices));
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [modalReviewedFiles, setModalReviewedFiles] = useState<Set<number>>(
    () => new Set(metadatas.length === 1 ? [0] : []),
  );
  const [isLoadMoreLinkVisible, setIsLoadMoreLinkVisible] = useState(false);
  const localActiveIndex = pageView ? activeIndex : modalActiveIndex;
  const activeMetadata = metadatas[localActiveIndex];
  const activeVoices = editableVoicesList[localActiveIndex] ?? [];
  const loadMoreAnchorId = `tariff-import-load-more-${localActiveIndex}`;

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
                          ? parseEuroAmount(value)
                          : field === "laborPercentage"
                            ? parseOptionalPercent(value)
                            : value,
                    }
                  : voice,
              ),
        ),
      );
    },
    [localActiveIndex],
  );

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
    cell?.scrollIntoView({ block: "center", inline: "nearest" });
    cell?.focus();
  }

  function scrollToLoadMore() {
    document.getElementById(loadMoreAnchorId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }

  return pageView ? (
    <div className="flex w-full flex-col gap-5">
      <div className="grid grid-flow-dense gap-3 md:grid-cols-4">
        <ImportMetric label="Righe rilevate" value={activeVoices.length.toLocaleString("it-IT")} />
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

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 self-start">
          <EditableTariffVoicesGrid
            duplicateCodes={duplicateCodes}
            groups={editableGroups}
            loadMoreAnchorId={loadMoreAnchorId}
            onChange={updateVoice}
            onLoadMoreVisibilityChange={setIsLoadMoreLinkVisible}
            validation={activeValidation}
          />
        </div>
        <div className="min-w-0 self-start md:sticky md:top-4 md:z-[5] md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[18px] bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)] shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
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

                {isLoadMoreLinkVisible ? (
                  <motion.button
                    className="group flex w-full items-center justify-between gap-3 rounded-[14px] border border-dashed border-[var(--accent-primary)]/45 bg-[var(--accent-primary)]/10 px-3 py-2.5 text-left text-[12px] font-bold text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                    onClick={scrollToLoadMore}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.42, ease: BUTTER_EASE }}
                  >
                    <span>Vai al caricamento altre voci</span>
                    <ArrowDownToLine className="size-4 shrink-0 transition-transform group-hover:translate-y-0.5" />
                  </motion.button>
                ) : null}

                {activeValidation.duplicateExamples.length > 0 ||
                activeValidation.invalidExamples.length > 0 ? (
                  <div className="rounded-[14px] bg-[var(--warning-soft)]/80 p-3 text-[12px] font-medium leading-5 text-[var(--warning-base)]">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="size-4 shrink-0" />
                      Interventi rapidi
                    </div>
                    {activeValidation.duplicateExamples.length > 0 ? (
                      <div className="mt-2">
                        Duplicati: {activeValidation.duplicateExamples.join(", ")}
                      </div>
                    ) : null}
                    {activeValidation.invalidExamples.length > 0 ? (
                      <div className="mt-1">
                        Dati mancanti: {activeValidation.invalidExamples.join(", ")}
                      </div>
                    ) : null}
                    {invalidRows.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {invalidRows.map((row) => (
                          <motion.button
                            className="rounded-full bg-[var(--warning-base)]/15 px-3 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--warning-base)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                            key={`${row.index}-${row.field}`}
                            onClick={() => focusImportCell(row.index, row.field)}
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hasVoices ? (
        <div className="rounded-[20px] bg-[var(--warning-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--warning-base)]">
          Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento contenga
          codici, unita di misura e prezzi leggibili.
        </div>
      ) : null}
    </div>
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
                  loadMoreAnchorId={loadMoreAnchorId}
                  onChange={updateVoice}
                  onLoadMoreVisibilityChange={setIsLoadMoreLinkVisible}
                  validation={activeValidation}
                />
                <div className="space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
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
                    {isLoadMoreLinkVisible ? (
                      <motion.button
                        className="mt-4 w-full rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-left text-[12px] font-bold text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-muted)]"
                        onClick={scrollToLoadMore}
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.42, ease: BUTTER_EASE }}
                      >
                        Vai in fondo per caricare le altre voci
                      </motion.button>
                    ) : null}
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
                            <motion.button
                              className="rounded-full bg-[var(--warning-base)]/15 px-3 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--warning-base)]/25"
                              key={`${row.index}-${row.field}`}
                              onClick={() => focusImportCell(row.index, row.field)}
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
