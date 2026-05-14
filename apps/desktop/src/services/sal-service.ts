import { useCallback } from "react";
import type {
  SalDocument,
  SalDocumentStatus,
  SalLine,
  SalProject,
  SalTariffVoice,
} from "@/features/sal/types";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

type CreateSalInput = {
  projectId: string;
  date: string;
  description: string;
  notes: string;
  title: string;
  lines?: SalLine[];
  voices?: Array<{
    category: string;
    code: string;
    description: string;
    id: string;
    laborPercentage?: number;
    projectYear: number;
    unit: string;
    unitPrice: number;
  }>;
  economicRules?: SalDocument["economicRules"];
  status?: SalDocumentStatus;
  materialUsage?: import("@/features/sal/types").SalMaterialUsage[];
  total?: number;
};

type UseSalWorkflowServiceReturn = {
  salDocuments: SalDocument[];
  projects: SalProject[];
  tariffVoices: SalTariffVoice[];
  activeProjectId: string;
  activeSalId: string;
  createProject: (input: Omit<SalProject, "id"> & { id?: string }) => SalProject;
  createSal: (input: CreateSalInput) => SalDocument;
  updateSalDraft: (id: string, input: Partial<CreateSalInput>) => SalDocument | null;
  closeSal: (salId: string) => void;
  setSalStatus: (salId: string, status: SalDocumentStatus) => void;
  deleteSal: (salId: string) => void;
  addLineToSal: (salId: string, voiceId: string) => void;
  deleteLineFromSal: (salId: string, lineId: string) => void;
  updateLine: (
    salId: string,
    lineId: string,
    data: Partial<Pick<SalLine, "quantity" | "surcharge">>,
  ) => void;
  setActiveProject: (projectId: string) => void;
  setActiveSal: (salId: string) => void;
};

export function useSalWorkflowService(): UseSalWorkflowServiceReturn {
  const store = useSalWorkflowStore();

  const activeProjectId = store.activeProjectId;
  const activeSalId = store.activeSalId;
  const salDocuments = store.salDocuments;
  const projects = store.projects;
  const tariffVoices = store.tariffVoices;

  const createProject = useCallback(
    (input: Omit<SalProject, "id"> & { id?: string }) => store.createProject(input),
    [store],
  );

  const createSal = useCallback((input: CreateSalInput) => store.createSal(input), [store]);

  const updateSalDraft = useCallback(
    (id: string, input: Partial<CreateSalInput>) => store.updateSalDraft(id, input),
    [store],
  );

  const closeSal = useCallback((salId: string) => store.closeSal(salId), [store]);
  const setSalStatus = useCallback(
    (salId: string, status: SalDocumentStatus) => store.setSalStatus(salId, status),
    [store],
  );
  const deleteSal = useCallback((salId: string) => store.deleteSal(salId), [store]);
  const addLineToSal = useCallback(
    (salId: string, voiceId: string) => store.addLineToSal(salId, voiceId),
    [store],
  );
  const deleteLineFromSal = useCallback(
    (salId: string, lineId: string) => store.deleteLineFromSal(salId, lineId),
    [store],
  );
  const updateLine = useCallback(
    (salId: string, lineId: string, data: Partial<Pick<SalLine, "quantity" | "surcharge">>) =>
      store.updateLine(salId, lineId, data),
    [store],
  );
  const setActiveProject = useCallback(
    (projectId: string) => store.setActiveProject(projectId),
    [store],
  );
  const setActiveSal = useCallback((salId: string) => store.setActiveSal(salId), [store]);

  return {
    salDocuments,
    projects,
    tariffVoices,
    activeProjectId,
    activeSalId,
    createProject,
    createSal,
    updateSalDraft,
    closeSal,
    setSalStatus,
    deleteSal,
    addLineToSal,
    deleteLineFromSal,
    updateLine,
    setActiveProject,
    setActiveSal,
  };
}
