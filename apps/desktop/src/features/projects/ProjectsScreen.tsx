import { FileSpreadsheet, FolderKanban, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useToast } from "@/components/shared/ToastProvider";
import { ContractorDetailView } from "@/features/projects/components/ContractorDetailView";
import { ContractorsWorkspace } from "@/features/projects/components/ContractorsWorkspace";
import {
  ContractorTreeView,
  buildContractorTree,
} from "@/features/projects/components/ContractorTreeView";
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
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import { useNavigate } from "@/hooks/useNavigate";
import {
  type DesktopContract,
  type DesktopDataResult,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";
import { isContractorMigrationComplete, resolveContractorName } from "@/lib/contractor-resolve";
import { selectProjectForWorkflow } from "@/lib/workflow-navigation";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import {
  type PendingWorkflowAction,
  useAppStore,
  useProjectsNavigationState,
} from "@/store/app-store";
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

const contractorRegistryStorageKey = STORAGE_KEYS.contractorRegistry;
const projectContractorStorageKey = STORAGE_KEYS.projectContractors;

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
  const { activeContext, activeRoute, navigateBack } = useProjectsNavigationState();
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
  const [isTreeView, setIsTreeView] = useState(false);
  const [focus, setFocus] = useState<PortfolioFocus>("all");
  const [, setMigrationAction] = useState<MigrationAction>("idle");
  const [query, setQuery] = useState("");
  const [isSalModalOpen, setIsSalModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportSelectionIds, setExportSelectionIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
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
            const baseProject = mapContractToProject(
              contract,
              resolveContractorName(contract, projectContractors),
            );
            return enrichProjectWithRealSalData(baseProject, salDocuments, tariffVoices);
          })
        : [],
    [contractsState.data, contractsState.source, projectContractors, salDocuments, tariffVoices],
  );
  const { exportProjectsReportWorkbook, importMigrationFile } = useProjectMigration({
    contracts: contractsState.data,
    notify,
    projects: activeProjects,
    salDocuments,
    setMigrationAction,
    tariffVoices,
  });
  const treeData = useMemo(
    () =>
      buildContractorTree(
        activeProjects,
        salDocuments.map((sal) => ({
          date: sal.date,
          projectId: sal.projectId,
          status: sal.status,
          title: sal.title,
          total: sal.total ?? 0,
        })),
      ),
    [activeProjects, salDocuments],
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

  const reloadPortfolio = useCallback(() => {
    return Promise.all([
      listDesktopContracts([]),
      listDesktopTariffBooks([fallbackProjectTariffBook]),
    ]).then(([contracts, tariffBooks]) => {
      setContractsState(contracts);
      setTariffBooksState(tariffBooks.data);
      setSelectedContractId((current) => current || contracts.data[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    void reloadPortfolio();
  }, [reloadPortfolio]);

  useDataChangedListener(() => {
    void reloadPortfolio();
  });

  useEffect(() => {
    writeJson(contractorRegistryStorageKey, contractorRegistry);
  }, [contractorRegistry]);

  useEffect(() => {
    if (!isContractorMigrationComplete()) {
      writeJson(projectContractorStorageKey, projectContractors);
    }
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
    selectProjectForWorkflow(project.id);
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
  const exportSelectedProjects = useMemo(
    () => visibleProjects.filter((project) => exportSelectionIds.has(project.id)),
    [exportSelectionIds, visibleProjects],
  );

  function openExportDialog() {
    setExportSelectionIds(new Set(visibleProjects.map((project) => project.id)));
    setIsExportDialogOpen(true);
  }

  function toggleExportProject(projectId: string) {
    setExportSelectionIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function confirmProjectExport() {
    if (exportSelectedProjects.length === 0) {
      notify({
        message: "Seleziona almeno un progetto da esportare.",
        title: "Export",
        tone: "warning",
      });
      return;
    }
    setIsExportDialogOpen(false);
    void exportProjectsReportWorkbook(exportSelectedProjects);
  }

  return (
    <ScreenLayout gradient="accent" gradientHeight={460}>
      <ErrorBoundary resetKey={`projects-workspace:${selectedContractorId ?? "root"}`}>
        <div className="flex min-h-0 flex-1 flex-col">
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
              onExport={openExportDialog}
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
          ) : isTreeView ? (
            <ContractorTreeView
              contractors={treeData}
              onOpenProject={(id) => {
                const p = activeProjects.find((proj) => proj.id === id);
                if (p) handleOpenProject(p);
              }}
              onSwitchView={() => setIsTreeView(false)}
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
              onSwitchToTreeView={() => setIsTreeView(true)}
              recentSalsCount={recentSals.length}
              totalPortfolioValue={totalPortfolioValue}
            />
          )}
        </div>
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
        <ProjectExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          onConfirm={confirmProjectExport}
          onSelectAll={() => setExportSelectionIds(new Set(visibleProjects.map((p) => p.id)))}
          onSelectNone={() => setExportSelectionIds(new Set())}
          onToggleProject={toggleExportProject}
          projects={visibleProjects}
          selectedIds={exportSelectionIds}
        />
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
    </ScreenLayout>
  );
}

function ProjectExportDialog({
  isOpen,
  onClose,
  onConfirm,
  onSelectAll,
  onSelectNone,
  onToggleProject,
  projects,
  selectedIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleProject: (projectId: string) => void;
  projects: PortfolioProject[];
  selectedIds: Set<string>;
}) {
  return (
    <Dialog
      className="max-w-3xl"
      contentClassName="overflow-hidden p-0"
      isOpen={isOpen}
      onClose={onClose}
      zIndex={90}
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-base)]">
              <FileSpreadsheet className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-16px font-bold text-[var(--text-primary)]">Esporta progetti</h3>
              <p className="mt-1 text-12px font-medium text-[var(--text-secondary)]">
                {selectedIds.size} di {projects.length} progetti selezionati
              </p>
            </div>
          </div>
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-[var(--bg-muted)] p-1">
          <button
            className="rounded-full px-3 py-1.5 text-12px font-bold text-[var(--accent-primary)] transition-colors hover:bg-[var(--surface-base)]"
            onClick={onSelectAll}
            type="button"
          >
            Tutti
          </button>
          <button
            className="rounded-full px-3 py-1.5 text-12px font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]"
            onClick={onSelectNone}
            type="button"
          >
            Nessuno
          </button>
        </div>
      </div>

      <div className="max-h-[52vh] space-y-2 overflow-y-auto bg-[var(--bg-muted)]/35 px-5 py-4">
        {projects.length > 0 ? (
          projects.map((project) => {
            const selected = selectedIds.has(project.id);
            return (
              <button
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-[var(--accent-primary)] bg-[var(--surface-base)] shadow-[0_12px_30px_color-mix(in_srgb,var(--accent-primary)_10%,transparent)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-base)] hover:bg-[var(--bg-muted)]",
                )}
                key={project.id}
                onClick={() => onToggleProject(project.id)}
                type="button"
              >
                <div className="min-w-0">
                  <div className="truncate text-14px font-bold text-[var(--text-primary)]">
                    {project.title}
                  </div>
                  <div className="mt-1 truncate text-12px font-medium text-[var(--text-secondary)]">
                    {project.contractor} · {project.lot}
                  </div>
                </div>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-lg border-2",
                    selected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)]",
                  )}
                >
                  {selected ? <span className="size-2 rounded-sm bg-white" /> : null}
                </span>
              </button>
            );
          })
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="Nessun progetto nel filtro corrente."
            description="Prova a modificare i filtri per trovare più progetti."
            className="rounded-xl"
          />
        )}
      </div>

      <DialogActions className="mt-0 border-t border-[var(--border-subtle)] px-5 py-4">
        <Button onClick={onClose} variant="ghost">
          Annulla
        </Button>
        <Button disabled={selectedIds.size === 0} icon={FileSpreadsheet} onClick={onConfirm}>
          Genera Excel
        </Button>
      </DialogActions>
    </Dialog>
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
    <Dialog isOpen onClose={onClose} zIndex={80}>
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
      <DialogActions>
        <Button onClick={onClose} variant="ghost">
          Annulla
        </Button>
        <Button onClick={onConfirm} variant="destructive">
          <Trash2 className="size-4" />
          Elimina
        </Button>
      </DialogActions>
    </Dialog>
  );
}
