import { m } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Package,
  Printer,
  Wallet,
} from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";

import { useToast } from "@/components/shared/ToastProvider";
import { useNavigate } from "@/hooks/useNavigate";
import { DATA_CHANGED_EVENT, dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";
import { useSalWorkflowService } from "@/services/sal-service";
import { useAppStore } from "@/store/app-store";
import type { SalTemplate } from "@/store/template-store";
import type { DesktopMaterial } from "@/lib/desktopData";
import { updateDesktopMaterial } from "@/lib/desktopData";
import { SalComparisonView } from "./components/SalComparisonView";
import {
  Currency,
  DocumentPreview,
  NumberValue,
  OutputRow,
  SelectedVoicesPanel,
} from "./components/SalCreationTables";
import { SaveAsTemplateDialog } from "./components/SaveAsTemplateDialog";
import { TemplatePicker } from "./components/TemplatePicker";
import {
  buildLineViews,
  buildVerificationChecks,
  defaultSalEconomicRules,
  summarizeSalLines,
} from "./domain/sal-calculations";
import {
  clearSalCreationDraft,
  clearSalCreationDraftBySalId,
  lineDraftsFromStoredSal,
  loadSalCreationDraft,
  loadSalCreationDraftBySalId,
  saveSalCreationDraft,
  saveSalCreationDraftBySalId,
} from "./domain/sal-creation-draft";
import { buildSalDocumentView, type SalSurchargeKind } from "./domain/sal-workflow";
import { useSalCreationData } from "./hooks/useSalCreationData";
import { getNextPhase, type SalWorkflowPhase } from "./state/workflow";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineDraft,
  SalLineView,
  SalProjectContext,
  SalTariffBookOption,
  SalVoiceDraft,
} from "./types";

const PHASE_ORDER: SalWorkflowPhase[] = ["context", "voices", "review", "confirm", "completed"];
const CREATED_FLAG_KEY = "quantara.salCreated.v1";

function surchargeKindFromPercent(percent: number): SalSurchargeKind {
  return percent >= 20 ? "night" : percent > 0 ? "day" : "none";
}

/* ── Form state reducer ── */
type SalFormState = {
  lines: SalLineDraft[];
  economicRules: SalEconomicRules;
  salTitle: string;
  phase: SalWorkflowPhase;
  materialUsage: Record<string, number>;
  materials: DesktopMaterial[];
};
type SalFormAction =
  | { type: "LINES"; lines: SalLineDraft[] }
  | { type: "ECONOMIC_RULES"; economicRules: SalEconomicRules }
  | { type: "SAL_TITLE"; salTitle: string }
  | { type: "PHASE"; phase: SalWorkflowPhase }
  | { type: "MATERIAL_USAGE"; materialUsage: Record<string, number> }
  | { type: "ALL"; partial: Partial<SalFormState> };

function salFormReducer(state: SalFormState, action: SalFormAction): SalFormState {
  switch (action.type) {
    case "LINES":
      return { ...state, lines: action.lines };
    case "ECONOMIC_RULES":
      return { ...state, economicRules: action.economicRules };
    case "SAL_TITLE":
      return { ...state, salTitle: action.salTitle };
    case "PHASE":
      return { ...state, phase: action.phase };
    case "MATERIAL_USAGE":
      return { ...state, materialUsage: action.materialUsage };
    case "ALL":
      return { ...state, ...action.partial };
  }
}
/* ── ── */

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
    phase: "context",
    materialUsage: {},
    materials: [],
  });
  const formStateRef = useRef(formState);
  formStateRef.current = formState;
  const { lines, economicRules, materialUsage, materials, salTitle, phase } = formState;

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
  const idCounter = useRef(0);

  // Guard: if SAL was already created in this session, redirect to project-detail
  useEffect(() => {
    if (sessionStorage.getItem(CREATED_FLAG_KEY) === "1") {
      sessionStorage.removeItem(CREATED_FLAG_KEY);
      navigate("project-detail");
    }
  }, [navigate]);

  // Resume draft from project SAL list
  useEffect(() => {
    const resumeSalId = sessionStorage.getItem("quantara.salResumeDraft.v1");
    const project = data.project;
    if (!resumeSalId || !project) return;

    const draftSal = salDocuments.find(
      (sal) => sal.id === resumeSalId && sal.projectId === project.id && sal.status === "draft",
    );
    const draft = loadSalCreationDraftBySalId(resumeSalId) ?? loadSalCreationDraft(project.id);

    if (!draft && draftSal && draftSal.lines.length > 0 && data.voices.length === 0) {
      return;
    }

    sessionStorage.removeItem("quantara.salResumeDraft.v1");

    if (draft) {
      editingDraftSalId.current = resumeSalId;
      dispatch({
        type: "ALL",
        partial: {
          lines: draft.lines,
          economicRules: draft.economicRules,
          materialUsage: draft.materialUsage ?? {},
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
      editingDraftSalId.current = resumeSalId;
      dispatch({
        type: "ALL",
        partial: {
          lines: lineDraftsFromStoredSal(draftSal, data.voices),
          salTitle: draftSal.title || project.salTitle,
          phase: draftSal.lines.length > 0 ? "voices" : "context",
        },
      });
    }
  }, [data.project, data.voices, data.restoreTariffBookIds, salDocuments]);

  const voicesMap = useMemo(() => new Map(data.voices.map((v) => [v.id, v])), [data.voices]);

  // Subscribe to step navigation from TopToolbar
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.salPendingStep !== prev.salPendingStep && state.salPendingStep !== null) {
        const stepToPhase: Record<number, SalWorkflowPhase> = {
          1: "context",
          2: "voices",
          3: "review",
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

  const [createdSalTitle, setCreatedSalTitle] = useState("SAL 01 - Periodo corrente");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [compareLines, setCompareLines] = useState<SalLineView[] | null>(null);

  // Set default discount from project when it loads
  useEffect(() => {
    const project = data.project;
    if (project) {
      setSalTitle((prev) => prev || project.salTitle);
      setEconomicRules((prev) => ({
        ...prev,
        discountEnabled: project.tenderDiscountPercent > 0,
        discountPercent: project.tenderDiscountPercent,
      }));
    }
  }, [data.project, setEconomicRules, setSalTitle]);

  const closedProjectSals = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) return [];

    return salDocuments
      .filter((sal) => sal.projectId === projectId && sal.status === "closed")
      .sort((a, b) => (b.closedAt ?? b.date).localeCompare(a.closedAt ?? a.date));
  }, [data.project?.id, salDocuments]);

  const previousProgressiveAmount = useMemo(
    () =>
      closedProjectSals.reduce(
        (sum, sal) => sum + buildSalDocumentView(sal, tariffVoices).total,
        0,
      ),
    [closedProjectSals, tariffVoices],
  );

  // Line views computed on every edit (needed for real-time display)
  const lineViews = useMemo(() => buildLineViews(lines, economicRules), [lines, economicRules]);

  // Summary: only recompute when line views or contract data change
  const summary = useMemo(() => {
    const contractAmount = data.project?.contractAmount ?? 0;
    return summarizeSalLines(lineViews, contractAmount, previousProgressiveAmount);
  }, [lineViews, data.project?.contractAmount, previousProgressiveAmount]);

  // Verification checks: only computed when entering review/confirm phase
  const checks = useMemo(
    () => buildVerificationChecks(lineViews, summary, economicRules),
    [lineViews, summary, economicRules],
  );
  const hasDangerChecks = checks.some((check) => check.tone === "danger");

  const previousSalLines = useMemo(() => {
    if (voicesMap.size === 0) return [];
    const latest = closedProjectSals[0];
    if (!latest) return [];
    return buildLineViews(
      (() => {
        const result: SalLineDraft[] = [];
        for (const l of latest.lines) {
          const voice = voicesMap.get(l.voiceId);
          if (!voice) continue;
          result.push({
            id: l.id,
            factor1: l.quantity,
            factor2: 1,
            factor3: 1,
            notes: "",
            quantity: l.quantity,
            sourceType: "voice",
            surchargePercent: l.surcharge === "night" ? 25 : l.surcharge === "day" ? 10 : 0,
            voice,
          });
        }
        return result;
      })(),
      defaultSalEconomicRules,
    );
  }, [closedProjectSals, voicesMap]);

  const upsertLine = useCallback(
    (voice: SalVoiceDraft) => {
      const exists = lines.some((l) => l.voice.id === voice.id);
      setLines((current) => {
        if (exists) return current.filter((l) => l.voice.id !== voice.id);
        return [
          ...current,
          {
            id: `draft-${voice.id}`,
            factor1: 1,
            factor2: 1,
            factor3: 1,
            notes: "",
            quantity: 1,
            sourceType: "voice",
            surchargePercent: 0,
            voice,
          },
        ];
      });
      if (exists) {
        notify({
          message: `${voice.code} rimossa dalla bozza.`,
          title: "Voce rimossa",
          tone: "warning",
        });
      } else {
        notify({
          message: `${voice.code} aggiunta alla bozza.`,
          title: "Voce aggiunta",
          tone: "success",
        });
      }
    },
    [lines, notify, setLines],
  );

  const setSurcharge = useCallback(
    (lineId: string, pct: number) => {
      setLines((current) =>
        current.map((l) => (l.id === lineId ? { ...l, surchargePercent: pct } : l)),
      );
    },
    [setLines],
  );

  const setFactor = useCallback(
    (lineId: string, field: "factor1" | "factor2" | "factor3", value: number) => {
      setLines((current) =>
        current.map((l) =>
          l.id === lineId
            ? {
                ...l,
                [field]: Number.isFinite(value) && value >= 0 ? value : 0,
                quantity:
                  field === "factor1"
                    ? (Number.isFinite(value) && value >= 0 ? value : 0) * l.factor2 * l.factor3
                    : field === "factor2"
                      ? l.factor1 * (Number.isFinite(value) && value >= 0 ? value : 0) * l.factor3
                      : l.factor1 * l.factor2 * (Number.isFinite(value) && value >= 0 ? value : 0),
              }
            : l,
        ),
      );
    },
    [setLines],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      const line = lines.find((l) => l.id === lineId);
      setLines((current) => current.filter((l) => l.id !== lineId));
      if (line)
        notify({
          message: `${line.voice.code} eliminata dalla bozza.`,
          title: "Voce rimossa",
          tone: "warning",
        });
    },
    [lines, notify, setLines],
  );

  const setNotes = useCallback(
    (lineId: string, notes: string) => {
      setLines((current) => current.map((l) => (l.id === lineId ? { ...l, notes } : l)));
    },
    [setLines],
  );

  const handlePasteLine = useCallback(
    (draft: SalLineDraft) => {
      const newId = `draft-${draft.voice.id}-${idCounter.current++}`;
      setLines((current) => [
        ...current,
        { ...draft, id: newId, quantity: draft.factor1 * draft.factor2 * draft.factor3 },
      ]);
      notify({
        message: `${draft.voice.code} duplicata via incolla.`,
        title: "Voce incollata",
        tone: "success",
      });
    },
    [notify, setLines],
  );

  const handleApplyTemplate = useCallback(
    (template: SalTemplate) => {
      const newLines: SalLineDraft[] = [];
      for (const entry of template.voiceEntries) {
        const voice = voicesMap.get(entry.voiceId);
        if (!voice) continue;
        newLines.push({
          id: `draft-${entry.voiceId}`,
          factor1: entry.factor1,
          factor2: entry.factor2,
          factor3: entry.factor3,
          notes: "",
          quantity: entry.factor1 * entry.factor2 * entry.factor3,
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
      // Mantieni il ribasso del progetto — il template non sovrascrive la % del contratto
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
    const canContinue =
      phase === "context"
        ? Boolean(data.project && data.selectedTariffBooks.length > 0)
        : phase === "voices"
          ? lines.length > 0 && lineViews.every((l) => l.status === "complete")
          : phase === "review"
            ? checks.every((c) => c.tone !== "danger") && lines.length > 0
            : phase === "confirm"
              ? lines.length > 0 && !checks.some((c) => c.tone === "danger")
              : true;

    if (!canContinue) {
      notify({
        message: disabledReason(
          phase,
          data.project,
          data.selectedTariffBooks[0] ?? null,
          lineViews,
          hasDangerChecks,
        ),
        title: "Attenzione",
        tone: "warning",
      });
      return;
    }

    if (phase !== "confirm" && phase !== "completed") {
      const nextPhase = getNextPhase(phase);
      const phaseNames: Record<string, string> = {
        context: "Impostazioni",
        voices: "Voci",
        review: "Verifica",
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

    const materialUsagePayload = Object.entries(materialUsage)
      .filter(([_, qty]) => qty > 0)
      .map(([materialId, qty]) => {
        const mat = materials.find((m) => m.id === materialId);
        return {
          materialId,
          code: mat?.code ?? materialId,
          description: mat?.description ?? materialId,
          unit: mat?.unit ?? "",
          quantity: qty,
        };
      });

    const finalSalPayload = {
      date: new Date().toISOString().slice(0, 10),
      description: "Periodo corrente",
      lines: lineViews.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        surcharge: surchargeKindFromPercent(l.surchargePercent),
        voiceId: l.voice.id,
      })),
      notes: "",
      projectId: data.project.id,
      title: salTitle.trim() || data.project.salTitle,
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

    if (editingDraftSalId.current) {
      updateSalDraft(editingDraftSalId.current, finalSalPayload);
      closeSal(editingDraftSalId.current);
    } else {
      createSal(finalSalPayload);
    }

    // Deduct materials from inventory on SAL confirmation
    if (materialUsagePayload.length > 0) {
      await Promise.all(
        materialUsagePayload.map(async (mu) => {
          const mat = materials.find((m) => m.id === mu.materialId);
          if (mat) {
            await updateDesktopMaterial(mu.materialId, {
              ...mat,
              quantity: Math.max(0, mat.quantity - mu.quantity),
            });
          }
        }),
      );
      dispatchDataChanged();
    }

    setCreatedSalTitle(salTitle.trim() || data.project.salTitle);
    clearSalCreationDraft(data.project.id);
    if (editingDraftSalId.current) {
      clearSalCreationDraftBySalId(editingDraftSalId.current);
    }
    sessionStorage.setItem(CREATED_FLAG_KEY, "1");
    setPhase("completed");
    notify({
      message: `${salTitle.trim() || data.project.salTitle} confermata.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

  const persistDraftSilent = useCallback(() => {
    const project = data.project;
    const pid = project?.id;
    if (!project || !pid) return;
    saveSalCreationDraft(pid, {
      economicRules,
      lines,
      materialUsage,
      phase,
      salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((b: SalTariffBookOption) => b.id),
    });
  }, [
    economicRules,
    lines,
    materialUsage,
    phase,
    salTitle,
    data.project,
    data.selectedTariffBooks,
  ]);

  const debounceAutoSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAutoSave = useCallback(() => {
    if (debounceAutoSave.current) clearTimeout(debounceAutoSave.current);
    debounceAutoSave.current = setTimeout(persistDraftSilent, 800);
  }, [persistDraftSilent]);

  const handleSaveDraft = useCallback(() => {
    const project = data.project;
    const pid = project?.id;
    if (!project || !pid) return;
    saveSalCreationDraft(pid, {
      economicRules,
      lines,
      materialUsage,
      phase,
      salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((b: SalTariffBookOption) => b.id),
    });
    // Also persist a draft SAL in the store so it appears in the project
    createSalProject({
      client: project.contractor,
      description: `${project.frameworkAgreementCode} - ${project.applicationContractCode}`,
      id: pid,
      name: project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });
    const draftMaterialUsage = Object.entries(materialUsage)
      .filter(([_, qty]) => qty > 0)
      .map(([mid, qty]) => {
        const mat = materials.find((m) => m.id === mid);
        return {
          materialId: mid,
          code: mat?.code ?? mid,
          description: mat?.description ?? "",
          unit: mat?.unit ?? "",
          quantity: qty,
        };
      });
    const draftPayload = {
      date: new Date().toISOString().slice(0, 10),
      description: salTitle.trim() || project.salTitle,
      lines: lineViews.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        surcharge: surchargeKindFromPercent(l.surchargePercent),
        voiceId: l.voice.id,
      })),
      notes: "",
      projectId: pid,
      status: "draft" as const,
      title: salTitle.trim() || project.salTitle,
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
    const draftSalId = draftSal?.id ?? editingDraftSalId.current;
    if (draftSalId) {
      editingDraftSalId.current = draftSalId;
      saveSalCreationDraftBySalId(draftSalId, {
        economicRules,
        lines,
        materialUsage,
        phase,
        salTitle: salTitle.trim() || project.salTitle,
        selectedTariffBookIds: data.selectedTariffBooks.map((b: SalTariffBookOption) => b.id),
      });
    }
    // Materials are NOT deducted on draft save — only on final SAL confirmation.
    // This avoids double-deduction when saving draft then confirming.

    notify({
      message: "Bozza salvata. La trovi nel registro SAL del progetto.",
      title: "Bozza salvata",
      tone: "success",
    });
    try {
      window.sessionStorage.setItem(
        "quantara.selectedProjectDetail.v1",
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
    materials,
    phase,
    salTitle,
    notify,
    lineViews,
    createSalProject,
    createSal,
    updateSalDraft,
    navigate,
    summary.total,
  ]);

  const toolbarConfig = useMemo(
    () => ({
      budgetResidual: summary.budgetResidual,
      discountAmount: summary.discountAmount,
      lineCount: lineViews.length,
      salTitle: salTitle.trim() || data.project?.salTitle || "Nuovo SAL",
      total: summary.total,
      voicesCount: data.voices.length,
    }),
    [
      data.project?.salTitle,
      data.voices.length,
      lineViews.length,
      salTitle,
      summary.budgetResidual,
      summary.discountAmount,
      summary.total,
    ],
  );

  useEffect(() => {
    useAppStore.getState().setSalToolbar(toolbarConfig);
  }, [toolbarConfig]);

  useEffect(() => {
    const handleSalToolbarAction = (event: Event) => {
      const actionId = (event as CustomEvent<string>).detail;
      if (actionId === "sal-save-draft") {
        handleSaveDraft();
      }
    };

    window.addEventListener("sal-create-action", handleSalToolbarAction);
    return () => window.removeEventListener("sal-create-action", handleSalToolbarAction);
  }, [handleSaveDraft]);

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-3 pb-6 pt-1 md:px-4">
      <div className="mt-2 space-y-3">
        {phase === "completed" ? (
          <CompletedView
            createdSalTitle={createdSalTitle}
            onClose={() => {
              try {
                window.sessionStorage.setItem(
                  "quantara.selectedProjectDetail.v1",
                  JSON.stringify({ id: data.project?.id }),
                );
              } catch {
                /* no-op */
              }
              navigate("project-detail", undefined, true);
            }}
            onNew={() => {
              setLines([]);
              setPhase("context");
            }}
            summary={summary}
          />
        ) : (
          <SalEditorContent
            checks={checks}
            compareLines={compareLines}
            contracts={data.contracts}
            dataError={data.error}
            dataSetContract={data.setContract}
            dataTariffBookOptions={data.tariffBookOptions}
            dataVoices={data.voices}
            dataVoicesLength={data.voices.length}
            dataSelectedTariffBooks={data.selectedTariffBooks}
            dataSelectedTariffBook={data.selectedTariffBook}
            dataSelectTariffBook={data.selectTariffBook}
            economicRules={economicRules}
            goPrimary={goPrimary}
            handleApplyTemplate={handleApplyTemplate}
            handlePasteLine={handlePasteLine}
            lineViews={lineViews}
            lines={lines}
            materialUsage={materialUsage}
            materials={materials}
            notify={notify}
            onAutoSave={handleAutoSave}
            onMaterialUsageChange={(usage) =>
              dispatch({ type: "MATERIAL_USAGE", materialUsage: usage })
            }
            onMaterialsChange={(mats) => dispatch({ type: "ALL", partial: { materials: mats } })}
            onToggleCompare={() => setCompareLines(compareLines ? null : previousSalLines)}
            previousSalLines={previousSalLines}
            removeLine={removeLine}
            salTitle={salTitle}
            setFactor={setFactor}
            setIsTemplateDialogOpen={setIsTemplateDialogOpen}
            setLines={setLines}
            setNotes={setNotes}
            setSalTitle={setSalTitle}
            setSurcharge={setSurcharge}
            summary={summary}
            upsertLine={upsertLine}
            phase={phase}
            project={data.project}
            tariffBookId={data.selectedTariffBook?.id ?? ""}
          />
        )}
      </div>
      {isTemplateDialogOpen && (
        <SaveAsTemplateDialog
          economicRules={economicRules}
          onClose={() => setIsTemplateDialogOpen(false)}
          tariffBookId={data.selectedTariffBook?.id ?? ""}
          voiceEntries={lines.map((l) => ({
            voiceId: l.voice.id,
            factor1: l.factor1,
            factor2: l.factor2,
            factor3: l.factor3,
            surchargePercent: l.surchargePercent,
          }))}
        />
      )}
    </main>
  );
}

/* ── Editor content ── */
function SalEditorContent({
  checks,
  compareLines,
  contracts,
  dataError,
  dataSetContract,
  dataTariffBookOptions,
  dataVoices,
  dataVoicesLength,
  dataSelectedTariffBooks,
  dataSelectedTariffBook,
  dataSelectTariffBook,
  project,
  economicRules,
  goPrimary,
  handleApplyTemplate,
  handlePasteLine,
  lineViews,
  lines,
  materialUsage,
  materials,
  notify,
  onAutoSave,
  onMaterialUsageChange,
  onMaterialsChange,
  onToggleCompare,
  previousSalLines,
  phase,
  removeLine,
  salTitle,
  setFactor,
  setIsTemplateDialogOpen,
  setLines,
  setNotes,
  setSalTitle,
  setSurcharge,
  summary,
  tariffBookId,
  upsertLine,
}: {
  checks: ReturnType<typeof buildVerificationChecks>;
  compareLines: SalLineView[] | null;
  contracts: { id: string; title: string; contractor?: string }[];
  dataError: string | null;
  dataSetContract: ((id: string) => void) | undefined;
  dataTariffBookOptions: SalTariffBookOption[];
  dataVoices: SalVoiceDraft[];
  dataVoicesLength: number;
  dataSelectedTariffBooks: SalTariffBookOption[];
  dataSelectedTariffBook: SalTariffBookOption | null;
  dataSelectTariffBook: (id: string) => Promise<void>;
  project: SalProjectContext | null;
  economicRules: SalEconomicRules;
  goPrimary: () => void;
  handleApplyTemplate: (t: SalTemplate) => void;
  handlePasteLine: (d: SalLineDraft) => void;
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  materialUsage: Record<string, number>;
  materials: DesktopMaterial[];
  notify: ReturnType<typeof useToast>["notify"];
  onAutoSave: () => void;
  onMaterialUsageChange: (usage: Record<string, number>) => void;
  onMaterialsChange: (mats: DesktopMaterial[]) => void;
  onToggleCompare: () => void;
  previousSalLines: SalLineView[];
  phase: SalWorkflowPhase;
  removeLine: (lineId: string) => void;
  salTitle: string;
  setFactor: (lineId: string, f: "factor1" | "factor2" | "factor3", v: number) => void;
  setIsTemplateDialogOpen: Dispatch<SetStateAction<boolean>>;
  setLines: (updater: SalLineDraft[] | ((prev: SalLineDraft[]) => SalLineDraft[])) => void;
  setNotes: (lineId: string, notes: string) => void;
  setSalTitle: (updater: string | ((prev: string) => string)) => void;
  setSurcharge: (lineId: string, p: number) => void;
  summary: SalEconomicSummary;
  tariffBookId: string;
  upsertLine: (v: SalVoiceDraft) => void;
}) {
  return (
    <>
      {dataError ? (
        <FeedbackBanner tone="danger" title="Caricamento fallito" message={dataError} />
      ) : null}
      {phase === "context" ? (
        <SetupStep
          contracts={contracts}
          economicRules={economicRules}
          onSelectContract={dataSetContract}
          project={project}
          salTitle={salTitle}
          selectedTariffBooks={dataSelectedTariffBooks}
          selectedTariffBook={dataSelectedTariffBook}
          selectTariffBook={async (id) => {
            await dataSelectTariffBook(id);
            const book = dataTariffBookOptions.find((b) => b.id === id);
            if (book)
              notify({
                message: `${book.name} (${book.year}) selezionato.`,
                title: "Tariffario",
                tone: "success",
              });
          }}
          setSalTitle={setSalTitle}
          summary={summary}
          tariffBooks={dataTariffBookOptions}
          voicesCount={dataVoicesLength}
          onPrimary={goPrimary}
        />
      ) : null}
      {phase === "voices" ? (
        <VoicesStep
          lineViews={lineViews}
          lines={lines}
          onFactorChange={setFactor}
          onNotesChange={setNotes}
          onPasteLine={handlePasteLine}
          onPrimary={goPrimary}
          onReorder={setLines}
          onRemove={removeLine}
          onSurcharge={setSurcharge}
          onToggle={upsertLine}
          summary={summary}
          voices={dataVoices}
          onApplyTemplate={handleApplyTemplate}
          onOpenTemplateDialog={() => setIsTemplateDialogOpen(true)}
          tariffBookId={tariffBookId}
        />
      ) : null}
      {phase === "review" ? (
        <ReviewStep
          checks={checks}
          economicRules={economicRules}
          lineViews={lineViews}
          materialUsage={materialUsage}
          materials={materials}
          onAutoSave={onAutoSave}
          onMaterialUsageChange={onMaterialUsageChange}
          onMaterialsChange={onMaterialsChange}
          onPrimary={goPrimary}
          summary={summary}
          previousSalLines={previousSalLines}
          compareLines={compareLines}
          onToggleCompare={onToggleCompare}
        />
      ) : null}
      {phase === "confirm" ? (
        <ConfirmStep
          economicRules={economicRules}
          lineViews={lineViews}
          materialUsage={materialUsage}
          onPrimary={goPrimary}
          summary={summary}
        />
      ) : null}
    </>
  );
}

/* ── Setup ── */
function SetupStep({
  contracts,
  economicRules,
  project,
  salTitle,
  selectedTariffBooks,
  selectedTariffBook,
  selectTariffBook,
  setSalTitle,
  summary,
  tariffBooks,
  voicesCount,
  onPrimary,
  onSelectContract,
}: {
  contracts: { id: string; title: string; contractor?: string }[];
  economicRules: SalEconomicRules;
  project: SalProjectContext | null;
  salTitle: string;
  selectedTariffBooks: SalTariffBookOption[];
  selectedTariffBook: SalTariffBookOption | null;
  selectTariffBook: (id: string) => Promise<void>;
  setSalTitle: Dispatch<SetStateAction<string>>;
  summary: SalEconomicSummary;
  tariffBooks: SalTariffBookOption[];
  voicesCount: number;
  onPrimary: () => void;
  onSelectContract?: ((id: string) => void) | undefined;
}) {
  const [projectOpen, setProjectOpen] = useState(false);
  if (!project) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-12 text-center">
        <Building2 className="mx-auto size-8 text-[var(--text-secondary)]" />
        <p className="mt-3 text-14px font-semibold text-[var(--text-primary)]">
          Nessun contratto disponibile
        </p>
        <p className="mt-1 text-13px text-[var(--text-secondary)]">
          Crea o apri un progetto prima di generare una SAL.
        </p>
      </div>
    );
  }

  const showContractSelector = contracts.length > 1 && onSelectContract;

  return (
    <div className="space-y-6 rounded-2xl bg-[var(--surface-base)]/80 p-4 ring-1 ring-[var(--border-subtle)]/70 md:p-6">
      <div className="rounded-xl bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
        {showContractSelector ? (
          <div className="relative">
            <m.button
              className="flex w-full items-center gap-5 text-left"
              onClick={() => setProjectOpen(!projectOpen)}
              type="button"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info-base)]">
                <Building2 className="size-7" />
              </span>
              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0 border-b border-[var(--border-subtle)]/70 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                  <div className="text-12px font-medium text-[var(--text-secondary)]">Progetto</div>
                  <div className="mt-1 truncate text-15px font-bold text-[var(--text-primary)]">
                    {project.title}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-12px font-medium text-[var(--text-secondary)]">Cliente</div>
                  <div className="mt-1 truncate text-15px font-bold text-[var(--text-primary)]">
                    {project.contractor}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-12px font-bold transition-colors",
                  projectOpen
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--accent-primary)] hover:bg-[var(--bg-muted)]",
                )}
              >
                Cambia progetto
                <ChevronDown
                  className={cn("size-3 transition-transform", projectOpen && "rotate-180")}
                />
              </span>
            </m.button>
            {projectOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProjectOpen(false)}
                  type="button"
                  aria-label="Chiudi"
                />
                <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[300px] overflow-hidden rounded-xl bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]">
                  {contracts.map((c) => {
                    const isActive = c.id === project.id;
                    return (
                      <m.button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all",
                          isActive
                            ? "bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30"
                            : "hover:bg-[var(--bg-muted)]",
                        )}
                        key={c.id}
                        onClick={() => {
                          if (!isActive && onSelectContract) onSelectContract(c.id);
                          setProjectOpen(false);
                        }}
                        type="button"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-10px",
                            isActive
                              ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                              : "bg-[var(--info-soft)] text-[var(--info-base)]",
                          )}
                        >
                          <Building2 className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-13px font-bold text-[var(--text-primary)]">
                            {c.title}
                          </div>
                          <div className="mt-0.5 truncate text-11px text-[var(--text-secondary)]">
                            {c.contractor ?? "—"}
                          </div>
                        </div>
                        {isActive && (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--text-inverse)]">
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>
                        )}
                      </m.button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info-base)]">
              <Building2 className="size-7" />
            </span>
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 border-b border-[var(--border-subtle)]/70 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                <div className="text-12px font-medium text-[var(--text-secondary)]">Progetto</div>
                <div className="mt-1 truncate text-15px font-bold text-[var(--text-primary)]">
                  {project.title}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-12px font-medium text-[var(--text-secondary)]">Cliente</div>
                <div className="mt-1 truncate text-15px font-bold text-[var(--text-primary)]">
                  {project.contractor}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label
          className="text-13px font-semibold text-[var(--text-primary)]"
          htmlFor="sal-title-input"
        >
          Nome SAL
        </label>
        <input
          className="mt-2 h-11 w-full rounded-10px border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-14px font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          id="sal-title-input"
          onChange={(e) => setSalTitle(e.target.value)}
          placeholder={project.salTitle}
          value={salTitle}
        />
      </div>

      <div className="border-t border-[var(--border-subtle)]/70 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-17px font-semibold text-[var(--text-primary)]">
              Tariffari del progetto
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-12px text-[var(--text-secondary)]">
              {selectedTariffBooks.length > 0 ? (
                <>
                  <CheckCircle2 className="size-4 text-[var(--success-base)]" />
                  <span>
                    {selectedTariffBooks.length} selezionat
                    {selectedTariffBooks.length !== 1 ? "i" : "o"}
                    {selectedTariffBook ? ` · ${voicesCount} voci` : ""}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-[var(--warning-base)]">
                  Seleziona almeno un tariffario
                </span>
              )}
            </div>
          </div>
        </div>
        {tariffBooks.length === 0 ? (
          <p className="mt-2 text-12px text-[var(--text-secondary)]">Nessun tariffario caricato.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {tariffBooks.map((book) => {
              const isSelected = selectedTariffBooks.some((b) => b.id === book.id);
              return (
                <m.button
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-12px font-semibold transition-all",
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base)_90%)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]/70 bg-[var(--surface-base)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                  )}
                  key={book.id}
                  layout
                  onClick={() => void selectTariffBook(book.id)}
                  type="button"
                >
                  {isSelected ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    <span className="size-3.5 rounded-full border-2 border-[var(--border-subtle)]" />
                  )}
                  <span>{book.name}</span>
                  <span className="text-11px text-[var(--text-secondary)]">{book.year}</span>
                </m.button>
              );
            })}
          </div>
        )}
        <div className="mt-3 text-11px text-[var(--text-secondary)]">
          I tariffari associati al progetto vengono presi come predefiniti. Puoi modificare la
          selezione qui per questa SAL. Per modificare i tariffari del progetto, vai al{" "}
          <span className="font-semibold text-[var(--info-base)]">dettaglio progetto</span>.
        </div>
      </div>

      <SetupMetricsCards
        economicRules={economicRules}
        project={project}
        summary={summary}
        voicesCount={voicesCount}
      />

      <div className="flex items-center justify-end">
        <m.button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-12px font-bold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          Continua <ArrowRight className="size-4" />
        </m.button>
      </div>
    </div>
  );
}

/* ── Setup metrics cards ── */
function SetupMetricsCards({
  economicRules,
  project,
  summary,
  voicesCount,
}: {
  economicRules: SalEconomicRules;
  project: SalProjectContext;
  summary: SalEconomicSummary;
  voicesCount: number;
}) {
  return (
    <div className="border-t border-[var(--border-subtle)]/70 pt-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
          <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success-base)]">
            <Wallet className="size-5" />
          </span>
          <div className="mt-4 text-12px font-medium text-[var(--text-secondary)]">
            Budget totale
          </div>
          <div className="mt-1 text-18px font-black text-[var(--text-primary)]">
            <Currency value={project.contractAmount} />
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
          <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success-base)]">
            <Calculator className="size-5" />
          </span>
          <div className="mt-4 text-12px font-medium text-[var(--text-secondary)]">
            Residuo stimato
          </div>
          <div className="mt-1 text-18px font-black text-[var(--success-base)]">
            <Currency value={summary.budgetResidual} />
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
          <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--accent-primary)]">
            <Calculator className="size-5" />
          </span>
          <div className="mt-4 text-12px font-medium text-[var(--text-secondary)]">
            Ribasso gara
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-18px font-black text-[var(--text-primary)]">
              {economicRules.discountPercent.toLocaleString("it-IT")}%
            </span>
            {!economicRules.discountEnabled && (
              <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-10px font-bold text-[var(--warning-base)]">
                Disattivato
              </span>
            )}
          </div>
          {economicRules.discountEnabled && (
            <div className="mt-3 text-12px font-medium text-[var(--danger-base)]">
              Sconto: -<Currency value={summary.discountAmount} />
            </div>
          )}
          <div className="mt-2 text-11px text-[var(--text-secondary)]">
            Dal contratto · non modificabile in SAL
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
          <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info-base)]">
            <FileText className="size-5" />
          </span>
          <div className="mt-4 text-12px font-medium text-[var(--text-secondary)]">
            Voci disponibili
          </div>
          <div className="mt-1 text-18px font-black text-[var(--info-base)]">{voicesCount}</div>
          <div className="mt-2 text-11px text-[var(--text-secondary)]">
            nel tariffario selezionato
          </div>
        </div>
      </div>
      <EconomicEquation className="mt-4" summary={summary} />
    </div>
  );
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
  if (phase === "context" && !tariffBook)
    return "Nessun tariffario disponibile. Importa un tariffario o crea un progetto con tariffario associato.";
  return "Completa i campi richiesti prima di proseguire.";
}

/* ── Voices ── */
function VoicesStep({
  lineViews,
  lines,
  onFactorChange,
  onNotesChange,
  onPasteLine,
  onPrimary,
  onReorder,
  onRemove,
  onSurcharge,
  onToggle,
  summary,
  voices,
  onApplyTemplate,
  onOpenTemplateDialog,
  tariffBookId,
}: {
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  onFactorChange: (lineId: string, f: "factor1" | "factor2" | "factor3", v: number) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onPasteLine: (line: SalLineDraft) => void;
  onPrimary: () => void;
  onReorder: (l: SalLineDraft[]) => void;
  onRemove: (lineId: string) => void;
  onSurcharge: (lineId: string, p: number) => void;
  onToggle: (v: SalVoiceDraft) => void;
  summary: SalEconomicSummary;
  voices: SalVoiceDraft[];
  onApplyTemplate: (t: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
  tariffBookId: string;
}) {
  const totalQty = lineViews.reduce((s, l) => s + l.quantity, 0);
  const linked = lineViews.reduce((s, l) => s + l.linkedCharges.length, 0);
  const autocompleteOptions = useMemo(
    () =>
      voices.map((v) => ({
        label: v.description,
        metadata: `${v.category} · ${v.unit} · ${v.unitPrice.toLocaleString("it-IT", { currency: "EUR", style: "currency", minimumFractionDigits: 2 })}`,
        value: v.code,
        keywords: `${v.code} ${v.description} ${v.category}`,
      })),
    [voices],
  );
  const [copiedLine, setCopiedLine] = useState<SalLineDraft | null>(null);
  const lastInteractedRef = useRef<string | null>(null);
  const idCounter = useRef(0);

  const handleCopyLine = useCallback(
    (lineId: string) => {
      const line = lineViews.find((l) => l.id === lineId);
      if (!line) return;
      setCopiedLine({
        id: line.id,
        factor1: line.factor1,
        factor2: line.factor2,
        factor3: line.factor3,
        notes: "",
        quantity: line.quantity,
        sourceType: line.sourceType,
        surchargePercent: line.surchargePercent,
        voice: line.voice,
      });
    },
    [lineViews],
  );

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isInput =
      activeEl?.tagName === "INPUT" ||
      activeEl?.tagName === "TEXTAREA" ||
      (activeEl as HTMLElement | null)?.isContentEditable;

    if (isInput) return;

    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    if (mod && key === "c" && lastInteractedRef.current) {
      const lineId = lastInteractedRef.current;
      const line = lineViews.find((l) => l.id === lineId);
      if (line) {
        e.preventDefault();
        setCopiedLine({
          id: line.id,
          factor1: line.factor1,
          factor2: line.factor2,
          factor3: line.factor3,
          notes: "",
          quantity: line.quantity,
          sourceType: line.sourceType,
          surchargePercent: line.surchargePercent,
          voice: line.voice,
        });
      }
    }

    if (mod && key === "v" && copiedLine) {
      e.preventDefault();
      const uniqueVoice = {
        ...copiedLine.voice,
        id: `${copiedLine.voice.id}-copy-${idCounter.current++}`,
      };
      const pastedLine: SalLineDraft = {
        ...copiedLine,
        id: `draft-${uniqueVoice.id}`,
        voice: uniqueVoice,
        notes: "",
        quantity: copiedLine.factor1 * copiedLine.factor2 * copiedLine.factor3,
      };
      onPasteLine(pastedLine);
      setCopiedLine(null);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      role="none"
      className="space-y-3"
      onClick={(e) => {
        const row = (e.target as HTMLElement).closest("[data-line-id]");
        if (row) {
          lastInteractedRef.current = row.getAttribute("data-line-id");
        }
      }}
      onKeyDown={() => {}}
    >
      <section className="overflow-hidden rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/70">
        <div className="grid gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_58%,var(--surface-base)_42%)] p-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Misure
            </div>
            <div className="mt-1 text-15px font-bold text-[var(--text-primary)]">
              Inserisci le voci come in un foglio di calcolo
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TemplatePicker onApply={onApplyTemplate} tariffBookId={tariffBookId} />
            {lines.length > 0 && (
              <m.button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--surface-base)] px-3 text-11px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                onClick={onOpenTemplateDialog}
                type="button"
              >
                Salva template
              </m.button>
            )}
          </div>
        </div>

        <div className="grid gap-3 p-3">
          <div className="min-w-0 space-y-3">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <AutocompleteInput
                options={autocompleteOptions}
                onSelect={(o) => {
                  const v = voices.find((x) => x.code === o.value);
                  if (v) {
                    const exists = lines.some((l) => l.voice.id === v.id);
                    if (exists) {
                      onPasteLine({
                        id: `draft-${v.id}-${idCounter.current++}`,
                        factor1: 1,
                        factor2: 1,
                        factor3: 1,
                        notes: "",
                        quantity: 1,
                        sourceType: "voice",
                        surchargePercent: 0,
                        voice: v,
                      });
                    } else {
                      onToggle(v);
                    }
                  }
                }}
                placeholder={`Cerca codice, descrizione o categoria (${voices.length} voci)...`}
              />
              <div className="flex items-center gap-2 text-11px font-semibold text-[var(--text-secondary)]">
                <span className="rounded-md bg-[var(--bg-muted)] px-2 py-1">Invio seleziona</span>
                <span className="rounded-md bg-[var(--bg-muted)] px-2 py-1">Tab tra celle</span>
              </div>
            </div>
            <SelectedVoicesPanel
              lines={lineViews}
              copiedVoiceId={copiedLine?.id ?? null}
              onCopyLine={handleCopyLine}
              onFactorChange={onFactorChange}
              onNotesChange={onNotesChange}
              onRemove={onRemove}
              onReorder={onReorder}
              onSurcharge={onSurcharge}
            />
          </div>

          <SalBudgetLive summary={summary} />
        </div>
      </section>

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-xl bg-[color-mix(in_srgb,var(--surface-base)_94%,transparent)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/70 backdrop-blur-md">
        <div />
        <div className="hidden flex-wrap items-center gap-3 text-12px lg:flex">
          <span className="font-semibold text-[var(--accent-primary)]">
            Totale: <Currency value={summary.total} />
          </span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="font-medium text-[var(--text-secondary)]">{lines.length} voci</span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="text-[var(--text-secondary)]">
            Qtà: <NumberValue value={totalQty} />
          </span>
          {linked > 0 && (
            <>
              <span className="text-[var(--border-subtle)]">·</span>
              <span className="text-[var(--text-secondary)]">{linked} magg.</span>
            </>
          )}
        </div>
        <m.button
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-5 text-12px font-bold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          Continua <ArrowRight className="size-4" />
        </m.button>
      </div>
    </div>
  );
}

/* ── Review ── */
function ReviewStep({
  checks,
  economicRules,
  lineViews,
  materialUsage,
  materials,
  onAutoSave,
  onMaterialUsageChange,
  onMaterialsChange,
  onPrimary,
  summary,
  previousSalLines,
  compareLines,
  onToggleCompare,
}: {
  checks: ReturnType<typeof buildVerificationChecks>;
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  materialUsage: Record<string, number>;
  materials: DesktopMaterial[];
  onAutoSave: () => void;
  onMaterialUsageChange: (usage: Record<string, number>) => void;
  onMaterialsChange: (mats: DesktopMaterial[]) => void;
  onPrimary: () => void;
  summary: SalEconomicSummary;
  previousSalLines: SalLineView[];
  compareLines: SalLineView[] | null;
  onToggleCompare: () => void;
}) {
  const [materialsLoadEpoch, setMaterialsLoadEpoch] = useState(0);
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialExpanded, setMaterialExpanded] = useState(false);
  const onMaterialsChangeRef = useRef(onMaterialsChange);
  onMaterialsChangeRef.current = onMaterialsChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: materialsLoadEpoch triggers re-fetch on DATA_CHANGED_EVENT
  useEffect(() => {
    setIsSearchingMaterials(true);
    import("@/lib/desktopData").then(({ listDesktopMaterials }) =>
      listDesktopMaterials([]).then((res) => {
        onMaterialsChangeRef.current(res.data);
        setIsSearchingMaterials(false);
      }),
    );
  }, [materialsLoadEpoch]);

  useEffect(() => {
    const handleChange = () => setMaterialsLoadEpoch((e) => e + 1);
    window.addEventListener(DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleChange);
  }, []);

  const filteredMaterials = useMemo(() => {
    if (!materialSearch.trim()) return materials;
    const q = materialSearch.toLowerCase();
    return materials.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q),
    );
  }, [materials, materialSearch]);

  const displayMaterials = materialExpanded ? filteredMaterials : filteredMaterials.slice(0, 5);
  const hasMoreMaterials = filteredMaterials.length > 5;

  const usageCount = Object.values(materialUsage).filter((q) => q > 0).length;
  const usageTotalQty = Object.values(materialUsage).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {/* Checks + compare button */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/50">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {checks.map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-11px font-medium ${c.tone === "success" ? "bg-[var(--success-soft)] text-[var(--success-base)]" : c.tone === "warning" ? "bg-[var(--warning-soft)] text-[var(--warning-base)]" : "bg-[var(--danger-soft)] text-[var(--danger-base)]"}`}
              title={c.detail}
            >
              {c.result}
            </span>
          ))}
        </div>
        {previousSalLines.length > 0 && (
          <m.button
            className={cn(
              "shrink-0 inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-12px font-semibold ring-1 transition-colors",
              compareLines
                ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] ring-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/20"
                : "bg-[var(--accent-primary)] text-[var(--text-inverse)] ring-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 shadow-sm",
            )}
            onClick={onToggleCompare}
            type="button"
          >
            <ArrowRight className={cn("size-3.5", compareLines && "rotate-180")} />
            {compareLines ? "Nascondi confronto" : "Confronta con SAL precedente"}
          </m.button>
        )}
      </div>

      {compareLines && <SalComparisonView before={previousSalLines} after={lineViews} />}

      {/* ── Materiali in cantiere ── */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base)_90%)] text-[var(--accent-primary)]">
              <Package className="size-4" />
            </span>
            <div>
              <div className="text-11px font-semibold text-[var(--text-primary)]">
                Materiali in cantiere
              </div>
              {usageCount > 0 && (
                <div className="text-10px text-[var(--text-secondary)]">
                  {usageCount} material{usageCount !== 1 ? "i" : "e"} ·{" "}
                  {usageTotalQty.toLocaleString("it-IT")} unità
                </div>
              )}
            </div>
          </div>
          {isSearchingMaterials && (
            <span className="text-11px text-[var(--text-secondary)]">Caricamento...</span>
          )}
        </div>

        {/* Search */}
        {materials.length > 0 && (
          <div className="border-b border-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)] px-3 py-2">
            <div className="relative">
              <svg
                aria-label="Cerca"
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
                fill="none"
                role="img"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="h-8 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-8 pr-3 text-12px outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                onChange={(e) => {
                  setMaterialSearch(e.target.value);
                  setMaterialExpanded(true);
                }}
                placeholder="Cerca codice, descrizione o categoria..."
                value={materialSearch}
              />
            </div>
          </div>
        )}

        {materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Package className="mb-2 size-8 text-[var(--text-tertiary)]" />
            <p className="text-13px font-semibold text-[var(--text-primary)]">
              {isSearchingMaterials ? "Caricamento materiali..." : "Nessun materiale disponibile"}
            </p>
            {!isSearchingMaterials && (
              <p className="mt-1 max-w-xs text-11px text-[var(--text-secondary)]">
                I materiali presenti a magazzino appaiono qui per tracciare il consumo in cantiere.
              </p>
            )}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="px-4 py-6 text-center text-12px text-[var(--text-tertiary)]">
            Nessun materiale corrisponde alla ricerca.
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {displayMaterials.map((mat) => {
              const available = mat.quantity ?? 0;
              const minQ = mat.minQuantity ?? 0;
              const used = materialUsage[mat.id] ?? 0;
              const remaining = Math.max(0, available - used);
              const exceedsAvailable = used > available;
              const barCoverage =
                available > 0 ? Math.min(100, Math.round((remaining / available) * 100)) : 0;
              const stockTone =
                minQ > 0
                  ? remaining < minQ
                    ? "danger"
                    : remaining <= minQ * 1.5
                      ? "warning"
                      : "success"
                  : "success";
              return (
                <div
                  key={mat.id}
                  className="flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)] px-4 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-12px font-semibold text-[var(--text-primary)]">
                        {mat.description}
                      </span>
                      <span className="shrink-0 text-10px text-[var(--text-tertiary)]">
                        {mat.code}
                      </span>
                      {exceedsAvailable && (
                        <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--danger-base)]">
                          Eccesso
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-10px text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border-subtle)] sm:w-20">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              stockTone === "danger" && "bg-[var(--danger-base)]",
                              stockTone === "warning" && "bg-[var(--warning-base)]",
                              stockTone === "success" && "bg-[var(--success-base)]",
                            )}
                            style={{ width: `${barCoverage}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "w-7 text-right font-bold tabular-nums",
                            stockTone === "danger" && "text-[var(--danger-base)]",
                            stockTone === "warning" && "text-[var(--warning-base)]",
                            stockTone === "success" && "text-[var(--success-base)]",
                          )}
                        >
                          {barCoverage}%
                        </span>
                      </div>
                      <span>{mat.category}</span>
                      <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                      <span>
                        disp.{" "}
                        <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                          {available.toLocaleString("it-IT")}
                        </span>{" "}
                        {mat.unit}
                      </span>
                      {minQ > 0 && (
                        <>
                          <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                          <span>
                            soglia{" "}
                            <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                              {minQ.toLocaleString("it-IT")}
                            </span>
                          </span>
                        </>
                      )}
                      {used > 0 && (
                        <>
                          <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                          <span>
                            usati{" "}
                            <span className="font-semibold tabular-nums text-[var(--accent-primary)]">
                              {used.toLocaleString("it-IT")}
                            </span>
                          </span>
                          <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                          <span>
                            restano{" "}
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                remaining < minQ
                                  ? "text-[var(--danger-base)]"
                                  : remaining <= minQ * 1.5
                                    ? "text-[var(--warning-base)]"
                                    : "text-[var(--success-base)]",
                              )}
                            >
                              {remaining.toLocaleString("it-IT")}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="flex items-center overflow-hidden rounded-md border border-[var(--border-subtle)]">
                      <button
                        className="flex size-7 items-center justify-center text-13px text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                        disabled={used <= 0}
                        onClick={() =>
                          onMaterialUsageChange({
                            ...materialUsage,
                            [mat.id]: Math.max(0, used - 1),
                          })
                        }
                        type="button"
                      >
                        −
                      </button>
                      <input
                        className="h-7 w-14 border-x border-[var(--border-subtle)] bg-[var(--surface-base)] px-1 text-center text-11px font-semibold tabular-nums outline-none transition focus:bg-[var(--bg-muted)]"
                        min={0}
                        onBlur={onAutoSave}
                        onChange={(e) => {
                          const qty = Math.max(
                            0,
                            Number.parseFloat(e.target.value.replace(",", ".")) || 0,
                          );
                          onMaterialUsageChange({ ...materialUsage, [mat.id]: qty });
                        }}
                        placeholder="0"
                        type="text"
                        inputMode="decimal"
                        value={used || ""}
                      />
                      <button
                        className="flex size-7 items-center justify-center text-13px text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                        onClick={() =>
                          onMaterialUsageChange({ ...materialUsage, [mat.id]: used + 1 })
                        }
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expand / collapse toggle */}
        {hasMoreMaterials && (
          <button
            className="flex w-full items-center justify-center gap-1 border-t border-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)] px-4 py-2 text-11px font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-muted)]/30"
            onClick={() => setMaterialExpanded((o) => !o)}
            type="button"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", materialExpanded && "rotate-180")}
            />
            {materialExpanded
              ? "Mostra meno"
              : `Mostra tutti (${filteredMaterials.length} materiali)`}
          </button>
        )}

        {/* Summary footer */}
        {usageCount > 0 && (
          <div className="flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_2%,var(--surface-base)_98%)] px-4 py-2 text-11px text-[var(--text-secondary)]">
            <span>
              <span className="font-semibold text-[var(--text-primary)]">{usageCount}</span>{" "}
              material{usageCount !== 1 ? "i" : "e"} con consumo
            </span>
            <span>
              Totale{" "}
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {usageTotalQty.toLocaleString("it-IT")}
              </span>{" "}
              unità
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <SalCostRecap
          economicRules={economicRules}
          lineViews={lineViews}
          summary={summary}
          showBudget
        />
        <div className="overflow-hidden rounded-lg bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/60">
          <div className="flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-5 py-4">
            <div>
              <div className="text-10px font-medium uppercase tracking-overline text-[var(--text-secondary)]">
                Anteprima verifica
              </div>
              <div className="mt-1 text-13px font-medium text-[var(--text-primary)]">
                Libretto con ribasso evidenziato
              </div>
            </div>
            <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-10px font-semibold text-[var(--success-base)]">
              Netto calcolato
            </span>
          </div>
          <div className="p-4">
            <DocumentPreview compact lines={lineViews} summary={summary} />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <m.button
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 text-13px font-semibold text-[var(--text-inverse)] shadow-sm transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          Continua <ArrowRight className="size-4" />
        </m.button>
      </div>
    </div>
  );
}

/* ── Confirm ── */
function ConfirmStep({
  economicRules,
  lineViews,
  materialUsage,
  onPrimary,
  summary,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  materialUsage: Record<string, number>;
  onPrimary: () => void;
  summary: SalEconomicSummary;
}) {
  const usageCount = Object.values(materialUsage).filter((q) => q > 0).length;
  const usageTotalQty = Object.values(materialUsage).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3">
      <FeedbackBanner
        message="La verifica è completata. La documentazione è pronta per la conferma."
        title="Pronta per conferma"
        tone="success"
      />
      {usageCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
          <Package className="size-4 text-[var(--text-secondary)]" />
          <span className="text-13px font-medium text-[var(--text-primary)]">
            {usageCount} material{usageCount !== 1 ? "i" : "e"} tracciat
            {usageCount !== 1 ? "i" : "o"}
          </span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="text-12px text-[var(--text-secondary)]">
            {usageTotalQty.toLocaleString("it-IT")} unità totali
          </span>
        </div>
      ) : null}
      <div className="responsive-grid-elastic gap-3">
        <div className="rounded-lg bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-10px font-semibold uppercase tracking-caption text-[var(--text-secondary)]">
            Totale SAL
          </div>
          <div className="mt-1 text-26px font-bold text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-10px font-semibold uppercase tracking-caption text-[var(--text-secondary)]">
            Budget residuo
          </div>
          <div
            className={cn(
              "mt-1 text-26px font-bold",
              summary.budgetResidual < 0
                ? "text-[var(--danger-base)]"
                : "text-[var(--success-base)]",
            )}
          >
            <Currency value={summary.budgetResidual} />
          </div>
          <div className="mt-0.5 text-11px text-[var(--text-secondary)]">
            Impegnato <Currency value={summary.previousProgressiveAmount} />
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-10px font-semibold uppercase tracking-caption text-[var(--text-secondary)]">
            Voci / quantità
          </div>
          <div className="mt-1 text-26px font-bold text-[var(--info-base)]">
            {summary.voiceCount}
          </div>
          <div className="mt-0.5 text-11px text-[var(--text-secondary)]">
            Importo lordo <Currency value={summary.grossAmount} />
          </div>
        </div>
      </div>
      <SalCostRecap
        economicRules={economicRules}
        lineViews={lineViews}
        summary={summary}
        showBudget
      />
      <div
        className="responsive-grid-elastic gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}
      >
        <OutputRow
          disabled
          icon={<FileText className="size-4 text-[var(--danger-base)]" />}
          label="PDF libretto"
        />
        <OutputRow
          disabled
          icon={<FileSpreadsheet className="size-4 text-[var(--success-base)]" />}
          label="Excel dettaglio"
        />
        <OutputRow
          disabled
          icon={<Printer className="size-4 text-[var(--info-base)]" />}
          label="Stampa contabilità"
        />
      </div>
      <div className="flex justify-end">
        <m.button
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 text-13px font-semibold text-[var(--text-inverse)] shadow-sm transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          <CheckCircle2 className="size-4" />
          Conferma SAL
        </m.button>
      </div>
    </div>
  );
}

/* ── Completed ── */
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
    <div className="space-y-4">
      <FeedbackBanner
        message={`${createdSalTitle} confermata con successo.`}
        title="Operazione completata"
        tone="success"
      />
      <div className="responsive-grid-elastic gap-3">
        <StepMetric accent label="Totale SAL" value={<Currency value={summary.total} />} />
        <StepMetric
          accent={summary.budgetResidual >= 0}
          danger={summary.budgetResidual < 0}
          label="Budget residuo"
          value={<Currency value={summary.budgetResidual} />}
        />
        <StepMetric label="Stato" value="Confermata" />
      </div>
      <div className="flex justify-end gap-2">
        <m.button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-12px font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
          onClick={onClose}
          type="button"
        >
          Chiudi
        </m.button>
        <m.button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 text-12px font-bold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onNew}
          type="button"
        >
          Nuova revisione
        </m.button>
      </div>
    </div>
  );
}

/* ── Shared ── */

function SalBudgetLive({ summary }: { summary: SalEconomicSummary }) {
  const contractAmount = useMemo(
    () => summary.budgetResidual + summary.previousProgressiveAmount + summary.total,
    [summary],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]">
      <div className="border-b border-[var(--border-subtle)]/60 bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)] px-4 py-2.5">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Budget disponibile in tempo reale
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)]/40 md:grid-cols-4">
        <LiveMetric label="Budget contratto" value={contractAmount} isActive={false} />
        <LiveMetric
          label="Già impegnato"
          value={summary.previousProgressiveAmount}
          isActive={false}
        />
        <LiveMetric label="In corso" value={summary.total} isActive />
        <LiveMetric
          label="Residuo"
          value={summary.budgetResidual}
          isActive={false}
          danger={summary.budgetResidual < 0}
        />
      </div>
    </div>
  );
}

function LiveMetric({
  label,
  value,
  isActive,
  danger,
}: {
  label: string;
  value: number;
  isActive?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center px-4 py-3",
        isActive && "bg-[color-mix(in_srgb,var(--accent-primary)_5%,var(--surface-base)_95%)]",
      )}
    >
      <div className="text-10px font-medium text-[var(--text-secondary)]">{label}</div>
      <m.span
        key={Math.round(value * 100)}
        initial={{ opacity: 0.3, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "mt-0.5 inline-block text-15px font-black tabular-nums transition-colors duration-500",
          danger
            ? "text-[var(--danger-base)]"
            : isActive
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-primary)]",
        )}
      >
        <Currency value={value} />
      </m.span>
    </div>
  );
}

function SalCostRecap({
  economicRules,
  lineViews,
  summary,
  showBudget = true,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  summary: SalEconomicSummary;
  showBudget?: boolean;
}) {
  const categories = useMemo(() => {
    const catMap = new Map<
      string,
      { gross: number; net: number; count: number; hasSafety: boolean }
    >();
    for (const line of lineViews) {
      const cat = line.voice.category || "Altro";
      const existing = catMap.get(cat) ?? {
        gross: 0,
        net: 0,
        count: 0,
        hasSafety: false,
      };
      existing.gross += line.grossAmount;
      existing.net += line.totalAmount;
      existing.count += 1;
      existing.hasSafety = existing.hasSafety || line.voice.isSafetyCost;
      catMap.set(cat, existing);
    }
    return [...catMap.entries()].filter(([_, v]) => v.gross > 0);
  }, [lineViews]);

  const safetyCategories = useMemo(() => {
    return categories.filter(([_, v]) => v.hasSafety);
  }, [categories]);

  const regularCategories = useMemo(() => {
    return categories.filter(([_, v]) => !v.hasSafety);
  }, [categories]);

  const mgEntries = useMemo(
    () => lineViews.flatMap((line) => line.linkedCharges.filter((c) => c.code.startsWith("MG."))),
    [lineViews],
  );

  const totalMgAmount = useMemo(
    () => mgEntries.reduce((sum, entry) => sum + entry.total, 0),
    [mgEntries],
  );

  const hasMg = mgEntries.length > 0;
  const hasDiscount = summary.discountAmount > 0;
  const hasSurcharges = summary.linkedChargeAmount > 0;

  const contractAmount = useMemo(
    () => summary.budgetResidual + summary.previousProgressiveAmount + summary.total,
    [summary],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)] px-5 py-3.5">
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Riepilogo costi
          </div>
          <div className="mt-0.5 text-11px font-medium text-[var(--text-secondary)]">
            {summary.voiceCount} voci ·{" "}
            {categories.reduce((s, [_, v]) => s + v.count, 0) === summary.voiceCount
              ? categories.length === 1
                ? "1 categoria"
                : `${categories.length} categorie`
              : "importi raggruppati"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Totale netto
          </div>
          <div className="mt-0.5 text-17px font-black text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]">
        {/* Category breakdown */}
        {regularCategories.length > 0 && (
          <div className="px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Importo lordo per categoria
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              {regularCategories.map(([cat, data], idx) => (
                <CategoryRow
                  key={cat}
                  category={cat}
                  count={data.count}
                  amount={data.gross}
                  withSeparator={idx < regularCategories.length - 1 || safetyCategories.length > 0}
                />
              ))}
              {safetyCategories.length > 0 && (
                <>
                  {regularCategories.length > 0 && (
                    <div className="h-0 border-t border-dashed border-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)]" />
                  )}
                  {safetyCategories.map(([cat, data], idx) => (
                    <CategoryRow
                      key={cat}
                      category={cat}
                      count={data.count}
                      amount={data.gross}
                      isSafety
                      withSeparator={idx < safetyCategories.length - 1}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* MG Surcharges */}
        {hasMg && (
          <div className="px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Maggiorazioni MG
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              {mgEntries.map((entry) => {
                const tariffPrefix = entry.code.replace("MG.", "");
                const label =
                  tariffPrefix === "ALL"
                    ? `MG ${entry.percent.toLocaleString("it-IT")}% su tutte le voci`
                    : `MG ${entry.percent.toLocaleString("it-IT")}% su voci ${tariffPrefix}`;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-1.5 text-12px"
                  >
                    <span className="min-w-0 truncate text-[var(--text-primary)]">{label}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-[var(--info-base)]">
                      +<Currency value={entry.total} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Discount */}
        {hasDiscount && (
          <div className="px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Ribasso gara ({economicRules.discountPercent.toLocaleString("it-IT")}%)
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              <div className="flex items-center justify-between py-1.5 text-12px">
                <span className="text-[var(--text-primary)]">
                  Su importo ribassabile{" "}
                  <span className="text-[var(--text-tertiary)]">
                    ({summary.discountedVoiceCount} voci)
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  <Currency value={summary.discountableAmount} />
                </span>
              </div>
              {summary.excludedSafetyVoiceCount > 0 && (
                <div className="flex items-center justify-between py-1.5 text-11px text-[var(--text-secondary)]">
                  <span>
                    OS esclus{summary.excludedSafetyVoiceCount !== 1 ? "i" : "a"} (
                    {summary.excludedSafetyVoiceCount} voci)
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--danger-base)]">
                    -<Currency value={summary.discountAmount} />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equation */}
        <div className="bg-[color-mix(in_srgb,var(--accent-primary)_3%,var(--surface-base)_97%)] px-5 py-3.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-12px text-[var(--text-secondary)]">
              <span>Voci lordo</span>
              <span className="tabular-nums">
                <Currency value={summary.grossAmount} />
              </span>
            </div>
            {totalMgAmount > 0 && (
              <div className="flex items-center justify-between text-12px text-[var(--info-base)]">
                <span>+ Maggiorazioni MG distribuite</span>
                <span className="tabular-nums">
                  +<Currency value={totalMgAmount} />
                </span>
              </div>
            )}
            {hasSurcharges && (
              <div className="flex items-center justify-between text-12px text-[var(--info-base)]">
                <span>+ Maggiorazioni su manodopera</span>
                <span className="tabular-nums">
                  +<Currency value={summary.linkedChargeAmount} />
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)] pt-2 text-13px font-bold text-[var(--accent-primary)]">
            <span>= Totale con maggiorazioni</span>
            <span className="tabular-nums">
              <Currency value={summary.grossAmount + totalMgAmount + summary.linkedChargeAmount} />
            </span>
          </div>
          {hasDiscount && (
            <div className="mt-1 flex items-center justify-between text-12px text-[var(--danger-base)]">
              <span>- Ribasso gara ({economicRules.discountPercent.toLocaleString("it-IT")}%)</span>
              <span className="tabular-nums">
                -<Currency value={summary.discountAmount} />
              </span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)] pt-2.5 text-14px font-black text-[var(--accent-primary)]">
            <span>= Totale netto SAL</span>
            <span className="tabular-nums">
              <Currency value={summary.total} />
            </span>
          </div>
        </div>

        {/* Safety footnote */}
        {summary.safetyAmount > 0 && (
          <div className="flex items-center gap-2 border-t border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] px-5 py-2.5 text-11px text-[var(--text-secondary)]">
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--danger-base)]" />
            di cui oneri sicurezza (OS):{" "}
            <span className="font-semibold tabular-nums text-[var(--danger-base)]">
              <Currency value={summary.safetyAmount} />
            </span>
          </div>
        )}

        {/* Budget context */}
        {showBudget && (
          <div className="border-t border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[var(--bg-muted)]/20 px-5 py-3.5">
            <div className="mb-2.5 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Budget contratto
            </div>
            <div className="space-y-0 divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
              <div className="flex items-center justify-between py-1.5 text-12px text-[var(--text-primary)]">
                <span>Importo contratto</span>
                <span className="font-semibold tabular-nums">
                  <Currency value={contractAmount} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-12px text-[var(--text-secondary)]">
                <span>Già impegnato (SAL precedenti)</span>
                <span className="tabular-nums">
                  <Currency value={summary.previousProgressiveAmount} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-12px text-[var(--accent-primary)]">
                <span>Questo SAL</span>
                <span className="tabular-nums">
                  <Currency value={summary.total} />
                </span>
              </div>
              <div className="border-t border-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] pt-1.5">
                <div className="flex items-center justify-between py-1 text-13px font-bold">
                  <span
                    className={
                      summary.budgetResidual >= 0
                        ? "text-[var(--success-base)]"
                        : "text-[var(--danger-base)]"
                    }
                  >
                    Residuo disponibile
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      summary.budgetResidual >= 0
                        ? "text-[var(--success-base)]"
                        : "text-[var(--danger-base)]",
                    )}
                  >
                    <Currency value={summary.budgetResidual} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  count,
  amount,
  isSafety,
  withSeparator,
}: {
  category: string;
  count: number;
  amount: number;
  isSafety?: boolean;
  withSeparator?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-1.5 text-12px",
        withSeparator &&
          "border-b border-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "truncate",
            isSafety ? "font-medium text-[var(--danger-base)]" : "text-[var(--text-primary)]",
          )}
        >
          {category}
        </span>
        {isSafety && (
          <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--danger-base)]">
            OS
          </span>
        )}
        <span className="shrink-0 text-10px text-[var(--text-tertiary)]">{count} voci</span>
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-[var(--text-primary)]">
        <Currency value={amount} />
      </span>
    </div>
  );
}

function EconomicEquation({
  className,
  summary,
}: {
  className?: string;
  summary: SalEconomicSummary;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-[var(--border-subtle)]/50 rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="text-12px font-medium text-[var(--text-secondary)]">
          Totale voci lordo
        </span>
        <span className="text-13px font-semibold text-[var(--text-primary)]">
          <Currency value={summary.grossAmount} />
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-12px font-medium text-[var(--danger-base)]">
          <span className="flex size-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger-base)_14%,var(--surface-base)_86%)] text-9px font-bold">
            −
          </span>
          Sconto
        </span>
        <span className="text-13px font-semibold text-[var(--danger-base)]">
          −<Currency value={summary.discountAmount} />
        </span>
      </div>
      {summary.linkedChargeAmount > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-12px font-medium text-[var(--info-base)]">
            <span className="flex size-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--info-base)_14%,var(--surface-base)_86%)] text-9px font-bold">
              +
            </span>
            Maggiorazioni
          </span>
          <span className="text-13px font-semibold text-[var(--info-base)]">
            +<Currency value={summary.linkedChargeAmount} />
          </span>
        </div>
      ) : null}
      {summary.safetyAmount > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-12px font-medium text-[var(--text-secondary)]">di cui voci OS</span>
          <span className="text-12px font-medium text-[var(--text-secondary)]">
            <Currency value={summary.safetyAmount} />
          </span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-b-xl bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--surface-base)_94%)] px-4 py-3">
        <span className="text-13px font-bold text-[var(--accent-primary)]">
          = Totale attuale SAL
        </span>
        <span className="text-16px font-black text-[var(--accent-primary)]">
          <Currency value={summary.total} />
        </span>
      </div>
    </div>
  );
}

function StepMetric({
  accent,
  danger,
  label,
  value,
}: {
  accent?: boolean;
  danger?: boolean;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
      <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-22px font-bold",
          danger && "text-[var(--danger-base)]",
          accent && !danger && "text-[var(--accent-primary)]",
          !accent && !danger && "text-[var(--info-base)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FeedbackBanner({
  message,
  title,
  tone,
}: {
  message: string;
  title: string;
  tone: "danger" | "info" | "success";
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${tone === "danger" ? "border-[var(--danger-base)]/25 bg-[var(--danger-soft)] text-[var(--danger-base)]" : tone === "success" ? "border-[var(--success-base)]/25 bg-[var(--success-soft)] text-[var(--success-base)]" : "border-[var(--info-base)]/25 bg-[var(--info-soft)] text-[var(--info-base)]"}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-current/10">
          {tone === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Calculator className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="text-13px font-semibold">{title}</div>
          <div className="mt-0.5 text-12px opacity-80">{message}</div>
        </div>
      </div>
    </div>
  );
}
