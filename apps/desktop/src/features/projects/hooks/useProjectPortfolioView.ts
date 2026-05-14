import { useMemo } from "react";
import { activityFeed, approvalWindow, priorityQueue } from "@/features/projects/projects-data";
import type { PortfolioFocus, PortfolioProject } from "@/features/projects/types";
import { buildContractorFolders } from "@/features/projects/utils/buildContractorFolders";
import {
  buildManagerLoad,
  compareProjects,
  createContractorId,
  isPlaceholderContractorName,
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
  const contractorFolderById = useMemo(
    () => new Map(contractorFolders.map((folder) => [folder.id, folder])),
    [contractorFolders],
  );
  const selectedContractor = selectedContractorId
    ? (contractorFolderById.get(selectedContractorId) ?? null)
    : null;
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
            if (!project || isPlaceholderContractorName(project.client)) {
              return false;
            }

            return createContractorId(project.client) === selectedContractorId;
          })
        : allSals,
    [allSals, projectSalIndex, selectedContractorId],
  );

  const projectByIdMap = useMemo(
    () => new Map(contractorProjects.map((project) => [project.id, project])),
    [contractorProjects],
  );

  const visibleProjects = useMemo(() => {
    const projects = contractorProjects.filter(
      (project) => matchesFocus(project, focus) && matchesProjectSearch(project, deferredQuery),
    );

    projects.sort(compareProjects);
    return projects;
  }, [contractorProjects, deferredQuery, focus]);

  const derivedView = useMemo(() => {
    const isVisibleProject = (project: PortfolioProject | undefined): project is PortfolioProject =>
      Boolean(project && matchesFocus(project, focus));

    const visibleQueue = priorityQueue.filter((item) => {
      const project = projectByIdMap.get(item.projectId);

      if (!isVisibleProject(project)) {
        return false;
      }

      return matchesSearch(
        `${project.title} ${project.lot} ${project.location} ${item.title} ${item.detail} ${item.owner}`,
        deferredQuery,
      );
    });

    const visibleApprovals = approvalWindow.filter((item) => {
      const project = projectByIdMap.get(item.projectId);

      if (!isVisibleProject(project)) {
        return false;
      }

      return matchesSearch(
        `${project.title} ${project.lot} ${project.location} ${item.label} ${item.owner}`,
        deferredQuery,
      );
    });

    const visibleActivities = activityFeed.filter((item) => {
      const project = projectByIdMap.get(item.projectId);

      if (!isVisibleProject(project)) {
        return false;
      }

      return matchesSearch(`${project.title} ${item.label} ${item.detail}`, deferredQuery);
    });

    let totalBudget = 0;
    let salExposure = 0;
    let criticalCount = 0;
    let salWindowCount = 0;
    let progressSum = 0;
    const focusCounts: Record<PortfolioFocus, number> = {
      all: visibleProjects.length,
      critical: 0,
      sal: 0,
    };

    for (const project of visibleProjects) {
      totalBudget += project.budget.amount;
      salExposure += project.salValue.amount;
      progressSum += project.progress;

      if (project.tone === "danger") {
        criticalCount += 1;
      }

      if (isSalWindow(project)) {
        salWindowCount += 1;
      }

      if (matchesFocus(project, "critical")) {
        focusCounts.critical += 1;
      }

      if (matchesFocus(project, "sal")) {
        focusCounts.sal += 1;
      }
    }

    return {
      focusCounts,
      managerLoad: buildManagerLoad(visibleProjects),
      portfolioMetrics: {
        averageProgress: visibleProjects.length
          ? Math.round(progressSum / visibleProjects.length)
          : 0,
        criticalCount,
        salExposure,
        salWindowCount,
        totalBudget,
      },
      visibleActivities,
      visibleApprovals,
      visibleQueue,
    };
  }, [deferredQuery, focus, projectByIdMap, visibleProjects]);

  return {
    contractorFolders,
    contractorProjects,
    focusCounts: derivedView.focusCounts,
    managerLoad: derivedView.managerLoad,
    modalSals,
    portfolioMetrics: derivedView.portfolioMetrics,
    selectedContractor,
    visibleActivities: derivedView.visibleActivities,
    visibleApprovals: derivedView.visibleApprovals,
    visibleProjects,
    visibleQueue: derivedView.visibleQueue,
  };
}
