import type { ContractorFolder, PortfolioProject } from "../types";
import { createContractorId, isSalWindow, normalizeContractorName } from "./projects-helpers";

export function buildContractorFolders(
  contractors: string[],
  projects: PortfolioProject[],
  sals: { projectId: string; status: string }[],
  salProjectIndex: Map<string, { client: string }>,
): ContractorFolder[] {
  const folders = new Map<string, ContractorFolder>();

  for (const contractorName of contractors) {
    const contractor = normalizeContractorName(contractorName);
    const id = createContractorId(contractor);

    if (!id) {
      continue;
    }

    folders.set(id, {
      budget: 0,
      contractor,
      criticalCount: 0,
      id,
      projectCount: 0,
      salCount: 0,
      salExposure: 0,
      salWindowCount: 0,
    });
  }

  for (const project of projects) {
    const contractor = normalizeContractorName(project.contractor);
    const id = createContractorId(contractor);
    const current = folders.get(id);

    if (!current) {
      continue;
    }

    current.budget += project.budget.amount;
    current.projectCount += 1;
    current.salExposure += project.salValue.amount;
    current.criticalCount += project.tone === "danger" ? 1 : 0;
    current.salWindowCount += isSalWindow(project) ? 1 : 0;
    folders.set(id, current);
  }

  for (const sal of sals) {
    const project = salProjectIndex.get(sal.projectId);
    const contractor = normalizeContractorName(project?.client ?? "Appaltatore da assegnare");
    const id = createContractorId(contractor);
    const current = folders.get(id);

    if (!current) {
      continue;
    }

    current.salCount += 1;
    folders.set(id, current);
  }

  return [...folders.values()].sort((left, right) => {
    if (right.projectCount !== left.projectCount) {
      return right.projectCount - left.projectCount;
    }

    return left.contractor.localeCompare(right.contractor);
  });
}
