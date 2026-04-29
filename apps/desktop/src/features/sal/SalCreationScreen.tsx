import {
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
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
import { ScreenShell } from "@/components/shared/Screen";
import { useToast } from "@/components/shared/ToastProvider";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
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
  StatusPill,
} from "./components/SalCreationTables";
import {
  buildLineViews,
  buildVerificationChecks,
  defaultSalEconomicRules,
  summarizeSalLines,
} from "./domain/sal-calculations";
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

const previousProgressiveAmount = 18_000;

export function SalCreationScreen() {
  const { notify } = useToast();
  const data = useSalCreationData();
  const createSalProjectWithId = useSalWorkflowStore((state) => state.createProjectWithId);
  const createClosedSal = useSalWorkflowStore((state) => state.createClosedSal);
  const [phase, setPhase] = useState<SalWorkflowPhase>("context");
  const [lines, setLines] = useState<SalLineDraft[]>([]);
  const [economicRules, setEconomicRules] = useState<SalEconomicRules>(defaultSalEconomicRules);
  const [createdSalTitle, setCreatedSalTitle] = useState("SAL 01 - Periodo corrente");
  const derived = useMemo(() => {
    const contractAmount = data.project?.contractAmount ?? 0;
    const lineViews = buildLineViews(lines, economicRules);
    const summary = summarizeSalLines(lineViews, contractAmount, previousProgressiveAmount);
    const checks = buildVerificationChecks(lineViews, summary);
    const selectedIds = new Set(lines.map((line) => line.voice.id));

    return { checks, lineViews, selectedIds, summary };
  }, [data.project?.contractAmount, economicRules, lines]);
  const { checks, lineViews, selectedIds, summary } = derived;
  const hasDangerChecks = checks.some((check) => check.tone === "danger");
  const blockedPhases = useMemo(() => {
    const blocked = new Set<SalWorkflowPhase>();

    if (!data.project || !data.selectedTariffBook) {
      blocked.add("context");
    }

    if (lines.length === 0 || lineViews.some((line) => line.status !== "complete")) {
      blocked.add("review");
    }

    if (lines.length === 0 || hasDangerChecks) {
      blocked.add("confirm");
    }

    return blocked;
  }, [data.project, data.selectedTariffBook, hasDangerChecks, lineViews, lines.length]);
  const stages = useMemo(() => buildWorkflowStages(phase, blockedPhases), [blockedPhases, phase]);

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
        ? Boolean(data.project && data.selectedTariffBook)
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
          data.selectedTariffBook,
          lineViews,
          hasDangerChecks,
        ),
        title: "Azione non disponibile",
        tone: "warning",
      });
      return;
    }

    if (phase !== "confirm" && phase !== "completed") {
      setPhase(getNextPhase(phase));
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
    setPhase("completed");
    notify({
      message: `${created.title} confermata. Gli export sono disponibili quando il backend documentale li abilita.`,
      title: "SAL confermata",
      tone: "success",
    });
  }

  const primaryLabel = phase === "review" || phase === "confirm" ? "Conferma" : "Continua";

  return (
    <ScreenShell className="min-h-full space-y-4 bg-[var(--bg-muted)] p-0">
      <SalWorkflowTopbar
        canGoBack={phase !== "context"}
        onBack={() =>
          phase === "completed" ? setPhase("confirm") : setPhase(getPreviousPhase(phase))
        }
        onDraft={saveDraft}
        onPrimary={goPrimary}
        primaryLabel={primaryLabel}
        showPrimary={phase !== "completed"}
      />

      <div className="space-y-4 px-7 pb-7">
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
            onNew={() => setPhase("context")}
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
            <SalStepper stages={stages} />
            {phase === "context" ? (
              <SetupStep
                project={data.project}
                selectedTariffBook={data.selectedTariffBook}
                selectTariffBook={data.selectTariffBook}
                setEconomicRules={setEconomicRules}
                economicRules={economicRules}
                summary={summary}
                tariffBooks={data.tariffBookOptions}
                voicesCount={data.voices.length}
              />
            ) : null}
            {phase === "voices" ? (
              <VoicesStep
                lineViews={lineViews}
                lines={lines}
                onFactorChange={setFactor}
                onRemove={removeLine}
                onSurcharge={setSurcharge}
                onToggle={upsertLine}
                selectedIds={selectedIds}
                summary={summary}
                voices={data.voices}
                economicRules={economicRules}
              />
            ) : null}
            {phase === "review" ? (
              <VerifyStep
                checks={checks}
                economicRules={economicRules}
                lineViews={lineViews}
                summary={summary}
              />
            ) : null}
            {phase === "confirm" ? (
              <ConfirmStep economicRules={economicRules} lineViews={lineViews} summary={summary} />
            ) : null}
          </>
        )}
      </div>
    </ScreenShell>
  );
}

function SetupStep({
  economicRules,
  project,
  selectedTariffBook,
  selectTariffBook,
  setEconomicRules,
  summary,
  tariffBooks,
  voicesCount,
}: {
  economicRules: SalEconomicRules;
  project: SalProjectContext | null;
  selectedTariffBook: SalTariffBookOption | null;
  selectTariffBook: (tariffBookId: string) => Promise<void>;
  setEconomicRules: Dispatch<SetStateAction<SalEconomicRules>>;
  summary: SalEconomicSummary;
  tariffBooks: SalTariffBookOption[];
  voicesCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="sal-panel grid gap-0 overflow-hidden p-0 md:grid-cols-4">
        <ContextTile
          label="Contratto"
          value={project?.applicationContractCode ?? "Non disponibile"}
        />
        <ContextTile label="Documento" value={project?.salTitle ?? "SAL da creare"} />
        <ContextTile label="Tariffario" value={selectedTariffBook?.name ?? "Non selezionato"} />
        <ContextTile
          label="Residuo stimato"
          tone="success"
          value={<Currency value={summary.budgetResidual} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px_340px]">
        <SalCard title="Contesto contrattuale e documento">
          {project ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <ReadOnlyField label="Appaltatore" value={project.contractor} />
                <ReadOnlyField label="Impresa" value={project.contractor} />
                <ReadOnlyField label="Progetto / Contratto" value={project.title} />
                <ReadOnlyField label="Atto contrattuale" value={project.applicationContractCode} />
                <ReadOnlyField label="Linea / Lotto" value={project.location} />
                <ReadOnlyField label="Tipo documento" value="SAL" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_260px]">
                <ReadOnlyField label="Nome documento / Nome SAL" value={project.salTitle} />
                <ReadOnlyField
                  label="Anno tariffario"
                  value={String(selectedTariffBook?.year ?? "Non selezionato")}
                />
              </div>
              <div className="mt-5 rounded-[14px] border border-subtle bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Calculator className="size-4 text-primary" />
                  Regole economiche
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(260px,1.1fr)_1fr_1fr_1fr]">
                  <DiscountControl
                    economicRules={economicRules}
                    setEconomicRules={setEconomicRules}
                  />
                  <RuleChip
                    label={economicRules.discountEnabled ? "Ribasso attivo" : "Ribasso disattivato"}
                  />
                  <RuleChip label="Arrotonda al centesimo" />
                  <RuleChip label="Voci OS abilitate" />
                </div>
              </div>
            </>
          ) : (
            <EmptyPanel message="Nessun contratto reale disponibile. Crea o importa un contratto prima di generare una SAL." />
          )}
        </SalCard>

        <SalCard icon={ShieldCheck} title="Presidio economico">
          <SummaryLine
            label="Importo contrattuale"
            value={<Currency value={project?.contractAmount ?? 0} />}
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
          <SummaryLine label="Documento corrente" value={<Currency value={summary.total} />} />
          <SummaryLine
            label="Residuo stimato"
            value={<Currency value={summary.budgetResidual} />}
            tone="success"
          />
          <SummaryLine label="Voci OS" value="Escluse dal ribasso" />
          <SummaryLine label="Tariffari attivi" value={String(tariffBooks.length)} />
        </SalCard>

        <SalCard icon={ClipboardList} title="Workflow documento">
          {[
            "Contesto contrattuale",
            "Regole economiche",
            "Setup valorizzazione",
            "Inserimento voci",
            "Verifica contabile",
            "Conferma / Export",
          ].map((item, index) => (
            <div className="flex gap-3 pb-4 text-sm last:pb-0" key={item}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <div>
                <div className="font-semibold">{item}</div>
                <div className="text-xs text-secondary">Configurazione guidata del documento</div>
              </div>
            </div>
          ))}
        </SalCard>
      </div>

      <SalCard title="Setup valorizzazione">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <div className="rounded-[14px] border border-subtle bg-muted/20 p-4">
            <div className="text-sm font-semibold">Anno tariffario documento</div>
            <div className="mt-4 text-3xl font-semibold">{selectedTariffBook?.year ?? "-"}</div>
            <p className="mt-3 text-xs text-secondary">
              Le voci vengono lette dal tariffario selezionato.
            </p>
          </div>
          <div className="rounded-[14px] border border-primary/35 bg-primary/5 p-4">
            <div className="mb-3 text-sm font-semibold text-primary">Tariffe attive</div>
            <div className="grid gap-2">
              {tariffBooks.length === 0 ? (
                <div className="text-sm text-secondary">Nessun tariffario caricato.</div>
              ) : (
                tariffBooks.slice(0, 3).map((book) => (
                  <button
                    className="flex items-center justify-between rounded-[10px] border border-subtle bg-card px-3 py-2 text-left text-sm hover:border-primary/40"
                    key={book.id}
                    onClick={() => void selectTariffBook(book.id)}
                    type="button"
                  >
                    <span className="font-semibold">{book.name}</span>
                    <StatusPill tone={selectedTariffBook?.id === book.id ? "info" : "success"}>
                      {book.isPriority ? `Priorita ${book.priority}` : book.status}
                    </StatusPill>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="rounded-[14px] border border-subtle p-4">
            <div className="text-sm font-semibold">Maggiorazioni compatibili</div>
            <div className="mt-4 grid gap-3">
              <RuleChip label="Diurna +10%" />
              <RuleChip label="Notturna +25%" />
            </div>
          </div>
          <div className="rounded-[14px] border border-subtle p-4">
            <div className="text-sm font-semibold">Criteri di ribasso</div>
            <SummaryLine label="Voci ordinarie" value="Soggette" />
            <SummaryLine label="Voci OS" value="Escluse" tone="warning" />
            <SummaryLine label="Voci disponibili" value={String(voicesCount)} />
          </div>
        </div>
      </SalCard>
    </div>
  );
}

function VoicesStep({
  economicRules,
  lineViews,
  lines,
  onFactorChange,
  onRemove,
  onSurcharge,
  onToggle,
  selectedIds,
  summary,
  voices,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  lines: SalLineDraft[];
  onFactorChange: (
    voiceId: string,
    field: "factor1" | "factor2" | "factor3",
    value: number,
  ) => void;
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
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(420px,0.95fr)_minmax(560px,1.35fr)]">
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
      <SalCard icon={Wallet} title="Riepilogo bozza SAL">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryLine label="Voci inserite" value={String(lines.length)} />
          <SummaryLine
            label="Quantita totale (misurata)"
            value={<NumberValue value={totalQuantity} />}
          />
          <SummaryLine label="Voci collegate (magg./interf.)" value={String(linkedCount)} />
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
          <SummaryLine
            label="Valore ribasso applicato"
            tone="danger"
            value={<Currency value={summary.discountAmount} />}
          />
          <SummaryLine label="Budget residuo" value={<Currency value={summary.budgetResidual} />} />
          <SummaryLine
            label="Totale progressivo SAL"
            tone="info"
            value={<Currency value={summary.total} />}
          />
        </div>
      </SalCard>
      <AccountingRows lines={lineViews} />
      <div className="sal-panel flex flex-wrap items-center justify-end gap-8 px-7 py-5 text-lg font-semibold">
        <span>Totale SAL</span>
        <span className="text-primary">
          <Currency value={summary.total} />
        </span>
      </div>
    </div>
  );
}

function VerifyStep({
  checks,
  economicRules,
  lineViews,
  summary,
}: {
  checks: ReturnType<typeof buildVerificationChecks>;
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  summary: SalEconomicSummary;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="TOTALE SAL" value={<Currency value={summary.total} />} />
        <Metric
          label="VOCI PRINCIPALI"
          value={String(lineViews.filter((line) => !line.voice.isSafetyCost).length)}
        />
        <Metric
          label="CONTROLLI CONTABILI OK"
          tone="success"
          value={`${checks.filter((check) => check.tone === "success").length} / ${checks.length}`}
        />
        <Metric
          label="BUDGET RESIDUO"
          tone="warning"
          value={<Currency value={summary.budgetResidual} />}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <SalCard title="Riepilogo economico">
          <SummaryLine
            label="Imponibile soggetto a ribasso"
            value={<Currency value={summary.discountableAmount} />}
          />
          <SummaryLine
            label={`Ribasso (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`}
            value={<Currency value={-summary.discountAmount} />}
            tone="danger"
          />
          <SummaryLine
            label="Importo maggiorazioni"
            value={<Currency value={summary.linkedChargeAmount} />}
          />
          <SummaryLine label="Importo voci OS" value={<Currency value={summary.safetyAmount} />} />
          <SummaryLine label="TOTALE SAL" value={<Currency value={summary.total} />} tone="info" />
        </SalCard>
        <SalCard title="Controlli contabili">
          {checks.map((check) => (
            <CheckRow check={check} key={check.id} />
          ))}
        </SalCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <SalCard title="Dettaglio voci">
          <AccountingRows lines={lineViews} />
        </SalCard>
        <SalCard title="Anteprima documento">
          <DocumentPreview compact lines={lineViews} />
        </SalCard>
      </div>
      <SalCard title="Note e validazione">
        <textarea
          aria-label="Note facoltative sulla coerenza contabile del SAL"
          className="min-h-[72px] w-full resize-y rounded-[12px] border border-subtle bg-card px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="Inserisci note o osservazioni sulla coerenza contabile del SAL..."
        />
      </SalCard>
    </div>
  );
}

function ConfirmStep({
  economicRules,
  lineViews,
  summary,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  summary: SalEconomicSummary;
}) {
  const totalItems = lineViews.length;
  const safetyItems = lineViews.filter((line) => line.voice.isSafetyCost).length;
  const linkedItems = lineViews.reduce((sum, line) => sum + line.linkedCharges.length, 0);

  return (
    <div className="space-y-4">
      <FeedbackBanner
        message="La verifica e stata completata con successo. La documentazione contabile e pronta per conferma ed export."
        title="SAL pronta per la conferma"
        tone="success"
      />
      <div className="grid gap-4 xl:grid-cols-[360px_360px_minmax(0,1fr)]">
        <SalCard title="Chiusura economica documento">
          <SummaryLine
            label="Importo lordo tariffa"
            value={<Currency value={summary.grossAmount} />}
          />
          <SummaryLine
            label={`Ribasso gara (${economicRules.discountEnabled ? economicRules.discountPercent.toLocaleString("it-IT") : "0"}%)`}
            value={<Currency value={-summary.discountAmount} />}
            tone="danger"
          />
          <SummaryLine
            label="Totale lavori al netto"
            value={<Currency value={summary.netDiscountableAmount} />}
          />
          <SummaryLine label="Totale voci OS" value={<Currency value={summary.safetyAmount} />} />
          <SummaryLine
            label="Totale maggiorazioni"
            value={<Currency value={summary.linkedChargeAmount} />}
          />
          <SummaryLine
            label="Totale complessivo documento"
            value={<Currency value={summary.total} />}
            tone="info"
          />
        </SalCard>
        <div className="space-y-4">
          <SalCard title="Output documentali">
            <div className="space-y-3">
              <OutputRow
                disabled
                icon={<FileText className="size-5 text-danger" />}
                label="PDF libretto"
              />
              <OutputRow
                disabled
                icon={<FileSpreadsheet className="size-5 text-success" />}
                label="Excel dettaglio"
              />
              <OutputRow
                disabled
                icon={<Printer className="size-5 text-primary" />}
                label="Stampa contabilita"
              />
            </div>
          </SalCard>
          <SalCard title="Conteggio voci">
            <SummaryLine label="Voci principali" value={String(totalItems - safetyItems)} />
            <SummaryLine label="Voci maggiorazione" value={String(linkedItems)} />
            <SummaryLine label="Voci OS" value={String(safetyItems)} />
            <SummaryLine label="Totale voci documento" value={String(totalItems + linkedItems)} />
          </SalCard>
        </div>
        <SalCard title="Anteprima contabilita (libretto misure)">
          <DocumentPreview lines={lineViews} />
        </SalCard>
      </div>
    </div>
  );
}

function DetailView({
  createdSalTitle,
  lineViews,
  onNew,
  project,
  summary,
}: {
  createdSalTitle: string;
  lineViews: SalLineView[];
  onNew: () => void;
  project: SalProjectContext | null;
  summary: SalEconomicSummary;
}) {
  return (
    <>
      <SalHero
        icon={BarChart3}
        step={5}
        subtitle="Dettaglio economico e stato di avanzamento della SAL"
        title={createdSalTitle}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Totale SAL" value={<Currency value={summary.total} />} />
        <Metric label="Voci contabilizzate" value={String(lineViews.length)} />
        <Metric label="Ultimo aggiornamento" value="27 Apr 2026 - 17:40" />
        <Metric label="Impatto sul budget" value={`${summary.budgetResidual < 0 ? "-" : ""}0,0%`} />
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

function Metric({
  label,
  tone = "info",
  value,
}: {
  label: string;
  tone?: "info" | "success" | "warning";
  value: ReactNode;
}) {
  return (
    <div className="sal-panel flex min-h-[102px] items-center gap-4 p-5">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Wallet className="size-6" />
      </div>
      <div>
        <div className="text-xs font-semibold text-secondary">{label}</div>
        <div
          className={
            tone === "success"
              ? "mt-2 text-2xl font-semibold text-success"
              : tone === "warning"
                ? "mt-2 text-2xl font-semibold text-warning"
                : "mt-2 text-2xl font-semibold text-primary"
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs font-semibold text-secondary">
      <span>{label}</span>
      <div className="mt-1 min-h-10 rounded-[10px] border border-subtle bg-card px-3 py-2 text-sm font-semibold text-foreground">
        {value}
      </div>
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
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
        {label}
      </div>
      <div
        className={
          tone === "success"
            ? "mt-1 truncate text-[15px] font-bold text-success"
            : "mt-1 truncate text-[15px] font-bold text-foreground"
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
      <span className="text-secondary">{label}</span>
      <strong
        className={
          tone === "danger"
            ? "text-danger"
            : tone === "success"
              ? "text-success"
              : tone === "warning"
                ? "text-warning"
                : tone === "info"
                  ? "text-primary"
                  : "text-foreground"
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

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-subtle bg-muted/30 px-4 py-8 text-center text-sm text-secondary">
      {message}
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
