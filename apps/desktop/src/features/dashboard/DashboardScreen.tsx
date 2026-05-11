import { Calculator, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface, MetricCard } from "@/components/shared/ui-primitives";
import {
  buildActivityRows,
  buildFocusRows,
  buildGanttBars,
  buildOverviewMetrics,
  buildPriorityActions,
  buildSalTimeline,
  OperationalSites,
  PriorityActions,
  RightRail,
  TimelineGantt,
} from "@/features/dashboard/components/DashboardSections";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import type { PortfolioProject } from "@/features/projects/types";
import { buildSalDocumentViews } from "@/features/sal/domain/sal-workflow";
import type { SalDocumentView } from "@/features/sal/domain/sal-workflow";
import { deleteDesktopContract, listDesktopContracts } from "@/lib/desktopData";
import { readStringRecord } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { useNavigate } from "@/hooks/useNavigate";
import { useAuditLogStore } from "@/store/audit-log-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Buonanotte";
  if (hour < 13) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
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
      view.status === "closed" ? current.approvedAmount + view.total : current.approvedAmount;
    const budget = budgetById.get(view.projectId) ?? 0;
    const progressPercent = budget > 0 ? Math.min(100, (committedAmount / budget) * 100) : 0;
    totals.set(view.projectId, { approvedAmount, committedAmount, progressPercent });
  }

  return totals;
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
        window.sessionStorage.setItem("quantara.selectedProjectDetail.v1", JSON.stringify(project));
      } catch {
        /* no-op */
      }
      navigate("project-detail");
    },
    [navigate],
  );

  useEffect(() => {
    const abort = new AbortController();

    listDesktopContracts([])
      .then((contracts) => {
        if (abort.signal.aborted) return;
        const contractors = readStringRecord("quantara.projectContractors.v1");
        setProjects(contracts.data.map((c) => mapContractToProject(c, contractors[c.id])));
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

  const derived = useMemo(() => {
    const views = buildSalDocumentViews(salDocuments, tariffVoices);
    const salTimeline = buildSalTimeline(projects, views);

    return {
      metrics: buildOverviewMetrics(projects),
      distribution: buildFocusRows(projects),
      activities: buildActivityRows(auditEntries),
      priorityActions: buildPriorityActions(projects),
      ganttBars: buildGanttBars(projects, salTimeline),
      totalBudget: projects.reduce((s, p) => s + p.budget.amount, 0),
      totalSal: views.reduce((sum, v) => sum + v.total, 0),
      escalationCount: projects.filter((p) => p.tone === "danger").length,
      operationalTotals: buildOperationalTotals(projects, views),
      salTimeline,
    };
  }, [projects, salDocuments, tariffVoices, auditEntries]);

  async function handleDeleteProject(projectId: string) {
    try {
      await deleteDesktopContract(projectId);
      setProjects((current) => current.filter((p) => p.id !== projectId));
      dispatchDataChanged();
      notify({
        title: "Progetto eliminato",
        message: "Il progetto e stato rimosso dalla dashboard.",
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
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      <div className="grid min-w-0 gap-8 lg:gap-10 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
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
                      {derived.totalBudget.toLocaleString("it-IT", {
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
                  {derived.totalSal.toLocaleString("it-IT", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                  })}{" "}
                  SAL
                  {derived.escalationCount > 0 ? ` · ${derived.escalationCount} criticita` : ""}
                </p>
              </div>
            }
          />

          <div className="animate-entry grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {derived.metrics.map((metric) => (
              <MetricCard {...metric} key={metric.label} />
            ))}
          </div>

          <PriorityActions items={derived.priorityActions} />

          <BezelSurface innerClassName="p-4">
            <div className="mb-4 flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--info-base)]">
              <TrendingUp className="size-4" />
              Timeline cantieri
            </div>
            {derived.ganttBars.length > 0 ? (
              <TimelineGantt bars={derived.ganttBars} />
            ) : (
              <p className="py-6 text-center text-13px text-[var(--text-secondary)]">
                Nessun cantiere con SAL registrate.
              </p>
            )}
          </BezelSurface>

          <OperationalSites
            onDeleteProject={handleDeleteProject}
            onOpenProject={handleOpenProject}
            operationalByProjectId={derived.operationalTotals}
            projects={projects}
          />
        </div>

        <RightRail
          activities={derived.activities}
          distribution={derived.distribution}
          projectCount={projects.length}
        />
      </div>
    </main>
  );
}
