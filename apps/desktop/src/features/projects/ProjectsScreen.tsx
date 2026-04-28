import {
  parseQuantaraMigrationWorkbook,
  type QuantaraMigrationWorkbook,
  serializeQuantaraMigrationWorkbook,
  validateQuantaraMigrationWorkbook,
} from "@quantara/excel-import";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FolderOpen,
  Layers3,
  Search,
  TrendingUp,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ScreenShell } from "@/components/shared/Screen";
import { useToast } from "@/components/shared/ToastProvider";
import { ContractorModal } from "@/features/projects/components/ContractorModal";
import { ContractorsWorkspace } from "@/features/projects/components/ContractorsWorkspace";
import { ControlRailPanel } from "@/features/projects/components/ControlRailPanel";
import { CreateSalModal } from "@/features/projects/components/CreateSalModal";
import { ProjectActionDialog } from "@/features/projects/components/ProjectActionDialog";
import { ProjectsWorkbench } from "@/features/projects/components/ProjectsWorkbench";
import { SalModal } from "@/features/projects/components/SalModal";
import {
  CompactRail,
  EmptyState,
  FocusChip,
  PortfolioMetric,
} from "@/features/projects/components/workspace-ui";
import { CreateProjectModal } from "@/features/projects/dialogs/CreateProjectModal";
import type {
  MigrationAction,
  PortfolioFocus,
  PortfolioProject,
  ProjectActionDialogState,
  ProjectEditState,
} from "@/features/projects/types";
import { useNavigate } from "@/hooks/useNavigate";
import {
  type CreateDesktopContractRequest,
  createDesktopContract,
  type DesktopContract,
  type DesktopDataResult,
  deleteDesktopContract,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
} from "@/lib/desktopData";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import {
  activityFeed,
  approvalWindow,
  fallbackProjectTariffBook,
  focusOptions,
  priorityQueue,
} from "./projects-data";
import { buildContractorFolders } from "./utils/buildContractorFolders";
import { mapContractToProject, mapDesktopVoiceToSalVoice } from "./utils/project-mappers";
import {
  buildManagerLoad,
  compareProjects,
  countValidationIssues,
  createContractorId,
  downloadWorkbook,
  isSalWindow,
  matchesFocus,
  matchesProjectSearch,
  matchesSearch,
  mergeContractorRegistry,
  normalizeContractorName,
  readStringList,
  readStringRecord,
  waitForUiPaint,
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
  const [isCreateSalModalOpen, setIsCreateSalModalOpen] = useState(false);
  const [isSalModalOpen, setIsSalModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
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
  const createSalDraftWithLines = useSalWorkflowStore((state) => state.createSalDraftWithLines);
  const createSalProjectWithId = useSalWorkflowStore((state) => state.createProjectWithId);
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
        setIsCreateSalModalOpen(true);
        useAppStore.getState().setPendingWorkflowAction(null);
      }
    });

    return unsub;
  }, []);

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

  async function handleCreateProject(
    request: CreateDesktopContractRequest,
    meta: { contractorName: string },
  ) {
    setCreateState("saving");
    setCreateMessage("");

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
      setCreateState("saved");
      setCreateMessage(`${created.title} creato.`);
      notify({
        message: `${created.title} e pronto nel registro progetti.`,
        title: "Progetto creato",
        tone: "success",
      });
      return created;
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Creazione non riuscita",
        tone: "danger",
      });
      return null;
    }
  }

  async function handleUpdateProject(
    request: CreateDesktopContractRequest,
    meta: { contractorName: string },
  ) {
    if (!editingProject) {
      return handleCreateProject(request, meta);
    }

    setCreateState("saving");
    setCreateMessage("");

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
      setCreateState("saved");
      setCreateMessage(`${updated.title} aggiornato.`);
      setEditingProject(null);
      notify({
        message: `${updated.title} aggiornato correttamente.`,
        title: "Progetto aggiornato",
        tone: "success",
      });
      return updated;
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Modifica non riuscita",
        tone: "danger",
      });
      return null;
    }
  }

  function handleSelectProject(projectId: string) {
    const contract = contractsState.data.find((item) => item.id === projectId);

    if (!contract) {
      setCreateState("error");
      setCreateMessage("Modifica disponibile sui progetti locali creati nel database.");
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
        tariffBookId: contract.tariffPriorities[0]?.tariffBookId ?? tariffBooksState[0]?.id ?? "",
        title: contract.title,
      },
    });
    setIsCreateProjectModalOpen(true);
    setCreateState("idle");
    setCreateMessage("");
  }

  function handleOpenProject(project: PortfolioProject) {
    try {
      window.sessionStorage.setItem("quantara.selectedProjectDetail.v1", JSON.stringify(project));
    } catch {
      // Detail still opens with fallback content if storage is unavailable.
    }

    navigate("project-detail");
  }

  async function handleDeleteFromDropdown(projectId: string) {
    setCreateState("saving");
    setCreateMessage("");

    try {
      const deletedContract = contractsState.data.find((contract) => contract.id === projectId);

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
      setCreateState("saved");
      setCreateMessage(`${deletedContract?.title ?? "Progetto"} eliminato.`);
      notify({
        message: `${deletedContract?.title ?? "Progetto"} eliminato dal registro.`,
        title: "Progetto eliminato",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Eliminazione non riuscita",
        tone: "danger",
      });
    }
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
  }

  function handleEditFromActions(project: PortfolioProject) {
    setProjectActionDialog(null);
    handleSelectProject(project.id);
  }

  function handleAskDeleteFromActions(project: PortfolioProject) {
    setProjectActionDialog({ mode: "delete", project });
  }

  async function handleConfirmDeleteFromActions(project: PortfolioProject) {
    setProjectActionDialog(null);
    await handleDeleteFromDropdown(project.id);
  }

  async function handleExportMigrationWorkbook() {
    setMigrationAction("export");
    setCreateState("saving");
    setCreateMessage("Preparazione export Excel...");

    const data: QuantaraMigrationWorkbook = {
      materials: [],
      projects: contractsState.data.map((contract) => ({
        applicationContractCode: contract.applicationContractCode,
        client: "",
        contractualAmount: contract.contractualAmount.amount,
        description: "",
        frameworkAgreementCode: contract.frameworkAgreementCode,
        tariffBookId: contract.tariffPriorities[0]?.tariffBookId ?? "",
        title: contract.title,
        year: new Date().getFullYear(),
      })),
      sal: [],
    };

    try {
      await waitForUiPaint();
      downloadWorkbook(serializeQuantaraMigrationWorkbook(data), "quantara-projects-export.xlsx");
      setCreateState("saved");
      setCreateMessage(
        data.projects.length > 0
          ? `Export Excel completato: ${data.projects.length} progetti inclusi.`
          : "Export Excel scaricato senza progetti locali. Usa il template per una migrazione pulita.",
      );
      notify({
        message:
          data.projects.length > 0
            ? `${data.projects.length} progetti inclusi nell'export.`
            : "Export scaricato senza progetti locali.",
        title: "Export Excel completato",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Export non riuscito",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
  }

  async function handleImportMigrationFile(file: File) {
    setMigrationAction("import");
    setCreateState("saving");
    setCreateMessage(`Lettura ${file.name}...`);

    try {
      const data = parseQuantaraMigrationWorkbook(await file.arrayBuffer());
      const validation = validateQuantaraMigrationWorkbook(data);

      setCreateState(validation.valid ? "saved" : "error");
      setCreateMessage(
        validation.valid
          ? `${file.name}: ${validation.importableRows} righe pronte per l'import.`
          : `${file.name}: correggi ${countValidationIssues(validation, "error")} errori prima del commit.`,
      );
      notify({
        message: validation.valid
          ? `${validation.importableRows} righe pronte per l'import.`
          : `${countValidationIssues(validation, "error")} errori da correggere prima del commit.`,
        title: file.name,
        tone: validation.valid ? "success" : "warning",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Import Excel non riuscito",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
  }

  const contractorFolders = useMemo(
    () => buildContractorFolders(contractorRegistry, activeProjects, allSals, projectSalIndex),
    [activeProjects, allSals, contractorRegistry, projectSalIndex],
  );
  const selectedContractor = contractorFolders.find((folder) => folder.id === selectedContractorId);
  const contractorProjects = useMemo(
    () =>
      selectedContractorId
        ? activeProjects.filter(
            (project) => createContractorId(project.contractor) === selectedContractorId,
          )
        : activeProjects,
    [activeProjects, selectedContractorId],
  );
  const modalSals = useMemo(
    () =>
      selectedContractorId
        ? allSals.filter((sal) => {
            const project = projectSalIndex.get(sal.projectId);
            return createContractorId(project?.client ?? "") === selectedContractorId;
          })
        : allSals,
    [allSals, projectSalIndex, selectedContractorId],
  );

  const projectByIdMap = useMemo(
    () => new Map(contractorProjects.map((project) => [project.id, project])),
    [contractorProjects],
  );

  const visibleProjects = useMemo(
    () =>
      contractorProjects
        .filter(
          (project) => matchesFocus(project, focus) && matchesProjectSearch(project, deferredQuery),
        )
        .sort(compareProjects),
    [contractorProjects, deferredQuery, focus],
  );

  const visibleQueue = useMemo(
    () =>
      priorityQueue.filter((item) => {
        const project = projectByIdMap.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.title} ${item.detail} ${item.owner}`,
          deferredQuery,
        );
      }),
    [projectByIdMap, deferredQuery, focus],
  );

  const visibleApprovals = useMemo(
    () =>
      approvalWindow.filter((item) => {
        const project = projectByIdMap.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.label} ${item.owner}`,
          deferredQuery,
        );
      }),
    [projectByIdMap, deferredQuery, focus],
  );

  const visibleActivities = useMemo(
    () =>
      activityFeed.filter((item) => {
        const project = projectByIdMap.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(`${project.title} ${item.label} ${item.detail}`, deferredQuery);
      }),
    [projectByIdMap, deferredQuery, focus],
  );

  const portfolioMetrics = useMemo(() => {
    const totalBudget = visibleProjects.reduce((sum, project) => sum + project.budget.amount, 0);
    const salExposure = visibleProjects.reduce((sum, project) => sum + project.salValue.amount, 0);
    const criticalCount = visibleProjects.filter((project) => project.tone === "danger").length;
    const salWindowCount = visibleProjects.filter((project) => isSalWindow(project)).length;
    const averageProgress = visibleProjects.length
      ? Math.round(
          visibleProjects.reduce((sum, project) => sum + project.progress, 0) /
            visibleProjects.length,
        )
      : 0;

    return { averageProgress, criticalCount, salExposure, salWindowCount, totalBudget };
  }, [visibleProjects]);

  const { averageProgress, criticalCount, salExposure, salWindowCount, totalBudget } =
    portfolioMetrics;

  const managerLoad = buildManagerLoad(visibleProjects);
  const focusCounts = useMemo(() => {
    const counts: Record<PortfolioFocus, number> = {
      all: visibleProjects.length,
      critical: 0,
      sal: 0,
    };

    for (const project of visibleProjects) {
      if (matchesFocus(project, "critical")) {
        counts.critical += 1;
      }

      if (matchesFocus(project, "sal")) {
        counts.sal += 1;
      }
    }

    return counts;
  }, [visibleProjects]);

  return (
    <ScreenShell>
      {createMessage ? (
        <div
          className={cn(
            "mb-4 rounded-[16px] border px-4 py-3 text-[13px] font-medium shadow-none",
            createState === "error"
              ? "border-[var(--danger-base)]/25 bg-[var(--danger-soft)] text-[var(--danger-base)]"
              : "border-[var(--success-base)]/25 bg-[var(--success-soft)] text-[var(--success-base)]",
          )}
          role="status"
        >
          {createMessage}
        </div>
      ) : null}

      {selectedContractor ? (
        <div className="pt-2">
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                    Portfolio / 27 apr
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--success-base)]/20 bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success-base)]">
                    <span className="size-1.5 rounded-full bg-current" />
                    Operativo
                  </span>
                  {isPending ? (
                    <span className="rounded-[8px] bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning-base)]">
                      Filtri in aggiornamento
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-6 text-[28px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)] md:mt-8 md:text-[36px]">
                  {selectedContractor.contractor}
                </h2>
                <p className="mt-3 max-w-4xl text-[14px] font-normal leading-6 text-[var(--text-secondary)] md:mt-4 md:text-[15px]">
                  Cartella operativa dell'appaltatore. Monitoraggio del portfolio e dei contratti
                  nel perimetro attivo.
                </p>
              </div>
              <button
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]"
                onClick={() => {
                  setSelectedContractorId(null);
                  setQuery("");
                  setFocus("all");
                }}
                type="button"
              >
                <ArrowLeft className="size-4" />
                Appaltatori
              </button>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <PortfolioMetric
              detail="Totale dei progetti nel perimetro corrente"
              icon={Layers3}
              label="Valore contratti"
              tone="info"
              value={formatMoney({ amount: totalBudget, currency: "EUR" })}
            />
            <PortfolioMetric
              detail="Elementi agganciati alla cartella"
              icon={FolderOpen}
              label="Progetti / contratti"
              tone="success"
              value={`${visibleProjects.length}`}
            />
            <PortfolioMetric
              detail={`${salWindowCount} lotti tra emissioni, firme e dossier`}
              icon={ClipboardList}
              label="SAL in corso"
              tone={salWindowCount > 0 ? "warning" : "success"}
              value={formatMoney({ amount: salExposure, currency: "EUR" })}
            />
            <PortfolioMetric
              detail="Cantieri con forecast e documentazione fuori soglia"
              icon={AlertTriangle}
              label="Escalation"
              tone={criticalCount > 0 ? "danger" : "success"}
              value={`${criticalCount}`}
            />
            <PortfolioMetric
              detail="Media ponderata sul portfolio visibile"
              icon={TrendingUp}
              label="Avanzamento medio"
              tone="info"
              value={formatPercent(averageProgress)}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {focusOptions.map((option) => (
                    <FocusChip
                      active={focus === option.value}
                      count={focusCounts[option.value]}
                      key={option.value}
                      label={option.label}
                      onClick={() => startTransition(() => setFocus(option.value))}
                    />
                  ))}
                </div>
                <label className="relative block h-10 min-w-0 xl:w-[420px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    className="h-full w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-4 text-[13px] font-medium text-[var(--text-primary)] outline-none transition-all hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca lotto, PM, milestone o materiale critico"
                    type="search"
                    value={query}
                  />
                </label>
              </div>
            </div>
            <button
              className="hidden h-10 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-left text-[13px] font-semibold text-[var(--text-primary)] xl:block"
              type="button"
            >
              Dettagli perimetro
            </button>
          </div>

          <section className="mt-3 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_220px]">
            <section className="min-w-0">
              <ProjectsWorkbench
                onCreateProject={() => {
                  setEditingProject(null);
                  setIsCreateProjectModalOpen(true);
                }}
                onExport={handleExportMigrationWorkbook}
                onImport={() => fileInputRef.current?.click()}
                onOpenProject={handleOpenProject}
                onOpenProjectActions={handleOpenProjectActions}
                projects={visibleProjects}
                query={query}
                selectedProjectId={selectedContractId}
              />
            </section>

            <div className="grid gap-3 lg:grid-cols-2 2xl:block 2xl:space-y-3">
              <CompactRail title="Azioni che non possono aspettare" value={visibleQueue.length}>
                <EmptyState
                  description="I filtri correnti non lasciano task critici in evidenza."
                  title="Coda stabile"
                />
              </CompactRail>
              <CompactRail
                title="Finestra 72 ore"
                value={`${visibleApprovals.filter((item) => item.tone === "danger").length} escalation`}
              >
                <EmptyState
                  description="Nessuna approvazione ricade nel perimetro selezionato."
                  title="Finestra pulita"
                />
              </CompactRail>
              <CompactRail title="Copertura PM" value={String(managerLoad.length)}>
                <div className="flex items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-full border-4 border-[var(--success-base)] text-[11px] font-semibold text-[var(--success-base)]">
                    100%
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                      Copertura completa
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                      {visibleProjects.length} progetto con PM assegnato su {visibleProjects.length}{" "}
                      totale.
                    </div>
                  </div>
                </div>
              </CompactRail>
              <ControlRailPanel activities={visibleActivities} signals={[]} />
            </div>
          </section>
        </div>
      ) : (
        <ContractorsWorkspace
          activeProjectsCount={activeProjects.length}
          folders={contractorFolders}
          onImport={() => fileInputRef.current?.click()}
          onOpenCreateContractor={() => setIsContractorModalOpen(true)}
          onOpenFolder={(folderId) => {
            setSelectedContractorId(folderId);
            setQuery("");
            setFocus("all");
          }}
          onOpenNotifications={() => setIsSalModalOpen(true)}
          recentSalsCount={recentSals.length}
          totalPortfolioValue={activeProjects.reduce(
            (sum, project) => sum + project.budget.amount,
            0,
          )}
        />
      )}

      <input
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportMigrationFile(file);
          }
          event.currentTarget.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />

      {isCreateProjectModalOpen ? (
        <CreateProjectModal
          contractorOptions={contractorRegistry}
          defaultTariffBookId={tariffBooksState[0]?.id ?? fallbackProjectTariffBook.id}
          {...(editingProject
            ? { initialValues: editingProject.values }
            : selectedContractor
              ? {
                  initialValues: {
                    applicationContractCode: "",
                    contractorName: selectedContractor.contractor,
                    contractualAmount: "",
                    frameworkAgreementCode: "",
                    tariffBookId: tariffBooksState[0]?.id ?? fallbackProjectTariffBook.id,
                    title: "",
                  },
                }
              : {})}
          isSaving={createState === "saving"}
          onClose={() => {
            setIsCreateProjectModalOpen(false);
            setEditingProject(null);
          }}
          onCreate={editingProject ? handleUpdateProject : handleCreateProject}
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
      {isCreateSalModalOpen ? (
        <CreateSalModal
          contractors={contractorFolders}
          onClose={() => setIsCreateSalModalOpen(false)}
          onCreate={(request) => {
            const project = activeProjects.find((item) => item.id === request.projectId);

            if (!project) {
              notify({
                message: "Seleziona un progetto valido prima di creare la SAL.",
                title: "SAL non creata",
                tone: "warning",
              });
              return;
            }

            const voices = request.voices.map((voice) =>
              mapDesktopVoiceToSalVoice(voice, request.projectYear),
            );

            createSalProjectWithId({
              client: project.contractor,
              description: `${project.lot} - ${project.location}`,
              id: project.id,
              name: project.title,
              year: new Date().getFullYear(),
            });
            const created = createSalDraftWithLines({
              date: request.date,
              description: request.description,
              notes: "",
              projectId: request.projectId,
              title: request.title,
              voices,
            });
            setIsCreateSalModalOpen(false);
            setIsSalModalOpen(true);
            notify({
              message: `${created.title} creata come bozza.`,
              title: "SAL creata",
              tone: "success",
            });
          }}
          projects={selectedContractorId ? contractorProjects : activeProjects}
          tariffBooks={tariffBooksState}
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
    </ScreenShell>
  );
}
