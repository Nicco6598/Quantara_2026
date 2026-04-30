import {
  type ChangeEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useToast } from "@/components/shared/ToastProvider";
import { ContractorDetailView } from "@/features/projects/components/ContractorDetailView";
import { ContractorModal } from "@/features/projects/components/ContractorModal";
import { ContractorsWorkspace } from "@/features/projects/components/ContractorsWorkspace";
import { ProjectActionDialog } from "@/features/projects/components/ProjectActionDialog";
import { SalModal } from "@/features/projects/components/SalModal";
import { CreateProjectModal } from "@/features/projects/dialogs/CreateProjectModal";
import { useProjectMigration } from "@/features/projects/hooks/useProjectMigration";
import { useProjectMutations } from "@/features/projects/hooks/useProjectMutations";
import { useProjectPortfolioView } from "@/features/projects/hooks/useProjectPortfolioView";
import type {
  MigrationAction,
  PortfolioFocus,
  PortfolioProject,
  ProjectActionDialogState,
  ProjectEditState,
} from "@/features/projects/types";
import { useNavigate } from "@/hooks/useNavigate";
import {
  type DesktopContract,
  type DesktopDataResult,
  listDesktopContracts,
  listDesktopTariffBooks,
} from "@/lib/desktopData";
import { cn } from "@/lib/utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { useAppStore } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { fallbackProjectTariffBook, focusOptions } from "./projects-data";
import { mapContractToProject } from "./utils/project-mappers";
import {
  mergeContractorRegistry,
  normalizeContractorName,
  readStringList,
  readStringRecord,
  writeJson,
} from "./utils/projects-helpers";

export type { PortfolioProject } from "@/features/projects/types";
export { portfolioProjects } from "./projects-data";
export { mapContractToProject } from "./utils/project-mappers";

const contractorRegistryStorageKey = "quantara.contractorRegistry.v1";
const projectContractorStorageKey = "quantara.projectContractors.v1";

export function ProjectsScreen() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createState, setCreateState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [createMessage, setCreateMessage] = useState("");
  const [contractsState, setContractsState] = useState<DesktopDataResult<DesktopContract[]>>({
    data: [],
    message: "Caricamento contratti locali.",
    source: "fallback",
  });
  const [editingProject, setEditingProject] = useState<ProjectEditState | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectActionDialog, setProjectActionDialog] = useState<ProjectActionDialogState | null>(
    null,
  );
  const [contractorDraft, setContractorDraft] = useState("");
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [contractorRegistry, setContractorRegistry] = useState<string[]>(() =>
    readStringList(contractorRegistryStorageKey),
  );
  const [projectContractors, setProjectContractors] = useState<Record<string, string>>(() =>
    readStringRecord(projectContractorStorageKey),
  );
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [tariffBooksState, setTariffBooksState] = useState([fallbackProjectTariffBook]);
  const [focus, setFocus] = useState<PortfolioFocus>("all");
  const [, setMigrationAction] = useState<MigrationAction>("idle");
  const [query, setQuery] = useState("");
  const [isSalModalOpen, setIsSalModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { exportMigrationWorkbook, importMigrationFile } = useProjectMigration({
    contracts: contractsState.data,
    notify,
    setCreateMessage,
    setCreateState,
    setMigrationAction,
  });
  const { createProject, deleteProject, selectProject, updateProject } = useProjectMutations({
    contracts: contractsState.data,
    editingProject,
    notify,
    projectContractors,
    selectedContractId,
    setContractorRegistry,
    setContractsState,
    setCreateMessage,
    setCreateState,
    setEditingProject,
    setIsCreateProjectModalOpen,
    setProjectContractors,
    setSelectedContractId,
    tariffBookId: tariffBooksState[0]?.id ?? "",
  });
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const activeProjects = useMemo(
    () =>
      contractsState.source === "desktop" || contractsState.data.length > 0
        ? contractsState.data.map((contract) =>
            mapContractToProject(contract, projectContractors[contract.id]),
          )
        : [],
    [contractsState.data, contractsState.source, projectContractors],
  );
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const salProjects = useSalWorkflowStore((state) => state.projects);
  const updateSalLineQuantity = useSalWorkflowStore((state) => state.updateLineQuantity);
  const updateSalLineSurcharge = useSalWorkflowStore((state) => state.updateLineSurcharge);
  const projectSalIndex = useMemo(
    () => new Map(salProjects.map((project) => [project.id, project])),
    [salProjects],
  );
  const allSals = useMemo(
    () =>
      [...salDocuments].sort((a, b) => {
        const dateA = a.closedAt || a.date;
        const dateB = b.closedAt || b.date;
        return dateB.localeCompare(dateA);
      }),
    [salDocuments],
  );
  const recentSals = useMemo(() => allSals.slice(0, 5), [allSals]);
  const totalPortfolioValue = useMemo(
    () => activeProjects.reduce((sum, project) => sum + project.budget.amount, 0),
    [activeProjects],
  );

  useEffect(() => {
    let active = true;

    Promise.all([
      listDesktopContracts([]),
      listDesktopTariffBooks([fallbackProjectTariffBook]),
    ]).then(([contracts, tariffBooks]) => {
      if (active) {
        setContractsState(contracts);
        setTariffBooksState(tariffBooks.data);
        setSelectedContractId(contracts.data[0]?.id ?? "");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    writeJson(contractorRegistryStorageKey, contractorRegistry);
  }, [contractorRegistry]);

  useEffect(() => {
    writeJson(projectContractorStorageKey, projectContractors);
  }, [projectContractors]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (state.pendingWorkflowAction === "new-project") {
        setEditingProject(null);
        setIsCreateProjectModalOpen(true);
        useAppStore.getState().setPendingWorkflowAction(null);
      } else if (state.pendingWorkflowAction === "new-sal") {
        navigate("sal-create");
        useAppStore.getState().setPendingWorkflowAction(null);
      }
    });

    return unsub;
  }, [navigate]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setEditingProject(null);
        setIsCreateProjectModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, []);

  function handleOpenProject(project: PortfolioProject) {
    try {
      window.sessionStorage.setItem("quantara.selectedProjectDetail.v1", JSON.stringify(project));
    } catch {
      // Detail still opens with fallback content if storage is unavailable.
    }

    navigate("project-detail");
  }

  function handleOpenProjectActions(project: PortfolioProject) {
    setProjectActionDialog({ mode: "actions", project });
  }

  function handleCreateContractor() {
    const contractorName = normalizeContractorName(contractorDraft);

    if (contractorName.length < 2) {
      setCreateState("error");
      setCreateMessage("Inserisci un nome appaltatore valido.");
      return;
    }

    setContractorRegistry((current) => mergeContractorRegistry(current, contractorName));
    setContractorDraft("");
    setIsContractorModalOpen(false);
    setCreateState("saved");
    setCreateMessage(`${contractorName} creato tra gli appaltatori.`);
    dispatchDataChanged();
  }

  function handleEditFromActions(project: PortfolioProject) {
    setProjectActionDialog(null);
    selectProject(project.id);
  }

  function handleAskDeleteFromActions(project: PortfolioProject) {
    setProjectActionDialog({ mode: "delete", project });
  }

  async function handleConfirmDeleteFromActions(project: PortfolioProject) {
    setProjectActionDialog(null);
    await deleteProject(project.id);
  }

  const handleBackFromContractor = useCallback(() => {
    setSelectedContractorId(null);
    setQuery("");
    setFocus("all");
  }, []);

  const handleOpenCreateProject = useCallback(() => {
    setEditingProject(null);
    setIsCreateProjectModalOpen(true);
  }, []);

  const handleOpenFolder = useCallback((folderId: string) => {
    setSelectedContractorId(folderId);
    setQuery("");
    setFocus("all");
  }, []);

  const handleImportFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void importMigrationFile(file);
      }
      event.currentTarget.value = "";
    },
    [importMigrationFile],
  );

  const handleCloseCreateProjectModal = useCallback(() => {
    setIsCreateProjectModalOpen(false);
    setEditingProject(null);
  }, []);

  const {
    contractorFolders,
    focusCounts,
    managerLoad,
    modalSals,
    portfolioMetrics,
    selectedContractor,
    visibleActivities,
    visibleApprovals,
    visibleProjects,
    visibleQueue,
  } = useProjectPortfolioView({
    activeProjects,
    allSals,
    contractorRegistry,
    deferredQuery,
    focus,
    projectSalIndex,
    selectedContractorId,
  });

  const createProjectInitialValues = useMemo(() => {
    if (editingProject) {
      return editingProject.values;
    }

    if (!selectedContractor) {
      return undefined;
    }

    return {
      applicationContractCode: "",
      contractorName: selectedContractor.contractor,
      contractualAmount: "",
      frameworkAgreementCode: "",
      safetyCostsNotSubjectToDiscount: "",
      tariffBookId: tariffBooksState[0]?.id ?? fallbackProjectTariffBook.id,
      title: "",
    };
  }, [editingProject, selectedContractor, tariffBooksState]);
  const { averageProgress, criticalCount, salExposure, salWindowCount, totalBudget } =
    portfolioMetrics;

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      {createMessage ? (
        <div
          className={cn(
            "mb-4 rounded-[14px] border px-4 py-3 text-[13px] font-medium",
            createState === "error"
              ? "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger-base)]"
              : "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success-base)]",
          )}
          role="status"
        >
          {createMessage}
        </div>
      ) : null}

      {selectedContractor ? (
        <ContractorDetailView
          averageProgress={averageProgress}
          contractor={selectedContractor}
          criticalCount={criticalCount}
          focus={focus}
          focusCounts={focusCounts}
          focusOptions={focusOptions}
          isPending={isPending}
          managerLoadCount={managerLoad.length}
          onBack={handleBackFromContractor}
          onCreateProject={handleOpenCreateProject}
          onExport={exportMigrationWorkbook}
          onFocusChange={(nextFocus) => startTransition(() => setFocus(nextFocus))}
          onImport={() => fileInputRef.current?.click()}
          onOpenProject={handleOpenProject}
          onOpenProjectActions={handleOpenProjectActions}
          projects={visibleProjects}
          query={query}
          salExposure={salExposure}
          salWindowCount={salWindowCount}
          selectedProjectId={selectedContractId}
          setQuery={setQuery}
          totalBudget={totalBudget}
          visibleActivities={visibleActivities}
          visibleApprovals={visibleApprovals}
          visibleQueue={visibleQueue}
        />
      ) : (
        <ContractorsWorkspace
          activeProjectsCount={activeProjects.length}
          folders={contractorFolders}
          onImport={() => fileInputRef.current?.click()}
          onOpenCreateContractor={() => setIsContractorModalOpen(true)}
          onOpenFolder={handleOpenFolder}
          onOpenNotifications={() => setIsSalModalOpen(true)}
          recentSalsCount={recentSals.length}
          totalPortfolioValue={totalPortfolioValue}
        />
      )}

      <input
        accept=".xlsx"
        className="hidden"
        onChange={handleImportFileChange}
        ref={fileInputRef}
        type="file"
      />

      {isCreateProjectModalOpen ? (
        <CreateProjectModal
          contractorOptions={contractorRegistry}
          defaultTariffBookId={tariffBooksState[0]?.id ?? fallbackProjectTariffBook.id}
          {...(createProjectInitialValues ? { initialValues: createProjectInitialValues } : {})}
          isSaving={createState === "saving"}
          onClose={handleCloseCreateProjectModal}
          onCreate={editingProject ? updateProject : createProject}
          submitLabel={editingProject ? "Salva modifiche" : "Crea progetto"}
          tariffBooks={tariffBooksState}
        />
      ) : null}
      {projectActionDialog ? (
        <ProjectActionDialog
          mode={projectActionDialog.mode}
          onClose={() => setProjectActionDialog(null)}
          onDelete={() => handleAskDeleteFromActions(projectActionDialog.project)}
          onEdit={() => handleEditFromActions(projectActionDialog.project)}
          onOpen={() => {
            setProjectActionDialog(null);
            handleOpenProject(projectActionDialog.project);
          }}
          onConfirmDelete={() => void handleConfirmDeleteFromActions(projectActionDialog.project)}
          project={projectActionDialog.project}
        />
      ) : null}
      {isContractorModalOpen ? (
        <ContractorModal
          contractorDraft={contractorDraft}
          onChange={setContractorDraft}
          onClose={() => {
            setContractorDraft("");
            setIsContractorModalOpen(false);
          }}
          onCreate={handleCreateContractor}
        />
      ) : null}
      <SalModal
        isOpen={isSalModalOpen}
        onClose={() => setIsSalModalOpen(false)}
        projectIndex={projectSalIndex}
        sals={modalSals}
        onUpdateQuantity={updateSalLineQuantity}
        onUpdateSurcharge={updateSalLineSurcharge}
      />
    </main>
  );
}
