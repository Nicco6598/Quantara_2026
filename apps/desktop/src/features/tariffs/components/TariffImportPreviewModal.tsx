import { parseEuroAmount } from "@quantara/domain-utils";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronRight,
  Files,
  List,
  ListChecks,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { BUTTER_EASE, SPRING_EASE } from "@/components/shared/easings";
import { useToast } from "@/components/shared/ToastProvider";

import { ProjectControlButton } from "@/components/shared/ui-primitives";

import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";

import type { ImportValidation } from "../tariffs-types";
import { groupEditableTariffVoices } from "../utils/tariff-grouping";
import { getImportValidation, parseOptionalPercent } from "../utils/tariffs-validation";
import {
  EditableTariffVoicesGrid,
  type TariffGridSectionSummary,
} from "./EditableTariffVoicesGrid";
import { ImportMetric } from "./ImportMetric";
import { ValidationLine } from "./ValidationLine";

const DRAFT_VERSION = 1;
type InspectorTab = "checks" | "categories" | "issues";

type ImportDraft = {
  draftedFiles: number[];
  editableVoicesList: DesktopTariffVoice[][];
  excludedFiles: number[];
  id: string;
  metadatas: TariffPdfMetadata[];
  name: string;
  reviewedFiles: number[];
  savedAt: string;
  signature: string;
  version: number;
};

export type TariffImportDraftSummary = {
  fileCount: number;
  id: string;
  name: string;
  reviewedCount: number;
  savedAt: string;
  totalVoices: number;
};

export type TariffImportPreviewResult = TariffPdfMetadata & {
  importStatus: "active" | "draft";
  existingBookId?: string;
};

export function TariffImportPreviewModal({
  activeIndex = 0,
  existingBookIds,
  isBusy,
  metadatas,
  onCancel,
  onConfirm,
  onDraftedFilesChange,
  onMetadatasChange,
  onPageCanConfirmChange,
  onReviewedFilesChange,
  pageView = false,
}: {
  activeIndex?: number;
  existingBookIds?: (string | undefined)[];
  isBusy: boolean;
  metadatas: TariffPdfMetadata[];
  onCancel: () => void;
  onConfirm: (metadatas: TariffImportPreviewResult[]) => void;
  onDraftedFilesChange?: (draftedFiles: Set<number>) => void;
  onMetadatasChange?: (metadatas: TariffPdfMetadata[]) => void;
  onPageCanConfirmChange?: (canConfirm: boolean) => void;
  onReviewedFilesChange?: (reviewedFiles: Set<number>) => void;
  pageView?: boolean;
}) {
  const { notify } = useToast();
  const isEditingExistingTariff = existingBookIds?.some(Boolean) ?? false;
  const draftSignature = useMemo(() => createDraftSignature(metadatas), [metadatas]);
  const draftStorageKey = useMemo(
    () => `quantara:tariff-import-preview:${draftSignature}`,
    [draftSignature],
  );
  const loadedDraft = useMemo(
    () =>
      isEditingExistingTariff
        ? null
        : loadImportDraft(draftStorageKey, draftSignature, metadatas.length),
    [draftSignature, draftStorageKey, isEditingExistingTariff, metadatas.length],
  );
  const [editableVoicesList, setEditableVoicesList] = useState(() =>
    loadedDraft?.metadatas
      ? loadedDraft.metadatas.map((metadata) => metadata.voices)
      : (loadedDraft?.editableVoicesList ?? metadatas.map((m) => m.voices)),
  );
  const [excludedFiles, setExcludedFiles] = useState<Set<number>>(
    () => new Set(loadedDraft?.excludedFiles ?? []),
  );
  const [draftedFiles, setDraftedFiles] = useState<Set<number>>(
    () => new Set(loadedDraft?.draftedFiles ?? []),
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    code: string;
    description: string;
    index: number;
  } | null>(null);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [modalReviewedFiles, setModalReviewedFiles] = useState<Set<number>>(
    () => new Set(loadedDraft?.reviewedFiles ?? (metadatas.length === 1 ? [0] : [])),
  );
  const [categorySections, setCategorySections] = useState<TariffGridSectionSummary[]>([]);
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
      const isDrafted = draftedFiles.has(i);
      return (
        voices &&
        voices.length > 0 &&
        v &&
        (isDrafted || (v.invalidCount === 0 && modalReviewedFiles.has(i)))
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

  const confirmableMetadatas = useMemo(
    () =>
      metadatas.map((meta, i) => {
        const existingBookId = existingBookIds?.[i];
        return {
          ...meta,
          ...(existingBookId ? { existingBookId } : {}),
          importStatus: draftedFiles.has(i) ? ("draft" as const) : ("active" as const),
          voices: editableVoicesList[i] ?? [],
        };
      }),
    [draftedFiles, editableVoicesList, existingBookIds, metadatas],
  );

  const confirmChanges = useCallback(() => {
    deleteTariffImportDraft(draftStorageKey);
    onConfirm(confirmableMetadatas);
  }, [confirmableMetadatas, draftStorageKey, onConfirm]);

  useEffect(() => {
    setEditableVoicesList(
      loadedDraft?.metadatas
        ? loadedDraft.metadatas.map((metadata) => metadata.voices)
        : (loadedDraft?.editableVoicesList ?? metadatas.map((metadata) => metadata.voices)),
    );
    setExcludedFiles(new Set(loadedDraft?.excludedFiles ?? []));
    setDraftedFiles(new Set(loadedDraft?.draftedFiles ?? []));
    setModalReviewedFiles(
      new Set(loadedDraft?.reviewedFiles ?? (metadatas.length === 1 ? [0] : [])),
    );
    setCategorySections([]);
    setDeleteTarget(null);
    setModalActiveIndex(0);
  }, [loadedDraft, metadatas]);

  const saveDraft = useCallback(() => {
    const draftMetadatas = metadatas.map((meta, i) => ({
      ...meta,
      voices: editableVoicesList[i] ?? [],
    }));
    const draft: ImportDraft = {
      draftedFiles: [...draftedFiles],
      editableVoicesList,
      excludedFiles: [...excludedFiles],
      id: draftStorageKey,
      metadatas: draftMetadatas,
      name: createDraftName(draftMetadatas),
      reviewedFiles: [...modalReviewedFiles],
      savedAt: new Date().toISOString(),
      signature: draftSignature,
      version: DRAFT_VERSION,
    };
    saveImportDraftRecord(draft);
    notify({
      message: "Bozza import salvata. La trovi nelle azioni rapide del catalogo tariffari.",
      tone: "success",
    });
  }, [
    draftedFiles,
    draftSignature,
    draftStorageKey,
    editableVoicesList,
    excludedFiles,
    metadatas,
    modalReviewedFiles,
    notify,
  ]);

  const discardDraft = useCallback(() => {
    deleteTariffImportDraft(draftStorageKey);
    notify({ message: "Bozza import eliminata.", tone: "success" });
  }, [draftStorageKey, notify]);

  const switchFile = useCallback((index: number) => {
    startTransition(() => {
      setCategorySections([]);
      setModalActiveIndex(index);
    });
  }, []);

  const removeActiveFile = useCallback(() => {
    const nextMetadatas = metadatas.filter((_, index) => index !== localActiveIndex);
    if (nextMetadatas.length === 0) {
      onMetadatasChange?.([]);
      onCancel();
      return;
    }
    const nextReviewedFiles = new Set<number>();
    for (const index of modalReviewedFiles) {
      if (index < localActiveIndex) nextReviewedFiles.add(index);
      if (index > localActiveIndex) nextReviewedFiles.add(index - 1);
    }

    setEditableVoicesList((current) => current.filter((_, index) => index !== localActiveIndex));
    setExcludedFiles((current) => {
      const next = new Set<number>();
      for (const index of current) {
        if (index < localActiveIndex) next.add(index);
        if (index > localActiveIndex) next.add(index - 1);
      }
      return next;
    });
    setDraftedFiles((current) => {
      const next = new Set<number>();
      for (const index of current) {
        if (index < localActiveIndex) next.add(index);
        if (index > localActiveIndex) next.add(index - 1);
      }
      onDraftedFilesChange?.(next);
      return next;
    });
    setModalReviewedFiles(nextReviewedFiles);
    onReviewedFilesChange?.(nextReviewedFiles);
    onMetadatasChange?.(nextMetadatas);
    switchFile(Math.min(localActiveIndex, nextMetadatas.length - 1));
    notify({ message: "File rimosso dalla revisione import.", tone: "success" });
  }, [
    localActiveIndex,
    metadatas,
    modalReviewedFiles,
    notify,
    onCancel,
    onDraftedFilesChange,
    onMetadatasChange,
    onReviewedFilesChange,
    switchFile,
  ]);

  const toggleActiveFileDraft = useCallback(() => {
    setDraftedFiles((current) => {
      const next = new Set(current);
      if (next.has(localActiveIndex)) next.delete(localActiveIndex);
      else next.add(localActiveIndex);
      onDraftedFilesChange?.(next);
      return next;
    });
    setModalReviewedFiles((current) => {
      if (!current.has(localActiveIndex)) return current;
      const next = new Set(current);
      next.delete(localActiveIndex);
      onReviewedFilesChange?.(next);
      return next;
    });
  }, [localActiveIndex, onDraftedFilesChange, onReviewedFilesChange]);

  const saveActiveFileAsDraft = useCallback(() => {
    const nextDraftedFiles = new Set(draftedFiles);
    nextDraftedFiles.add(localActiveIndex);
    setDraftedFiles(nextDraftedFiles);
    onDraftedFilesChange?.(nextDraftedFiles);
    setModalReviewedFiles((current) => {
      const next = new Set(current);
      next.delete(localActiveIndex);
      onReviewedFilesChange?.(next);
      return next;
    });

    const draftMetadatas = metadatas.map((meta, i) => ({
      ...meta,
      voices: editableVoicesList[i] ?? [],
    }));
    saveImportDraftRecord({
      draftedFiles: [...nextDraftedFiles],
      editableVoicesList,
      excludedFiles: [...excludedFiles],
      id: draftStorageKey,
      metadatas: draftMetadatas,
      name: createDraftName(draftMetadatas),
      reviewedFiles: [...modalReviewedFiles].filter((index) => index !== localActiveIndex),
      savedAt: new Date().toISOString(),
      signature: draftSignature,
      version: DRAFT_VERSION,
    });
    notify({
      message: `${activeMetadata?.name ?? "File"} salvato come bozza import.`,
      tone: "success",
    });
  }, [
    activeMetadata?.name,
    draftedFiles,
    draftSignature,
    draftStorageKey,
    editableVoicesList,
    excludedFiles,
    localActiveIndex,
    metadatas,
    modalReviewedFiles,
    notify,
    onDraftedFilesChange,
    onReviewedFilesChange,
  ]);

  const markActiveFileReviewed = useCallback(() => {
    setDraftedFiles((current) => {
      if (!current.has(localActiveIndex)) return current;
      const next = new Set(current);
      next.delete(localActiveIndex);
      onDraftedFilesChange?.(next);
      return next;
    });
    setModalReviewedFiles((current) => {
      const next = new Set(current);
      next.add(localActiveIndex);
      onReviewedFilesChange?.(next);
      return next;
    });
  }, [localActiveIndex, onDraftedFilesChange, onReviewedFilesChange]);

  const toggleActiveFileReviewed = useCallback(() => {
    setDraftedFiles((current) => {
      if (!current.has(localActiveIndex)) return current;
      const next = new Set(current);
      next.delete(localActiveIndex);
      onDraftedFilesChange?.(next);
      return next;
    });
    setModalReviewedFiles((current) => {
      const next = new Set(current);
      if (next.has(localActiveIndex)) next.delete(localActiveIndex);
      else next.add(localActiveIndex);
      onReviewedFilesChange?.(next);
      return next;
    });
  }, [localActiveIndex, onDraftedFilesChange, onReviewedFilesChange]);

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
    onReviewedFilesChange?.(modalReviewedFiles);
  }, [modalReviewedFiles, onReviewedFilesChange]);

  useEffect(() => {
    if (!pageView) {
      return;
    }

    const handleToolbarAction = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      if (actionId !== "tariff-import-confirm" || !canConfirm) {
        return;
      }

      confirmChanges();
    };

    window.addEventListener("tariff-preview-action", handleToolbarAction);
    return () => window.removeEventListener("tariff-preview-action", handleToolbarAction);
  }, [canConfirm, confirmChanges, pageView]);

  useEffect(() => {
    const handleToolbarAction = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      if (actionId === "tariff-import-save-draft") {
        saveActiveFileAsDraft();
        return;
      }
      if (actionId === "tariff-import-toggle-reviewed") {
        toggleActiveFileReviewed();
        return;
      }
      if (actionId === "tariff-import-delete-file") {
        removeActiveFile();
      }
    };

    window.addEventListener("tariff-preview-action", handleToolbarAction);
    return () => window.removeEventListener("tariff-preview-action", handleToolbarAction);
  }, [removeActiveFile, saveActiveFileAsDraft, toggleActiveFileReviewed]);

  useEffect(() => {
    onDraftedFilesChange?.(draftedFiles);
  }, [draftedFiles, onDraftedFilesChange]);

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
      <div className="flex w-full flex-col gap-5 pb-28 xl:pb-0 xl:pr-[360px]">
        <div className="grid grid-flow-dense gap-3 md:grid-cols-4">
          <ImportMetric
            caption="Totali rilevate"
            icon={Files}
            label="Righe rilevate"
            tone="info"
            value={activeVoices.length.toLocaleString("it-IT")}
          />
          <ImportMetric
            caption="Pronte all'uso"
            icon={CheckCircle2}
            label="Valide"
            tone={activeValidation.validCount > 0 ? "success" : "warning"}
            value={activeValidation.validCount.toLocaleString("it-IT")}
          />
          <ImportMetric
            caption="Da verificare"
            icon={AlertTriangle}
            label="Warning"
            tone={activeValidation.warningCount > 0 ? "warning" : "neutral"}
            value={activeValidation.warningCount.toLocaleString("it-IT")}
          />
          <ImportMetric
            caption="Possibili duplicati"
            icon={Archive}
            label="Duplicati"
            tone={activeValidation.duplicateCount > 0 ? "warning" : "info"}
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
              onSectionsChange={setCategorySections}
              validation={activeValidation}
            />
          </div>
        </div>

        {!hasVoices ? (
          <div className="mt-4 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-13px font-semibold text-[var(--warning-base)]">
            Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento contenga
            codici, unita di misura e prezzi leggibili.
          </div>
        ) : null}
      </div>
      <TariffImportReviewInspector
        activeMetadata={activeMetadata}
        activeValidation={activeValidation}
        blockingIssueCount={blockingIssueCount}
        completionPercent={completionPercent}
        hasVoices={hasVoices}
        invalidRows={invalidRows}
        isReviewReady={isReviewReady}
        onFocusCell={focusImportCell}
        sections={categorySections}
        variant="page"
      />
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
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SPRING_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="flex min-h-0 flex-col rounded-22px bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="min-w-0">
              <div className="text-10px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                Preview importazione
              </div>
              <h3 className="mt-2 text-24px font-semibold leading-1_05 tracking-neg-0_035em text-[var(--text-primary)] md:text-30px">
                {metadatas.length > 1
                  ? `${metadatas.length} tariffari da importare`
                  : (activeMetadata?.name ?? "Preview importazione")}
              </h3>
              <p className="mt-1 text-13px font-medium text-[var(--text-secondary)]">
                Controlla i dati estratti prima di confermarli nel catalogo.
              </p>
            </div>
            <motion.button
              aria-label="Chiudi"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
              onClick={onCancel}
              type="button"
              transition={{ duration: 0.42, ease: BUTTER_EASE }}
            >
              <X className="size-4" />
            </motion.button>
          </div>

          {metadatas.length > 1 ? (
            <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/25 px-5 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-11px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
                  File import
                </div>
                <div className="text-12px font-semibold text-[var(--text-secondary)]">
                  {metadatas.length}/{metadatas.length} in revisione
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {metadatas.map((meta, i) => {
                  const v = validations[i];
                  const voices = editableVoicesList[i];
                  const hasErrors = (v?.invalidCount ?? 0) > 0 || (v?.duplicateCount ?? 0) > 0;
                  const isValid = (voices?.length ?? 0) > 0 && !hasErrors;
                  const isReviewed = modalReviewedFiles.has(i);
                  return (
                    <motion.button
                      className={cn(
                        "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-12px font-semibold transition-all duration-200",
                        i === localActiveIndex
                          ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm"
                          : draftedFiles.has(i)
                            ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-1 ring-[var(--warning-base)]/30"
                            : isReviewed
                              ? "bg-[var(--success-soft)] text-[var(--success-base)] ring-1 ring-[var(--success-base)]/30"
                              : "bg-[var(--surface-base)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                      )}
                      key={meta.name}
                      onClick={() => switchFile(i)}
                      type="button"
                      transition={{ duration: 0.42, ease: BUTTER_EASE }}
                    >
                      {draftedFiles.has(i) ? (
                        <Save className="size-3.5 shrink-0" />
                      ) : isReviewed ? (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      ) : isValid ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-[var(--success-base)]" />
                      ) : hasErrors ? (
                        <span className="size-3.5 shrink-0 rounded-full bg-[var(--warning-base)]" />
                      ) : null}
                      <span className="min-w-0 truncate">{meta.name}</span>
                      {draftedFiles.has(i) ? (
                        <span className="shrink-0 rounded-full bg-[var(--warning-base)]/15 px-1.5 py-0.5 text-9px font-bold uppercase tracking-wider text-[var(--warning-base)]">
                          Bozza
                        </span>
                      ) : isReviewed ? (
                        <span className="shrink-0 rounded-full bg-[var(--success-base)]/15 px-1.5 py-0.5 text-9px font-bold uppercase tracking-wider text-[var(--success-base)]">
                          Rev.
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-0 overflow-y-auto p-5" data-tariff-preview-scroll>
              <div className="grid grid-flow-dense gap-3 md:grid-cols-4">
                <ImportMetric
                  caption="Totali rilevate"
                  icon={Files}
                  label="Righe rilevate"
                  tone="info"
                  value={activeVoices.length.toLocaleString("it-IT")}
                />
                <ImportMetric
                  caption="Pronte all'uso"
                  icon={CheckCircle2}
                  label="Valide"
                  tone={activeValidation.validCount > 0 ? "success" : "warning"}
                  value={activeValidation.validCount.toLocaleString("it-IT")}
                />
                <ImportMetric
                  caption="Da verificare"
                  icon={AlertTriangle}
                  label="Warning"
                  tone={activeValidation.warningCount > 0 ? "warning" : "neutral"}
                  value={activeValidation.warningCount.toLocaleString("it-IT")}
                />
                <ImportMetric
                  caption="Possibili duplicati"
                  icon={Archive}
                  label="Duplicati"
                  tone={activeValidation.duplicateCount > 0 ? "warning" : "info"}
                  value={activeValidation.duplicateCount.toLocaleString("it-IT")}
                />
              </div>

              <div className="mt-4 min-w-0">
                <EditableTariffVoicesGrid
                  duplicateCodes={duplicateCodes}
                  groups={editableGroups}
                  onChange={updateVoice}
                  onDelete={askDeleteVoice}
                  onSectionsChange={setCategorySections}
                  validation={activeValidation}
                />
              </div>

              {!hasVoices ? (
                <div className="mt-4 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-13px font-semibold text-[var(--warning-base)]">
                  Nessuna voce tariffaria importabile trovata nel PDF. Verifica che il documento
                  contenga codici, unita di misura e prezzi leggibili.
                </div>
              ) : null}
            </div>
            <TariffImportReviewInspector
              activeMetadata={activeMetadata}
              activeValidation={activeValidation}
              blockingIssueCount={blockingIssueCount}
              completionPercent={completionPercent}
              hasVoices={hasVoices}
              invalidRows={invalidRows}
              isReviewReady={isReviewReady}
              onFocusCell={focusImportCell}
              sections={categorySections}
              variant="modal"
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ProjectControlButton onClick={onCancel} variant="neutral">
                Annulla
              </ProjectControlButton>
              <ProjectControlButton icon={Save} onClick={saveDraft} variant="neutral">
                Salva bozza
              </ProjectControlButton>
              {loadedDraft ? (
                <ProjectControlButton icon={Archive} onClick={discardDraft} variant="neutral">
                  Elimina bozza
                </ProjectControlButton>
              ) : null}
              {metadatas.length > 0 ? (
                <ProjectControlButton icon={Trash2} onClick={removeActiveFile} variant="neutral">
                  Cancella file
                </ProjectControlButton>
              ) : null}
              {metadatas.length > 1 ? (
                <ProjectControlButton icon={Save} onClick={toggleActiveFileDraft} variant="neutral">
                  {draftedFiles.has(localActiveIndex) ? "Salvato in bozza" : "Salva in bozza"}
                </ProjectControlButton>
              ) : null}
              {metadatas.length > 1 && !modalReviewedFiles.has(localActiveIndex) ? (
                <ProjectControlButton
                  disabled={draftedFiles.has(localActiveIndex)}
                  icon={CheckCircle2}
                  onClick={markActiveFileReviewed}
                  variant="soft"
                >
                  Segna come revisionato
                </ProjectControlButton>
              ) : null}
              {metadatas.length > 1 && (modalReviewedFiles.size > 0 || draftedFiles.size > 0) ? (
                <span className="text-12px font-medium text-[var(--text-secondary)]">
                  <span className="text-[var(--success-base)]">{modalReviewedFiles.size}</span>/
                  {metadatas.length} revisionati{" "}
                  <span className="text-[var(--warning-base)]">{draftedFiles.size}</span>/
                  {metadatas.length} in bozza
                </span>
              ) : null}
            </div>
            <ProjectControlButton
              disabled={!canConfirm || isBusy}
              icon={CheckCircle2}
              onClick={confirmChanges}
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

function TariffImportReviewInspector({
  activeMetadata,
  activeValidation,
  blockingIssueCount,
  completionPercent,
  hasVoices,
  invalidRows,
  isReviewReady,
  onFocusCell,
  sections,
  variant,
}: {
  activeMetadata: TariffPdfMetadata | undefined;
  activeValidation: ImportValidation;
  blockingIssueCount: number;
  completionPercent: number;
  hasVoices: boolean;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  isReviewReady: boolean;
  onFocusCell: (rowIndex: number, field: string) => void;
  sections: TariffGridSectionSummary[];
  variant: "modal" | "page";
}) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("checks");
  const issueCount =
    (hasVoices ? 0 : 1) +
    activeValidation.invalidCount +
    activeValidation.duplicateCount +
    (activeMetadata?.sourceName === "Ente da confermare" ? 1 : 0) +
    ((activeMetadata?.year ?? 0) >= 1900 && (activeMetadata?.year ?? 0) <= 2200 ? 0 : 1);

  const body = (
    <InspectorContent
      activeMetadata={activeMetadata}
      activeTab={activeTab}
      activeValidation={activeValidation}
      blockingIssueCount={blockingIssueCount}
      completionPercent={completionPercent}
      hasVoices={hasVoices}
      invalidRows={invalidRows}
      isReviewReady={isReviewReady}
      issueCount={issueCount}
      onFocusCell={onFocusCell}
      onTabChange={setActiveTab}
      sections={sections}
    />
  );

  if (variant === "page") {
    return (
      <aside className="fixed inset-x-4 bottom-4 z-20 xl:bottom-auto xl:left-auto xl:right-8 xl:top-[300px] xl:w-[336px]">
        <div className="max-h-[58dvh] overflow-y-auto rounded-22px xl:max-h-[calc(100dvh-324px)]">
          {body}
        </div>
      </aside>
    );
  }

  if (variant === "modal") {
    return (
      <aside className="min-h-0 overflow-y-auto border-l border-[var(--border-subtle)]/70 bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-4">
        {body}
      </aside>
    );
  }
}

function InspectorContent({
  activeMetadata,
  activeTab,
  activeValidation,
  blockingIssueCount,
  completionPercent,
  hasVoices,
  invalidRows,
  isReviewReady,
  issueCount,
  onFocusCell,
  onTabChange,
  sections,
}: {
  activeMetadata: TariffPdfMetadata | undefined;
  activeTab: InspectorTab;
  activeValidation: ImportValidation;
  blockingIssueCount: number;
  completionPercent: number;
  hasVoices: boolean;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  isReviewReady: boolean;
  issueCount: number;
  onFocusCell: (rowIndex: number, field: string) => void;
  onTabChange: (tab: InspectorTab) => void;
  sections: TariffGridSectionSummary[];
}) {
  return (
    <div className="rounded-22px bg-[color-mix(in_srgb,var(--surface-base)_78%,var(--bg-muted)_22%)] p-1 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_54%,transparent)] shadow-[0_18px_44px_color-mix(in_srgb,var(--shadow-color,rgba(15,23,42,0.10))_16%,transparent)]">
      <div className="rounded-18px bg-[var(--surface-base)] p-3">
        <InspectorHeader
          completionPercent={completionPercent}
          isReviewReady={isReviewReady}
          issueCount={issueCount}
        />
        <InspectorTabs
          activeTab={activeTab}
          issueCount={issueCount}
          onTabChange={onTabChange}
          sectionsCount={sections.length}
        />
        <div className="mt-3 text-12px font-semibold text-[var(--text-primary)]">
          {activeTab === "checks"
            ? "Stato import e controlli"
            : activeTab === "categories"
              ? "Indice categorie e voci"
              : "Errori e anomalie da risolvere"}
        </div>
        <div className="mt-3">
          {activeTab === "checks" ? (
            <ControlPanel
              activeMetadata={activeMetadata}
              activeValidation={activeValidation}
              blockingIssueCount={blockingIssueCount}
              completionPercent={completionPercent}
              hasVoices={hasVoices}
              isReviewReady={isReviewReady}
              compact
            />
          ) : null}
          {activeTab === "categories" ? <CategoryJumpPanel sections={sections} compact /> : null}
          {activeTab === "issues" ? (
            <InterventionPanel
              activeMetadata={activeMetadata}
              activeValidation={activeValidation}
              hasVoices={hasVoices}
              invalidRows={invalidRows}
              onFocusCell={onFocusCell}
              compact
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InspectorHeader({
  completionPercent,
  isReviewReady,
  issueCount,
}: {
  completionPercent: number;
  isReviewReady: boolean;
  issueCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Revisione import
        </div>
        <div className="mt-1 truncate text-14px font-bold text-[var(--text-primary)]">
          {isReviewReady ? "Import pronto" : `${issueCount.toLocaleString("it-IT")} interventi`}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-11px font-bold",
          isReviewReady
            ? "bg-[var(--success-base)] text-[var(--text-inverse)]"
            : "bg-[var(--warning-base)] text-[var(--text-inverse)]",
        )}
      >
        {completionPercent}%
      </span>
    </div>
  );
}

function InspectorTabs({
  activeTab,
  issueCount,
  onTabChange,
  sectionsCount,
}: {
  activeTab: InspectorTab;
  issueCount: number;
  onTabChange: (tab: InspectorTab) => void;
  sectionsCount: number;
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-1 rounded-14px bg-[var(--bg-muted)] p-1">
      <InspectorTabButton
        active={activeTab === "checks"}
        count={undefined}
        icon={ListChecks}
        label="Stato"
        onClick={() => onTabChange("checks")}
      />
      <InspectorTabButton
        active={activeTab === "categories"}
        count={sectionsCount}
        icon={List}
        label="Indice"
        onClick={() => onTabChange("categories")}
      />
      <InspectorTabButton
        active={activeTab === "issues"}
        count={issueCount}
        icon={AlertTriangle}
        label="Errori"
        onClick={() => onTabChange("issues")}
      />
    </div>
  );
}

function InspectorTabButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number | undefined;
  icon: typeof ListChecks;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-11px px-2 text-11px font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
        active
          ? "bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-base)]/65",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {typeof count === "number" ? (
        <span className="rounded-full bg-[var(--bg-muted-strong)] px-1.5 py-0.5 text-10px tabular-nums">
          {count.toLocaleString("it-IT")}
        </span>
      ) : null}
    </button>
  );
}

function CategoryJumpPanel({
  compact = false,
  sections,
}: {
  compact?: boolean;
  sections: TariffGridSectionSummary[];
}) {
  if (sections.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-18px bg-[var(--surface-base)] p-3 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)]",
        !compact &&
          "shadow-[0_16px_36px_color-mix(in_srgb,var(--shadow-color,rgba(15,23,42,0.10))_16%,transparent)]",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Indice categorie
        </div>
        <span className="text-11px font-semibold text-[var(--text-secondary)]">
          {sections.length}
        </span>
      </div>
      <div className={cn("space-y-1 overflow-y-auto pr-1", compact ? "max-h-[34dvh]" : "max-h-56")}>
        {sections.map((section) => (
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            key={section.id}
            onClick={() => document.getElementById(section.id)?.scrollIntoView({ block: "start" })}
            type="button"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-11px font-bold text-[var(--accent-primary)]">
              {section.categoria || "-"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-12px font-bold text-[var(--text-primary)]">
                Categoria {section.categoria || "Altre"}
              </span>
              <span className="block text-11px font-medium text-[var(--text-secondary)]">
                {section.groupsCount} gruppi · {section.rowsCount.toLocaleString("it-IT")} righe
              </span>
            </span>
            <ChevronRight className="size-3.5 text-[var(--text-secondary)]" />
          </button>
        ))}
      </div>
    </div>
  );
}

function InterventionPanel({
  activeMetadata,
  activeValidation,
  compact = false,
  hasVoices,
  invalidRows,
  onFocusCell,
}: {
  activeMetadata: TariffPdfMetadata | undefined;
  activeValidation: ImportValidation;
  compact?: boolean;
  hasVoices: boolean;
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  onFocusCell: (rowIndex: number, field: string) => void;
}) {
  const sourceNeedsReview = activeMetadata?.sourceName === "Ente da confermare";
  const yearNeedsReview = !(
    (activeMetadata?.year ?? 0) >= 1900 && (activeMetadata?.year ?? 0) <= 2200
  );
  const hasBlockingIssues =
    !hasVoices ||
    activeValidation.invalidCount > 0 ||
    activeValidation.duplicateCount > 0 ||
    sourceNeedsReview ||
    yearNeedsReview;

  return (
    <div
      className={cn(
        "rounded-18px p-4 text-12px font-medium leading-5 ring-1",
        !compact &&
          "shadow-[0_16px_36px_color-mix(in_srgb,var(--shadow-color,rgba(15,23,42,0.10))_12%,transparent)]",
        hasBlockingIssues
          ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-[var(--warning-base)]/15"
          : "bg-[var(--success-soft)] text-[var(--success-base)] ring-[var(--success-base)]/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-bold">
          {hasBlockingIssues ? (
            <AlertTriangle className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          Gestione anomalie
        </div>
        <span className="rounded-full bg-[var(--surface-base)]/70 px-2 py-0.5 text-11px font-bold tabular-nums">
          {activeValidation.warningCount}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <IssueLine count={hasVoices ? 0 : 1} label="PDF senza voci importabili" ok={hasVoices} />
        <IssueLine
          count={activeValidation.invalidCount}
          label="Righe con dati mancanti"
          ok={activeValidation.invalidCount === 0}
        />
        <IssueLine
          count={activeValidation.duplicateCount}
          label="Codici duplicati"
          ok={activeValidation.duplicateCount === 0}
        />
        <IssueLine
          count={sourceNeedsReview ? 1 : 0}
          label="Ente da confermare"
          ok={!sourceNeedsReview}
        />
        <IssueLine
          count={yearNeedsReview ? 1 : 0}
          label="Anno non coerente"
          ok={!yearNeedsReview}
        />
      </div>

      {activeValidation.duplicateExamples.length > 0 ? (
        <div className="mt-3 rounded-lg bg-[var(--surface-base)]/65 px-3 py-2">
          <div className="text-10px font-bold uppercase tracking-caption opacity-75">
            Duplicati principali
          </div>
          <div className="mt-1 font-bold">{activeValidation.duplicateExamples.join(", ")}</div>
        </div>
      ) : null}

      {invalidRows.length > 0 ? (
        <div className="mt-3">
          <div className="mb-2 text-10px font-bold uppercase tracking-caption opacity-75">
            Vai alla correzione
          </div>
          <div className="flex flex-wrap gap-2">
            {invalidRows.map((row) => (
              <motion.button
                className="rounded-full bg-[var(--warning-base)]/15 px-3 py-1 text-11px font-bold transition-colors hover:bg-[var(--warning-base)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                key={`${row.index}-${row.field}`}
                onClick={() => onFocusCell(row.index, row.field)}
                type="button"
                transition={{ duration: 0.42, ease: BUTTER_EASE }}
              >
                Riga {row.index + 1}: {row.label}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IssueLine({ count, label, ok }: { count: number; label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-base)]/55 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-bold tabular-nums">{count.toLocaleString("it-IT")}</span>
    </div>
  );
}

function ControlPanel({
  activeMetadata,
  activeValidation,
  blockingIssueCount,
  compact = false,
  completionPercent,
  hasVoices,
  isReviewReady,
}: {
  activeMetadata: TariffPdfMetadata | undefined;
  activeValidation: ImportValidation;
  blockingIssueCount: number;
  compact?: boolean;
  completionPercent: number;
  hasVoices: boolean;
  isReviewReady: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-18px bg-[var(--surface-base)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)]",
        !compact &&
          "shadow-[0_16px_36px_color-mix(in_srgb,var(--shadow-color,rgba(15,23,42,0.10))_16%,transparent)]",
      )}
    >
      <div
        className={cn(
          "border-b px-4 py-4",
          isReviewReady
            ? "border-[var(--success-base)]/15 bg-[var(--surface-base)]"
            : "border-[var(--warning-base)]/15 bg-[var(--surface-base)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
              <ListChecks className="size-3.5" />
              Centro controllo
            </div>
            <div className="mt-2 text-15px font-bold leading-tight text-[var(--text-primary)]">
              {isReviewReady ? "Import pronto" : "Verifiche richieste"}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-11px font-bold",
              isReviewReady
                ? "bg-[var(--success-base)] text-[var(--text-inverse)]"
                : "bg-[var(--warning-base)] text-[var(--text-inverse)]",
            )}
          >
            {completionPercent}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
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
        <div className="space-y-2 text-12px font-medium text-[var(--text-secondary)]">
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
      <div className="relative w-full max-w-md rounded-22px bg-[var(--surface-base)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ring-1 ring-[var(--border-subtle)]">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
            <Trash2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-18px font-bold leading-tight text-[var(--text-primary)]">
              Eliminare questa voce?
            </h3>
            <p className="mt-2 text-13px font-medium leading-5 text-[var(--text-secondary)]">
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
      <div className="text-9px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-18px font-bold leading-none tabular-nums",
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

function createDraftSignature(metadatas: TariffPdfMetadata[]): string {
  return metadatas
    .map((metadata) =>
      [metadata.name, metadata.sourceName, metadata.year, metadata.voices.length].join(":"),
    )
    .join("|")
    .replace(/[^a-zA-Z0-9:_|-]+/g, "_");
}

function createDraftName(metadatas: TariffPdfMetadata[]): string {
  if (metadatas.length === 0) return "Bozza import tariffari";
  if (metadatas.length === 1) return metadatas[0]?.name ?? "Bozza import tariffario";
  return `${metadatas.length} file · ${metadatas[0]?.name ?? "Import tariffari"}`;
}

function loadImportDraft(
  storageKey: string,
  signature: string,
  expectedFileCount: number,
): ImportDraft | null {
  try {
    const rawDraft = localStorage.getItem(storageKey);
    if (!rawDraft) return null;
    const draft = JSON.parse(rawDraft) as ImportDraft;
    if (
      draft.version !== DRAFT_VERSION ||
      draft.signature !== signature ||
      draft.editableVoicesList.length !== expectedFileCount
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function saveImportDraftRecord(draft: ImportDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draft.id, JSON.stringify(draft));
  const summaries = listTariffImportDrafts().filter((item) => item.id !== draft.id);
  const nextSummary: TariffImportDraftSummary = {
    fileCount: draft.metadatas.length,
    id: draft.id,
    name: draft.name,
    reviewedCount: draft.reviewedFiles.length,
    savedAt: draft.savedAt,
    totalVoices: draft.metadatas.reduce((sum, metadata) => sum + metadata.voices.length, 0),
  };
  window.localStorage.setItem(
    TARIFF_IMPORT_DRAFTS_INDEX_KEY,
    JSON.stringify([nextSummary, ...summaries].slice(0, 12)),
  );
  window.dispatchEvent(new CustomEvent("tariff-import-drafts-change"));
}

const TARIFF_IMPORT_DRAFTS_INDEX_KEY = "quantara:tariff-import-preview:index";

export function listTariffImportDrafts(): TariffImportDraftSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is TariffImportDraftSummary =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.savedAt === "string",
        )
      : [];
  } catch {
    window.localStorage.removeItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY);
    return [];
  }
}

export function loadTariffImportDraftMetadatas(id: string): TariffPdfMetadata[] | null {
  if (typeof window === "undefined") return null;
  try {
    const rawValue = window.localStorage.getItem(id);
    if (!rawValue) return null;
    const draft = JSON.parse(rawValue) as ImportDraft;
    if (draft.version !== DRAFT_VERSION || !Array.isArray(draft.metadatas)) {
      return null;
    }
    return draft.metadatas;
  } catch {
    return null;
  }
}

export function deleteTariffImportDraft(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(id);
  const summaries = listTariffImportDrafts().filter((item) => item.id !== id);
  window.localStorage.setItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY, JSON.stringify(summaries));
  window.dispatchEvent(new CustomEvent("tariff-import-drafts-change"));
}
