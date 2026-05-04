import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Save,
  Wallet,
} from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { useToast } from "@/components/shared/ToastProvider";
import { useNavigate } from "@/hooks/useNavigate";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import type { SalTemplate } from "@/store/template-store";
import { SalComparisonView } from "./components/SalComparisonView";
import {
  AccountingRows,
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
  buildSalDocumentView,
  type SalDocument,
  type SalSurchargeKind,
} from "./domain/sal-workflow";
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
const DRAFT_STORAGE_KEY = "quantara.salCreationDraft.v1";
const CREATED_FLAG_KEY = "quantara.salCreated.v1";

type SalCreationDraft = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  phase: SalWorkflowPhase;
  projectId: string;
  salTitle: string;
  selectedTariffBookIds: string[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveDraft(projectId: string, data: Omit<SalCreationDraft, "projectId">) {
  try {
    const existing: Record<string, Omit<SalCreationDraft, "projectId">> = JSON.parse(
      localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}",
    );
    existing[projectId] = data;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    /* no-op */
  }
}

function saveDraftBySalId(salId: string, data: Omit<SalCreationDraft, "projectId">) {
  saveDraft(`sal:${salId}`, data);
}

function loadDraft(projectId: string): Omit<SalCreationDraft, "projectId"> | null {
  try {
    const all: Record<string, Omit<SalCreationDraft, "projectId">> = JSON.parse(
      localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}",
    );
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

function loadDraftBySalId(salId: string): Omit<SalCreationDraft, "projectId"> | null {
  return loadDraft(`sal:${salId}`);
}

function clearDraft(projectId: string) {
  try {
    const all: Record<string, Omit<SalCreationDraft, "projectId">> = JSON.parse(
      localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}",
    );
    delete all[projectId];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* no-op */
  }
}

function clearDraftBySalId(salId: string) {
  clearDraft(`sal:${salId}`);
}

function lineDraftsFromStoredSal(
  sal: SalDocument,
  voices: readonly SalVoiceDraft[],
): SalLineDraft[] {
  const voiceById = new Map(voices.map((voice) => [voice.id, voice]));

  return sal.lines.flatMap((line) => {
    const voice = voiceById.get(line.voiceId);
    if (!voice) return [];

    return [
      {
        id: line.id,
        factor1: line.quantity,
        factor2: 1,
        factor3: 1,
        notes: "",
        quantity: line.quantity,
        surchargePercent: line.surcharge === "night" ? 20 : line.surcharge === "day" ? 10 : 0,
        voice,
      },
    ];
  });
}

function surchargeKindFromPercent(percent: number): SalSurchargeKind {
  return percent >= 20 ? "night" : percent > 0 ? "day" : "none";
}

export function SalCreationScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const data = useSalCreationData();
  const createSalProjectWithId = useSalWorkflowStore((state) => state.createProjectWithId);
  const createClosedSal = useSalWorkflowStore((state) => state.createClosedSal);
  const closeSal = useSalWorkflowStore((state) => state.closeSal);
  const updateSalDraft = useSalWorkflowStore((state) => state.updateSalDraft);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const [phase, setPhase] = useState<SalWorkflowPhase>("context");
  const [editingDraftSalId, setEditingDraftSalId] = useState<string | null>(null);

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
    const draft = loadDraftBySalId(resumeSalId) ?? loadDraft(project.id);

    if (!draft && draftSal && draftSal.lines.length > 0 && data.voices.length === 0) {
      return;
    }

    sessionStorage.removeItem("quantara.salResumeDraft.v1");

    if (draft) {
      setEditingDraftSalId(resumeSalId);
      setLines(draft.lines);
      setEconomicRules(draft.economicRules);
      setSalTitle(draft.salTitle || draftSal?.title || project.salTitle);
      setPhase(draft.phase);
      return;
    }

    if (draftSal) {
      setEditingDraftSalId(resumeSalId);
      setLines(lineDraftsFromStoredSal(draftSal, data.voices));
      setSalTitle(draftSal.title || project.salTitle);
      setPhase(draftSal.lines.length > 0 ? "voices" : "context");
    }
  }, [data.project, data.voices, salDocuments]);

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
  }, []);

  useEffect(() => {
    const stepIndex = PHASE_ORDER.indexOf(phase);
    useAppStore.getState().setSalCurrentStep(stepIndex < 4 ? stepIndex + 1 : 4);
  }, [phase]);

  const [lines, setLines] = useState<SalLineDraft[]>([]);
  const [economicRules, setEconomicRules] = useState<SalEconomicRules>(defaultSalEconomicRules);
  const [createdSalTitle, setCreatedSalTitle] = useState("SAL 01 - Periodo corrente");
  const [salTitle, setSalTitle] = useState("");
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
  }, [data.project]);

  const previousProgressiveAmount = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) return 0;
    return salDocuments
      .filter((sal) => sal.projectId === projectId && sal.status === "closed")
      .reduce((sum, sal) => sum + buildSalDocumentView(sal, tariffVoices).total, 0);
  }, [data.project?.id, salDocuments, tariffVoices]);

  const derived = useMemo(() => {
    const contractAmount = data.project?.contractAmount ?? 0;
    const lv = buildLineViews(lines, economicRules);
    const s = summarizeSalLines(lv, contractAmount, previousProgressiveAmount);
    const c = buildVerificationChecks(lv, s, economicRules);
    return { checks: c, lineViews: lv, summary: s };
  }, [data.project?.contractAmount, economicRules, lines, previousProgressiveAmount]);

  const { checks, lineViews, summary } = derived;
  const hasDangerChecks = checks.some((check) => check.tone === "danger");

  const previousSalLines = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId || voicesMap.size === 0) return [];
    // Latest closed SAL for this project
    const closed = [...salDocuments]
      .filter((s) => s.projectId === projectId && s.status === "closed")
      .sort((a, b) => (b.closedAt ?? b.date).localeCompare(a.closedAt ?? a.date));
    if (closed.length === 0) return [];
    const latest = closed[0];
    if (!latest) return [];
    return buildLineViews(
      latest.lines
        .map((l) => {
          const voice = voicesMap.get(l.voiceId);
          if (!voice) return null;
          return {
            id: l.id,
            factor1: l.quantity,
            factor2: 1,
            factor3: 1,
            notes: "",
            quantity: l.quantity,
            surchargePercent: l.surcharge === "night" ? 25 : l.surcharge === "day" ? 10 : 0,
            voice,
          } as SalLineDraft;
        })
        .filter((l): l is SalLineDraft => l !== null),
      defaultSalEconomicRules,
    );
  }, [data.project?.id, voicesMap, salDocuments]);

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
    [lines, notify],
  );

  const setSurcharge = useCallback((voiceId: string, pct: number) => {
    setLines((current) =>
      current.map((l) => (l.voice.id === voiceId ? { ...l, surchargePercent: pct } : l)),
    );
  }, []);

  const setFactor = useCallback(
    (voiceId: string, field: "factor1" | "factor2" | "factor3", value: number) => {
      setLines((current) =>
        current.map((l) =>
          l.voice.id === voiceId
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
    [],
  );

  const removeLine = useCallback(
    (voiceId: string) => {
      const line = lines.find((l) => l.voice.id === voiceId);
      setLines((current) => current.filter((l) => l.voice.id !== voiceId));
      if (line)
        notify({
          message: `${line.voice.code} eliminata dalla bozza.`,
          title: "Voce rimossa",
          tone: "warning",
        });
    },
    [lines, notify],
  );

  const handleApplyTemplate = useCallback(
    (template: SalTemplate) => {
      const newLines: SalLineDraft[] = template.voiceEntries
        .map((entry) => {
          const voice = voicesMap.get(entry.voiceId);
          if (!voice) return null;
          return {
            id: `draft-${entry.voiceId}`,
            factor1: entry.factor1,
            factor2: entry.factor2,
            factor3: entry.factor3,
            notes: "",
            quantity: entry.factor1 * entry.factor2 * entry.factor3,
            surchargePercent: entry.surchargePercent,
            voice,
          };
        })
        .filter((l): l is SalLineDraft => l !== null);

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
    [voicesMap, notify],
  );

  function goPrimary() {
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

    createSalProjectWithId({
      client: data.project.contractor,
      description: `${data.project.frameworkAgreementCode} - ${data.project.applicationContractCode}`,
      id: data.project.id,
      name: data.project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });

    const finalSalPayload = {
      date: data.project.periodEnd,
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
      voices: lineViews.map((l) => ({
        category: l.voice.category,
        code: l.voice.code,
        description: l.voice.description,
        id: l.voice.id,
        projectYear: l.voice.tariffYear,
        unit: l.voice.unit,
        unitPrice: l.voice.unitPrice,
      })),
    };

    if (editingDraftSalId) {
      updateSalDraft({ ...finalSalPayload, id: editingDraftSalId });
      closeSal(editingDraftSalId);
    } else {
      createClosedSal(finalSalPayload);
    }

    setCreatedSalTitle(salTitle.trim() || data.project.salTitle);
    clearDraft(data.project.id);
    if (editingDraftSalId) {
      clearDraftBySalId(editingDraftSalId);
    }
    sessionStorage.setItem(CREATED_FLAG_KEY, "1");
    setPhase("completed");
    notify({
      message: `${salTitle.trim() || data.project.salTitle} confermata.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

  const handleSaveDraft = useCallback(() => {
    const project = data.project;
    const pid = project?.id;
    if (!project || !pid) return;
    saveDraft(pid, {
      economicRules,
      lines,
      phase,
      salTitle,
      selectedTariffBookIds: data.selectedTariffBooks.map((b: SalTariffBookOption) => b.id),
    });
    // Also persist a draft SAL in the store so it appears in the project
    createSalProjectWithId({
      client: project.contractor,
      description: `${project.frameworkAgreementCode} - ${project.applicationContractCode}`,
      id: pid,
      name: project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });
    const draftPayload = {
      date: project.periodEnd,
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
      voices: lineViews.map((l) => ({
        category: l.voice.category,
        code: l.voice.code,
        description: l.voice.description,
        id: l.voice.id,
        projectYear: l.voice.tariffYear,
        unit: l.voice.unit,
        unitPrice: l.voice.unitPrice,
      })),
    };
    const draftSal = editingDraftSalId
      ? updateSalDraft({ ...draftPayload, id: editingDraftSalId })
      : createClosedSal(draftPayload);
    const draftSalId = draftSal?.id ?? editingDraftSalId;
    if (draftSalId) {
      setEditingDraftSalId(draftSalId);
      saveDraftBySalId(draftSalId, {
        economicRules,
        lines,
        phase,
        salTitle: salTitle.trim() || project.salTitle,
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
    phase,
    salTitle,
    notify,
    lineViews,
    createSalProjectWithId,
    createClosedSal,
    editingDraftSalId,
    updateSalDraft,
    navigate,
    summary.total,
  ]);

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
          <>
            {data.error ? (
              <FeedbackBanner tone="danger" title="Caricamento fallito" message={data.error} />
            ) : null}
            {phase === "context" ? (
              <SetupStep
                contracts={data.contracts}
                economicRules={economicRules}
                onSaveDraft={handleSaveDraft}
                onSelectContract={data.setContract}
                project={data.project}
                salTitle={salTitle}
                selectedTariffBooks={data.selectedTariffBooks}
                selectedTariffBook={data.selectedTariffBook}
                selectTariffBook={async (id) => {
                  await data.selectTariffBook(id);
                  const book = data.tariffBookOptions.find((b) => b.id === id);
                  if (book)
                    notify({
                      message: `${book.name} (${book.year}) selezionato.`,
                      title: "Tariffario",
                      tone: "success",
                    });
                }}
                setSalTitle={setSalTitle}
                summary={summary}
                tariffBooks={data.tariffBookOptions}
                voicesCount={data.voices.length}
                onPrimary={goPrimary}
              />
            ) : null}
            {phase === "voices" ? (
              <VoicesStep
                economicRules={economicRules}
                lineViews={lineViews}
                lines={lines}
                onFactorChange={setFactor}
                onPrimary={goPrimary}
                onReorder={setLines}
                onRemove={removeLine}
                onSaveDraft={handleSaveDraft}
                onSurcharge={setSurcharge}
                onToggle={upsertLine}
                summary={summary}
                voices={data.voices}
                dataProject={data.project}
                onApplyTemplate={handleApplyTemplate}
                onOpenTemplateDialog={() => setIsTemplateDialogOpen(true)}
                tariffBookId={data.selectedTariffBook?.id ?? ""}
              />
            ) : null}
            {phase === "review" ? (
              <ReviewStep
                checks={checks}
                economicRules={economicRules}
                lineViews={lineViews}
                onPrimary={goPrimary}
                summary={summary}
                previousSalLines={previousSalLines}
                compareLines={compareLines}
                onToggleCompare={() => setCompareLines(compareLines ? null : previousSalLines)}
              />
            ) : null}
            {phase === "confirm" ? (
              <ConfirmStep economicRules={economicRules} onPrimary={goPrimary} summary={summary} />
            ) : null}
          </>
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
  onSaveDraft,
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
  onSaveDraft?: (() => void) | undefined;
  onSelectContract?: ((id: string) => void) | undefined;
}) {
  const [showAll, setShowAll] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  if (!project) {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-12 text-center">
        <Building2 className="mx-auto size-8 text-[var(--text-secondary)]" />
        <p className="mt-3 text-[14px] font-semibold text-[var(--text-primary)]">
          Nessun contratto disponibile
        </p>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Crea o apri un progetto prima di generare una SAL.
        </p>
      </div>
    );
  }

  const showContractSelector = contracts.length > 1 && onSelectContract;

  return (
    <div className="space-y-6 rounded-[20px] bg-[var(--surface-base)]/80 p-4 ring-1 ring-[var(--border-subtle)]/70 md:p-6">
      <div className="rounded-[16px] bg-[var(--surface-base)] px-5 py-5 ring-1 ring-[var(--border-subtle)]/70">
        {showContractSelector ? (
          <div className="relative">
            <button
              className="flex w-full items-center gap-5 text-left"
              onClick={() => setProjectOpen(!projectOpen)}
              type="button"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-[var(--info-soft)] text-[var(--info-base)]">
                <Building2 className="size-7" />
              </span>
              <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0 border-b border-[var(--border-subtle)]/70 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                  <div className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Progetto
                  </div>
                  <div className="mt-1 truncate text-[15px] font-bold text-[var(--text-primary)]">
                    {project.title}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Cliente
                  </div>
                  <div className="mt-1 truncate text-[15px] font-bold text-[var(--text-primary)]">
                    {project.contractor}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[12px] font-bold transition-colors",
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
            </button>
            {projectOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProjectOpen(false)}
                  type="button"
                  aria-label="Chiudi"
                />
                <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[300px] overflow-hidden rounded-[16px] bg-[var(--surface-base)] p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.2)] ring-1 ring-[var(--border-subtle)]">
                  {contracts.map((c) => {
                    const isActive = c.id === project.id;
                    return (
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left transition-all",
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
                            "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                            isActive
                              ? "bg-[var(--accent-primary)] text-white"
                              : "bg-[var(--info-soft)] text-[var(--info-base)]",
                          )}
                        >
                          <Building2 className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                            {c.title}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                            {c.contractor ?? "—"}
                          </div>
                        </div>
                        {isActive && (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white">
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-[var(--info-soft)] text-[var(--info-base)]">
              <Building2 className="size-7" />
            </span>
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 border-b border-[var(--border-subtle)]/70 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                <div className="text-[12px] font-medium text-[var(--text-secondary)]">Progetto</div>
                <div className="mt-1 truncate text-[15px] font-bold text-[var(--text-primary)]">
                  {project.title}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[var(--text-secondary)]">Cliente</div>
                <div className="mt-1 truncate text-[15px] font-bold text-[var(--text-primary)]">
                  {project.contractor}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label
          className="text-[13px] font-semibold text-[var(--text-primary)]"
          htmlFor="sal-title-input"
        >
          Nome SAL
        </label>
        <input
          className="mt-2 h-11 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[14px] font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          id="sal-title-input"
          onChange={(e) => setSalTitle(e.target.value)}
          placeholder={project.salTitle}
          value={salTitle}
        />
      </div>

      <div className="border-t border-[var(--border-subtle)]/70 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
              Tariffari disponibili
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
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
          {tariffBooks.length > 3 ? (
            <button
              className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-[12px] font-semibold text-[var(--info-base)] transition-colors hover:bg-[var(--bg-muted)]"
              onClick={() => setShowAll(!showAll)}
              type="button"
            >
              {showAll ? "Mostra meno" : `Tutti (${tariffBooks.length})`}
            </button>
          ) : null}
        </div>
        {tariffBooks.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
            Nessun tariffario caricato.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {(showAll ? tariffBooks : tariffBooks.slice(0, 3)).map((book) => {
              const isSelected = selectedTariffBooks.some((b) => b.id === book.id);
              return (
                <button
                  className={cn(
                    "relative flex min-h-[148px] items-center gap-5 rounded-[14px] border p-5 text-left transition-all duration-200",
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_18px_40px_-28px_var(--accent-primary)]"
                      : "border-[var(--border-subtle)]/70 bg-[var(--surface-base)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]/40",
                  )}
                  key={book.id}
                  onClick={() => void selectTariffBook(book.id)}
                  type="button"
                >
                  <div
                    className={cn(
                      "relative flex h-[96px] w-[72px] shrink-0 items-center justify-center rounded-[8px] border bg-white text-[10px] font-bold uppercase leading-tight shadow-[0_12px_22px_-18px_rgba(15,23,42,0.45)]",
                      isSelected
                        ? "border-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)]",
                    )}
                  >
                    <span className="absolute left-[-6px] top-2 rounded-[4px] bg-[var(--danger-base)] px-1.5 py-1 text-[9px] font-black text-white">
                      PDF
                    </span>
                    <div className="space-y-1.5 text-slate-300">
                      <div className="h-1 w-9 rounded bg-current" />
                      <div className="h-1 w-7 rounded bg-current" />
                      <div className="h-1 w-10 rounded bg-current" />
                      <div className="mt-4 h-1 w-8 rounded bg-current" />
                      <div className="h-1 w-11 rounded bg-current" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "truncate text-[16px] font-bold leading-tight",
                        isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]",
                      )}
                    >
                      {book.name}
                    </div>
                    <div className="mt-3 text-[13px] text-[var(--text-secondary)]">
                      Anno {book.year}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
                      <span>PDF</span>
                      <span>·</span>
                      <span>{voicesCount} voci</span>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="absolute right-4 top-4 flex size-6 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-primary)] text-white">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="absolute right-4 top-4 size-5 shrink-0 rounded-full border-2 border-[var(--border-subtle)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-subtle)]/70 pt-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[14px] bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--success-soft)] text-[var(--success-base)]">
              <Wallet className="size-5" />
            </span>
            <div className="mt-4 text-[12px] font-medium text-[var(--text-secondary)]">
              Budget totale
            </div>
            <div className="mt-1 text-[18px] font-black text-[var(--text-primary)]">
              <Currency value={project.contractAmount} />
            </div>
          </div>
          <div className="rounded-[14px] bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--success-soft)] text-[var(--success-base)]">
              <Calculator className="size-5" />
            </span>
            <div className="mt-4 text-[12px] font-medium text-[var(--text-secondary)]">
              Residuo stimato
            </div>
            <div className="mt-1 text-[18px] font-black text-[var(--success-base)]">
              <Currency value={summary.budgetResidual} />
            </div>
          </div>
          <div className="rounded-[14px] bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--info-soft)] text-[var(--accent-primary)]">
              <Calculator className="size-5" />
            </span>
            <div className="mt-4 text-[12px] font-medium text-[var(--text-secondary)]">
              Ribasso gara
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[18px] font-black text-[var(--text-primary)]">
                {economicRules.discountPercent.toLocaleString("it-IT")}%
              </span>
              {!economicRules.discountEnabled && (
                <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning-base)]">
                  Disattivato
                </span>
              )}
            </div>
            {economicRules.discountEnabled && (
              <div className="mt-3 text-[12px] font-medium text-[var(--danger-base)]">
                Sconto: -<Currency value={summary.discountAmount} />
              </div>
            )}
            <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
              Dal contratto · non modificabile in SAL
            </div>
          </div>
          <div className="rounded-[14px] bg-[var(--surface-base)] p-5 ring-1 ring-[var(--border-subtle)]/70">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--info-soft)] text-[var(--info-base)]">
              <FileText className="size-5" />
            </span>
            <div className="mt-4 text-[12px] font-medium text-[var(--text-secondary)]">
              Voci disponibili
            </div>
            <div className="mt-1 text-[18px] font-black text-[var(--info-base)]">{voicesCount}</div>
            <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
              nel tariffario selezionato
            </div>
          </div>
        </div>
        <EconomicEquation className="mt-4" summary={summary} />
      </div>

      <div className="flex items-center justify-between">
        {onSaveDraft ? (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
            onClick={onSaveDraft}
            type="button"
          >
            <Save className="size-4" />
            Salva bozza
          </button>
        ) : (
          <div />
        )}
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          Continua <ArrowRight className="size-4" />
        </button>
      </div>
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
  economicRules,
  lineViews,
  lines,
  onFactorChange,
  onPrimary,
  onReorder,
  onRemove,
  onSurcharge,
  onToggle,
  summary,
  voices,
  dataProject,
  onApplyTemplate,
  onOpenTemplateDialog,
  onSaveDraft,
  tariffBookId,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  onFactorChange: (vid: string, f: "factor1" | "factor2" | "factor3", v: number) => void;
  onPrimary: () => void;
  onReorder: (l: SalLineDraft[]) => void;
  onRemove: (vid: string) => void;
  onSurcharge: (vid: string, p: number) => void;
  onToggle: (v: SalVoiceDraft) => void;
  summary: SalEconomicSummary;
  voices: SalVoiceDraft[];
  dataProject: SalProjectContext | null;
  onApplyTemplate: (t: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
  onSaveDraft?: () => void;
  tariffBookId: string;
}) {
  const totalQty = lineViews.reduce((s, l) => s + l.quantity, 0);
  const linked = lineViews.reduce((s, l) => s + l.linkedCharges.length, 0);
  const contractAmount = dataProject?.contractAmount ?? 0;
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
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[12px] bg-[var(--surface-base)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]/60">
        <div className="min-w-0 flex-1">
          <AutocompleteInput
            options={autocompleteOptions}
            onSelect={(o) => {
              const v = voices.find((x) => x.code === o.value);
              if (v) onToggle(v);
            }}
            placeholder={`Cerca voce (${voices.length} disponibili)...`}
          />
        </div>
        <TemplatePicker onApply={onApplyTemplate} tariffBookId={tariffBookId} />
        {lines.length > 0 && (
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 text-[11px] font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            onClick={onOpenTemplateDialog}
            type="button"
          >
            Salva come template
          </button>
        )}
      </div>
      <SelectedVoicesPanel
        lines={lineViews}
        onFactorChange={onFactorChange}
        onRemove={onRemove}
        onReorder={onReorder}
        onSurcharge={onSurcharge}
      />
      {/* Dashboard strip — SAL corrente + Sconto */}
      <div
        className="responsive-grid-elastic gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}
      >
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            SAL corrente
          </div>
          <div className="mt-1 text-[24px] font-bold text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            <Currency value={contractAmount} /> budget
          </div>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Ribasso gara
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-[var(--text-primary)]">
              {economicRules.discountPercent.toLocaleString("it-IT")}%
            </span>
            {!economicRules.discountEnabled && (
              <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning-base)]">
                Disattivato
              </span>
            )}
          </div>
          {economicRules.discountEnabled && (
            <div className="mt-0.5 text-[13px] font-bold text-[var(--danger-base)]">
              -<Currency value={summary.discountAmount} />
            </div>
          )}
        </div>
      </div>
      <EconomicEquation summary={summary} />
      {/* Total + continue */}
      <div className="flex items-center justify-between rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
        {onSaveDraft ? (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
            onClick={onSaveDraft}
            type="button"
          >
            <Save className="size-4" />
            Salva bozza
          </button>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
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
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          Continua <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Review ── */
function ReviewStep({
  checks,
  economicRules,
  lineViews,
  onPrimary,
  summary,
  previousSalLines,
  compareLines,
  onToggleCompare,
}: {
  checks: ReturnType<typeof buildVerificationChecks>;
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  onPrimary: () => void;
  summary: SalEconomicSummary;
  previousSalLines: SalLineView[];
  compareLines: SalLineView[] | null;
  onToggleCompare: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
        {checks.map((c) => (
          <span
            key={c.id}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.tone === "success" ? "bg-[var(--success-soft)] text-[var(--success-base)]" : c.tone === "warning" ? "bg-[var(--warning-soft)] text-[var(--warning-base)]" : "bg-[var(--danger-soft)] text-[var(--danger-base)]"}`}
            title={c.detail}
          >
            {c.result}
          </span>
        ))}
        {previousSalLines.length > 0 && (
          <button
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 text-[11px] font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            onClick={onToggleCompare}
            type="button"
          >
            {compareLines ? "Nascondi confronto" : "Confronta con SAL precedente"}
          </button>
        )}
      </div>

      {compareLines && <SalComparisonView before={previousSalLines} after={lineViews} />}

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-[18px] bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/70">
          <div className="bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Verifica economica
            </div>
            <div className="mt-1 text-[20px] font-black text-[var(--text-primary)]">
              Totale attuale SAL <Currency value={summary.total} />
            </div>
          </div>
          <div className="p-5">
            <EconomicEquation summary={summary} />
            <dl className="mt-5 space-y-2">
              <SummaryLine
                label="Totale voci lordo"
                value={<Currency value={summary.grossAmount} />}
                large
              />
              <SummaryLine
                label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`}
                value={<Currency value={-summary.discountAmount} />}
                tone="danger"
                large
              />
              <SummaryLine
                label="Maggiorazioni"
                value={<Currency value={summary.linkedChargeAmount} />}
                large
              />
              <SummaryLine
                label="Voci OS incluse"
                value={<Currency value={summary.safetyAmount} />}
                large
              />
              <SummaryLine
                label="Totale attuale SAL"
                value={<Currency value={summary.total} />}
                tone="info"
                large
              />
            </dl>
          </div>
        </div>
        <div className="overflow-hidden rounded-[18px] bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/70">
          <div className="flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Anteprima verifica
              </div>
              <div className="mt-1 text-[13px] font-semibold text-[var(--text-primary)]">
                Libretto con ribasso evidenziato
              </div>
            </div>
            <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-[11px] font-bold text-[var(--success-base)]">
              Netto calcolato
            </span>
          </div>
          <div className="p-4">
            <DocumentPreview compact lines={lineViews} summary={summary} />
          </div>
        </div>
      </div>
      <details className="rounded-[12px] bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/60">
        <summary className="cursor-pointer px-4 py-3 text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Dettaglio voci ({lineViews.length})
        </summary>
        <div className="border-t border-[var(--border-subtle)]/50 px-4 pb-3 pt-3">
          <AccountingRows lines={lineViews} />
        </div>
      </details>
      <div className="flex justify-end">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          Continua <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Confirm ── */
function ConfirmStep({
  economicRules,
  onPrimary,
  summary,
}: {
  economicRules: SalEconomicRules;
  onPrimary: () => void;
  summary: SalEconomicSummary;
}) {
  return (
    <div className="space-y-3">
      <FeedbackBanner
        message="La verifica è completata. La documentazione è pronta per la conferma."
        title="Pronta per conferma"
        tone="success"
      />
      <div className="responsive-grid-elastic gap-3">
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Totale SAL
          </div>
          <div className="mt-1 text-[26px] font-bold text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Budget residuo
          </div>
          <div
            className={cn(
              "mt-1 text-[26px] font-bold",
              summary.budgetResidual < 0
                ? "text-[var(--danger-base)]"
                : "text-[var(--success-base)]",
            )}
          >
            <Currency value={summary.budgetResidual} />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            Impegnato <Currency value={summary.previousProgressiveAmount} />
          </div>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Voci / quantità
          </div>
          <div className="mt-1 text-[26px] font-bold text-[var(--info-base)]">
            {summary.voiceCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            Importo lordo <Currency value={summary.grossAmount} />
          </div>
        </div>
      </div>
      <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
        <EconomicEquation className="mb-5" summary={summary} />
        <dl className="space-y-2">
          <SummaryLine
            label="Importo lordo"
            value={<Currency value={summary.grossAmount} />}
            large
          />
          <SummaryLine
            label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`}
            value={<Currency value={-summary.discountAmount} />}
            tone="danger"
            large
          />
          <SummaryLine label="Voci OS" value={<Currency value={summary.safetyAmount} />} large />
          <SummaryLine
            label="Maggiorazioni"
            value={<Currency value={summary.linkedChargeAmount} />}
            large
          />
        </dl>
      </div>
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
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onPrimary}
          type="button"
        >
          <CheckCircle2 className="size-4" />
          Conferma SAL
        </button>
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
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
          onClick={onClose}
          type="button"
        >
          Chiudi
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90"
          onClick={onNew}
          type="button"
        >
          Nuova revisione
        </button>
      </div>
    </div>
  );
}

/* ── Shared ── */
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
        "grid gap-2 rounded-[14px] bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] p-3 ring-1 ring-[var(--border-subtle)]/60 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center",
        className,
      )}
    >
      <EquationAmount label="Totale voci" value={<Currency value={summary.grossAmount} />} />
      <EquationOperator>-</EquationOperator>
      <EquationAmount
        label="Sconto"
        tone="danger"
        value={<Currency value={summary.discountAmount} />}
      />
      <EquationOperator>=</EquationOperator>
      <EquationAmount
        label="Totale attuale SAL"
        tone="info"
        value={<Currency value={summary.total} />}
      />
      {summary.linkedChargeAmount > 0 ? (
        <div className="md:col-span-5 rounded-[10px] bg-[var(--surface-base)]/70 px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)]">
          Maggiorazioni incluse nel totale attuale: <Currency value={summary.linkedChargeAmount} />
        </div>
      ) : null}
    </div>
  );
}

function EquationAmount({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger" | "info";
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[11px] bg-[var(--surface-base)] px-3 py-3">
      <div className="text-[11px] font-semibold text-[var(--text-secondary)]">{label}</div>
      <div
        className={cn(
          "mt-1 truncate text-[18px] font-black",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "info" && "text-[var(--accent-primary)]",
          !tone && "text-[var(--text-primary)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EquationOperator({ children }: { children: ReactNode }) {
  return (
    <div className="hidden size-9 items-center justify-center rounded-full bg-[var(--surface-base)] text-[18px] font-black text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/70 md:flex">
      {children}
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
    <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[22px] font-bold",
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

function SummaryLine({
  label,
  large,
  tone,
  value,
}: {
  label: string;
  large?: boolean;
  tone?: "danger" | "info" | "success" | "warning";
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "font-medium text-[var(--text-secondary)]",
          large ? "text-[14px]" : "text-[13px]",
        )}
      >
        {label}
      </span>
      <strong
        className={cn(
          large ? "text-[15px]" : "text-[13px]",
          "font-semibold",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "success" && "text-[var(--success-base)]",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "info" && "text-[var(--info-base)]",
          !tone && "text-[var(--text-primary)]",
        )}
      >
        {value}
      </strong>
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
      className={`rounded-[12px] border px-4 py-3 ${tone === "danger" ? "border-[var(--danger-base)]/25 bg-[var(--danger-soft)] text-[var(--danger-base)]" : tone === "success" ? "border-[var(--success-base)]/25 bg-[var(--success-soft)] text-[var(--success-base)]" : "border-[var(--info-base)]/25 bg-[var(--info-soft)] text-[var(--info-base)]"}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-current/10">
          {tone === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Calculator className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="mt-0.5 text-[12px] opacity-80">{message}</div>
        </div>
      </div>
    </div>
  );
}
