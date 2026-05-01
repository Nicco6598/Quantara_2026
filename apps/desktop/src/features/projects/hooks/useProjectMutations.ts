import type { Dispatch, SetStateAction } from "react";
import type { ProjectEditState } from "@/features/projects/types";
import {
  mergeContractorRegistry,
  normalizeContractorName,
} from "@/features/projects/utils/projects-helpers";
import type {
  CreateDesktopContractRequest,
  DesktopContract,
  DesktopDataResult,
} from "@/lib/desktopData";
import {
  createDesktopContract,
  deleteDesktopContract,
  updateDesktopContract,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";

type Notify = (toast: {
  message: string;
  title?: string;
  tone?: "danger" | "info" | "success" | "warning";
}) => string;

type UseProjectMutationsOptions = {
  contracts: DesktopContract[];
  editingProject: ProjectEditState | null;
  notify: Notify;
  projectContractors: Record<string, string>;
  setContractorRegistry: Dispatch<SetStateAction<string[]>>;
  setContractsState: Dispatch<SetStateAction<DesktopDataResult<DesktopContract[]>>>;
  setEditingProject: Dispatch<SetStateAction<ProjectEditState | null>>;
  setIsCreateProjectModalOpen: (isOpen: boolean) => void;
  setProjectContractors: Dispatch<SetStateAction<Record<string, string>>>;
  setSelectedContractId: (contractId: string) => void;
  selectedContractId: string;
  tariffBookId: string;
};

export function useProjectMutations({
  contracts,
  editingProject,
  notify,
  projectContractors,
  setContractorRegistry,
  setContractsState,
  setEditingProject,
  setIsCreateProjectModalOpen,
  setProjectContractors,
  setSelectedContractId,
  selectedContractId,
  tariffBookId,
}: UseProjectMutationsOptions) {
  async function createProject(
    request: CreateDesktopContractRequest,
    meta: { contractorName: string },
  ) {
    try {
      const created = await createDesktopContract(request);

      setContractsState((current) => ({
        data: [created, ...current.data.filter((contract) => contract.id !== created.id)],
        ...(current.source === "fallback"
          ? { message: "Runtime browser: anteprima locale.", source: "fallback" }
          : { source: "desktop" }),
      }));
      setProjectContractors((current) => ({
        ...current,
        [created.id]: normalizeContractorName(meta.contractorName),
      }));
      setContractorRegistry((current) =>
        mergeContractorRegistry(current, normalizeContractorName(meta.contractorName)),
      );
      setSelectedContractId(created.id);
      dispatchDataChanged();
      notify({
        message: `${created.title} e pronto nel registro progetti.`,
        title: "Progetto creato",
        tone: "success",
      });
      return created;
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Creazione non riuscita",
        tone: "danger",
      });
      return null;
    }
  }

  async function updateProject(
    request: CreateDesktopContractRequest,
    meta: { contractorName: string },
  ) {
    if (!editingProject) {
      return createProject(request, meta);
    }

    try {
      const updated = await updateDesktopContract(editingProject.contractId, {
        ...request,
        id: editingProject.contractId,
      });

      setContractsState((current) => ({
        data: current.data.map((contract) => (contract.id === updated.id ? updated : contract)),
        ...(current.source === "fallback"
          ? { message: "Runtime browser: modifica in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      setProjectContractors((current) => ({
        ...current,
        [updated.id]: normalizeContractorName(meta.contractorName),
      }));
      setContractorRegistry((current) =>
        mergeContractorRegistry(current, normalizeContractorName(meta.contractorName)),
      );
      setSelectedContractId(updated.id);
      setEditingProject(null);
      dispatchDataChanged();
      notify({
        message: `${updated.title} aggiornato correttamente.`,
        title: "Progetto aggiornato",
        tone: "success",
      });
      return updated;
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Modifica non riuscita",
        tone: "danger",
      });
      return null;
    }
  }

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

    setSelectedContractId(contract.id);
    setEditingProject({
      contractId: contract.id,
      values: {
        applicationContractCode: contract.applicationContractCode,
        contractorName: projectContractors[contract.id] ?? "",
        contractualAmount: String(contract.contractualAmount.amount),
        frameworkAgreementCode: contract.frameworkAgreementCode,
        safetyCostsNotSubjectToDiscount: String(
          contract.safetyCostsNotSubjectToDiscount?.amount ?? 0,
        ),
        tariffBookId: contract.tariffPriorities[0]?.tariffBookId ?? tariffBookId,
        title: contract.title,
      },
    });
    setIsCreateProjectModalOpen(true);
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
      dispatchDataChanged();
      notify({
        message: `${deletedContract?.title ?? "Progetto"} eliminato dal registro.`,
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

  return { createProject, deleteProject, selectProject, updateProject };
}
