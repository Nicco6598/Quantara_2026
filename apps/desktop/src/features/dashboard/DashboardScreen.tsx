import { Calculator } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/shared/MetricCard";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useToast } from "@/components/shared/ToastProvider";
import {
  buildActivityRows,
  buildFocusRows,
  buildGanttBars,
  buildOverviewMetrics,
  buildPriorityActions,
  buildSalTimeline,
  PriorityActions,
  RightRail,
  TimelineGantt,
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
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from "@/persistence/storage-keys";
import { PortfolioBurn } from "@/components/shared/charts";
import { useAuditLogStore } from "@/store/audit-log-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

let cachedGreeting: string | null = null;
let cachedGreetingHour: number | null = null;

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

function buildOperationalTotals(projects: PortfolioProject[], views: SalDocumentView[]) {
  const budgetById = new Map(projects.map((p) => [p.id, p.budget.amount]));
  const totals = new Map<
    string,
    { approvedAmount: number; committedAmount: number; progressPercent: number }
  >();

  for (const view of views) {
    const current = totals.get(view.projectId) ?? {
      approvedAmount: 0,
      committedAmount: 0,
      progressPercent: 0,
    };
    const committedAmount = current.committedAmount + view.total;
    const approvedAmount =
      view.status === "closed" || view.status === "approved"
        ? current.approvedAmount + view.total
        : current.approvedAmount;
    const budget = budgetById.get(view.projectId) ?? 0;
    const progressPercent = budget > 0 ? Math.min(100, (committedAmount / budget) * 100) : 0;
    totals.set(view.projectId, { approvedAmount, committedAmount, progressPercent });
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

  const metrics = useMemo(() => buildOverviewMetrics(projects), [projects]);
  const distribution = useMemo(() => buildFocusRows(projects), [projects]);
  const priorityActions = useMemo(() => buildPriorityActions(projects), [projects]);

  const ganttBars = useMemo(() => buildGanttBars(projects, salTimeline), [projects, salTimeline]);

  const operationalTotals = useMemo(
    () => buildOperationalTotals(projects, views),
    [projects, views],
  );

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

  const escalationCount = useMemo(
    () => projects.filter((p) => p.tone === "danger").length,
    [projects],
  );

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
    <ScreenLayout>
      <div className="space-y-8">
        <ScreenHero
          badge={timeGreeting()}
          title="Portafoglio lavori"
          description="Monitora avanzamento, SAL e segnali di rischio dei cantieri attivi."
          sidePanel={
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                    Budget totale
                  </p>
                  <p className="mt-2 text-28px font-semibold leading-none text-[var(--text-primary)]">
                    {totalBudget.toLocaleString("it-IT", {
                      style: "currency",
                      currency: "EUR",
                      minimumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                  <Calculator className="size-6" />
                </span>
              </div>
              <p className="mt-5 text-12px font-medium leading-5 text-[var(--text-secondary)]">
                {projects.length} cantier{projects.length === 1 ? "e" : "i"} ·{" "}
                {totalSal.toLocaleString("it-IT", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                })}{" "}
                SAL
                {escalationCount > 0 ? ` · ${escalationCount} criticita` : ""}
              </p>
            </div>
          }
        />

        <div className="animate-entry grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard {...metric} key={metric.label} />
          ))}
        </div>

        <PriorityActions items={priorityActions} />

        {ganttBars.length > 0 ? (
          <TimelineGantt
            bars={ganttBars}
            projects={projects}
            operationalByProjectId={operationalTotals}
            onOpen={handleOpenProject}
            onDelete={handleDeleteProject}
          />
        ) : (
          <p className="py-6 text-center text-13px text-[var(--text-secondary)]">
            Nessun cantiere con SAL registrate.
          </p>
        )}

        <PortfolioBurn
          projects={projects}
          viewsByProjectId={viewsByProjectId}
          totalBudget={totalBudget}
        />

        <RightRail
          activities={activities}
          distribution={distribution}
          projectCount={projects.length}
        />
      </div>
    </ScreenLayout>
  );
}
