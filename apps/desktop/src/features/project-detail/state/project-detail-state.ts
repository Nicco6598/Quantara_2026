import type { PortfolioProject } from "@/features/projects/types";
import type { DesktopContract, DesktopTariffBook } from "@/lib/desktopData";
import { getWorkflowProjectId } from "@/lib/workflow-navigation";

export type ProjectState = {
  contracts: DesktopContract[];
  tariffBooks: DesktopTariffBook[];
  projects: PortfolioProject[];
};

export type ProjectAction =
  | {
      type: "INIT";
      contracts: DesktopContract[];
      tariffBooks: DesktopTariffBook[];
      projects: PortfolioProject[];
    }
  | { type: "UPDATE_CONTRACT"; contract: DesktopContract };

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "INIT":
      return {
        contracts: action.contracts,
        tariffBooks: action.tariffBooks,
        projects: action.projects,
      };
    case "UPDATE_CONTRACT":
      return {
        ...state,
        contracts: state.contracts.map((contract) =>
          contract.id === action.contract.id ? action.contract : contract,
        ),
      };
  }
}

export function readSelectedProjectId(): string | null {
  return getWorkflowProjectId();
}
