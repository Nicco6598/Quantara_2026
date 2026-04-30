import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import {
  buildActionSummary,
  buildActivityRows,
  buildFocusRows,
  buildMilestones,
  buildOverviewMetrics,
  Hero,
  MetricCard,
  Milestones,
  OperationalSites,
  PriorityActions,
  RightRail,
} from "@/features/dashboard/components/DashboardSections";
import { mapContractToProject, type PortfolioProject } from "@/features/projects/ProjectsScreen";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { deleteDesktopContract, listDesktopContracts } from "@/lib/desktopData";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

export function DashboardScreen() {
  const { notify } = useToast();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);

  useEffect(() => {
    let active = true;

    listDesktopContracts([]).then((contracts) => {
      if (!active) {
        return;
      }

      setProjects(contracts.data.map(mapContractToProject));
    });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => buildOverviewMetrics(projects), [projects]);
  const rows = useMemo(() => projects, [projects]);
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
    <div className="pt-4 md:pt-6 2xl:pt-7">
      <div className="grid min-w-0 gap-4 md:gap-5 2xl:grid-cols-[minmax(0,1fr)_280px] 2xl:gap-7">
        <div className="min-w-0 space-y-5">
          <Hero />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:gap-4">
            {metrics.map((metric) => (
              <MetricCard {...metric} key={metric.label} />
            ))}
          </div>

          <PriorityActions summary={priorityActions} />

          <OperationalSites
            onDeleteProject={handleDeleteProject}
            operationalByProjectId={operationalByProjectId}
            projects={rows}
          />

          <Milestones items={milestones} />
        </div>

        <RightRail
          activities={activities}
          distribution={distribution}
          projectCount={projects.length}
        />
      </div>
    </div>
  );
}
