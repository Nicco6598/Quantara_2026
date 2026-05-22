import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { SalDocument } from "@/features/sal/types";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import {
  savePdfAs,
  saveWorkbookAs,
  waitForUiPaint,
} from "@/features/projects/utils/projects-helpers";
import { useNavigate } from "@/hooks/useNavigate";
import {
  confirmSalTransaction,
  saveSalDocument,
  saveSalProject,
  updateSalDocument as updateBackendSalDocument,
} from "@/lib/sal-data";
import { cn } from "@/lib/utils";
import { SESSION_STORAGE_KEYS } from "@/persistence/storage-keys";
import { useSalWorkflowService } from "@/services/sal-service";
import { useAppStore } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import type { SalTemplate } from "@/store/template-store";
import { SalHeader } from "./components/SalHeader";
import { SalSearchBar } from "./components/SalSearchBar";
import { SaveAsTemplateDialog } from "./components/SaveAsTemplateDialog";
import { defaultSalEconomicRules, isMgCode } from "./domain/sal-calculations";
import {
  clearSalCreationDraft,
  clearSalCreationDraftBySalId,
  lineDraftsFromStoredSal,
  loadSalCreationDraftBySalId,
  saveSalCreationDraft,
  saveSalCreationDraftBySalId,
} from "./domain/sal-creation-draft";
import { useSalCreationData } from "./hooks/useSalCreationData";
import { useSalDerivedViews } from "./hooks/useSalDerivedViews";
import { useSalDraftAutosave } from "./hooks/useSalDraftAutosave";
import { useSalLineActions } from "./hooks/useSalLineActions";
import { PHASE_ORDER, salFormReducer, surchargeKindFromPercent } from "./state/sal-form-state";
import { getNextPhase, type SalWorkflowPhase } from "./state/workflow";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineDraft,
  SalLineView,
  SalMeasurementRowDraft,
  SalProjectContext,
  SalTariffBookOption,
  SalTariffVoice,
  SalVoiceDraft,
  SalVerificationCheck,
} from "./types";
import { createMeasurementId } from "./types";

import { ProjectStep } from "./steps/ProjectStep";
import { MeasureStep } from "./steps/MeasureStep";
import { VerifyStep } from "./steps/VerifyStep";
import { ConfirmStep } from "./steps/ConfirmStep";

const CREATED_FLAG_KEY = SESSION_STORAGE_KEYS.salCreated;

function buildDefaultSalTitle(existingCount: number) {
  return `SAL ${String(existingCount + 1).padStart(2, "0")} - Periodo corrente`;
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
  const {
    createProject: createSalProject,
    closeSal,
    createSal,
    updateSalDraft,
    salDocuments,
    tariffVoices,
  } = useSalWorkflowService();

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
      dispatch({ type: "LINES", lines: typeof updater === "function" ? updater(prev) : updater });
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
      dispatch({ type: "PHASE", phase: typeof updater === "function" ? updater(prev) : updater });
    },
    [],
  );

  const editingDraftSalId = useRef<string | null>(null);
  const resumeMissingVoicesNotified = useRef(false);

  // Guard: if SAL was already created in this session, redirect to project-detail
  useEffect(() => {
    if (sessionStorage.getItem(CREATED_FLAG_KEY) === "1") {
      sessionStorage.removeItem(CREATED_FLAG_KEY);
      navigate("project-detail");
    }
  }, [navigate]);

  // Resume draft from project SAL list
  useEffect(() => {
    const resumeSalId = sessionStorage.getItem(SESSION_STORAGE_KEYS.salResumeDraft);
    const project = data.project;
    if (!resumeSalId || !project) return;

    const draftSal = salDocuments.find(
      (sal) => sal.id === resumeSalId && sal.projectId === project.id && sal.status === "draft",
    );
    const draft = loadSalCreationDraftBySalId(resumeSalId);

    if (!draft && !draftSal) {
      return;
    }

    const resumeVoices = mergeResumeVoices(data.voices, tariffVoices);

    if (!draft && draftSal && draftSal.lines.length > 0 && resumeVoices.length === 0) {
      return;
    }

    if (draft) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.salResumeDraft);
      resumeMissingVoicesNotified.current = false;
      editingDraftSalId.current = resumeSalId;
      dispatch({
        type: "ALL",
        partial: {
          lines: draft.lines,
          economicRules: draft.economicRules,
          materialUsage: draft.materialUsage ?? {},
          salDate: draft.salDate ?? new Date().toISOString().slice(0, 10),
          salTitle: draft.salTitle || draftSal?.title || project.salTitle,
          phase: draft.phase,
        },
      });
      if (draft.selectedTariffBookIds?.length > 0) {
        data.restoreTariffBookIds(draft.selectedTariffBookIds);
      }
      return;
    }

    if (draftSal) {
      const resumedLines = lineDraftsFromStoredSal(draftSal, resumeVoices);
      if (draftSal.lines.length > 0 && resumedLines.length === 0) {
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

      sessionStorage.removeItem(SESSION_STORAGE_KEYS.salResumeDraft);
      resumeMissingVoicesNotified.current = false;
      editingDraftSalId.current = resumeSalId;
      dispatch({
        type: "ALL",
        partial: {
          lines: resumedLines,
          salDate: draftSal.date ?? new Date().toISOString().slice(0, 10),
          salTitle: draftSal.title || project.salTitle,
          phase: draftSal.lines.length > 0 ? "measure" : "project",
        },
      });
    }
  }, [data.project, data.voices, data.restoreTariffBookIds, salDocuments, tariffVoices, notify]);

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

  const [createdSalTitle, setCreatedSalTitle] = useState("SAL 01 - Periodo corrente");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [compareLines, setCompareLines] = useState<SalLineView[] | null>(null);

  const suggestedSalTitle = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) return buildDefaultSalTitle(0);
    const existingCount = salDocuments.filter((sal) => sal.projectId === projectId).length;
    return buildDefaultSalTitle(existingCount);
  }, [data.project?.id, salDocuments]);

  // Set default discount from project when it loads
  useEffect(() => {
    const project = data.project;
    if (project) {
      setSalTitle((prev) => prev || suggestedSalTitle);
      setEconomicRules((prev) => ({
        ...prev,
        discountEnabled: project.tenderDiscountPercent > 0,
        discountPercent: project.tenderDiscountPercent,
      }));
    }
  }, [data.project, setEconomicRules, setSalTitle, suggestedSalTitle]);

  const closedProjectSals = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) return [];
    return salDocuments
      .filter((sal) => sal.projectId === projectId && sal.status === "closed")
      .sort((a, b) => (b.closedAt ?? b.date).localeCompare(a.closedAt ?? a.date));
  }, [data.project?.id, salDocuments]);

  const { checks, lineViews, previousSalLines, summary, voicesMap } = useSalDerivedViews({
    closedProjectSals,
    economicRules,
    lines,
    project: data.project,
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
    removeLine,
    removeMeasurementRow,
    setNotes,
    setSurcharge,
    updateMeasurementRow,
    upsertLine,
  } = useSalLineActions({ lines, notify, setLines });

  const handleAllocateMg = useCallback(
    (mgLineId: string, targetLineIds: string[]) => {
      setEconomicRules((prev) => {
        const nextAlloc = { ...(prev.mgManualAllocations ?? {}) };
        nextAlloc[mgLineId] = targetLineIds;
        return { ...prev, mgManualAllocations: nextAlloc };
      });
    },
    [setEconomicRules],
  );

  const handleAddMgVoice = useCallback(
    (voice: SalVoiceDraft) => {
      const exists = formStateRef.current.lines.some((line) => line.voice.id === voice.id);
      if (exists) {
        addVoiceAsNewLine(voice);
      } else {
        upsertLine(voice);
      }
    },
    [addVoiceAsNewLine, upsertLine],
  );

  const handleApplyTemplate = useCallback(
    (template: SalTemplate) => {
      const newLines: SalLineDraft[] = [];
      for (const entry of template.voiceEntries) {
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
          id: `draft-${entry.voiceId}`,
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

    createSalProject({
      client: data.project.contractor,
      description: `${data.project.frameworkAgreementCode} - ${data.project.applicationContractCode}`,
      id: data.project.id,
      name: data.project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });
    try {
      saveSalProject({
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

    const finalSalPayload = {
      date: salDate,
      description: "Periodo corrente",
      lines: lineViews.map((l) => ({
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
      voices: lineViews.map((l) => ({
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
    if (editingDraftSalId.current) {
      updateSalDraft(editingDraftSalId.current, finalSalPayload);
      closeSal(editingDraftSalId.current);
      const updatedDraft = useSalWorkflowStore
        .getState()
        .salDocuments.find((d) => d.id === editingDraftSalId.current);
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
    if (editingDraftSalId.current) {
      clearSalCreationDraftBySalId(editingDraftSalId.current);
    }
    sessionStorage.setItem(CREATED_FLAG_KEY, "1");
    setPhase("completed");
    notify({
      message: `${salTitle.trim() || suggestedSalTitle} confermata.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

  const {
    lastSaved: salAutoSaveLastSaved,
    markChanged: handleAutoSave,
    status: salAutoSaveStatus,
  } = useSalDraftAutosave({
    economicRules,
    lines,
    materialUsage,
    phase,
    projectId: data.project?.id ?? "",
    salDate,
    salTitle,
    selectedTariffBooks: data.selectedTariffBooks,
  });

  const handleSaveDraft = useCallback(async () => {
    const project = data.project;
    const pid = project?.id;
    if (!project || !pid) return;
    saveSalCreationDraft(pid, {
      economicRules,
      lines,
      materialUsage,
      phase,
      salDate,
      salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((b: SalTariffBookOption) => b.id),
    });
    createSalProject({
      client: project.contractor,
      description: `${project.frameworkAgreementCode} - ${project.applicationContractCode}`,
      id: pid,
      name: project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });
    try {
      saveSalProject({
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
    const draftMaterialUsage = Object.entries(materialUsage)
      .filter(([_, qty]) => qty > 0)
      .map(([mid, qty]) => {
        const mat = materialById.get(mid);
        return {
          materialId: mid,
          code: mat?.code ?? mid,
          description: mat?.description ?? "",
          unit: mat?.unit ?? "",
          quantity: qty,
        };
      });
    const draftPayload = {
      date: salDate,
      description: salTitle.trim() || suggestedSalTitle,
      lines: lineViews.map((l) => ({
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
      projectId: pid,
      status: "draft" as const,
      title: salTitle.trim() || suggestedSalTitle,
      total: summary.total,
      ...(draftMaterialUsage.length > 0 ? { materialUsage: draftMaterialUsage } : {}),
      voices: lineViews.map((l) => ({
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
    const draftSal = editingDraftSalId.current
      ? updateSalDraft(editingDraftSalId.current, draftPayload)
      : createSal(draftPayload);
    if (draftSal) {
      try {
        if (editingDraftSalId.current) {
          await updateBackendSalDocument(draftSal.id, draftSal);
        } else {
          await saveSalDocument(pid, draftSal);
        }
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Salvataggio bozza SAL non riuscito",
          tone: "danger",
        });
        return;
      }
    }
    const draftSalId = draftSal?.id ?? editingDraftSalId.current;
    if (draftSalId) {
      editingDraftSalId.current = draftSalId;
      saveSalCreationDraftBySalId(draftSalId, {
        economicRules,
        lines,
        materialUsage,
        phase,
        salDate,
        salTitle: salTitle.trim() || suggestedSalTitle,
        selectedTariffBookIds: data.selectedTariffBooks.map((b: SalTariffBookOption) => b.id),
      });
    }

    notify({
      message: "Bozza salvata. La trovi nel registro SAL del progetto.",
      title: "Bozza salvata",
      tone: "success",
    });
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEYS.selectedProjectDetail,
        JSON.stringify({ id: pid }),
      );
    } catch {
      /* no-op */
    }
    navigate("project-detail", undefined, true);
  }, [
    data.project,
    data.selectedTariffBooks,
    data.selectedTariffBook,
    economicRules,
    lines,
    materialUsage,
    materialById,
    salDate,
    phase,
    salTitle,
    suggestedSalTitle,
    notify,
    lineViews,
    createSalProject,
    createSal,
    updateSalDraft,
    navigate,
    summary.total,
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

  const headerCockpit = useMemo(
    () => ({
      budgetResidual: summary.budgetResidual,
      checks,
      incompleteCount: lineViews.filter(
        (line) => !isMgCode(line.voice.code) && line.status !== "complete",
      ).length,
      voiceCount: lineViews.filter((line) => !isMgCode(line.voice.code)).length,
    }),
    [checks, lineViews, summary.budgetResidual],
  );

  const actionHandlersRef = useRef({ goPrimary, handleSaveDraft, phase });
  actionHandlersRef.current = { goPrimary, handleSaveDraft, phase };

  useEffect(() => {
    const handler = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      const { goPrimary, handleSaveDraft, phase } = actionHandlersRef.current;
      if (phase === "completed") return;
      if (actionId === "sal-save-draft") {
        handleSaveDraft();
        return;
      }
      if (actionId === "sal-confirm") {
        goPrimary();
      }
    };
    window.addEventListener("sal-create-action", handler);
    return () => window.removeEventListener("sal-create-action", handler);
  }, []);

  return (
    <div className="flex h-[calc(100dvh-48px)] flex-col">
      <SalHeader
        phase={phase}
        salTitle={salTitle}
        suggestedSalTitle={suggestedSalTitle}
        projectTitle={data.project?.title ?? null}
        total={summary.total}
        cockpit={headerCockpit}
        canContinue={canContinue}
        primaryDisabledReason={currentDisabledReason}
        onPrimary={goPrimary}
        onSaveDraft={handleSaveDraft}
        onPhaseChange={handlePhaseChange}
        searchBar={
          <div className={cn(phase !== "measure" && "hidden")}>
            <SalSearchBar
              voices={data.voices}
              tariffBookIds={selectedTariffBookIds}
              linesCount={lines.length}
              isLoading={data.isLoading}
              onSelectVoice={(voice) => {
                const exists = lines.some((l) => l.voice.id === voice.id);
                if (exists) addVoiceAsNewLine(voice);
                else upsertLine(voice);
              }}
              onApplyTemplate={handleApplyTemplate}
              onOpenTemplateDialog={() => setIsTemplateDialogOpen(true)}
            />
          </div>
        }
      />

      <div className="relative flex-1 min-h-0">
        {/* Tutte le fasi sono sempre montate, toggle display:none per preservare DOM e stato */}
        <div className={cn("h-full min-h-0 overflow-hidden", phase !== "measure" && "hidden")}>
          <MeasureStep
            economicRules={economicRules}
            lineViews={lineViews}
            voices={data.voices}
            isLoading={data.isLoading}
            onAllocateMg={handleAllocateMg}
            onAddMgVoice={handleAddMgVoice}
            onAddMeasurementRow={addMeasurementRow}
            onDuplicateMeasurementRow={duplicateMeasurementRow}
            onRemoveMeasurementRow={removeMeasurementRow}
            onUpdateMeasurementRow={updateMeasurementRow}
            onRemove={removeLine}
            onNotesChange={setNotes}
            onSurcharge={setSurcharge}
            onPasteLine={handlePasteLine}
          />
        </div>

        <div
          className={cn(
            "h-full min-h-0 overflow-y-auto p-4 lg:p-6",
            phase !== "project" && "hidden",
          )}
        >
          {data.error && (
            <div className="mb-4 rounded-xl border border-[var(--danger-base)]/20 bg-[var(--danger-soft)] px-4 py-3 text-13px font-medium text-[var(--danger-base)]">
              {data.error}
            </div>
          )}
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
            isLoading={data.isLoading}
            setSalDate={setSalDate}
            setSalTitle={setSalTitle}
            summary={summary}
            tariffBooks={data.tariffBookOptions}
            voicesCount={data.voices.length}
          />
        </div>

        <div
          className={cn(
            "h-full min-h-0 overflow-y-auto p-4 lg:p-6",
            phase !== "verify" && "hidden",
          )}
        >
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

        <div
          className={cn(
            "h-full min-h-0 overflow-y-auto p-4 lg:p-6",
            phase !== "confirm" && "hidden",
          )}
        >
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

        <div
          className={cn(
            "h-full min-h-0 overflow-y-auto p-4 lg:p-6",
            phase !== "completed" && "hidden",
          )}
        >
          <CompletedView
            createdSalTitle={createdSalTitle}
            onClose={() => {
              try {
                window.sessionStorage.setItem(
                  SESSION_STORAGE_KEYS.selectedProjectDetail,
                  JSON.stringify({ id: data.project?.id }),
                );
              } catch {
                /* no-op */
              }
              navigate("project-detail", undefined, true);
            }}
            onNew={() => {
              setLines([]);
              setPhase("project");
            }}
            summary={summary}
          />
        </div>
      </div>

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
        <MetricCard label="Totale SAL" value={<Currency value={summary.total} />} accent />
        <MetricCard
          label="Budget residuo"
          value={<Currency value={summary.budgetResidual} />}
          tone={summary.budgetResidual >= 0 ? "success" : "danger"}
        />
        <MetricCard label="Stato" value="Confermata" />
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

function MetricCard({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/50">
      <div className="text-10px font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-22px font-bold leading-none",
          accent && "text-[var(--accent-primary)]",
          tone === "success" && "text-[var(--success-base)]",
          tone === "danger" && "text-[var(--danger-base)]",
          !accent && !tone && "text-[var(--text-primary)]",
        )}
      >
        {value}
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
