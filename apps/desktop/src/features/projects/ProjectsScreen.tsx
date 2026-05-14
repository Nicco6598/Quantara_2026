import { m } from "framer-motion";
import { Trash2, X } from "lucide-react";
import {
  type ChangeEvent,
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SPRING_EASE } from "@/components/shared/easings";
import { ProjectControlButton } from "@/components/shared/ui-primitives";
import { ContractorDetailView } from "@/features/projects/components/ContractorDetailView";
import { ContractorsWorkspace } from "@/features/projects/components/ContractorsWorkspace";
import { useProjectMigration } from "@/features/projects/hooks/useProjectMigration";
import { useProjectMutations } from "@/features/projects/hooks/useProjectMutations";
import { useProjectPortfolioView } from "@/features/projects/hooks/useProjectPortfolioView";
import type {
  ContractorFolder,
  MigrationAction,
  PortfolioFocus,
  PortfolioProject,
} from "@/features/projects/types";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { useNavigate } from "@/hooks/useNavigate";
import {
  type DesktopContract,
  type DesktopDataResult,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { type PendingWorkflowAction, useAppStore, useNavigationState } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { fallbackProjectTariffBook, focusOptions } from "./projects-data";
import { mapContractToProject } from "./utils/project-mappers";
import {
  createContractorId,
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

const ContractorModal = lazy(() =>
  import("@/features/projects/components/ContractorModal").then((m) => ({
    default: m.ContractorModal,
  })),
);
const SalModal = lazy(() =>
  import("@/features/projects/components/SalModal").then((m) => ({ default: m.SalModal })),
);
export function ProjectsScreen() {
  const navigate = useNavigate();
  const { activeContext, activeRoute, navigateBack } = useNavigationState();
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contractsState, setContractsState] = useState<DesktopDataResult<DesktopContract[]>>({
    data: [],
    message: "Caricamento contratti locali.",
    source: "fallback",
  });
  const [contractorDraft, setContractorDraft] = useState("");
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [contractorDeleteTarget, setContractorDeleteTarget] = useState<ContractorFolder | null>(
    null,
  );
  const [contractorRegistry, setContractorRegistry] = useState<string[]>(() =>
    readStringList(contractorRegistryStorageKey),
  );
  const [projectContractors, setProjectContractors] = useState<Record<string, string>>(() =>
    readStringRecord(projectContractorStorageKey),
  );
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<string | null>(null);
  const [tariffBooksState, setTariffBooksState] = useState([fallbackProjectTariffBook]);
  const [focus, setFocus] = useState<PortfolioFocus>("all");
  const [, setMigrationAction] = useState<MigrationAction>("idle");
  const [query, setQuery] = useState("");
  const [isSalModalOpen, setIsSalModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { exportMigrationWorkbook, importMigrationFile } = useProjectMigration({
    contracts: contractsState.data,
    notify,
    setMigrationAction,
  });
  const { deleteProject, selectProject } = useProjectMutations({
    contracts: contractsState.data,
    notify,
    projectContractors,
    selectedContractId,
    setContractsState,
    setProjectContractors,
    setSelectedContractId,
    tariffBookId: tariffBooksState[0]?.id ?? "",
  });
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const salProjects = useSalWorkflowStore((state) => state.projects);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const updateSalLine = useSalWorkflowStore((state) => state.updateLine);

  const activeProjects = useMemo(
    () =>
      contractsState.source === "desktop" || contractsState.data.length > 0
        ? contractsState.data.map((contract) => {
            const baseProject = mapContractToProject(contract, projectContractors[contract.id]);
            return enrichProjectWithRealSalData(baseProject, salDocuments, tariffVoices);
          })
        : [],
    [contractsState.data, contractsState.source, projectContractors, salDocuments, tariffVoices],
  );
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

  const processPendingWorkflowAction = useCallback(
    (action: PendingWorkflowAction) => {
      if (action === "new-project") {
        navigate("project-create");
        useAppStore.getState().setPendingWorkflowAction(null);
        return;
      }

      if (action === "new-sal") {
        navigate("sal-create");
        useAppStore.getState().setPendingWorkflowAction(null);
      }
    },
    [navigate],
  );

  useEffect(() => {
    processPendingWorkflowAction(useAppStore.getState().pendingWorkflowAction);

    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.pendingWorkflowAction !== prev.pendingWorkflowAction) {
        processPendingWorkflowAction(state.pendingWorkflowAction);
      }
    });

    return unsub;
  }, [processPendingWorkflowAction]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate("project-create");
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [navigate]);

  useEffect(() => {
    if (activeRoute === "projects") {
      setSelectedContractorId(activeContext ?? null);
    }
  }, [activeRoute, activeContext]);

  function handleOpenProject(project: PortfolioProject) {
    try {
      window.sessionStorage.setItem("quantara.selectedProjectDetail.v1", JSON.stringify(project));
    } catch {
      // Detail still opens with fallback content if storage is unavailable.
    }

    navigate("project-detail");
  }

  function handleCreateContractor(name?: string) {
    const contractorName = normalizeContractorName(name ?? contractorDraft);

    if (contractorName.length < 2) {
      notify({ message: "Inserisci un nome appaltatore valido.", tone: "warning" });
      return;
    }

    setContractorRegistry((current) => mergeContractorRegistry(current, contractorName));
    setContractorDraft("");
    setIsContractorModalOpen(false);
    dispatchDataChanged();
    notify({
      message: `${contractorName} creato tra gli appaltatori.`,
      title: "Appaltatore aggiunto",
      tone: "success",
    });
  }

  async function handleConfirmDeleteContractor() {
    if (!contractorDeleteTarget) {
      return;
    }

    const deletedId = contractorDeleteTarget.id;
    const deletedName = contractorDeleteTarget.contractor;

    const unassignedProjectsCount = activeProjects.filter(
      (project) => createContractorId(project.contractor) === deletedId,
    ).length;
    const contractsToUnassign = contractsState.data.filter((contract) => {
      const contractor = contract.contractorName ?? projectContractors[contract.id] ?? "";
      return createContractorId(contractor) === deletedId;
    });

    try {
      const updatedContracts = await Promise.all(
        contractsToUnassign.map((contract) =>
          updateDesktopContract(contract.id, {
            applicationContractCode: contract.applicationContractCode,
            contractorName: null,
            contractualAmount: contract.contractualAmount.amount,
            frameworkAgreementCode: contract.frameworkAgreementCode,
            id: contract.id,
            osExcludedAmount: contract.osExcludedAmount ?? null,
            tenderDiscountPercent: contract.tenderDiscountPercent,
            tariffPriorities: contract.tariffPriorities,
            title: contract.title,
          }),
        ),
      );

      if (updatedContracts.length > 0) {
        const updatedById = new Map(updatedContracts.map((contract) => [contract.id, contract]));
        setContractsState((current) => ({
          ...current,
          data: current.data.map((contract) => updatedById.get(contract.id) ?? contract),
        }));
      }
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Eliminazione non riuscita",
        tone: "danger",
      });
      return;
    }

    setContractorRegistry((current) =>
      current.filter((contractor) => createContractorId(contractor) !== deletedId),
    );
    setProjectContractors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([, contractor]) => createContractorId(contractor) !== deletedId,
        ),
      ),
    );
    useSalWorkflowStore.setState((state) => ({
      projects: state.projects.map((project) =>
        createContractorId(project.client) === deletedId
          ? { ...project, client: "Senza appaltatore" }
          : project,
      ),
    }));
    if (selectedContractorId === deletedId) {
      navigateBack();
    }
    setContractorDeleteTarget(null);
    dispatchDataChanged();
    notify({
      message:
        unassignedProjectsCount > 0
          ? `${deletedName} rimosso: ${unassignedProjectsCount} progetti restano nel registro senza appaltatore.`
          : `${deletedName} rimosso dal registro appaltatori.`,
      title: "Appaltatore eliminato",
      tone: "success",
    });
  }

  const handleBackFromContractor = useCallback(() => {
    setQuery("");
    setFocus("all");
    navigateBack();
  }, [navigateBack]);

  const handleOpenCreateProject = useCallback(() => {
    navigate("project-create");
  }, [navigate]);

  const handleOpenFolder = useCallback(
    (folderId: string) => {
      setQuery("");
      setFocus("all");
      navigate("projects", folderId);
    },
    [navigate],
  );

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

  const { averageProgress, criticalCount, salExposure, salWindowCount, totalBudget } =
    portfolioMetrics;

  return (
    <main className="premium-page relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(ellipse_at_18%_0%,color-mix(in_srgb,var(--surface-base)_92%,transparent),transparent_42%),radial-gradient(ellipse_at_88%_10%,color-mix(in_srgb,var(--accent-primary)_8%,transparent),transparent_36%)]" />

      <ErrorBoundary resetKey={`projects-workspace:${selectedContractorId ?? "root"}`}>
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
            onEditProject={(project) => selectProject(project.id)}
            onDeleteProject={(projectId) => setProjectDeleteTarget(projectId)}
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
            onDeleteContractor={setContractorDeleteTarget}
            onOpenCreateContractor={() => setIsContractorModalOpen(true)}
            onOpenFolder={handleOpenFolder}
            onOpenNotifications={() => setIsSalModalOpen(true)}
            recentSalsCount={recentSals.length}
            totalPortfolioValue={totalPortfolioValue}
          />
        )}
      </ErrorBoundary>

      <input
        accept=".xlsx"
        className="hidden"
        onChange={handleImportFileChange}
        ref={fileInputRef}
        type="file"
      />

      <Suspense fallback={null}>
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
        {isSalModalOpen ? (
          <SalModal
            isOpen={isSalModalOpen}
            onClose={() => setIsSalModalOpen(false)}
            projectIndex={projectSalIndex}
            sals={modalSals}
            onUpdateQuantity={(salId, lineId, qty) =>
              updateSalLine(salId, lineId, { quantity: qty })
            }
            onUpdateSurcharge={(salId, lineId, surcharge) =>
              updateSalLine(salId, lineId, { surcharge })
            }
          />
        ) : null}
        {contractorDeleteTarget ? (
          <ContractorDeleteDialog
            contractor={contractorDeleteTarget}
            onClose={() => setContractorDeleteTarget(null)}
            onConfirm={handleConfirmDeleteContractor}
          />
        ) : null}
        <ConfirmDialog
          isOpen={projectDeleteTarget !== null}
          onCancel={() => setProjectDeleteTarget(null)}
          onConfirm={() => {
            if (projectDeleteTarget) void deleteProject(projectDeleteTarget);
            setProjectDeleteTarget(null);
          }}
          title="Eliminare questo progetto?"
          tone="danger"
        >
          L'operazione rimuove il contratto locale dal registro.
        </ConfirmDialog>
      </Suspense>
    </main>
  );
}

function enrichProjectWithRealSalData(
  project: PortfolioProject,
  salDocuments: ReturnType<typeof useSalWorkflowStore.getState>["salDocuments"],
  tariffVoices: ReturnType<typeof useSalWorkflowStore.getState>["tariffVoices"],
): PortfolioProject {
  const projectSals = salDocuments
    .filter((sal) => sal.projectId === project.id)
    .map((sal) => buildSalDocumentView(sal, tariffVoices))
    .sort((left, right) => {
      const leftDate = left.closedAt ?? left.date;
      const rightDate = right.closedAt ?? right.date;
      return rightDate.localeCompare(leftDate);
    });

  if (projectSals.length === 0) {
    return {
      ...project,
      forecastDeltaDays: 0,
      healthLabel: "SAL da avviare",
      manager: "PM non assegnato",
      materialRisk: "Nessuna SAL registrata",
      nextMilestone: "Creare prima SAL",
      progress: 0,
      salDays: 0,
      salState: "Nessuna SAL",
      salValue: { amount: 0, currency: project.budget.currency },
      tone: "warning",
      variance: "0,0%",
    };
  }

  const closedSals = projectSals.filter((sal) => sal.status === "closed");
  const draftSals = projectSals.filter((sal) => sal.status !== "closed");
  const latestSal = projectSals[0];
  const latestClosedSal = closedSals[0];
  const committedAmount = projectSals.reduce((sum, sal) => sum + sal.total, 0);
  const closedAmount = closedSals.reduce((sum, sal) => sum + sal.total, 0);
  const referenceAmount = latestSal?.total ?? 0;
  const progress =
    project.budget.amount > 0
      ? Math.min(100, Math.round((closedAmount / project.budget.amount) * 1000) / 10)
      : 0;
  const variance =
    project.budget.amount > 0
      ? `${((committedAmount / project.budget.amount) * 100).toLocaleString("it-IT", {
          maximumFractionDigits: 1,
          minimumFractionDigits: 1,
        })}%`
      : "0,0%";

  if (draftSals.length > 0) {
    return {
      ...project,
      healthLabel: draftSals.length === 1 ? "SAL in bozza" : `${draftSals.length} SAL in bozza`,
      manager: "PM non assegnato",
      materialRisk:
        closedSals.length > 0
          ? `${closedSals.length} SAL approvate, ${draftSals.length} in lavorazione`
          : "SAL in lavorazione senza approvazioni",
      nextMilestone: latestSal?.title ?? "Completare SAL",
      progress,
      salDays: daysFromToday(latestSal?.date),
      salState: latestSal?.title ?? "SAL in bozza",
      salValue: { amount: referenceAmount, currency: project.budget.currency },
      tone: "warning",
      variance,
    };
  }

  return {
    ...project,
    healthLabel: "SAL approvata",
    manager: "PM non assegnato",
    materialRisk: `${closedSals.length} SAL approvate`,
    nextMilestone: latestClosedSal?.title ?? "SAL approvata",
    progress,
    salDays: daysFromToday(latestClosedSal?.closedAt ?? latestClosedSal?.date),
    salState: latestClosedSal?.title ?? "SAL chiusa",
    salValue: { amount: latestClosedSal?.total ?? 0, currency: project.budget.currency },
    tone: "success",
    variance,
  };
}

function daysFromToday(dateValue: string | undefined): number {
  if (!dateValue) {
    return 0;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

function ContractorDeleteDialog({
  contractor,
  onClose,
  onConfirm,
}: {
  contractor: ContractorFolder;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi conferma eliminazione appaltatore"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <m.section
        className="relative w-full max-w-sm rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: SPRING_EASE }}
      >
        <div className="rounded-22px bg-[var(--surface-base)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between">
            <h3 className="text-16px font-semibold text-[var(--text-primary)]">
              Elimina {contractor.contractor}?
            </h3>
            <button
              className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-3 text-13px leading-6 text-[var(--text-secondary)]">
            {contractor.projectCount > 0
              ? `I ${contractor.projectCount} progetti collegati resteranno nel registro senza appaltatore assegnato. Anche i SAL collegati non ricreeranno la cartella.`
              : "La cartella verra rimossa dal registro appaltatori e dai SAL collegati."}
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <ProjectControlButton onClick={onClose} variant="ghost">
              Annulla
            </ProjectControlButton>
            <ProjectControlButton
              className="!bg-[var(--danger-base)] !text-white hover:!bg-[var(--danger-soft)] hover:!text-[var(--danger-base)]"
              onClick={onConfirm}
              variant="primary"
            >
              <Trash2 className="size-4" />
              Elimina
            </ProjectControlButton>
          </div>
        </div>
      </m.section>
    </div>
  );
}
