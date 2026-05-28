import { CheckCircle2, Receipt, WalletCards } from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/Button";
import { MetricCard } from "@/components/shared/MetricCard";
import { useToast } from "@/components/shared/ToastProvider";
import {
  savePdfAs,
  saveWorkbookAs,
  waitForUiPaint,
} from "@/features/projects/utils/projects-helpers";
import type { SalDocument } from "@/features/sal/types";
import { useActionHandler } from "@/hooks/useAction";
import { useNavigate } from "@/hooks/useNavigate";
import { confirmSalTransaction } from "@/lib/sal-data";
import {
  clearResumeSalDraftId,
  consumeSalCreatedRedirect,
  getResumeSalDraftId,
  markSalCreatedRedirect,
  selectProjectForWorkflow,
} from "@/lib/workflow-navigation";
import { persistSalProjectMetadata, upsertSalDraftDocument } from "@/repositories/sal-repository";
import { useSalWorkflowService } from "@/services/sal-service";
import { useAppStore } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import type { SalTemplate } from "@/store/template-store";
import { SaveAsTemplateDialog } from "./components/SaveAsTemplateDialog";
import { buildSalDraftPayload } from "./domain/build-sal-draft-payload";
import { buildLineViews, defaultSalEconomicRules, isMgVoice } from "./domain/sal-calculations";
import {
  applyMgManualAllocation,
  buildSalResumeState,
  clearSalCreationDraft,
  clearSalCreationDraftBySalId,
  mgRulesQualityScore,
  persistSalCreationLocalDraft,
  prepareEconomicRulesForDraftPersist,
  syncMgVoiceAllocations,
} from "./domain/sal-creation-draft";
import { useSalCreationData } from "./hooks/useSalCreationData";
import { useSalDerivedViews } from "./hooks/useSalDerivedViews";
import type { SalDraftAutosaveSnapshot } from "./hooks/useSalDraftAutosave";
import { useSalDraftAutosave } from "./hooks/useSalDraftAutosave";
import { useSalLineActions } from "./hooks/useSalLineActions";
import {
  scheduleSalVoiceSearchIndexWarmup,
  useSalVoiceSearchIndex,
} from "./hooks/useSalVoiceSearchIndex";
import { SalWorkspace } from "./SalWorkspace";
import { PHASE_ORDER, salFormReducer, surchargeKindFromPercent } from "./state/sal-form-state";
import { getNextPhase, type SalWorkflowPhase } from "./state/workflow";
import { ConfirmStep } from "./steps/ConfirmStep";
import { MeasureStep } from "./steps/MeasureStep";
import { ProjectStep } from "./steps/ProjectStep";
import { VerifyStep } from "./steps/VerifyStep";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineDraft,
  SalLineView,
  SalMeasurementRowDraft,
  SalProjectContext,
  SalTariffBookOption,
  SalTariffVoice,
  SalVerificationCheck,
  SalVoiceDraft,
} from "./types";
import { createMeasurementId } from "./types";

function buildDefaultSalTitle(existingCount: number) {
  return `SAL ${String(existingCount + 1).padStart(2, "0")} - Periodo corrente`;
}

function sameTariffBookIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function mergeResumeVoices(
  loadedVoices: readonly SalVoiceDraft[],
  cachedVoices: readonly SalTariffVoice[],
): SalVoiceDraft[] {
  const result = new Map<string, SalVoiceDraft>();

  for (const voice of loadedVoices) {
    result.set(voice.id, voice);
  }

  for (const voice of cachedVoices) {
    if (result.has(voice.id)) continue;
    result.set(voice.id, {
      category: voice.category,
      code: voice.code,
      description: voice.description,
      id: voice.id,
      isSafetyCost: voice.isSafetyCost ?? false,
      laborPercentage: voice.laborPercentage ?? 0,
      source: voice as never,
      tariffBookId: "",
      tariffBookName: "",
      tariffYear: voice.projectYear,
      unit: voice.unit,
      unitPrice: voice.unitPrice,
    });
  }

  return [...result.values()];
}

export function SalCreationScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const data = useSalCreationData();
  const { closeSal, createSal, updateSalDraft, salDocuments, tariffVoices } =
    useSalWorkflowService();

  const [formState, dispatch] = useReducer(salFormReducer, {
    lines: [],
    economicRules: defaultSalEconomicRules,
    salTitle: "",
    salDate: new Date().toISOString().slice(0, 10),
    phase: "project",
    materialUsage: {},
    materials: [],
  });

  const formStateRef = useRef(formState);
  formStateRef.current = formState;
  const { lines, economicRules, materialUsage, materials, salTitle, salDate, phase } = formState;

  const setLines = useCallback(
    (updater: SalLineDraft[] | ((prev: SalLineDraft[]) => SalLineDraft[])) => {
      const prev = formStateRef.current.lines;
      const nextLines = typeof updater === "function" ? updater(prev) : updater;
      formStateRef.current = { ...formStateRef.current, lines: nextLines };
      dispatch({ type: "LINES", lines: nextLines });
    },
    [],
  );
  const setEconomicRules = useCallback(
    (updater: SalEconomicRules | ((prev: SalEconomicRules) => SalEconomicRules)) => {
      const prev = formStateRef.current.economicRules;
      dispatch({
        type: "ECONOMIC_RULES",
        economicRules: typeof updater === "function" ? updater(prev) : updater,
      });
    },
    [],
  );
  const setSalDate = useCallback((date: string) => {
    dispatch({ type: "ALL", partial: { salDate: date } });
  }, []);
  const setSalTitle = useCallback((updater: string | ((prev: string) => string)) => {
    const prev = formStateRef.current.salTitle;
    dispatch({
      type: "SAL_TITLE",
      salTitle: typeof updater === "function" ? updater(prev) : updater,
    });
  }, []);
  const setPhase = useCallback(
    (updater: SalWorkflowPhase | ((prev: SalWorkflowPhase) => SalWorkflowPhase)) => {
      const prev = formStateRef.current.phase;
      const nextPhase = typeof updater === "function" ? updater(prev) : updater;
      startTransition(() => {
        dispatch({ type: "PHASE", phase: nextPhase });
      });
    },
    [],
  );

  const [editingDraftSalId, setEditingDraftSalId] = useState<string | null>(null);
  const resumeMissingVoicesNotified = useRef(false);
  const resumeAppliedRef = useRef(false);
  const resumeHydratedSalIdRef = useRef<string | null>(null);
  const [resumeHydrationReady, setResumeHydrationReady] = useState(() => !getResumeSalDraftId());
  const flushSalDraftSnapshotRef = useRef<
    ((snapshot: SalDraftAutosaveSnapshot) => Promise<void>) | null
  >(null);

  const getSalDraftAutosaveSnapshot = useCallback((): SalDraftAutosaveSnapshot => {
    const form = formStateRef.current;
    return {
      economicRules: form.economicRules,
      lines: form.lines,
      materialUsage: form.materialUsage,
      phase: form.phase,
      projectId: data.project?.id ?? "",
      salDate: form.salDate,
      salDraftId: editingDraftSalId,
      salTitle: form.salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((book) => book.id),
    };
  }, [data.project?.id, data.selectedTariffBooks, editingDraftSalId]);

  // Guard: if SAL was already created in this session, redirect to project-detail
  useEffect(() => {
    if (consumeSalCreatedRedirect()) {
      navigate("project-detail");
    }
  }, [navigate]);

  // Resume draft from project SAL list (re-run when catalog/sync enriches MG data).
  useEffect(() => {
    const resumeSalId = getResumeSalDraftId() ?? editingDraftSalId;
    const project = data.project;
    if (!resumeSalId || !project) {
      setResumeHydrationReady(true);
      return;
    }

    const draftSal = salDocuments.find(
      (sal) => sal.id === resumeSalId && sal.projectId === project.id && sal.status === "draft",
    );
    const resumeVoices = mergeResumeVoices(data.voices, tariffVoices);
    const resumeState = buildSalResumeState({
      draftSal: draftSal ?? null,
      projectId: project.id,
      projectSalTitle: project.salTitle,
      resumeSalId,
      resumeVoices,
    });

    if (!resumeState) {
      if (!draftSal) {
        setResumeHydrationReady(true);
      }
      return;
    }

    if (
      draftSal &&
      draftSal.lines.length > 0 &&
      resumeState.lines.length === 0 &&
      resumeVoices.length === 0
    ) {
      if (!resumeMissingVoicesNotified.current) {
        notify({
          message:
            "La bozza esiste ma le voci tariffarie collegate non sono ancora disponibili. Verifica i tariffari associati al progetto.",
          title: "Bozza non ripristinata",
          tone: "warning",
        });
        resumeMissingVoicesNotified.current = true;
      }
      return;
    }

    const incomingMgScore = mgRulesQualityScore(resumeState.economicRules);
    const currentMgScore = mgRulesQualityScore(formStateRef.current.economicRules);
    const alreadyHydrated = resumeHydratedSalIdRef.current === resumeSalId;

    if (getResumeSalDraftId()) {
      clearResumeSalDraftId();
    }

    if (alreadyHydrated) {
      if (incomingMgScore > currentMgScore) {
        const nextRules = resumeState.economicRules;
        dispatch({ type: "ECONOMIC_RULES", economicRules: nextRules });
        formStateRef.current = { ...formStateRef.current, economicRules: nextRules };
      }
      return;
    }

    resumeMissingVoicesNotified.current = false;
    resumeAppliedRef.current = true;
    resumeHydratedSalIdRef.current = resumeSalId;
    setEditingDraftSalId(resumeSalId);

    const resumePartial = {
      lines: resumeState.lines,
      economicRules: resumeState.economicRules,
      materialUsage: resumeState.materialUsage ?? {},
      salDate: resumeState.salDate,
      salTitle: resumeState.salTitle,
      phase: resumeState.phase,
    };
    dispatch({ type: "ALL", partial: resumePartial });
    formStateRef.current = { ...formStateRef.current, ...resumePartial };

    if (resumeState.selectedTariffBookIds?.length > 0) {
      const currentBookIds = data.selectedTariffBooks.map((book) => book.id);
      if (!sameTariffBookIds(currentBookIds, resumeState.selectedTariffBookIds)) {
        void data.restoreTariffBookIds(resumeState.selectedTariffBookIds);
      }
    }

    setResumeHydrationReady(true);
  }, [
    data.project,
    data.restoreTariffBookIds,
    data.selectedTariffBooks,
    editingDraftSalId,
    salDocuments,
    tariffVoices,
    notify,
    data.voices,
  ]);

  // Subscribe to step navigation from TopToolbar
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.salPendingStep !== prev.salPendingStep && state.salPendingStep !== null) {
        const stepToPhase: Record<number, SalWorkflowPhase> = {
          1: "project",
          2: "measure",
          3: "verify",
          4: "confirm",
        };
        const targetPhase = stepToPhase[state.salPendingStep];
        if (targetPhase) setPhase(targetPhase);
        useAppStore.getState().setSalPendingStep(null);
      }
    });
    return unsub;
  }, [setPhase]);

  useEffect(() => {
    const stepIndex = PHASE_ORDER.indexOf(phase);
    useAppStore.getState().setSalCurrentStep(stepIndex < 4 ? stepIndex + 1 : 4);
  }, [phase]);

  const selectedTariffBookIds = useMemo(
    () => data.selectedTariffBooks.map((b) => b.id),
    [data.selectedTariffBooks],
  );
  const voiceSearchIndex = useSalVoiceSearchIndex(data.voices, selectedTariffBookIds);
  const mgAvailableVoices = useMemo(
    () => data.voices.filter((voice) => isMgVoice(voice)),
    [data.voices],
  );

  useEffect(() => {
    if (data.voices.length === 0) return;
    scheduleSalVoiceSearchIndexWarmup(data.voices, selectedTariffBookIds);
  }, [data.voices, selectedTariffBookIds]);

  const [createdSalTitle, setCreatedSalTitle] = useState("SAL 01 - Periodo corrente");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [compareLines, setCompareLines] = useState<SalLineView[] | null>(null);
  const [scrollToLineId, setScrollToLineId] = useState<string | null>(null);

  const suggestedSalTitle = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) return buildDefaultSalTitle(0);
    if (editingDraftSalId) {
      const editing = salDocuments.find((sal) => sal.id === editingDraftSalId);
      if (editing?.title?.trim()) {
        return editing.title.trim();
      }
    }
    const existingCount = salDocuments.filter(
      (sal) =>
        sal.projectId === projectId && sal.id !== editingDraftSalId && sal.status !== "closed",
    ).length;
    return buildDefaultSalTitle(existingCount);
  }, [data.project?.id, editingDraftSalId, salDocuments]);

  // Set default discount from project when it loads (after resume hydration).
  useEffect(() => {
    const project = data.project;
    if (!project || !resumeHydrationReady) return;

    const pendingResume = getResumeSalDraftId();
    if (!resumeAppliedRef.current && !pendingResume && !editingDraftSalId) {
      setSalTitle((prev) => (prev.trim() ? prev : suggestedSalTitle));
    }

    setEconomicRules((prev) => ({
      ...prev,
      discountEnabled: project.tenderDiscountPercent > 0,
      discountPercent: project.tenderDiscountPercent,
    }));
  }, [
    data.project,
    editingDraftSalId,
    resumeHydrationReady,
    setEconomicRules,
    setSalTitle,
    suggestedSalTitle,
  ]);

  const closedProjectSals = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) return [];
    return salDocuments
      .filter((sal) => sal.projectId === projectId && sal.status === "closed")
      .sort((a, b) => (b.closedAt ?? b.date).localeCompare(a.closedAt ?? a.date));
  }, [data.project?.id, salDocuments]);

  const measureLineViews = useMemo(
    () => (phase === "measure" ? buildLineViews(lines, economicRules) : []),
    [phase, lines, economicRules],
  );
  const { checks, lineViews, previousSalLines, summary, voicesMap } = useSalDerivedViews({
    closedProjectSals,
    economicRules,
    lines,
    project: data.project,
    ...(phase === "measure" ? { syncLineViews: measureLineViews } : {}),
    tariffVoices,
    voices: data.voices,
  });
  const materialById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  const hasDangerChecks = checks.some((check) => check.tone === "danger");
  const canContinue = canContinueSalPhase({
    checks,
    lineViews,
    lines,
    phase,
    project: data.project,
    selectedTariffBooks: data.selectedTariffBooks,
  });
  const currentDisabledReason = canContinue
    ? null
    : disabledReason(
        phase,
        data.project,
        data.selectedTariffBooks[0] ?? null,
        lineViews,
        hasDangerChecks,
      );

  const {
    addMeasurementRow,
    addVoiceAsNewLine,
    duplicateMeasurementRow,
    pasteLine: handlePasteLine,
    pasteMeasurementRows,
    pasteMeasurementRowsAt,
    removeLine,
    removeMeasurementRow,
    setNotes,
    setSurcharge,
    updateMeasurementRow,
    upsertLine,
  } = useSalLineActions({ lines, notify, setLines });

  const handleAllocateMg = useCallback(
    (mgLineId: string, targetLineIds: string[]) => {
      const form = formStateRef.current;
      const next = applyMgManualAllocation(form.economicRules, form.lines, mgLineId, targetLineIds);
      formStateRef.current = { ...form, economicRules: next };
      dispatch({ type: "ECONOMIC_RULES", economicRules: next });
      const snapshot: SalDraftAutosaveSnapshot = {
        ...getSalDraftAutosaveSnapshot(),
        economicRules: next,
        lines: form.lines,
      };
      void flushSalDraftSnapshotRef.current?.(snapshot);
    },
    [getSalDraftAutosaveSnapshot],
  );

  const handleAddMgVoice = useCallback(
    (voice: SalVoiceDraft) => {
      const exists = formStateRef.current.lines.some((line) => line.voice.id === voice.id);
      let lineId: string | null = null;
      flushSync(() => {
        lineId = exists ? addVoiceAsNewLine(voice) : upsertLine(voice);
      });
      if (!lineId) return;

      const form = formStateRef.current;
      const nextRules = syncMgVoiceAllocations(form.economicRules, form.lines);
      formStateRef.current = { ...form, economicRules: nextRules };
      dispatch({ type: "ECONOMIC_RULES", economicRules: nextRules });
      queueMicrotask(() => setScrollToLineId(lineId));

      const snapshot: SalDraftAutosaveSnapshot = {
        ...getSalDraftAutosaveSnapshot(),
        economicRules: nextRules,
        lines: formStateRef.current.lines,
      };
      void flushSalDraftSnapshotRef.current?.(snapshot);
    },
    [addVoiceAsNewLine, getSalDraftAutosaveSnapshot, upsertLine],
  );

  const persistDraftFromFormRef = useCallback(() => {
    const form = formStateRef.current;
    const projectId = data.project?.id ?? "";
    if (!projectId) return;

    const synced = syncMgVoiceAllocations(form.economicRules, form.lines);
    const prepared = prepareEconomicRulesForDraftPersist(synced, form.lines);
    formStateRef.current = { ...form, economicRules: prepared };
    dispatch({ type: "ECONOMIC_RULES", economicRules: prepared });

    const snapshot: SalDraftAutosaveSnapshot = {
      economicRules: prepared,
      lines: form.lines,
      materialUsage: form.materialUsage,
      phase: form.phase,
      projectId,
      salDate: form.salDate,
      salDraftId: editingDraftSalId,
      salTitle: form.salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((book) => book.id),
    };

    persistSalCreationLocalDraft({
      projectId,
      salId: editingDraftSalId,
      draft: {
        economicRules: snapshot.economicRules,
        lines: snapshot.lines,
        materialUsage: snapshot.materialUsage,
        phase: snapshot.phase,
        salDate: snapshot.salDate,
        salTitle: snapshot.salTitle,
        selectedTariffBookIds: snapshot.selectedTariffBookIds,
      },
    });

    void flushSalDraftSnapshotRef.current?.(snapshot);
  }, [data.project?.id, data.selectedTariffBooks, editingDraftSalId]);

  const handleSearchSelectVoice = useCallback(
    (voice: SalVoiceDraft) => {
      const exists = formStateRef.current.lines.some((line) => line.voice.id === voice.id);
      let lineId: string | null = null;
      flushSync(() => {
        lineId = exists ? addVoiceAsNewLine(voice) : upsertLine(voice);
      });
      if (!lineId) return;
      persistDraftFromFormRef();
      queueMicrotask(() => setScrollToLineId(lineId));
    },
    [addVoiceAsNewLine, persistDraftFromFormRef, upsertLine],
  );

  const handleScrollToLineHandled = useCallback(() => {
    setScrollToLineId(null);
  }, []);

  const handlePasteLineWithScroll = useCallback(
    (draft: SalLineDraft) => {
      let lineId = "";
      flushSync(() => {
        lineId = handlePasteLine(draft);
      });
      persistDraftFromFormRef();
      queueMicrotask(() => setScrollToLineId(lineId));
    },
    [handlePasteLine, persistDraftFromFormRef],
  );

  const handleApplyTemplate = useCallback(
    (template: SalTemplate) => {
      const newLines: SalLineDraft[] = [];
      for (const [entryIndex, entry] of template.voiceEntries.entries()) {
        const voice = voicesMap.get(entry.voiceId);
        if (!voice) continue;
        const row: SalMeasurementRowDraft = {
          date: new Date().toISOString().slice(0, 10),
          description: "",
          factor1: entry.factor1,
          factor2: entry.factor2,
          factor3: entry.factor3,
          id: createMeasurementId(),
          notes: "",
          order: 0,
          partialQuantity: entry.factor1 * entry.factor2 * entry.factor3,
          unit: voice.unit,
        };
        newLines.push({
          id: `draft-${entry.voiceId}-${entryIndex}`,
          measurementRows: [row],
          notes: "",
          sourceType: "voice",
          surchargePercent: entry.surchargePercent,
          voice,
        });
      }

      if (newLines.length === 0) {
        notify({
          message: "Nessuna voce del template trovata nel tariffario corrente.",
          title: "Template",
          tone: "warning",
        });
        return;
      }

      setLines(newLines);
      setEconomicRules((prev) => ({
        ...template.economicRules,
        discountPercent: prev.discountPercent,
        discountEnabled: prev.discountEnabled,
      }));
      notify({
        message: `Template "${template.name}" applicato (${newLines.length} voci).`,
        title: "Template applicato",
        tone: "success",
      });
    },
    [voicesMap, notify, setLines, setEconomicRules],
  );

  async function goPrimary() {
    if (!canContinue) {
      notify({
        message: currentDisabledReason ?? "Completa i campi richiesti prima di proseguire.",
        title: "Attenzione",
        tone: "warning",
      });
      return;
    }

    if (phase !== "confirm" && phase !== "completed") {
      const nextPhase = getNextPhase(phase);
      const phaseNames: Record<string, string> = {
        project: "Progetto",
        measure: "Misura",
        verify: "Verifica",
        confirm: "Conferma",
      };
      notify({
        message: `Passato a "${phaseNames[nextPhase] ?? nextPhase}".`,
        title: "Continua",
        tone: "success",
      });
      setPhase(nextPhase);
      return;
    }
    if (!data.project) return;

    try {
      await persistSalProjectMetadata({
        client: data.project.contractor,
        description: `${data.project.frameworkAgreementCode} - ${data.project.applicationContractCode}`,
        id: data.project.id,
        name: data.project.title,
        year: data.selectedTariffBook?.year ?? 2026,
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Salvataggio progetto SAL non riuscito",
        tone: "danger",
      });
      return;
    }

    const materialUsagePayload = Object.entries(materialUsage)
      .filter(([_, qty]) => qty > 0)
      .map(([materialId, qty]) => {
        const mat = materialById.get(materialId);
        return {
          materialId,
          code: mat?.code ?? materialId,
          description: mat?.description ?? materialId,
          unit: mat?.unit ?? "",
          quantity: qty,
        };
      });

    const finalLineViews = buildLineViews(lines, economicRules);
    const finalSalPayload = {
      date: salDate,
      description: "Periodo corrente",
      economicRules: syncMgVoiceAllocations(economicRules, lines),
      lines: finalLineViews.map((l) => ({
        id: l.id,
        measurementRows: l.measurementRows.map((r) => ({
          id: r.id,
          voiceId: l.voice.id,
          date: r.date,
          station: r.station,
          section: r.section,
          description: r.description,
          factor1: r.factor1,
          factor2: r.factor2,
          factor3: r.factor3,
          partialQuantity: r.partialQuantity,
          unit: r.unit,
          notes: r.notes,
          order: r.order,
        })),
        quantity: l.quantity,
        surcharge: surchargeKindFromPercent(l.surchargePercent),
        voiceId: l.voice.id,
      })),
      notes: "",
      projectId: data.project.id,
      title: salTitle.trim() || suggestedSalTitle,
      total: summary.total,
      ...(materialUsagePayload.length > 0 ? { materialUsage: materialUsagePayload } : {}),
      voices: finalLineViews.map((l) => ({
        category: l.voice.category,
        code: l.voice.code,
        description: l.voice.description,
        id: l.voice.id,
        laborPercentage: l.voice.laborPercentage,
        projectYear: l.voice.tariffYear,
        unit: l.voice.unit,
        unitPrice: l.voice.unitPrice,
      })),
    };

    // Atomic transaction: save SAL + deduct materials + audit
    let salForBackend: SalDocument;
    if (editingDraftSalId) {
      updateSalDraft(editingDraftSalId, finalSalPayload);
      closeSal(editingDraftSalId);
      const updatedDraft = useSalWorkflowStore
        .getState()
        .salDocuments.find((d) => d.id === editingDraftSalId);
      if (!updatedDraft) {
        notify({
          message: "La bozza aggiornata non e stata trovata nel registro locale.",
          title: "Errore SAL",
          tone: "danger",
        });
        return;
      }
      salForBackend = updatedDraft;
    } else {
      salForBackend = createSal({ ...finalSalPayload, status: "closed" });
    }

    try {
      await confirmSalTransaction(
        data.project.id,
        salForBackend,
        materialUsagePayload.map((mu) => ({
          materialId: mu.materialId,
          quantity: mu.quantity,
          description: `SAL: ${salTitle.trim() || suggestedSalTitle}`,
        })),
      );
    } catch (err) {
      notify({
        message: `Errore durante il salvataggio: ${err instanceof Error ? err.message : String(err)}`,
        title: "Errore SAL",
        tone: "danger",
      });
      return;
    }

    setCreatedSalTitle(salTitle.trim() || suggestedSalTitle);
    clearSalCreationDraft(data.project.id);
    if (editingDraftSalId) {
      clearSalCreationDraftBySalId(editingDraftSalId);
    }
    markSalCreatedRedirect();
    setPhase("completed");
    notify({
      message: `${salTitle.trim() || suggestedSalTitle} confermata.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

  const buildMaterialUsagePayload = useCallback(() => {
    return Object.entries(materialUsage)
      .filter(([_, qty]) => qty > 0)
      .map(([materialId, qty]) => {
        const mat = materialById.get(materialId);
        return {
          materialId,
          code: mat?.code ?? materialId,
          description: mat?.description ?? "",
          unit: mat?.unit ?? "",
          quantity: qty,
        };
      });
  }, [materialById, materialUsage]);

  const persistBackendDraft = useCallback(async () => {
    const project = data.project;
    const pid = project?.id;
    const salId = editingDraftSalId;
    if (!project || !pid || !salId) return;

    const form = formStateRef.current;

    await persistSalProjectMetadata({
      client: project.contractor,
      description: `${project.frameworkAgreementCode} - ${project.applicationContractCode}`,
      id: pid,
      name: project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });

    const rulesForSave = syncMgVoiceAllocations(form.economicRules, form.lines);
    const payload = buildSalDraftPayload({
      economicRules: rulesForSave,
      lines: form.lines,
      materialUsageEntries: buildMaterialUsagePayload(),
      projectId: pid,
      salDate: form.salDate,
      salTitle: form.salTitle,
      suggestedSalTitle,
      total: summary.total,
      lineViews: buildLineViews(form.lines, rulesForSave),
    });

    await upsertSalDraftDocument(pid, salId, payload, {
      clearLocalDrafts: "project-only",
      localDraftLines: form.lines,
      localDraftPhase: form.phase,
      localDraftSalDate: form.salDate,
      localDraftSalTitle: form.salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((book) => book.id),
    });
  }, [
    buildMaterialUsagePayload,
    data.project,
    data.selectedTariffBook?.year,
    data.selectedTariffBooks,
    editingDraftSalId,
    suggestedSalTitle,
    summary.total,
  ]);

  const {
    flushDraftSnapshot,
    lastSaved: salAutoSaveLastSaved,
    markChanged: handleAutoSave,
    status: salAutoSaveStatus,
  } = useSalDraftAutosave({
    enabled: resumeHydrationReady,
    getSnapshot: getSalDraftAutosaveSnapshot,
    onBackendAutosave: persistBackendDraft,
  });

  flushSalDraftSnapshotRef.current = flushDraftSnapshot;

  const handleSaveDraft = useCallback(async () => {
    const project = data.project;
    const pid = project?.id;
    if (!project || !pid) return;
    try {
      await persistSalProjectMetadata({
        client: project.contractor,
        description: `${project.frameworkAgreementCode} - ${project.applicationContractCode}`,
        id: pid,
        name: project.title,
        year: data.selectedTariffBook?.year ?? 2026,
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Salvataggio progetto SAL non riuscito",
        tone: "danger",
      });
      return;
    }

    const form = formStateRef.current;
    const rulesForSave = syncMgVoiceAllocations(form.economicRules, form.lines);
    const draftPayload = buildSalDraftPayload({
      economicRules: rulesForSave,
      lines: form.lines,
      materialUsageEntries: buildMaterialUsagePayload(),
      projectId: pid,
      salDate: form.salDate,
      salTitle: form.salTitle,
      suggestedSalTitle,
      total: summary.total,
      lineViews: buildLineViews(form.lines, rulesForSave),
    });

    try {
      const draftSal = await upsertSalDraftDocument(pid, editingDraftSalId, draftPayload, {
        clearLocalDrafts: "all",
        localDraftLines: form.lines,
        localDraftPhase: form.phase,
        localDraftSalDate: form.salDate,
        localDraftSalTitle: form.salTitle,
        selectedTariffBookIds: data.selectedTariffBooks.map((book) => book.id),
      });
      persistSalCreationLocalDraft({
        projectId: pid,
        salId: draftSal.id,
        draft: {
          economicRules: prepareEconomicRulesForDraftPersist(rulesForSave, form.lines),
          lines: form.lines,
          materialUsage: form.materialUsage,
          phase: form.phase,
          salDate: form.salDate,
          salTitle: form.salTitle,
          selectedTariffBookIds: data.selectedTariffBooks.map((book) => book.id),
        },
      });
      setEditingDraftSalId(draftSal.id);
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Salvataggio bozza SAL non riuscito",
        tone: "danger",
      });
      return;
    }

    notify({
      message: "Bozza salvata. La trovi nel registro SAL del progetto.",
      title: "Bozza salvata",
      tone: "success",
    });
    selectProjectForWorkflow(pid);
    navigate("project-detail", undefined, true);
  }, [
    data.project,
    data.selectedTariffBooks,
    data.selectedTariffBook,
    suggestedSalTitle,
    notify,
    buildMaterialUsagePayload,
    navigate,
    summary.total,
    editingDraftSalId,
  ]);

  const handleExportSalExcel = useCallback(async () => {
    const project = data.project;
    if (!project) {
      notify({
        message: "Seleziona un progetto prima di esportare la SAL.",
        title: "Export SAL",
        tone: "warning",
      });
      return;
    }

    try {
      const { serializeSalDetailReportWorkbook } = await import("@quantara/excel-import");
      const fileName = `quantara-sal-${slugify(salTitle.trim() || suggestedSalTitle)}-${salDate}.xlsx`;
      await waitForUiPaint();
      const savedPath = await saveWorkbookAs(
        await serializeSalDetailReportWorkbook({
          date: salDate,
          economicRules,
          lines: lineViews.map((line) => ({
            discountAmount: line.discountAmount,
            discountableAmount: line.discountableAmount,
            grossAmount: line.grossAmount,
            id: line.id,
            linkedCharges: line.linkedCharges,
            measurementRows: line.measurementRows.map((row) => ({
              date: row.date,
              description: row.description,
              factor1: row.factor1,
              factor2: row.factor2,
              factor3: row.factor3,
              notes: row.notes,
              partialQuantity: row.partialQuantity,
              ...(row.station ? { station: row.station } : {}),
              unit: row.unit,
            })),
            netAmount: line.netAmount,
            notes: line.notes,
            quantity: line.quantity,
            surchargePercent: line.surchargePercent,
            totalAmount: line.totalAmount,
            voice: {
              category: line.voice.category,
              code: line.voice.code,
              description: line.voice.description,
              isSafetyCost: line.voice.isSafetyCost,
              unit: line.voice.unit,
              unitPrice: line.voice.unitPrice,
            },
          })),
          project: {
            applicationContractCode: project.applicationContractCode,
            contractor: project.contractor,
            contractAmount: project.contractAmount,
            frameworkAgreementCode: project.frameworkAgreementCode,
            title: project.title,
          },
          summary,
          title: salTitle.trim() || suggestedSalTitle,
        }),
        fileName,
      );
      if (!savedPath) {
        notify({
          message: "Export annullato.",
          title: "Export SAL",
          tone: "info",
        });
        return;
      }
      notify({
        message: `${lineViews.length} righe incluse nel file Excel.`,
        title: "Excel SAL completato",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Export Excel non riuscito",
        tone: "danger",
      });
    }
  }, [
    data.project,
    economicRules,
    lineViews,
    notify,
    salDate,
    salTitle,
    suggestedSalTitle,
    summary,
  ]);

  const handlePdfPending = useCallback(
    async (kind: "libretto" | "sal" | "stampa") => {
      const project = data.project;
      if (!project) {
        notify({
          message: "Seleziona un progetto prima di esportare il PDF.",
          title: "Export PDF",
          tone: "warning",
        });
        return;
      }

      try {
        const { serializeAccountingPdf, serializeMeasurementBookPdf, serializeSalPdfReport } =
          await import("@quantara/pdf-export");
        const reportInput = buildPdfSalReportInput({
          date: salDate,
          lineViews,
          project,
          summary,
          title: salTitle.trim() || suggestedSalTitle,
        });
        const fileBase = `quantara-${kind}-${slugify(salTitle.trim() || suggestedSalTitle)}-${salDate}.pdf`;
        const bytes =
          kind === "libretto"
            ? serializeMeasurementBookPdf(reportInput)
            : kind === "stampa"
              ? serializeAccountingPdf(reportInput)
              : serializeSalPdfReport(reportInput);
        await waitForUiPaint();
        const savedPath = await savePdfAs(bytes, fileBase);
        notify({
          message: savedPath ? `${lineViews.length} voci incluse nel PDF.` : "Export annullato.",
          title:
            kind === "libretto"
              ? "PDF libretto completato"
              : kind === "stampa"
                ? "Stampa contabile completata"
                : "PDF SAL completato",
          tone: savedPath ? "success" : "info",
        });
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Export PDF non riuscito",
          tone: "danger",
        });
      }
    },
    [data.project, lineViews, notify, salDate, salTitle, suggestedSalTitle, summary],
  );

  const handlePrintAccounting = useCallback(() => {
    void handlePdfPending("stampa");
  }, [handlePdfPending]);

  const handleExportSalPdf = useCallback(() => {
    void handlePdfPending("sal");
  }, [handlePdfPending]);

  const handleExportMeasurementBookPdf = useCallback(() => {
    void handlePdfPending("libretto");
  }, [handlePdfPending]);

  const handlePhaseChange = useCallback((p: SalWorkflowPhase) => setPhase(p), [setPhase]);

  const toolbarConfig = useMemo(
    () => ({
      autoSaveLastSaved: salAutoSaveLastSaved,
      autoSaveStatus: salAutoSaveStatus,
      budgetResidual: summary.budgetResidual,
      discountAmount: summary.discountAmount,
      lineCount: lineViews.length,
      salTitle: salTitle.trim() || suggestedSalTitle,
      total: summary.total,
      voicesCount: data.voices.length,
    }),
    [
      data.voices.length,
      lineViews.length,
      salTitle,
      suggestedSalTitle,
      salAutoSaveLastSaved,
      salAutoSaveStatus,
      summary.budgetResidual,
      summary.discountAmount,
      summary.total,
    ],
  );

  useEffect(() => {
    useAppStore.getState().setSalToolbar(toolbarConfig);
  }, [toolbarConfig]);

  const handleSaveDraftRef = useRef(handleSaveDraft);
  handleSaveDraftRef.current = handleSaveDraft;
  const goPrimaryRef = useRef(goPrimary);
  goPrimaryRef.current = goPrimary;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useActionHandler(
    "sal.saveDraft",
    useCallback(() => {
      if (phaseRef.current === "completed") return;
      handleSaveDraftRef.current();
    }, []),
  );

  useActionHandler(
    "sal.confirm",
    useCallback(() => {
      if (phaseRef.current === "completed") return;
      goPrimaryRef.current();
    }, []),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SalWorkspace
        phase={phase}
        onPhaseChange={handlePhaseChange}
        salTitle={salTitle}
        suggestedSalTitle={suggestedSalTitle}
        projectTitle={data.project?.title ?? null}
        contractor={data.project?.contractor ?? null}
        total={summary.total}
        summary={summary}
        canContinue={canContinue}
        primaryDisabledReason={currentDisabledReason}
        autoSaveLastSaved={salAutoSaveLastSaved}
        autoSaveStatus={salAutoSaveStatus}
        onPrimary={goPrimary}
        onSaveDraft={handleSaveDraft}
        onExportPdf={handleExportSalPdf}
        onExportExcel={handleExportSalExcel}
        lineViews={lineViews}
      >
        {/* Project phase */}
        {phase === "project" && (
          <div className="flex h-full min-h-0 flex-col">
            {data.error && (
              <div className="mb-4 shrink-0 rounded-xl border border-[var(--danger-base)]/20 bg-[var(--danger-soft)] px-4 py-3 text-13px font-medium text-[var(--danger-base)]">
                {data.error}
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ProjectStep
                contracts={data.contracts}
                onSelectContract={data.setContract}
                project={data.project}
                salDate={salDate}
                salTitle={salTitle}
                suggestedSalTitle={suggestedSalTitle}
                selectedTariffBooks={data.selectedTariffBooks}
                selectedTariffBook={data.selectedTariffBook}
                selectTariffBook={data.selectTariffBook}
                setSelectedTariffBookIds={data.setSelectedTariffBookIds}
                isLoading={data.isVoicesLoading}
                setSalDate={setSalDate}
                setSalTitle={setSalTitle}
                summary={summary}
                tariffBooks={data.tariffBookOptions}
                voicesCount={data.voices.length}
              />
            </div>
          </div>
        )}

        {/* Measure phase */}
        {phase === "measure" && (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <MeasureStep
              economicRules={economicRules}
              lineViews={measureLineViews}
              mgAvailableVoices={mgAvailableVoices}
              voiceSearchIndex={voiceSearchIndex}
              isLoading={data.isVoicesLoading}
              isActive
              tariffBookIds={selectedTariffBookIds}
              onAllocateMg={handleAllocateMg}
              onAddMgVoice={handleAddMgVoice}
              onAddMeasurementRow={addMeasurementRow}
              onDuplicateMeasurementRow={duplicateMeasurementRow}
              onRemoveMeasurementRow={removeMeasurementRow}
              onUpdateMeasurementRow={updateMeasurementRow}
              onRemove={removeLine}
              onNotesChange={setNotes}
              onSurcharge={setSurcharge}
              onPasteLine={handlePasteLineWithScroll}
              onPasteMeasurementRows={pasteMeasurementRows}
              onPasteMeasurementRowsAt={pasteMeasurementRowsAt}
              onScrollToLineHandled={handleScrollToLineHandled}
              onSearchSelectVoice={handleSearchSelectVoice}
              scrollToLineId={scrollToLineId}
              onApplyTemplate={handleApplyTemplate}
              onOpenTemplateDialog={() => setIsTemplateDialogOpen(true)}
            />
          </div>
        )}

        {/* Verify phase */}
        {phase === "verify" && (
          <div className="flex h-full min-h-0 flex-col">
            <VerifyStep
              checks={checks}
              economicRules={economicRules}
              lineViews={lineViews}
              materialUsage={materialUsage}
              materials={materials}
              onAutoSave={handleAutoSave}
              onMaterialUsageChange={(usage) =>
                dispatch({ type: "MATERIAL_USAGE", materialUsage: usage })
              }
              onMaterialsChange={(mats) => dispatch({ type: "ALL", partial: { materials: mats } })}
              summary={summary}
              previousSalLines={previousSalLines}
              compareLines={compareLines}
              onToggleCompare={() => setCompareLines(compareLines ? null : previousSalLines)}
            />
          </div>
        )}

        {/* Confirm phase */}
        {phase === "confirm" && (
          <div className="flex h-full min-h-0 flex-col">
            <ConfirmStep
              economicRules={economicRules}
              lineViews={lineViews}
              onExportExcel={handleExportSalExcel}
              onExportMeasurementBookPdf={handleExportMeasurementBookPdf}
              onExportSalPdf={handleExportSalPdf}
              onPrintAccounting={handlePrintAccounting}
              summary={summary}
            />
          </div>
        )}

        {/* Completed view */}
        {phase === "completed" && (
          <CompletedView
            createdSalTitle={createdSalTitle}
            onClose={() => {
              if (data.project?.id) {
                selectProjectForWorkflow(data.project.id);
              }
              navigate("project-detail", undefined, true);
            }}
            onNew={() => {
              setLines([]);
              setPhase("project");
            }}
            summary={summary}
          />
        )}
      </SalWorkspace>

      {isTemplateDialogOpen && (
        <SaveAsTemplateDialog
          economicRules={economicRules}
          onClose={() => setIsTemplateDialogOpen(false)}
          tariffBookId={data.selectedTariffBook?.id ?? ""}
          voiceEntries={lines.map((l) => {
            const firstRow = l.measurementRows[0];
            return {
              voiceId: l.voice.id,
              factor1: firstRow?.factor1 ?? 0,
              factor2: firstRow?.factor2 ?? 1,
              factor3: firstRow?.factor3 ?? 1,
              surchargePercent: l.surchargePercent,
            };
          })}
        />
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function canContinueSalPhase({
  checks,
  lineViews,
  lines,
  phase,
  project,
  selectedTariffBooks,
}: {
  checks: SalVerificationCheck[];
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  phase: SalWorkflowPhase;
  project: SalProjectContext | null;
  selectedTariffBooks: SalTariffBookOption[];
}): boolean {
  if (phase === "project") return Boolean(project && selectedTariffBooks.length > 0);
  if (phase === "measure")
    return lines.length > 0 && lineViews.every((l) => l.status === "complete");
  if (phase === "verify") return checks.every((c) => c.tone !== "danger") && lines.length > 0;
  if (phase === "confirm") return lines.length > 0 && !checks.some((c) => c.tone === "danger");
  return true;
}

function disabledReason(
  phase: SalWorkflowPhase,
  project: SalProjectContext | null,
  tariffBook: SalTariffBookOption | null,
  _lineViews: SalLineView[],
  _hasDangerChecks: boolean,
): string {
  if (!project)
    return "Nessun contratto disponibile. Torna a Progetti e crea un progetto prima di generare una SAL.";
  if (phase === "project" && !tariffBook)
    return "Nessun tariffario disponibile. Importa un tariffario o crea un progetto con tariffario associato.";
  return "Completa i campi richiesti prima di proseguire.";
}

function buildPdfSalReportInput({
  date,
  lineViews,
  project,
  summary,
  title,
}: {
  date: string;
  lineViews: SalLineView[];
  project: SalProjectContext;
  summary: SalEconomicSummary;
  title: string;
}) {
  return {
    date,
    lines: lineViews.map((line) => ({
      discountAmount: line.discountAmount,
      discountableAmount: line.discountableAmount,
      grossAmount: line.grossAmount,
      id: line.id,
      linkedCharges: line.linkedCharges,
      measurementRows: line.measurementRows.map((row) => ({
        date: row.date,
        description: row.description,
        factor1: row.factor1,
        factor2: row.factor2,
        factor3: row.factor3,
        notes: row.notes,
        partialQuantity: row.partialQuantity,
        ...(row.station ? { station: row.station } : {}),
        unit: row.unit,
      })),
      netAmount: line.netAmount,
      notes: line.notes,
      quantity: line.quantity,
      surchargePercent: line.surchargePercent,
      totalAmount: line.totalAmount,
      voice: {
        category: line.voice.category,
        code: line.voice.code,
        description: line.voice.description,
        isSafetyCost: line.voice.isSafetyCost,
        unit: line.voice.unit,
        unitPrice: line.voice.unitPrice,
      },
    })),
    project: {
      applicationContractCode: project.applicationContractCode,
      contractAmount: project.contractAmount,
      contractor: project.contractor,
      frameworkAgreementCode: project.frameworkAgreementCode,
      title: project.title,
    },
    summary: {
      budgetResidual: summary.budgetResidual,
      discountAmount: summary.discountAmount,
      discountableAmount: summary.discountableAmount,
      grossAmount: summary.grossAmount,
      linkedChargeAmount: summary.linkedChargeAmount,
      netDiscountableAmount: summary.netDiscountableAmount,
      previousProgressiveAmount: summary.previousProgressiveAmount,
      safetyAmount: summary.safetyAmount,
      total: summary.total,
      voiceCount: summary.voiceCount,
    },
    title,
  };
}

/* ─── Completed view ─── */

function CompletedView({
  createdSalTitle,
  onClose,
  onNew,
  summary,
}: {
  createdSalTitle: string;
  onClose: () => void;
  onNew: () => void;
  summary: SalEconomicSummary;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-xl border border-[var(--success-base)]/20 bg-[var(--success-soft)] px-4 py-3.5 text-[var(--success-base)]">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="size-5" />
          <div className="min-w-0">
            <div className="text-13px font-semibold">Operazione completata</div>
            <div className="mt-0.5 text-12px opacity-75">
              {createdSalTitle} confermata con successo.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          caption="Importo complessivo della revisione"
          icon={Receipt}
          label="Totale SAL"
          tone="info"
          value={<Currency value={summary.total} />}
        />
        <MetricCard
          caption="Differenza tra budget e importo SAL"
          icon={WalletCards}
          label="Budget residuo"
          tone={summary.budgetResidual >= 0 ? "success" : "danger"}
          value={<Currency value={summary.budgetResidual} />}
        />
        <MetricCard
          caption="La revisione è stata generata"
          icon={CheckCircle2}
          label="Stato"
          value="Confermata"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} size="sm" type="button" variant="outline">
          Chiudi
        </Button>
        <Button onClick={onNew} size="sm" type="button" variant="primary">
          Nuova revisione
        </Button>
      </div>
    </div>
  );
}
function Currency({ value }: { value: number }) {
  return (
    <span className="tabular-nums">
      {value.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      })}
    </span>
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "sal"
  );
}
