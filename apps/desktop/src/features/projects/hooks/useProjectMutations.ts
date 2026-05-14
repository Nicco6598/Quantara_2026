import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "@/hooks/useNavigate";
import type { DesktopContract, DesktopDataResult } from "@/lib/desktopData";
import { deleteDesktopContract } from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

type Notify = (toast: {
  message: string;
  title?: string;
  tone?: "danger" | "info" | "success" | "warning";
}) => string;

type UseProjectMutationsOptions = {
  contracts: DesktopContract[];
  notify: Notify;
  projectContractors: Record<string, string>;
  setContractsState: Dispatch<SetStateAction<DesktopDataResult<DesktopContract[]>>>;
  setProjectContractors: Dispatch<SetStateAction<Record<string, string>>>;
  setSelectedContractId: (contractId: string) => void;
  selectedContractId: string;
  tariffBookId: string;
};

export function useProjectMutations({
  contracts,
  notify,
  projectContractors,
  setContractsState,
  setProjectContractors,
  setSelectedContractId,
  selectedContractId,
  tariffBookId,
}: UseProjectMutationsOptions) {
  const navigate = useNavigate();

  function selectProject(projectId: string) {
    const contract = contracts.find((item) => item.id === projectId);

    if (!contract) {
      notify({
        message: "Puoi modificare solo i progetti locali creati nel database.",
        title: "Modifica non disponibile",
        tone: "warning",
      });
      return;
    }

    const amount = contract.contractualAmount.amount;
    const osAmount = contract.osExcludedAmount ?? 0;

    setSelectedContractId(contract.id);

    const values = {
      applicationContractCode: contract.applicationContractCode,
      contractorName: contract.contractorName ?? projectContractors[contract.id] ?? "",
      contractualAmount: String(amount),
      frameworkAgreementCode: contract.frameworkAgreementCode,
      tenderDiscountPercent: String(contract.tenderDiscountPercent ?? 0),
      tariffBookIds:
        contract.tariffPriorities.length > 0
          ? contract.tariffPriorities.map((p) => p.tariffBookId)
          : tariffBookId
            ? [tariffBookId]
            : [],
      title: contract.title,
      osExcludedAmount: osAmount > 0 ? String(osAmount) : "",
      budgetIvaPercent: "",
      osIvaPercent: "",
    };

    try {
      window.sessionStorage.setItem("quantara.editingProject.v1", JSON.stringify(values));
      window.sessionStorage.setItem("quantara.editingContractId.v1", contract.id);
    } catch {
      /* no-op */
    }

    navigate("project-create");
  }

  async function deleteProject(projectId: string) {
    try {
      const deletedContract = contracts.find((contract) => contract.id === projectId);

      await deleteDesktopContract(projectId);
      setContractsState((current) => ({
        data: current.data.filter((contract) => contract.id !== projectId),
        ...(current.source === "fallback"
          ? { message: "Runtime browser: eliminazione in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      if (selectedContractId === projectId) {
        setSelectedContractId("");
      }
      setProjectContractors((current) => {
        const { [projectId]: _deleted, ...remaining } = current;
        return remaining;
      });
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
        message: `${deletedContract?.title ?? "Progetto"} e relative SAL eliminate.`,
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

  return { deleteProject, selectProject };
}
