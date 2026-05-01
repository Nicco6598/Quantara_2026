import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import {
  buildActionSummary,
  buildActivityRows,
  buildFocusRows,
  buildMilestones,
  buildOverviewMetrics,
  Hero,
  Milestones,
  OperationalSites,
  PriorityActions,
  RightRail,
} from "@/features/dashboard/components/DashboardSections";
import { MetricCard } from "@/features/projects/components/workspace-ui";
import { mapContractToProject, type PortfolioProject } from "@/features/projects/ProjectsScreen";
import { readStringRecord } from "@/features/projects/utils/projects-helpers";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { deleteDesktopContract, listDesktopContracts } from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

export function DashboardScreen() {
  const { notify } = useToast();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);

  useEffect(() => {
    const abort = new AbortController();

    listDesktopContracts([])
      .then((contracts) => {
        if (abort.signal.aborted) return;
        const projectContractors = readStringRecord("quantara.projectContractors.v1");
        setProjects(
          contracts.data.map((contract) =>
            mapContractToProject(contract, projectContractors[contract.id]),
          ),
        );
      })
      .catch(() => {
        if (abort.signal.aborted) return;
        notify({
          message: "Impossibile caricare i progetti. Verifica la connessione al database locale.",
          title: "Caricamento fallito",
          tone: "danger",
        });
      });

    return () => {
      abort.abort();
    };
  }, [notify]);

  const metrics = useMemo(() => buildOverviewMetrics(projects), [projects]);
  const distribution = useMemo(() => buildFocusRows(projects), [projects]);
  const activities = useMemo(() => buildActivityRows(projects), [projects]);
  const priorityActions = useMemo(() => buildActionSummary(projects), [projects]);
  const milestones = useMemo(() => buildMilestones(projects), [projects]);
  const operationalByProjectId = useMemo(() => {
    const totals = new Map<
      string,
      { approvedAmount: number; committedAmount: number; progressPercent: number }
    >();
    const contractBudgetById = new Map(
      projects.map((project) => [project.id, project.budget.amount]),
    );

    for (const document of salDocuments) {
      const view = buildSalDocumentView(document, tariffVoices);
      const current = totals.get(document.projectId) ?? {
        approvedAmount: 0,
        committedAmount: 0,
        progressPercent: 0,
      };

      const committedAmount = current.committedAmount + view.total;
      const approvedAmount =
        document.status === "closed" ? current.approvedAmount + view.total : current.approvedAmount;
      const budgetAmount = contractBudgetById.get(document.projectId) ?? 0;
      const progressPercent =
        budgetAmount > 0 ? Math.min(100, (committedAmount / budgetAmount) * 100) : 0;

      totals.set(document.projectId, {
        approvedAmount,
        committedAmount,
        progressPercent,
      });
    }

    return totals;
  }, [projects, salDocuments, tariffVoices]);

  async function handleDeleteProject(projectId: string) {
    try {
      await deleteDesktopContract(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
      dispatchDataChanged();
      notify({
        message: "Il progetto e stato rimosso dalla dashboard.",
        title: "Progetto eliminato",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Eliminazione non riuscita",
        tone: "danger",
      });
    }
  }

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      <div className="grid min-w-0 gap-6 md:gap-7 2xl:grid-cols-[minmax(0,1fr)_320px] 2xl:gap-8">
        <main className="min-w-0 space-y-6">
          <Hero />

          <div className="animate-entry grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {metrics.map((metric) => (
              <MetricCard {...metric} key={metric.label} />
            ))}
          </div>

          <PriorityActions summary={priorityActions} />

          <OperationalSites
            onDeleteProject={handleDeleteProject}
            operationalByProjectId={operationalByProjectId}
            projects={projects}
          />

          <Milestones items={milestones} />
        </main>

        <RightRail
          activities={activities}
          distribution={distribution}
          projectCount={projects.length}
        />
      </div>
    </main>
  );
}
