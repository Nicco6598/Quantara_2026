import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileText,
  FolderPlus,
  Plus,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import { PortfolioBurn } from "@/components/shared/charts";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { Panel } from "@/components/shared/Panel";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useToast } from "@/components/shared/ToastProvider";
import {
  buildActivityRows,
  buildFocusRows,
  buildGanttBars,
  buildDashboardRealitySummary,
  buildOverviewMetrics,
  buildPriorityActions,
  buildSalTimeline,
  PortfolioRealityPanel,
  PriorityActions,
  TimelineGantt,
} from "@/features/dashboard/components/DashboardSections";
import type {
  DashboardOperationalTotal,
  DashboardRealitySummary,
} from "@/features/dashboard/components/DashboardSections";
import type { PortfolioProject } from "@/features/projects/types";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import type { SalDocumentView } from "@/features/sal/domain/sal-workflow";
import { buildSalDocumentViews } from "@/features/sal/domain/sal-workflow";
import { useNavigate } from "@/hooks/useNavigate";
import { deleteDesktopContract, listDesktopContracts } from "@/lib/desktopData";
import {
  listDesktopSalDocuments,
  listDesktopSalProjects,
  migrateSalLocalStorageToBackend,
} from "@/lib/sal-data";
import { readStringRecord } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from "@/persistence/storage-keys";
import { useAuditLogStore } from "@/store/audit-log-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

let cachedGreeting: string | null = null;
let cachedGreetingHour: number | null = null;

const moneyCompactFormatter = new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const moneyFormatter = new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (cachedGreeting !== null && cachedGreetingHour === hour) {
    return cachedGreeting;
  }

  let greeting: string;
  if (hour < 6) greeting = "Buonanotte";
  else if (hour < 13) greeting = "Buongiorno";
  else if (hour < 18) greeting = "Buon pomeriggio";
  else greeting = "Buonasera";
  cachedGreeting = greeting;
  cachedGreetingHour = hour;
  return greeting;
}

function formatDashboardMoney(value: number, compact = false): string {
  return compact ? moneyCompactFormatter.format(value) : moneyFormatter.format(value);
}

function formatDashboardDate(value: string): string {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function salStatusLabel(status: string): string {
  if (status === "closed" || status === "approved") return "Approvato";
  if (status === "in-review") return "In revisione";
  if (status === "draft") return "Bozza";
  return status;
}

function buildOperationalTotals(projects: PortfolioProject[], views: SalDocumentView[]) {
  const budgetById = new Map(projects.map((p) => [p.id, p.budget.amount]));
  const totals = new Map<string, DashboardOperationalTotal>();

  for (const view of views) {
    const current = totals.get(view.projectId) ?? {
      approvedAmount: 0,
      approvedCount: 0,
      committedAmount: 0,
      draftAmount: 0,
      draftCount: 0,
      inReviewAmount: 0,
      inReviewCount: 0,
      lastSalDate: null,
      lastSalTotal: 0,
      progressPercent: 0,
      salCount: 0,
    };
    const committedAmount = current.committedAmount + view.total;
    const isApproved = view.status === "closed" || view.status === "approved";
    const isInReview = view.status === "in-review";
    const isDraft = view.status === "draft";
    const approvedAmount = isApproved
      ? current.approvedAmount + view.total
      : current.approvedAmount;
    const approvedCount = isApproved ? current.approvedCount + 1 : current.approvedCount;
    const inReviewAmount = isInReview
      ? current.inReviewAmount + view.total
      : current.inReviewAmount;
    const inReviewCount = isInReview ? current.inReviewCount + 1 : current.inReviewCount;
    const draftAmount = isDraft ? current.draftAmount + view.total : current.draftAmount;
    const draftCount = isDraft ? current.draftCount + 1 : current.draftCount;
    const salDate = view.closedAt || view.date;
    const lastSalDate =
      current.lastSalDate === null || new Date(salDate) > new Date(current.lastSalDate)
        ? salDate
        : current.lastSalDate;
    const lastSalTotal = lastSalDate === salDate ? view.total : current.lastSalTotal;
    const budget = budgetById.get(view.projectId) ?? 0;
    const progressPercent = budget > 0 ? Math.min(100, (committedAmount / budget) * 100) : 0;
    totals.set(view.projectId, {
      approvedAmount,
      approvedCount,
      committedAmount,
      draftAmount,
      draftCount,
      inReviewAmount,
      inReviewCount,
      lastSalDate,
      lastSalTotal,
      progressPercent,
      salCount: current.salCount + 1,
    });
  }

  return totals;
}

function buildDashboardSalViews(
  salDocuments: ReturnType<typeof useSalWorkflowStore.getState>["salDocuments"],
  tariffVoices: ReturnType<typeof useSalWorkflowStore.getState>["tariffVoices"],
): SalDocumentView[] {
  return salDocuments.map((doc) => {
    const cachedTotal =
      typeof doc.total === "number"
        ? doc.total
        : typeof (doc as { totalCents?: unknown }).totalCents === "number"
          ? (doc as { totalCents: number }).totalCents / 100
          : null;

    if (cachedTotal != null) {
      return {
        ...doc,
        lines: [],
        total: cachedTotal,
      } as SalDocumentView;
    }

    return buildSalDocumentViews([doc], tariffVoices)[0] as SalDocumentView;
  });
}

function DashboardSectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 min-w-0">
      <p className="text-11px font-medium text-[var(--text-tertiary)]">{eyebrow}</p>
      <h3 className="mt-0.5 text-16px font-semibold leading-tight text-[var(--text-primary)]">
        {title}
      </h3>
    </div>
  );
}

function DashboardPageHeader({
  onCreateProject,
  onImportTariff,
}: {
  onCreateProject: () => void;
  onImportTariff: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-12px font-medium text-[var(--text-tertiary)]">{timeGreeting()}</p>
        <h2 className="mt-1 text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
          Portafoglio lavori
        </h2>
        <p className="mt-2 max-w-2xl text-14px leading-6 text-[var(--text-secondary)]">
          Avanzamento, SAL e segnali di rischio dei cantieri attivi in una vista operativa.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button icon={Upload} onClick={onImportTariff} variant="outline">
          Importa tariffario
        </Button>
        <Button icon={FolderPlus} onClick={onCreateProject}>
          Crea progetto
        </Button>
      </div>
    </section>
  );
}

function DashboardEmptyState({
  onCreateProject,
  onImportTariff,
}: {
  onCreateProject: () => void;
  onImportTariff: () => void;
}) {
  return (
    <EmptyState
      action={{
        icon: FolderPlus,
        label: "Crea progetto",
        onClick: onCreateProject,
      }}
      className="mt-6 text-left [&>div]:mx-0 [&>p]:mx-0"
      description="Aggiungi un cantiere o importa un tariffario per iniziare a vedere budget, SAL, avanzamento e criticità senza pannelli vuoti."
      icon={ClipboardList}
      secondaryAction={{
        icon: Upload,
        label: "Importa tariffario",
        onClick: onImportTariff,
        variant: "secondary",
      }}
      title="Nessun dato operativo"
    />
  );
}

type DashboardMetric = ReturnType<typeof buildOverviewMetrics>[number];

function DashboardSummaryGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard {...metric} key={metric.label} />
        ))}
      </div>
    </section>
  );
}

function DashboardRiskBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger-base)_18%,var(--border-subtle))] bg-[var(--danger-soft)]/55 px-4 py-3 text-13px text-[var(--danger-base)]">
      <span className="flex min-w-0 items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 shrink-0" />
        <span>
          {count} budget critic{count === 1 ? "o" : "i"} da verificare
        </span>
      </span>
      <span className="hidden text-12px font-medium text-[var(--text-secondary)] md:inline">
        Priorità ordinate nel pannello a destra.
      </span>
    </div>
  );
}

function DashboardInsightRail({
  activities,
  distribution,
  onCreateProject,
  onCreateSal,
  onImportTariff,
  priorityActions,
  projectCount,
  summary,
}: {
  activities: string[];
  distribution: ReturnType<typeof buildFocusRows>;
  onCreateProject: () => void;
  onCreateSal: () => void;
  onImportTariff: () => void;
  priorityActions: PortfolioProject[];
  projectCount: number;
  summary: DashboardRealitySummary;
}) {
  return (
    <aside className="grid gap-4 xl:sticky xl:top-4">
      <Panel eyebrow="Decisioni" padding="lg" title="Priorità">
        <PriorityActions items={priorityActions} />
      </Panel>

      <LastSalPanel summary={summary} />

      <PortfolioStatusPanel distribution={distribution} projectCount={projectCount} />

      <Panel eyebrow="Azioni" padding="lg" title="Operazioni rapide">
        <div className="grid gap-2">
          <DashboardQuickAction
            description="Apre il flusso guidato di creazione SAL"
            icon={Plus}
            label="Nuova SAL"
            onClick={onCreateSal}
          />
          <DashboardQuickAction
            description="Crea un nuovo cantiere nel portafoglio"
            icon={FolderPlus}
            label="Crea progetto"
            onClick={onCreateProject}
          />
          <DashboardQuickAction
            description="Carica un tariffario o rivedi importazioni"
            icon={Upload}
            label="Importa tariffario"
            onClick={onImportTariff}
          />
        </div>
      </Panel>

      {activities.length > 0 ? <ActivityPanel activities={activities} /> : null}
    </aside>
  );
}

function LastSalPanel({ summary }: { summary: DashboardRealitySummary }) {
  const lastSal = summary.lastSal;

  return (
    <Panel eyebrow="Aggiornamento" padding="lg" title="Ultimo SAL">
      {lastSal ? (
        <div className="space-y-3">
          <div>
            <p className="truncate text-13px font-semibold text-[var(--text-primary)]">
              {lastSal.projectTitle}
            </p>
            <p className="mt-1 text-12px text-[var(--text-secondary)]">
              {formatDashboardDate(lastSal.date)} · {salStatusLabel(lastSal.status)}
            </p>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
            <span className="text-12px font-medium text-[var(--text-secondary)]">Importo</span>
            <span className="text-18px font-bold tabular-nums text-[var(--text-primary)]">
              {formatDashboardMoney(lastSal.amount)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-[var(--bg-muted)]/70 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info-base)]">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="text-13px font-semibold text-[var(--text-primary)]">Nessun SAL ancora</p>
            <p className="mt-1 text-12px leading-5 text-[var(--text-secondary)]">
              Crea il primo SAL per vedere avanzamento e maturato reale.
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

function PortfolioStatusPanel({
  distribution,
  projectCount,
}: {
  distribution: ReturnType<typeof buildFocusRows>;
  projectCount: number;
}) {
  return (
    <Panel eyebrow={`${projectCount} cantieri`} padding="lg" title="Stato portafoglio">
      <div className="space-y-3">
        {distribution.map((row) => {
          const value = Number(row.value);
          const percent = projectCount > 0 ? (value / projectCount) * 100 : 0;
          const toneClass =
            row.tone === "danger"
              ? "bg-[var(--danger-base)]"
              : row.tone === "warning"
                ? "bg-[var(--warning-base)]"
                : "bg-[var(--success-base)]";

          return (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-12px">
                <span className="font-medium text-[var(--text-secondary)]">{row.label}</span>
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  {row.value}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
                <div
                  className={cn("h-full rounded-full", toneClass)}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function DashboardQuickAction({
  description,
  icon: Icon,
  label,
  onClick,
}: {
  description: string;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 text-left transition-[background,border-color] duration-fast hover:border-[color-mix(in_srgb,var(--accent-primary)_24%,var(--border-subtle))] hover:bg-[var(--bg-muted)]"
      onClick={onClick}
      type="button"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info-base)]">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-13px font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-11px text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ActivityPanel({ activities }: { activities: string[] }) {
  return (
    <Panel eyebrow="Registro" padding="lg" title="Attività recenti">
      <div className="space-y-3">
        {activities.slice(0, 4).map((activity) => {
          const [time, ...rest] = activity.split(" · ");
          const detail = rest.join(" · ");
          return (
            <div className="grid grid-cols-[48px_1fr] gap-2" key={activity}>
              <span className="text-10px font-medium tabular-nums text-[var(--text-secondary)]">
                {time}
              </span>
              <span className="text-12px font-medium leading-4 text-[var(--text-primary)]">
                {detail}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function DashboardScreen() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const salDocuments = useSalWorkflowStore((s) => s.salDocuments);
  const tariffVoices = useSalWorkflowStore((s) => s.tariffVoices);
  const auditEntries = useAuditLogStore((s) => s.entries);

  const handleOpenProject = useCallback(
    (project: PortfolioProject) => {
      try {
        window.sessionStorage.setItem(
          SESSION_STORAGE_KEYS.selectedProjectDetail,
          JSON.stringify(project),
        );
      } catch {
        /* no-op */
      }
      navigate("project-detail");
    },
    [navigate],
  );

  useEffect(() => {
    const abort = new AbortController();

    Promise.all([
      listDesktopContracts([]),
      migrateSalLocalStorageToBackend().then(() =>
        Promise.all([listDesktopSalDocuments(null), listDesktopSalProjects()]),
      ),
    ])
      .then(([contracts, [salDocs, salProjects]]) => {
        if (abort.signal.aborted) return;
        const contractors = readStringRecord(STORAGE_KEYS.projectContractors);
        setProjects(
          contracts.data.map((contract) =>
            mapContractToProject(contract, contractors[contract.id]),
          ),
        );
        useSalWorkflowStore
          .getState()
          .initializeFromBackend(
            salDocs.data,
            salProjects.data,
            useSalWorkflowStore.getState().tariffVoices,
          );
      })
      .catch(() => {
        if (abort.signal.aborted) return;
        notify({
          title: "Caricamento fallito",
          message: "Impossibile caricare i progetti. Verifica la connessione al database locale.",
          tone: "danger",
        });
      });

    return () => abort.abort();
  }, [notify]);

  const views = useMemo(
    () => buildDashboardSalViews(salDocuments, tariffVoices),
    [salDocuments, tariffVoices],
  );

  const viewsByProjectId = useMemo(() => {
    const map = new Map<string, (typeof views)[number][]>();
    for (const v of views) {
      const existing = map.get(v.projectId) || [];
      existing.push(v);
      map.set(v.projectId, existing);
    }
    return map;
  }, [views]);

  const salTimeline = useMemo(() => buildSalTimeline(projects, views), [projects, views]);

  const operationalTotals = useMemo(
    () => buildOperationalTotals(projects, views),
    [projects, views],
  );

  const realitySummary = useMemo(
    () => buildDashboardRealitySummary(projects, views, operationalTotals),
    [projects, views, operationalTotals],
  );

  const metrics = useMemo(
    () => buildOverviewMetrics(projects, realitySummary),
    [projects, realitySummary],
  );
  const distribution = useMemo(() => buildFocusRows(projects), [projects]);
  const priorityActions = useMemo(() => buildPriorityActions(projects), [projects]);

  const ganttBars = useMemo(() => buildGanttBars(projects, salTimeline), [projects, salTimeline]);

  const activities = useMemo(() => buildActivityRows(auditEntries), [auditEntries]);

  const totalBudget = useMemo(() => {
    let sum = 0;
    for (const p of projects) sum += p.budget.amount;
    return sum;
  }, [projects]);

  const totalSal = useMemo(() => {
    let sum = 0;
    for (const v of views) sum += v.total;
    return sum;
  }, [views]);

  const escalationCount = realitySummary.budgetOverrunCount;

  const handleCreateProject = useCallback(() => {
    navigate("project-create");
  }, [navigate]);

  const handleImportTariff = useCallback(() => {
    navigate("tariffs");
  }, [navigate]);

  const handleCreateSal = useCallback(() => {
    navigate("sal-create");
  }, [navigate]);

  async function handleDeleteProject(projectId: string) {
    try {
      await deleteDesktopContract(projectId);
      setProjects((current) => current.filter((p) => p.id !== projectId));
      useSalWorkflowStore.setState((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        salDocuments: state.salDocuments.filter((sal) => sal.projectId !== projectId),
        activeProjectId: state.activeProjectId === projectId ? "" : state.activeProjectId,
        activeSalId: state.salDocuments.some(
          (sal) => sal.id === state.activeSalId && sal.projectId === projectId,
        )
          ? ""
          : state.activeSalId,
      }));
      dispatchDataChanged();
      notify({
        title: "Progetto eliminato",
        message: "Il progetto, le relative SAL e i riferimenti sono stati eliminati.",
        tone: "success",
      });
    } catch (error) {
      notify({
        title: "Eliminazione non riuscita",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger",
      });
    }
  }

  return (
    <ScreenLayout gradient="dashboard-hero">
      <div className="space-y-8">
        <DashboardPageHeader
          onCreateProject={handleCreateProject}
          onImportTariff={handleImportTariff}
        />

        {projects.length === 0 && views.length === 0 ? (
          <DashboardEmptyState
            onCreateProject={handleCreateProject}
            onImportTariff={handleImportTariff}
          />
        ) : (
          <>
            <DashboardSummaryGrid metrics={metrics} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
              <div className="space-y-6">
                <DashboardRiskBanner count={escalationCount} />

                {projects.length > 0 || realitySummary.salCount > 0 ? (
                  <section className="animate-entry">
                    <DashboardSectionHeader eyebrow="Operatività" title="SAL, budget e rischio" />
                    <Panel className="mt-3" variant="default" padding="lg">
                      <PortfolioRealityPanel projects={projects} summary={realitySummary} />
                    </Panel>
                  </section>
                ) : null}

                {ganttBars.length > 0 ? (
                  <section className="animate-entry">
                    <DashboardSectionHeader
                      eyebrow="Pianificazione"
                      title="Timeline cantieri e SAL"
                    />
                    <Panel className="mt-3 overflow-hidden" variant="default" padding="none">
                      <TimelineGantt
                        bars={ganttBars}
                        projects={projects}
                        operationalByProjectId={operationalTotals}
                        onOpen={handleOpenProject}
                        onDelete={handleDeleteProject}
                      />
                    </Panel>
                  </section>
                ) : null}

                {totalSal > 0 ? (
                  <section className="animate-entry">
                    <DashboardSectionHeader eyebrow="Andamento" title="Cumulato SAL nel tempo" />
                    <Panel className="mt-3" variant="premium" padding="lg">
                      <PortfolioBurn
                        projects={projects}
                        viewsByProjectId={viewsByProjectId}
                        totalBudget={totalBudget}
                      />
                    </Panel>
                  </section>
                ) : null}
              </div>

              <DashboardInsightRail
                activities={activities}
                distribution={distribution}
                onCreateProject={handleCreateProject}
                onCreateSal={handleCreateSal}
                onImportTariff={handleImportTariff}
                priorityActions={priorityActions}
                projectCount={projects.length}
                summary={realitySummary}
              />
            </div>
          </>
        )}
      </div>
    </ScreenLayout>
  );
}
