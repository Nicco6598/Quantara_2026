import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Printer,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useToast } from "@/components/shared/ToastProvider";
import { useNavigate } from "@/hooks/useNavigate";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { BezelSurface } from "@/features/projects/components/workspace-ui";
import { cn } from "@/lib/utils";
import { SalCard, SalHero, SalStepper, SalWorkflowTopbar } from "./components/SalCreationChrome";
import {
  AccountingRows,
  CatalogPanel,
  CheckRow,
  Currency,
  DocumentPreview,
  NumberValue,
  OutputRow,
  SelectedVoicesPanel,
} from "./components/SalCreationTables";
import {
  buildLineViews,
  buildVerificationChecks,
  defaultSalEconomicRules,
  summarizeSalLines,
} from "./domain/sal-calculations";
import { buildSalDocumentView } from "./domain/sal-workflow";
import { useSalCreationData } from "./hooks/useSalCreationData";
import {
  buildWorkflowStages,
  getNextPhase,
  getPreviousPhase,
  type SalWorkflowPhase,
} from "./state/workflow";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineDraft,
  SalLineView,
  SalProjectContext,
  SalTariffBookOption,
  SalVoiceDraft,
} from "./types";

export function SalCreationScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const data = useSalCreationData();
  const createSalProjectWithId = useSalWorkflowStore((state) => state.createProjectWithId);
  const createClosedSal = useSalWorkflowStore((state) => state.createClosedSal);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const [phase, setPhase] = useState<SalWorkflowPhase>("context");

  function goToPhase(nextPhase: SalWorkflowPhase) {
    const ordered = ["context", "voices", "review", "confirm", "completed"] as const;
    const currentIdx = ordered.indexOf(phase);
    const nextIdx = ordered.indexOf(nextPhase);
    setNavDirection(nextIdx >= currentIdx ? "forward" : "backward");
    setPhase(nextPhase);
  }
  const [lines, setLines] = useState<SalLineDraft[]>([]);
  const [economicRules, setEconomicRules] = useState<SalEconomicRules>(defaultSalEconomicRules);
  const [createdSalTitle, setCreatedSalTitle] = useState("SAL 01 - Periodo corrente");
  const [navDirection, setNavDirection] = useState<"forward" | "backward">("forward");
  const previousProgressiveAmount = useMemo(() => {
    const projectId = data.project?.id;
    if (!projectId) {
      return 0;
    }
    return salDocuments
      .filter((sal) => sal.projectId === projectId && sal.status === "closed")
      .reduce((sum, sal) => sum + buildSalDocumentView(sal, tariffVoices).total, 0);
  }, [data.project?.id, salDocuments, tariffVoices]);
  const derived = useMemo(() => {
    const contractAmount = data.project?.contractAmount ?? 0;
    const lineViews = buildLineViews(lines, economicRules);
    const summary = summarizeSalLines(lineViews, contractAmount, previousProgressiveAmount);
    const checks = buildVerificationChecks(lineViews, summary);
    const selectedIds = new Set(lines.map((line) => line.voice.id));

    return { checks, lineViews, selectedIds, summary };
  }, [data.project?.contractAmount, economicRules, lines, previousProgressiveAmount]);
  const { checks, lineViews, selectedIds, summary } = derived;
  const hasDangerChecks = checks.some((check) => check.tone === "danger");
  const blockedPhases = useMemo(() => {
    const blocked = new Set<SalWorkflowPhase>();

    if (!data.project || data.selectedTariffBooks.length === 0) {
      blocked.add("context");
    }

    if (lines.length === 0 || lineViews.some((line) => line.status !== "complete")) {
      blocked.add("review");
    }

    if (lines.length === 0 || hasDangerChecks) {
      blocked.add("confirm");
    }

    return blocked;
  }, [data.project, data.selectedTariffBooks.length, hasDangerChecks, lineViews, lines.length]);
  const stages = useMemo(
    () => buildWorkflowStages(phase, blockedPhases).filter((stage) => stage.id !== "completed"),
    [blockedPhases, phase],
  );

  const currentStep = useMemo(() => {
    if (phase === "context") return 1;
    if (phase === "voices") return 2;
    if (phase === "review") return 3;
    if (phase === "confirm") return 4;
    return 5;
  }, [phase]);

  const upsertLine = useCallback((voice: SalVoiceDraft) => {
    setLines((current) => {
      if (current.some((line) => line.voice.id === voice.id)) {
        return current.filter((line) => line.voice.id !== voice.id);
      }

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
  }, []);

  const setSurcharge = useCallback((voiceId: string, surchargePercent: number) => {
    setLines((current) =>
      current.map((line) => (line.voice.id === voiceId ? { ...line, surchargePercent } : line)),
    );
  }, []);

  const setFactor = useCallback(
    (voiceId: string, field: "factor1" | "factor2" | "factor3", value: number) => {
      setLines((current) =>
        current.map((line) =>
          line.voice.id === voiceId
            ? {
                ...line,
                [field]: Number.isFinite(value) && value >= 0 ? value : 0,
                quantity:
                  field === "factor1"
                    ? (Number.isFinite(value) && value >= 0 ? value : 0) *
                      line.factor2 *
                      line.factor3
                    : field === "factor2"
                      ? line.factor1 *
                        (Number.isFinite(value) && value >= 0 ? value : 0) *
                        line.factor3
                      : line.factor1 *
                        line.factor2 *
                        (Number.isFinite(value) && value >= 0 ? value : 0),
              }
            : line,
        ),
      );
    },
    [],
  );

  const removeLine = useCallback((voiceId: string) => {
    setLines((current) => current.filter((line) => line.voice.id !== voiceId));
  }, []);

  function saveDraft() {
    notify({
      message:
        lines.length === 0
          ? "La bozza non contiene ancora voci da salvare."
          : "La bozza SAL e stata aggiornata localmente.",
      title: "Bozza SAL",
      tone: lines.length === 0 ? "warning" : "success",
    });
  }

  function goPrimary() {
    const canContinue =
      phase === "context"
        ? Boolean(data.project && data.selectedTariffBooks.length > 0)
        : phase === "voices"
          ? lines.length > 0 && lineViews.every((line) => line.status === "complete")
          : phase === "review"
            ? checks.every((check) => check.tone !== "danger") && lines.length > 0
            : phase === "confirm"
              ? lines.length > 0 && !hasDangerChecks
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
        title: "Azione non disponibile",
        tone: "warning",
      });
      return;
    }

    if (phase !== "confirm" && phase !== "completed") {
      goToPhase(getNextPhase(phase));
      return;
    }

    if (!data.project) {
      return;
    }

    createSalProjectWithId({
      client: data.project.contractor,
      description: `${data.project.frameworkAgreementCode} - ${data.project.applicationContractCode}`,
      id: data.project.id,
      name: data.project.title,
      year: data.selectedTariffBook?.year ?? 2026,
    });

    const created = createClosedSal({
      date: data.project.periodEnd,
      description: "Periodo corrente",
      lines: lineViews.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        surcharge:
          line.surchargePercent >= 20 ? "night" : line.surchargePercent > 0 ? "day" : "none",
        voiceId: line.voice.id,
      })),
      notes: "",
      projectId: data.project.id,
      title: data.project.salTitle,
    });

    setCreatedSalTitle(created.title);
    goToPhase("completed");
    notify({
      message: `${created.title} confermata. Gli export sono disponibili quando il backend documentale li abilita.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

  const primaryLabel = phase === "confirm" ? "Conferma" : "Continua";

  const showBreadcrumbNav = phase !== "completed";

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

        {showBreadcrumbNav ? (
          <div className="mb-4 flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
            <span>Nuova SAL</span>
            <ChevronRight className="size-3.5" />
            <span className="font-semibold text-[var(--text-primary)]">{primaryLabel}</span>
          </div>
        ) : null}

        <SalWorkflowTopbar
          canGoBack={phase !== "context"}
          onBack={() =>
            phase === "completed" ? goToPhase("confirm") : goToPhase(getPreviousPhase(phase))
          }
          onDraft={saveDraft}
          onPrimary={goPrimary}
          primaryLabel={primaryLabel}
          showPrimary={phase !== "completed"}
        />

        <div className="mt-5 space-y-5">
          {data.error ? (
            <FeedbackBanner tone="danger" title="Caricamento SAL non riuscito" message={data.error} />
          ) : null}
          {data.isLoading ? (
            <FeedbackBanner
              tone="info"
              title="Caricamento dati reali"
              message="Sto leggendo contratti, tariffari e voci disponibili nel database locale."
            />
          ) : null}

          {phase === "completed" ? (
            <DetailView
            createdSalTitle={createdSalTitle}
            lineViews={lineViews}
            onClose={() => {
              if (data.project) {
                try {
                  window.sessionStorage.setItem(
                    "quantara.selectedProjectDetail.v1",
                    JSON.stringify({ id: data.project.id }),
                  );
                } catch {
                  // no-op
                }
              }
              navigate("project-detail");
            }}
            onNew={() => goToPhase("context")}
            project={data.project}
            summary={summary}
          />
        ) : (
          <>
            <SalHero
              icon={
                phase === "context"
                  ? FileText
                  : phase === "voices"
                    ? BarChart3
                    : phase === "review"
                      ? BarChart3
                      : CheckCircle2
              }
              step={currentStep}
              projectTitle={data.project?.title}
              tariffYear={data.selectedTariffBook?.year}
              subtitle={
                phase === "context"
                  ? "Configura il contesto contrattuale, le regole economiche e il motore di valorizzazione del documento."
                  : phase === "voices"
                    ? "Seleziona le voci dal tariffario e compila quantita e misurazioni per generare la bozza SAL."
                    : phase === "review"
                      ? "Controlla la coerenza contabile e i riepiloghi prima della conferma finale."
                      : "Conferma la SAL ed esporta i documenti."
              }
              title={
                phase === "review"
                  ? "Verifica SAL"
                  : phase === "confirm"
                    ? "Conferma SAL"
                    : "Nuova SAL"
              }
            />
            <SalStepper currentIndex={currentStep - 1} direction={navDirection} stages={stages} />
            {phase === "context" ? (
              <SetupStep
                canGoBack={false}
                economicRules={economicRules}
                onBack={() => goToPhase(getPreviousPhase(phase))}
                onPrimary={goPrimary}
                primaryLabel={primaryLabel}
                project={data.project}
                selectedTariffBooks={data.selectedTariffBooks}
                selectedTariffBook={data.selectedTariffBook}
                selectTariffBook={data.selectTariffBook}
                setEconomicRules={setEconomicRules}
                summary={summary}
                tariffBooks={data.tariffBookOptions}
                voicesCount={data.voices.length}
              />
            ) : null}
            {phase === "voices" ? (
              <VoicesStep
                canGoBack={true}
                economicRules={economicRules}
                lineViews={lineViews}
                lines={lines}
                onBack={() => goToPhase(getPreviousPhase(phase))}
                onFactorChange={setFactor}
                onPrimary={goPrimary}
                primaryLabel={primaryLabel}
                onRemove={removeLine}
                onSurcharge={setSurcharge}
                onToggle={upsertLine}
                selectedIds={selectedIds}
                summary={summary}
                voices={data.voices}
              />
            ) : null}
            {phase === "review" ? (
              <VerifyStep
                canGoBack={true}
                checks={checks}
                economicRules={economicRules}
                lineViews={lineViews}
                onBack={() => goToPhase(getPreviousPhase(phase))}
                onPrimary={goPrimary}
                primaryLabel={primaryLabel}
                summary={summary}
              />
            ) : null}
            {phase === "confirm" ? (
              <ConfirmStep
                canGoBack={true}
                economicRules={economicRules}
                lineViews={lineViews}
                onBack={() => goToPhase(getPreviousPhase(phase))}
                onPrimary={goPrimary}
                primaryLabel={primaryLabel}
                summary={summary}
              />
            ) : null}
          </>
        )}
        </div>
    </main>
  );
}

function SetupStep({
  canGoBack,
  economicRules,
  onBack,
  onPrimary,
  primaryLabel,
  project,
  selectedTariffBooks,
  selectedTariffBook,
  selectTariffBook,
  setEconomicRules,
  summary,
  tariffBooks,
  voicesCount,
}: {
  canGoBack: boolean;
  economicRules: SalEconomicRules;
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  project: SalProjectContext | null;
  selectedTariffBooks: SalTariffBookOption[];
  selectedTariffBook: SalTariffBookOption | null;
  selectTariffBook: (tariffBookId: string) => Promise<void>;
  setEconomicRules: Dispatch<SetStateAction<SalEconomicRules>>;
  summary: SalEconomicSummary;
  tariffBooks: SalTariffBookOption[];
  voicesCount: number;
}) {
  const [isSelectingTariff, setIsSelectingTariff] = useState(false);

  if (!project) {
    return (
      <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-14 text-center">
        <Building2 className="mx-auto size-10 text-[var(--text-secondary)]" />
        <p className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
          Nessun contratto disponibile
        </p>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          Crea o apri un progetto prima di generare una SAL.
        </p>
      </div>
    );
  }

  const displayedBooks = isSelectingTariff ? tariffBooks : tariffBooks.slice(0, 3);

  return (
    <div className="space-y-5">
      <BezelSurface innerClassName="p-0">
        <div className="grid divide-y divide-[var(--border-subtle)]/60 md:grid-cols-4 md:divide-x md:divide-y-0">
          <ContextTile
            label="Contratto"
            value={project.applicationContractCode}
          />
          <ContextTile label="Documento" value={project.salTitle} />
          <ContextTile
            label="Tariffario"
            value={
              selectedTariffBooks.length > 0
                ? `${selectedTariffBooks.length} selezionati`
                : "Nessuno"
            }
          />
          <ContextTile
            label="Residuo stimato"
            tone="success"
            value={<Currency value={summary.budgetResidual} />}
          />
        </div>
      </BezelSurface>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <FileText className="size-4 text-[var(--info-base)]" />
              Contratto e documento
            </div>
            <div className="mt-4 grid gap-x-5 gap-y-3 md:grid-cols-2">
              <InfoField label="Appaltatore" value={project.contractor} />
              <InfoField label="Progetto / Contratto" value={project.title} />
              <InfoField label="Atto contrattuale" value={project.applicationContractCode} />
              <InfoField label="Linea / Lotto" value={project.location} />
              <InfoField label="Nome SAL" value={project.salTitle} />
              <InfoField label="Tipo documento" value="SAL" />
            </div>
          </BezelSurface>

          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
                <ClipboardList className="size-4 text-[var(--info-base)]" />
                Tariffario{tariffBooks.length !== 1 ? "i" : ""}
              </div>
              {tariffBooks.length > 3 ? (
                <button
                  className="text-[12px] font-semibold text-[var(--info-base)] hover:underline"
                  onClick={() => setIsSelectingTariff(!isSelectingTariff)}
                  type="button"
                >
                  {isSelectingTariff ? "Mostra meno" : `Mostra tutti (${tariffBooks.length})`}
                </button>
              ) : null}
            </div>

            {tariffBooks.length === 0 ? (
              <div className="mt-4 text-[13px] text-[var(--text-secondary)]">
                Nessun tariffario caricato per questo contratto.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {displayedBooks.map((book) => {
                  const isSelected = selectedTariffBooks.some((b) => b.id === book.id);
                  return (
                    <button
                      className={cn(
                        "group relative rounded-[16px] border p-4 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isSelected
                          ? "border-[var(--accent-primary)]/50 bg-[color-mix(in_srgb,var(--info-soft)_30%,var(--surface-base)_70%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--accent-primary)_16%,transparent)]"
                          : "border-[var(--border-subtle)]/60 bg-[var(--surface-base)] hover:border-[var(--border-subtle)] hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.06)]",
                      )}
                      key={book.id}
                      onClick={() => void selectTariffBook(book.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                            {book.name}
                          </div>
                          <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                            Anno {book.year}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                            isSelected
                              ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                              : "border border-[var(--border-subtle)] bg-[var(--bg-muted)]",
                          )}
                        >
                          {isSelected ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {book.isPriority ? (
                          <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning-base)]">
                            Priorita {book.priority}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isSelected
                              ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                              : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
                          )}
                        >
                          {book.status}
                        </span>
                        <span className="rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                          {book.year}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedTariffBooks.length > 0 ? (
              <div className="mt-4 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <CheckCircle2 className="size-4 text-[var(--success-base)]" />
                <span className="font-medium">
                  {selectedTariffBooks.length} tariffario
                  {selectedTariffBooks.length !== 1 ? " selezionati" : " selezionato"}
                  {selectedTariffBook ? ` · ${voicesCount} voci disponibili` : ""}
                </span>
              </div>
            ) : (
              <div className="mt-4 text-[12px] font-medium text-[var(--warning-base)]">
                Seleziona almeno un tariffario per procedere
              </div>
            )}
          </BezelSurface>

          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <Calculator className="size-4 text-[var(--info-base)]" />
              Regole economiche
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <DiscountControl
                economicRules={economicRules}
                setEconomicRules={setEconomicRules}
              />
              <RuleChip label="Arrotonda al centesimo" />
              <RuleChip label="Voci OS: escluse dal ribasso" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    economicRules.discountEnabled
                      ? "bg-[var(--success-base)]"
                      : "bg-[var(--text-secondary)]",
                  )}
                />
                {economicRules.discountEnabled
                  ? `Ribasso ${economicRules.discountPercent.toLocaleString("it-IT")}%`
                  : "Ribasso disattivato"}
              </span>
              <span className="text-[var(--border-subtle)]">·</span>
              <span>Maggiorazioni: diurna +10%, notturna +25%</span>
            </div>
          </BezelSurface>
        </div>

        <div className="space-y-5">
          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="size-4 text-[var(--info-base)]" />
              Riepilogo economico
            </div>
            <dl className="mt-4 space-y-1">
              <SummaryLine
                label="Importo contrattuale"
                value={<Currency value={project.contractAmount} />}
              />
              <SummaryLine
                label="Ribasso gara"
                value={
                  economicRules.discountEnabled
                    ? `${economicRules.discountPercent.toLocaleString("it-IT")} %`
                    : "Disattivo"
                }
              />
              <SummaryLine
                label="Impegnato precedente"
                value={<Currency value={summary.previousProgressiveAmount} />}
              />
              <SummaryLine
                label="Documento corrente"
                value={<Currency value={summary.total} />}
              />
              <SummaryLine
                label="Residuo stimato"
                value={<Currency value={summary.budgetResidual} />}
                tone="success"
              />
              <SummaryLine label="Voci tariffarie" value={String(voicesCount)} />
            </dl>
          </BezelSurface>

          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <BarChart3 className="size-4 text-[var(--info-base)]" />
              Riferimenti
            </div>
            <dl className="mt-4 space-y-1">
              <SummaryLine label="Direzione Lavori" value="DL Assegnato" />
              <SummaryLine label="Periodo" value="Corrente" />
              <SummaryLine label="Stato" value="Bozza" />
            </dl>
          </BezelSurface>
        </div>
      </div>

      <StepNavigation
        canGoBack={canGoBack}
        onBack={onBack}
        onPrimary={onPrimary}
        primaryLabel={primaryLabel}
      />
    </div>
  );
}

function VoicesStep({
  canGoBack,
  economicRules,
  lineViews,
  lines,
  onBack,
  onFactorChange,
  onPrimary,
  primaryLabel,
  onRemove,
  onSurcharge,
  onToggle,
  selectedIds,
  summary,
  voices,
}: {
  canGoBack: boolean;
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  onBack: () => void;
  onFactorChange: (voiceId: string, field: "factor1" | "factor2" | "factor3", value: number) => void;
  onPrimary: () => void;
  primaryLabel: string;
  onRemove: (voiceId: string) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
  onToggle: (voice: SalVoiceDraft) => void;
  selectedIds: Set<string>;
  summary: SalEconomicSummary;
  voices: SalVoiceDraft[];
}) {
  const totalQuantity = lineViews.reduce((sum, line) => sum + line.quantity, 0);
  const linkedCount = lineViews.reduce((sum, line) => sum + line.linkedCharges.length, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(420px,0.95fr)_minmax(560px,1.35fr)]">
        <SalCard title="Catalogo tariffario (selezione voci)">
          <CatalogPanel onToggle={onToggle} selectedIds={selectedIds} voices={voices} />
        </SalCard>
        <SalCard title={`Voci selezionate (${lines.length})`}>
          <SelectedVoicesPanel
            lines={lineViews}
            onFactorChange={onFactorChange}
            onRemove={onRemove}
            onSurcharge={onSurcharge}
          />
        </SalCard>
      </div>

      <BezelSurface innerClassName="p-4 md:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--info-soft)] text-[var(--info-base)]">
            <Wallet className="size-4" />
          </div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Riepilogo bozza SAL ({lines.length} voci)
          </h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryLine label="Voci inserite" value={String(lines.length)} />
          <SummaryLine label="Quantita totale" value={<NumberValue value={totalQuantity} />} />
          <SummaryLine label="Maggiorazioni" value={String(linkedCount)} />
          <SummaryLine
            label="Ribasso gara"
            value={
              economicRules.discountEnabled
                ? `${economicRules.discountPercent.toLocaleString("it-IT")} %`
                : "Disattivo"
            }
          />
        </div>
        <div className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryLine label="Valore ribasso" tone="danger" value={<Currency value={summary.discountAmount} />} />
          <SummaryLine label="Budget residuo" value={<Currency value={summary.budgetResidual} />} />
          <SummaryLine label="Totale progressivo SAL" tone="info" value={<Currency value={summary.total} />} />
        </div>
      </BezelSurface>

      <AccountingRows lines={lineViews} />

      <BezelSurface innerClassName="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <span className="text-[16px] font-semibold text-[var(--text-secondary)]">
          Totale SAL
        </span>
        <span className="text-[20px] font-bold text-[var(--info-base)]">
          <Currency value={summary.total} />
        </span>
      </BezelSurface>

      <StepNavigation
        canGoBack={canGoBack}
        onBack={onBack}
        onPrimary={onPrimary}
        primaryLabel={primaryLabel}
      />
    </div>
  );
}

function VerifyStep({
  canGoBack,
  checks,
  economicRules,
  lineViews,
  onBack,
  onPrimary,
  primaryLabel,
  summary,
}: {
  canGoBack: boolean;
  checks: ReturnType<typeof buildVerificationChecks>;
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  summary: SalEconomicSummary;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StepMetric label="Totale SAL" value={<Currency value={summary.total} />} />
        <StepMetric
          label="Voci principali"
          value={String(lineViews.filter((line) => !line.voice.isSafetyCost).length)}
        />
        <StepMetric
          label="Controlli OK"
          tone="success"
          value={`${checks.filter((check) => check.tone === "success").length} / ${checks.length}`}
        />
        <StepMetric
          label="Budget residuo"
          tone="warning"
          value={<Currency value={summary.budgetResidual} />}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <BezelSurface innerClassName="p-4 md:p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
            <Wallet className="size-4 text-[var(--info-base)]" />
            Riepilogo economico
          </div>
          <dl className="mt-4 space-y-1">
            <SummaryLine label="Imponibile soggetto a ribasso" value={<Currency value={summary.discountableAmount} />} />
            <SummaryLine label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`} value={<Currency value={-summary.discountAmount} />} tone="danger" />
            <SummaryLine label="Importo maggiorazioni" value={<Currency value={summary.linkedChargeAmount} />} />
            <SummaryLine label="Importo voci OS" value={<Currency value={summary.safetyAmount} />} />
            <SummaryLine label="TOTALE SAL" value={<Currency value={summary.total} />} tone="info" />
          </dl>
        </BezelSurface>
        <BezelSurface innerClassName="p-4 md:p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
            <ShieldCheck className="size-4 text-[var(--info-base)]" />
            Controlli contabili
          </div>
          <div className="mt-4 space-y-2">
            {checks.map((check) => (
              <CheckRow check={check} key={check.id} />
            ))}
          </div>
        </BezelSurface>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <BezelSurface innerClassName="p-4 md:p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
            <ClipboardList className="size-4 text-[var(--info-base)]" />
            Dettaglio voci
          </div>
          <div className="mt-4">
            <AccountingRows lines={lineViews} />
          </div>
        </BezelSurface>
        <BezelSurface innerClassName="p-4 md:p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
            <FileText className="size-4 text-[var(--info-base)]" />
            Anteprima documento
          </div>
          <div className="mt-4">
            <DocumentPreview compact lines={lineViews} />
          </div>
        </BezelSurface>
      </div>
      <BezelSurface innerClassName="p-4 md:p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <FileText className="size-4 text-[var(--info-base)]" />
          Note e validazione
        </div>
        <textarea
          aria-label="Note facoltative sulla coerenza contabile del SAL"
          className="mt-4 min-h-[72px] w-full resize-y rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-3 text-[13px] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          placeholder="Inserisci note o osservazioni sulla coerenza contabile del SAL..."
        />
      </BezelSurface>

      <StepNavigation
        canGoBack={canGoBack}
        onBack={onBack}
        onPrimary={onPrimary}
        primaryLabel={primaryLabel}
      />
    </div>
  );
}

function ConfirmStep({
  canGoBack,
  economicRules,
  lineViews,
  onBack,
  onPrimary,
  primaryLabel,
  summary,
}: {
  canGoBack: boolean;
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  summary: SalEconomicSummary;
}) {
  const totalItems = lineViews.length;
  const safetyItems = lineViews.filter((line) => line.voice.isSafetyCost).length;
  const linkedItems = lineViews.reduce((sum, line) => sum + line.linkedCharges.length, 0);

  return (
    <div className="space-y-5">
      <FeedbackBanner
        message="La verifica e stata completata con successo. La documentazione contabile e pronta per conferma ed export."
        title="SAL pronta per la conferma"
        tone="success"
      />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <BezelSurface innerClassName="p-4 md:p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
            <Wallet className="size-4 text-[var(--info-base)]" />
            Chiusura economica
          </div>
          <dl className="mt-4 space-y-1">
            <SummaryLine label="Importo lordo tariffa" value={<Currency value={summary.grossAmount} />} />
            <SummaryLine label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`} value={<Currency value={-summary.discountAmount} />} tone="danger" />
            <SummaryLine label="Totale netto" value={<Currency value={summary.netDiscountableAmount} />} />
            <SummaryLine label="Voci OS" value={<Currency value={summary.safetyAmount} />} />
            <SummaryLine label="Maggiorazioni" value={<Currency value={summary.linkedChargeAmount} />} />
            <SummaryLine label="Totale complessivo" value={<Currency value={summary.total} />} tone="info" />
          </dl>
        </BezelSurface>
        <div className="grid gap-5 md:grid-cols-2">
          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <FileText className="size-4 text-[var(--info-base)]" />
              Output documentali
            </div>
            <div className="mt-4 space-y-3">
              <OutputRow disabled icon={<FileText className="size-5 text-[var(--danger-base)]" />} label="PDF libretto" />
              <OutputRow disabled icon={<FileSpreadsheet className="size-5 text-[var(--success-base)]" />} label="Excel dettaglio" />
              <OutputRow disabled icon={<Printer className="size-5 text-[var(--info-base)]" />} label="Stampa contabilita" />
            </div>
          </BezelSurface>
          <BezelSurface innerClassName="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <ClipboardList className="size-4 text-[var(--info-base)]" />
              Conteggio voci
            </div>
            <dl className="mt-4 space-y-1">
              <SummaryLine label="Voci principali" value={String(totalItems - safetyItems)} />
              <SummaryLine label="Maggiorazioni" value={String(linkedItems)} />
              <SummaryLine label="Voci OS" value={String(safetyItems)} />
              <SummaryLine label="Totale voci" value={String(totalItems + linkedItems)} />
            </dl>
          </BezelSurface>
        </div>
      </div>
      <BezelSurface innerClassName="p-4 md:p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <FileText className="size-4 text-[var(--info-base)]" />
          Anteprima contabilita
        </div>
        <div className="mt-4">
          <DocumentPreview lines={lineViews} />
        </div>
      </BezelSurface>

      <StepNavigation
        canGoBack={canGoBack}
        onBack={onBack}
        onPrimary={onPrimary}
        primaryLabel={primaryLabel}
      />
    </div>
  );
}

function DetailView({
  createdSalTitle,
  lineViews,
  onClose,
  onNew,
  project,
  summary,
}: {
  createdSalTitle: string;
  lineViews: SalLineView[];
  onClose: () => void;
  onNew: () => void;
  project: SalProjectContext | null;
  summary: SalEconomicSummary;
}) {
  return (
    <>
      <SalHero
        icon={BarChart3}
        projectTitle={project?.title}
        step={5}
        subtitle="Dettaglio economico e stato di avanzamento della SAL"
        statusLabel="SAL confermata"
        tariffYear={lineViews[0]?.voice.tariffYear}
        title={createdSalTitle}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StepMetric label="Totale SAL" value={<Currency value={summary.total} />} />
        <StepMetric label="Voci contabilizzate" value={String(lineViews.length)} />
        <StepMetric label="Ultimo aggiornamento" value="27 Apr 2026 - 17:40" />
        <StepMetric label="Impatto sul budget" value={`${summary.budgetResidual < 0 ? "-" : ""}0,0%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SalCard title="Registro contabile SAL">
          <AccountingRows lines={lineViews} />
        </SalCard>
        <div className="space-y-4">
          <SalCard title="Presidio SAL">
            <SummaryLine label="Progetto" value={project?.title ?? "Non disponibile"} />
            <SummaryLine
              label="Periodo"
              value={`${project?.periodStart ?? "-"} - ${project?.periodEnd ?? "-"}`}
            />
            <SummaryLine label="Responsabile" value={project?.manager ?? "Non assegnato"} />
            <SummaryLine
              label="Totale documento"
              value={<Currency value={summary.total} />}
              tone="info"
            />
          </SalCard>
          <SalCard title="Struttura economica SAL">
            <SummaryLine
              label="Importo lordo tariffa"
              value={<Currency value={summary.grossAmount} />}
            />
            <SummaryLine
              label="Ribasso gara"
              value={<Currency value={-summary.discountAmount} />}
              tone="danger"
            />
            <SummaryLine label="Totale voci OS" value={<Currency value={summary.safetyAmount} />} />
            <SummaryLine
              label="Totale complessivo"
              value={<Currency value={summary.total} />}
              tone="info"
            />
          </SalCard>
          <SalCard title="Documenti collegati">
            <OutputRow
              disabled
              icon={<FileText className="size-5 text-danger" />}
              label={`${createdSalTitle}.pdf`}
            />
            <div className="mt-3">
              <OutputRow
                disabled
                icon={<FileSpreadsheet className="size-5 text-success" />}
                label={`${createdSalTitle}.xlsx`}
              />
            </div>
          </SalCard>
          <SalCard title="Attivita recenti">
            <div className="flex items-start gap-3 text-sm">
              <ReceiptText className="mt-0.5 size-4 text-success" />
              <div>
                <div className="font-semibold">SAL confermata</div>
                <div className="text-xs text-secondary">
                  Documento registrato nel flusso locale SAL.
                </div>
              </div>
            </div>
          </SalCard>
          <button
            className="sal-secondary-button w-full justify-center"
            onClick={onClose}
            type="button"
          >
            Chiudi
          </button>
          <button
            className="sal-primary-button w-full justify-center"
            onClick={onNew}
            type="button"
          >
            Nuova revisione
          </button>
        </div>
      </div>
    </>
  );
}

function StepMetric({
  label,
  tone = "info",
  value,
}: {
  label: string;
  tone?: "info" | "success" | "warning";
  value: ReactNode;
}) {
  return (
    <BezelSurface innerClassName="flex items-center gap-4 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
        <Wallet className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-1 text-[20px] font-bold leading-none",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "info" && "text-[var(--info-base)]",
          )}
        >
          {value}
        </div>
      </div>
    </BezelSurface>
  );
}

function StepNavigation({
  canGoBack,
  onBack,
  onPrimary,
  primaryLabel,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        {canGoBack ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--bg-muted)] px-5 text-[13px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-4" />
            Indietro
          </button>
        ) : null}
      </div>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-6 text-[13px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary)]/90"
        onClick={onPrimary}
        type="button"
      >
        {primaryLabel}
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
        {label}
      </span>
      <div className="mt-1 text-[14px] font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ContextTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "success";
  value: ReactNode;
}) {
  return (
    <div className="border-b border-subtle px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-secondary">{label}</div>
      <div
        className={
          tone === "success"
            ? "mt-1.5 truncate text-[17px] font-bold text-success"
            : "mt-1.5 truncate text-[17px] font-bold text-foreground"
        }
      >
        {value}
      </div>
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
    <div className="flex items-center justify-between gap-3 border-b border-subtle py-3 text-sm last:border-b-0">
      <span className="font-medium text-secondary">{label}</span>
      <strong
        className={
          tone === "danger"
            ? "font-bold text-danger"
            : tone === "success"
              ? "font-bold text-success"
              : tone === "warning"
                ? "font-bold text-warning"
                : tone === "info"
                  ? "font-bold text-primary"
                  : "font-bold text-foreground"
        }
      >
        {value}
      </strong>
    </div>
  );
}

function RuleChip({ label }: { label: string }) {
  return (
    <div className="rounded-[10px] border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
      {label}
    </div>
  );
}

function DiscountControl({
  economicRules,
  setEconomicRules,
}: {
  economicRules: SalEconomicRules;
  setEconomicRules: Dispatch<SetStateAction<SalEconomicRules>>;
}) {
  return (
    <div className="rounded-[10px] border border-primary/25 bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            checked={economicRules.discountEnabled}
            className="size-4 accent-[var(--accent-primary)]"
            onChange={(event) =>
              setEconomicRules((current) => ({
                ...current,
                discountEnabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Ribasso gara
        </label>
        <div className="flex items-center gap-1">
          <input
            aria-label="Percentuale ribasso gara"
            className="h-8 w-20 rounded-[8px] border border-subtle bg-card px-2 text-right text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            disabled={!economicRules.discountEnabled}
            max={100}
            min={0}
            onChange={(event) =>
              setEconomicRules((current) => ({
                ...current,
                discountPercent: Number.isFinite(event.target.valueAsNumber)
                  ? Math.min(100, Math.max(0, event.target.valueAsNumber))
                  : 0,
              }))
            }
            step="0.01"
            type="number"
            value={economicRules.discountPercent}
          />
          <span className="text-sm font-semibold text-secondary">%</span>
        </div>
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
      className={
        tone === "danger"
          ? "rounded-[16px] border border-danger/25 bg-danger/10 px-5 py-4 text-danger"
          : tone === "success"
            ? "rounded-[16px] border border-success/25 bg-success/10 px-5 py-4 text-success"
            : "rounded-[16px] border border-primary/25 bg-primary/10 px-5 py-4 text-primary"
      }
    >
      <div className="flex items-center gap-3">
        {tone === "success" ? (
          <CheckCircle2 className="size-6" />
        ) : tone === "danger" ? (
          <ShieldCheck className="size-6" />
        ) : (
          <Building2 className="size-6" />
        )}
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-0.5 text-sm opacity-90">{message}</div>
        </div>
      </div>
    </div>
  );
}

function disabledReason(
  phase: SalWorkflowPhase,
  project: SalProjectContext | null,
  tariffBook: SalTariffBookOption | null,
  lineViews: SalLineView[],
  hasDangerChecks: boolean,
) {
  if (phase === "context" && !project) {
    return "Serve un contratto reale prima di configurare una SAL.";
  }
  if (phase === "context" && !tariffBook) {
    return "Serve almeno un tariffario reale caricato nel sistema.";
  }
  if (phase === "voices" && lineViews.length === 0) {
    return "Seleziona almeno una voce tariffaria reale.";
  }
  if (phase === "voices") {
    return "Completa le quantita delle voci selezionate.";
  }
  if (phase === "review" && hasDangerChecks) {
    return "Risolvi gli errori bloccanti evidenziati nella verifica.";
  }
  return "Controlla le validazioni prima di procedere.";
}
