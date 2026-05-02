import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Printer,
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
import { buildSalDocumentView } from "./domain/sal-workflow";
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

export function SalCreationScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const data = useSalCreationData();
  const createSalProjectWithId = useSalWorkflowStore((state) => state.createProjectWithId);
  const createClosedSal = useSalWorkflowStore((state) => state.createClosedSal);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const [phase, setPhase] = useState<SalWorkflowPhase>("context");

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

  useEffect(() => {
    if (data.project && !salTitle) setSalTitle(data.project.salTitle);
  }, [data.project, salTitle]);

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
    if (!projectId) return [];
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
          const voice = data.voices.find((v) => v.id === l.voiceId);
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
  }, [data.project?.id, data.voices, salDocuments]);

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
          const voice = data.voices.find((v) => v.id === entry.voiceId);
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
      setEconomicRules(template.economicRules);
      notify({
        message: `Template "${template.name}" applicato (${newLines.length} voci).`,
        title: "Template applicato",
        tone: "success",
      });
    },
    [data.voices, notify],
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

    createClosedSal({
      date: data.project.periodEnd,
      description: "Periodo corrente",
      lines: lineViews.map((l) => ({
        id: l.id,
        quantity: l.quantity,
        surcharge: l.surchargePercent >= 20 ? "night" : l.surchargePercent > 0 ? "day" : "none",
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
    });

    setCreatedSalTitle(salTitle.trim() || data.project.salTitle);
    setPhase("completed");
    notify({
      message: `${salTitle.trim() || data.project.salTitle} confermata.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

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
              navigate("project-detail");
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
                economicRules={economicRules}
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
                setEconomicRules={setEconomicRules}
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
                setEconomicRules={setEconomicRules}
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
  economicRules,
  project,
  salTitle,
  selectedTariffBooks,
  selectedTariffBook,
  selectTariffBook,
  setEconomicRules,
  setSalTitle,
  summary,
  tariffBooks,
  voicesCount,
  onPrimary,
}: {
  economicRules: SalEconomicRules;
  project: SalProjectContext | null;
  salTitle: string;
  selectedTariffBooks: SalTariffBookOption[];
  selectedTariffBook: SalTariffBookOption | null;
  selectTariffBook: (id: string) => Promise<void>;
  setEconomicRules: Dispatch<SetStateAction<SalEconomicRules>>;
  setSalTitle: Dispatch<SetStateAction<string>>;
  summary: SalEconomicSummary;
  tariffBooks: SalTariffBookOption[];
  voicesCount: number;
  onPrimary: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
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

  return (
    <div className="space-y-3">
      <div className="rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          <span className="font-medium text-[var(--text-secondary)]">{project.contractor}</span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="text-[var(--text-secondary)]">{project.title}</span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="text-[var(--text-secondary)]">
            Atto {project.applicationContractCode}
          </span>
        </div>
      </div>

      <div className="rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
        <label
          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
          htmlFor="sal-title-input"
        >
          Nome SAL
        </label>
        <input
          className="mt-1 h-9 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-muted)]/50 px-3 text-[14px] font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          id="sal-title-input"
          onChange={(e) => setSalTitle(e.target.value)}
          placeholder={project.salTitle}
          value={salTitle}
        />
      </div>

      <div className="rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            Tariffario{tariffBooks.length !== 1 ? "i" : ""}
          </span>
          {tariffBooks.length > 3 ? (
            <button
              className="text-[11px] font-semibold text-[var(--info-base)] hover:underline"
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
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(showAll ? tariffBooks : tariffBooks.slice(0, 3)).map((book) => {
              const isSelected = selectedTariffBooks.some((b) => b.id === book.id);
              return (
                <button
                  className={`relative rounded-[12px] border p-3 text-left transition-all duration-300 ${isSelected ? "border-[var(--accent-primary)]/50 bg-[color-mix(in_srgb,var(--info-soft)_30%,var(--surface-base)_70%)]" : "border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/30 hover:border-[var(--border-subtle)]"}`}
                  key={book.id}
                  onClick={() => void selectTariffBook(book.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                        {book.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Anno {book.year}
                      </div>
                    </div>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-all ${isSelected ? "bg-[var(--accent-primary)] text-white" : "border border-[var(--border-subtle)] bg-[var(--bg-muted)]"}`}
                    >
                      {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {selectedTariffBooks.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <CheckCircle2 className="size-3.5 text-[var(--success-base)]" />
            <span className="font-medium">
              {selectedTariffBooks.length} selezionat{selectedTariffBooks.length !== 1 ? "i" : "o"}
              {selectedTariffBook ? ` · ${voicesCount} voci` : ""}
            </span>
          </div>
        ) : (
          <div className="mt-2 text-[11px] font-medium text-[var(--warning-base)]">
            Seleziona almeno un tariffario
          </div>
        )}
      </div>

      <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
          <Wallet className="size-3.5 text-[var(--info-base)]" />
          Anteprima economica
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-[10px] font-medium text-[var(--text-secondary)]">
              Budget totale
            </div>
            <div className="mt-0.5 text-[16px] font-bold text-[var(--text-primary)]">
              <Currency value={project.contractAmount} />
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              Residuo stimato:{" "}
              <span className="font-semibold text-[var(--success-base)]">
                <Currency value={summary.budgetResidual} />
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-[var(--text-secondary)]">Ribasso gara</div>
            <div className="flex items-center gap-2">
              <DiscountInput
                value={economicRules.discountPercent}
                disabled={!economicRules.discountEnabled}
                onChange={(v) => setEconomicRules((c) => ({ ...c, discountPercent: v }))}
              />
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                <input
                  checked={economicRules.discountEnabled}
                  className="size-3.5 accent-[var(--accent-primary)]"
                  onChange={(e) =>
                    setEconomicRules((c) => ({ ...c, discountEnabled: e.target.checked }))
                  }
                  type="checkbox"
                />
                Attivo
              </label>
            </div>
            {economicRules.discountEnabled && (
              <div className="mt-1 text-[11px] font-medium text-[var(--danger-base)]">
                Sconto: -<Currency value={summary.discountAmount} />
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-medium text-[var(--text-secondary)]">
              Voci disponibili
            </div>
            <div className="mt-0.5 text-[16px] font-bold text-[var(--info-base)]">
              {voicesCount}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              nel tariffario selezionato
            </div>
          </div>
        </div>
      </div>

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

/* ── Discount Input (pure controlled) ── */
function DiscountInput({
  value,
  disabled,
  onChange,
  className,
}: {
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <input
      aria-label="Percentuale ribasso"
      className={cn(
        "h-7 w-24 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-2 text-right text-[12px] font-semibold outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] disabled:opacity-50",
        className,
      )}
      disabled={disabled}
      max={100}
      min={0}
      onChange={(e) => {
        const v = e.target.value;
        // Allow empty string for clearing
        if (v === "") return;
        const parsed = parseFloat(v.replace(",", "."));
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
          onChange(Math.round(parsed * 100) / 100);
        }
      }}
      step="0.01"
      type="number"
      value={value}
    />
  );
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
  setEconomicRules,
  onSurcharge,
  onToggle,
  summary,
  voices,
  dataProject,
  onApplyTemplate,
  onOpenTemplateDialog,
  tariffBookId,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  onFactorChange: (vid: string, f: "factor1" | "factor2" | "factor3", v: number) => void;
  onPrimary: () => void;
  onReorder: (l: SalLineDraft[]) => void;
  onRemove: (vid: string) => void;
  setEconomicRules: Dispatch<SetStateAction<SalEconomicRules>>;
  onSurcharge: (vid: string, p: number) => void;
  onToggle: (v: SalVoiceDraft) => void;
  summary: SalEconomicSummary;
  voices: SalVoiceDraft[];
  dataProject: SalProjectContext | null;
  onApplyTemplate: (t: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
  tariffBookId: string;
}) {
  const totalQty = lineViews.reduce((s, l) => s + l.quantity, 0);
  const linked = lineViews.reduce((s, l) => s + l.linkedCharges.length, 0);
  const contractAmount = dataProject?.contractAmount ?? 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[12px] bg-[var(--surface-base)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]/60">
        <div className="min-w-0 flex-1">
          <AutocompleteInput
            options={voices.map((v) => ({
              label: v.description,
              metadata: `${v.category} · ${v.unit} · ${v.unitPrice.toLocaleString("it-IT", { currency: "EUR", style: "currency", minimumFractionDigits: 2 })}`,
              value: v.code,
              keywords: `${v.code} ${v.description} ${v.category}`,
            }))}
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
      {/* Dashboard strip — SAL corrente, Residuo, Sconto */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            SAL corrente
          </div>
          <div className="mt-1 text-[20px] font-bold text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            <Currency value={contractAmount} /> budget
          </div>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Budget residuo
          </div>
          <div
            className={cn(
              "mt-1 text-[20px] font-bold",
              summary.budgetResidual < 0
                ? "text-[var(--danger-base)]"
                : "text-[var(--success-base)]",
            )}
          >
            <Currency value={summary.budgetResidual} />
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            Impegnato <Currency value={summary.previousProgressiveAmount} /> +{" "}
            <Currency value={summary.total} /> corr.
          </div>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Ribasso gara
            </span>
            <div className="flex items-center gap-2">
              <DiscountInput
                value={economicRules.discountPercent}
                disabled={!economicRules.discountEnabled}
                onChange={(v) => setEconomicRules((c) => ({ ...c, discountPercent: v }))}
              />
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                <input
                  checked={economicRules.discountEnabled}
                  className="size-3.5 accent-[var(--accent-primary)]"
                  onChange={(e) =>
                    setEconomicRules((c) => ({ ...c, discountEnabled: e.target.checked }))
                  }
                  type="checkbox"
                />
                Attivo
              </label>
            </div>
          </div>
          {economicRules.discountEnabled && (
            <div className="mt-1.5 text-[13px] font-bold text-[var(--danger-base)]">
              -<Currency value={summary.discountAmount} />
            </div>
          )}
        </div>
      </div>
      {/* Total + continue */}
      <div className="flex items-center justify-between rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
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
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            Riepilogo economico
          </div>
          <dl className="mt-3 space-y-1.5">
            <SummaryLine
              label="Imponibile"
              value={<Currency value={summary.discountableAmount} />}
            />
            <SummaryLine
              label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`}
              value={<Currency value={-summary.discountAmount} />}
              tone="danger"
            />
            <SummaryLine
              label="Maggiorazioni"
              value={<Currency value={summary.linkedChargeAmount} />}
            />
            <SummaryLine label="Voci OS" value={<Currency value={summary.safetyAmount} />} />
            <SummaryLine
              label="TOTALE SAL"
              value={<Currency value={summary.total} />}
              tone="info"
            />
          </dl>
        </div>
        <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            Anteprima
          </div>
          <div className="mt-3">
            <DocumentPreview compact lines={lineViews} />
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
      <div className="rounded-[12px] bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Totale SAL</span>
          <span className="text-[18px] font-bold text-[var(--accent-primary)]">
            <Currency value={summary.total} />
          </span>
        </div>
        <dl className="mt-3 space-y-1.5">
          <SummaryLine label="Importo lordo" value={<Currency value={summary.grossAmount} />} />
          <SummaryLine
            label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`}
            value={<Currency value={-summary.discountAmount} />}
            tone="danger"
          />
          <SummaryLine label="Voci OS" value={<Currency value={summary.safetyAmount} />} />
          <SummaryLine
            label="Maggiorazioni"
            value={<Currency value={summary.linkedChargeAmount} />}
          />
        </dl>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
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
      <div className="grid gap-3 sm:grid-cols-3">
        <StepMetric label="Totale SAL" value={<Currency value={summary.total} />} />
        <StepMetric label="Ultimo aggiornamento" value="Oggi" />
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
function StepMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-base)] p-3 ring-1 ring-[var(--border-subtle)]/60">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-bold text-[var(--info-base)]">{value}</div>
    </div>
  );
}

function SummaryLine({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger" | "info" | "success" | "warning";
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <strong
        className={cn(
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
