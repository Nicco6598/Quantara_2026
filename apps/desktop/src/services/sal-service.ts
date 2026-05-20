import { useShallow } from "zustand/react/shallow";
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
  initializeFromBackend: (
    docs: SalDocument[],
    projs: SalProject[],
    voices: SalTariffVoice[],
  ) => void;
};

export function useSalWorkflowService(): UseSalWorkflowServiceReturn {
  const activeProjectId = useSalWorkflowStore((s) => s.activeProjectId);
  const activeSalId = useSalWorkflowStore((s) => s.activeSalId);
  const projects = useSalWorkflowStore(useShallow((s) => s.projects));
  const salDocuments = useSalWorkflowStore(useShallow((s) => s.salDocuments));
  const tariffVoices = useSalWorkflowStore(useShallow((s) => s.tariffVoices));

  const createProject = useSalWorkflowStore((s) => s.createProject);
  const createSal = useSalWorkflowStore((s) => s.createSal);
  const updateSalDraft = useSalWorkflowStore((s) => s.updateSalDraft);
  const closeSal = useSalWorkflowStore((s) => s.closeSal);
  const setSalStatus = useSalWorkflowStore((s) => s.setSalStatus);
  const deleteSal = useSalWorkflowStore((s) => s.deleteSal);
  const addLineToSal = useSalWorkflowStore((s) => s.addLineToSal);
  const deleteLineFromSal = useSalWorkflowStore((s) => s.deleteLineFromSal);
  const updateLine = useSalWorkflowStore((s) => s.updateLine);
  const setActiveProject = useSalWorkflowStore((s) => s.setActiveProject);
  const setActiveSal = useSalWorkflowStore((s) => s.setActiveSal);
  const initializeFromBackend = useSalWorkflowStore((s) => s.initializeFromBackend);

  return {
    activeProjectId,
    activeSalId,
    projects,
    salDocuments,
    tariffVoices,
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
    initializeFromBackend,
  };
}
