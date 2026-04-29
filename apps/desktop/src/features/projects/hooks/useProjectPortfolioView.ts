import { useMemo } from "react";
import { activityFeed, approvalWindow, priorityQueue } from "@/features/projects/projects-data";
import type { PortfolioFocus, PortfolioProject } from "@/features/projects/types";
import { buildContractorFolders } from "@/features/projects/utils/buildContractorFolders";
import {
  buildManagerLoad,
  compareProjects,
  createContractorId,
  isSalWindow,
  matchesFocus,
  matchesProjectSearch,
  matchesSearch,
} from "@/features/projects/utils/projects-helpers";
import type { SalDocument, SalProject } from "@/features/sal/domain/sal-workflow";

type UseProjectPortfolioViewOptions = {
  activeProjects: PortfolioProject[];
  allSals: SalDocument[];
  contractorRegistry: string[];
  deferredQuery: string;
  focus: PortfolioFocus;
  projectSalIndex: Map<string, SalProject>;
  selectedContractorId: string | null;
};

export function useProjectPortfolioView({
  activeProjects,
  allSals,
  contractorRegistry,
  deferredQuery,
  focus,
  projectSalIndex,
  selectedContractorId,
}: UseProjectPortfolioViewOptions) {
  const contractorFolders = useMemo(
    () => buildContractorFolders(contractorRegistry, activeProjects, allSals, projectSalIndex),
    [activeProjects, allSals, contractorRegistry, projectSalIndex],
  );
  const selectedContractor = contractorFolders.find((folder) => folder.id === selectedContractorId);
  const contractorProjects = useMemo(
    () =>
      selectedContractorId
        ? activeProjects.filter(
            (project) => createContractorId(project.contractor) === selectedContractorId,
          )
        : activeProjects,
    [activeProjects, selectedContractorId],
  );
  const modalSals = useMemo(
    () =>
      selectedContractorId
        ? allSals.filter((sal) => {
            const project = projectSalIndex.get(sal.projectId);
            return createContractorId(project?.client ?? "") === selectedContractorId;
          })
        : allSals,
    [allSals, projectSalIndex, selectedContractorId],
  );

  const projectByIdMap = useMemo(
    () => new Map(contractorProjects.map((project) => [project.id, project])),
    [contractorProjects],
  );

  const visibleProjects = useMemo(
    () =>
      contractorProjects
        .filter(
          (project) => matchesFocus(project, focus) && matchesProjectSearch(project, deferredQuery),
        )
        .sort(compareProjects),
    [contractorProjects, deferredQuery, focus],
  );

  const visibleQueue = useMemo(
    () =>
      priorityQueue.filter((item) => {
        const project = projectByIdMap.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.title} ${item.detail} ${item.owner}`,
          deferredQuery,
        );
      }),
    [projectByIdMap, deferredQuery, focus],
  );

  const visibleApprovals = useMemo(
    () =>
      approvalWindow.filter((item) => {
        const project = projectByIdMap.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.label} ${item.owner}`,
          deferredQuery,
        );
      }),
    [projectByIdMap, deferredQuery, focus],
  );

  const visibleActivities = useMemo(
    () =>
      activityFeed.filter((item) => {
        const project = projectByIdMap.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(`${project.title} ${item.label} ${item.detail}`, deferredQuery);
      }),
    [projectByIdMap, deferredQuery, focus],
  );

  const portfolioMetrics = useMemo(() => {
    const totalBudget = visibleProjects.reduce((sum, project) => sum + project.budget.amount, 0);
    const salExposure = visibleProjects.reduce((sum, project) => sum + project.salValue.amount, 0);
    const criticalCount = visibleProjects.filter((project) => project.tone === "danger").length;
    const salWindowCount = visibleProjects.filter((project) => isSalWindow(project)).length;
    const averageProgress = visibleProjects.length
      ? Math.round(
          visibleProjects.reduce((sum, project) => sum + project.progress, 0) /
            visibleProjects.length,
        )
      : 0;

    return { averageProgress, criticalCount, salExposure, salWindowCount, totalBudget };
  }, [visibleProjects]);

  const managerLoad = useMemo(() => buildManagerLoad(visibleProjects), [visibleProjects]);
  const focusCounts = useMemo(() => {
    const counts: Record<PortfolioFocus, number> = {
      all: visibleProjects.length,
      critical: 0,
      sal: 0,
    };

    for (const project of visibleProjects) {
      if (matchesFocus(project, "critical")) {
        counts.critical += 1;
      }

      if (matchesFocus(project, "sal")) {
        counts.sal += 1;
      }
    }

    return counts;
  }, [visibleProjects]);

  return {
    contractorFolders,
    contractorProjects,
    focusCounts,
    managerLoad,
    modalSals,
    portfolioMetrics,
    selectedContractor,
    visibleActivities,
    visibleApprovals,
    visibleProjects,
    visibleQueue,
  };
}
