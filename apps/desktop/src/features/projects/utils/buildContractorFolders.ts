import type { ContractorFolder, PortfolioProject } from "../types";
import {
  createContractorId,
  isPlaceholderContractorName,
  isSalWindow,
  normalizeContractorName,
} from "./projects-helpers";

type SalWithMeta = {
  date?: string;
  closedAt?: string;
  projectId: string;
  status: string;
  title?: string;
};

export function buildContractorFolders(
  contractors: string[],
  projects: PortfolioProject[],
  sals: SalWithMeta[],
  salProjectIndex: Map<string, { client: string }>,
): ContractorFolder[] {
  const folders = new Map<string, ContractorFolder>();

  for (const contractorName of contractors) {
    const contractor = normalizeContractorName(contractorName);
    const id = createContractorId(contractor);

    if (!id || isPlaceholderContractorName(contractor)) {
      continue;
    }

    folders.set(id, {
      budget: 0,
      contractor,
      criticalCount: 0,
      id,
      projectCount: 0,
      recentSal: null,
      salCount: 0,
      salExposure: 0,
      salWindowCount: 0,
    });
  }

  const projectContractors = new Map(projects.map((p) => [p.id, p.contractor]));
  const projectNames = new Map(projects.map((p) => [p.id, p.title]));

  for (const project of projects) {
    const contractor = normalizeContractorName(project.contractor);
    if (isPlaceholderContractorName(contractor)) {
      continue;
    }

    const id = createContractorId(contractor);
    const current =
      folders.get(id) ??
      ({
        budget: 0,
        contractor,
        criticalCount: 0,
        id,
        projectCount: 0,
        recentSal: null,
        salCount: 0,
        salExposure: 0,
        salWindowCount: 0,
      } satisfies ContractorFolder);

    current.budget += project.budget.amount;
    current.projectCount += 1;
    current.salExposure += project.salValue.amount;
    current.criticalCount += project.tone === "danger" ? 1 : 0;
    current.salWindowCount += isSalWindow(project) ? 1 : 0;
    folders.set(id, current);
  }

  for (const sal of sals) {
    const project = salProjectIndex.get(sal.projectId);
    const contractorName = projectContractors.get(sal.projectId) ?? project?.client;
    if (!contractorName || isPlaceholderContractorName(contractorName)) {
      continue;
    }

    const contractor = normalizeContractorName(contractorName);
    const id = createContractorId(contractor);
    const current =
      folders.get(id) ??
      ({
        budget: 0,
        contractor,
        criticalCount: 0,
        id,
        projectCount: 0,
        recentSal: null,
        salCount: 0,
        salExposure: 0,
        salWindowCount: 0,
      } satisfies ContractorFolder);

    current.salCount += 1;

    const salDate = sal.closedAt || sal.date;
    if (salDate && sal.title) {
      if (!current.recentSal || salDate > current.recentSal.date) {
        current.recentSal = {
          date: salDate,
          projectName: projectNames.get(sal.projectId) ?? "",
          status: sal.status,
          title: sal.title,
        };
      }
    }

    folders.set(id, current);
  }

  return [...folders.values()].sort((left, right) => {
    if (right.projectCount !== left.projectCount) {
      return right.projectCount - left.projectCount;
    }

    return left.contractor.localeCompare(right.contractor);
  });
}
