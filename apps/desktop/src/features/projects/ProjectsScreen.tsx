import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  HardHat,
  Layers3,
  Pencil,
  Search,
  TrendingUp,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import type { Money } from "@quantara/shared-types";
import { eur } from "@quantara/domain-utils";
import {
  parseQuantaraMigrationWorkbook,
  serializeQuantaraMigrationWorkbook,
  validateQuantaraMigrationWorkbook,
  type QuantaraMigrationWorkbook,
} from "@quantara/excel-import";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ScreenShell, SectionPanel } from "@/components/shared/Screen";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { ContractorsWorkspace } from "@/features/projects/components/ContractorsWorkspace";
import { ProjectsWorkbench } from "@/features/projects/components/ProjectsWorkbench";
import {
  CompactRail,
  EmptyState,
  FocusChip,
  PortfolioMetric,
} from "@/features/projects/components/workspace-ui";
import { CreateProjectModal } from "@/features/projects/dialogs/CreateProjectModal";
import type { ContractorFolder, PortfolioFocus, PortfolioProject } from "@/features/projects/types";
import { useNavigate } from "@/hooks/useNavigate";
import {
  createDesktopContract,
  deleteDesktopContract,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
  updateDesktopContract,
  type CreateDesktopContractRequest,
  type DesktopContract,
  type DesktopDataResult,
  type DesktopTariffBook,
  type DesktopTariffVoice,
} from "@/lib/desktopData";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import {
  buildManagerLoad,
  compareProjects,
  countValidationIssues,
  createContractorId,
  createDesktopVoiceKey,
  downloadWorkbook,
  getTonePalette,
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

type MigrationAction = "commit" | "export" | "idle" | "import" | "template";
type ProjectEditState = {
  contractId: string;
  values: {
    applicationContractCode: string;
    contractorName: string;
    contractualAmount: string;
    frameworkAgreementCode: string;
    tariffBookId: string;
    title: string;
  };
};

type ProjectActionDialogState = {
  mode: "actions" | "delete";
  project: PortfolioProject;
};

type PriorityItem = {
  deadline: string;
  detail: string;
  owner: string;
  projectId: string;
  title: string;
  tone: StatusTone;
};

type ApprovalItem = {
  amount: Money;
  dueDays: number;
  label: string;
  owner: string;
  projectId: string;
  tone: StatusTone;
};

type ControlSignal = {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: StatusTone;
  value: string;
};

type ActivityItem = {
  detail: string;
  icon: LucideIcon;
  label: string;
  projectId: string;
  tone: StatusTone;
};

type RecentSalItem = {
  closedAt?: string;
  date: string;
  description: string;
  id: string;
  lines: { id: string; quantity: number; surcharge: "day" | "night" | "none"; voiceId: string }[];
  notes: string;
  projectId: string;
  status: string;
  title: string;
};

const contractorRegistryStorageKey = "quantara.contractorRegistry.v1";
const projectContractorStorageKey = "quantara.projectContractors.v1";

export const portfolioProjects: PortfolioProject[] = [
  {
    budget: eur(26150000),
    contractor: "RFI",
    forecastDeltaDays: 5,
    healthLabel: "In linea",
    id: "milano-verona",
    location: "Verona Est",
    lot: "Lotto 3A",
    manager: "M. Bianchi",
    materialRisk: "Binari 60E1 in conferma consegna",
    nextMilestone: "Validazione costi indiretti",
    phase: "Armamento e impianti",
    progress: 68,
    salDays: 2,
    salState: "SAL 9 in emissione",
    salValue: eur(2156800),
    title: "Linea AV/AC Milano-Verona",
    tone: "success",
    variance: "+1,8%",
  },
  {
    budget: eur(18420000),
    contractor: "RFI",
    forecastDeltaDays: 11,
    healthLabel: "Sotto presidio",
    id: "firenze-av",
    location: "Galleria Belvedere",
    lot: "Lotto 2B",
    manager: "L. Rossi",
    materialRisk: "Getto cunicolo da riprogrammare",
    nextMilestone: "Perizia galleria Belvedere",
    phase: "Scavi e consolidamenti",
    progress: 61,
    salDays: 6,
    salState: "SAL 7 da chiudere",
    salValue: eur(1985600),
    title: "Nodo di Firenze AV",
    tone: "warning",
    variance: "+8,7%",
  },
  {
    budget: eur(32780000),
    contractor: "RFI",
    forecastDeltaDays: 18,
    healthLabel: "Escalation",
    id: "napoli-bari",
    location: "Tratta Orsara",
    lot: "Lotto 1C",
    manager: "G. Verdi",
    materialRisk: "Subappalto e trasporti fuori soglia",
    nextMilestone: "Riesame extra-costi inerti",
    phase: "Opere civili e viadotti",
    progress: 72,
    salDays: 1,
    salState: "SAL 8 bloccata",
    salValue: eur(2890300),
    title: "Linea AV Napoli-Bari",
    tone: "danger",
    variance: "+12,4%",
  },
  {
    budget: eur(9850000),
    contractor: "RFI",
    forecastDeltaDays: -3,
    healthLabel: "In anticipo",
    id: "genova-ventimiglia",
    location: "Tratta Finale",
    lot: "Lotto Unico",
    manager: "A. Bianchi",
    materialRisk: "Scarpata sud sotto controllo",
    nextMilestone: "Validazione piano interferenze",
    phase: "Opere di linea",
    progress: 27,
    salDays: 9,
    salState: "SAL 4 pianificata",
    salValue: eur(842200),
    title: "Linea AV Genova-Ventimiglia",
    tone: "success",
    variance: "-2,1%",
  },
  {
    budget: eur(4250000),
    contractor: "ANAS",
    forecastDeltaDays: 0,
    healthLabel: "Monitoraggio",
    id: "rete-nord",
    location: "Programma 2024",
    lot: "Lotto manutentivo",
    manager: "D. Serra",
    materialRisk: "Nessun blocco materiale aperto",
    nextMilestone: "Ordine ricambi giugno",
    phase: "Manutenzione programmata",
    progress: 35,
    salDays: 14,
    salState: "SAL allineata",
    salValue: eur(210500),
    title: "Manutenzione Rete Nord",
    tone: "success",
    variance: "-1,3%",
  },
  {
    budget: eur(11600000),
    contractor: "RFI",
    forecastDeltaDays: 7,
    healthLabel: "Sotto presidio",
    id: "catania-merci",
    location: "Hub Bicocca",
    lot: "Lotto impianti",
    manager: "F. Greco",
    materialRisk: "Quadri AT in verifica finale",
    nextMilestone: "Consegna quadri elettrici",
    phase: "Impianti e automazione",
    progress: 48,
    salDays: 5,
    salState: "SAL 5 da firmare",
    salValue: eur(976500),
    title: "Passante merci Catania",
    tone: "warning",
    variance: "+4,6%",
  },
  {
    budget: eur(14900000),
    contractor: "Regione Marche",
    forecastDeltaDays: 21,
    healthLabel: "Escalation",
    id: "adriatica-quadruplicamento",
    location: "Tratta Sud",
    lot: "Lotto fondazioni",
    manager: "S. Conti",
    materialRisk: "Consolidamenti fuori programma",
    nextMilestone: "Chiusura variante fondazioni",
    phase: "Fondazioni e opere geotecniche",
    progress: 53,
    salDays: 3,
    salState: "Documenti SAL incompleti",
    salValue: eur(1124000),
    title: "Quadruplicamento Adriatica",
    tone: "danger",
    variance: "+10,2%",
  },
];

const priorityQueue: PriorityItem[] = [
  {
    deadline: "entro 18:00",
    detail: "Servono note OS e contraddittorio con subappalto per sbloccare il prossimo SAL.",
    owner: "Controllo costi",
    projectId: "napoli-bari",
    title: "Riallineare extra-costi e quadro SAL",
    tone: "danger",
  },
  {
    deadline: "domani",
    detail: "Manca il pacchetto fotografico definitivo per chiudere la pratica di emissione.",
    owner: "Direzione lavori",
    projectId: "adriatica-quadruplicamento",
    title: "Completare dossier SAL e allegati",
    tone: "danger",
  },
  {
    deadline: "48 ore",
    detail: "Ripianificare il getto in galleria prima che si propaghi sul forecast di fine lotto.",
    owner: "Produzione",
    projectId: "firenze-av",
    title: "Riprogrammare sequenza Belvedere",
    tone: "warning",
  },
  {
    deadline: "48 ore",
    detail: "Confermare la finestra di consegna armamento per tenere l'emissione SAL in traccia.",
    owner: "Procurement",
    projectId: "milano-verona",
    title: "Consolidare consegna binari 60E1",
    tone: "warning",
  },
  {
    deadline: "3 giorni",
    detail: "Ultimo check tecnico sui quadri AT prima della firma del quinto stato avanzamento.",
    owner: "Impianti",
    projectId: "catania-merci",
    title: "Chiudere validazione quadri elettrici",
    tone: "warning",
  },
];

const approvalWindow: ApprovalItem[] = [
  {
    amount: eur(2890300),
    dueDays: 0,
    label: "SAL 8 · rilascio straordinario",
    owner: "G. Verdi",
    projectId: "napoli-bari",
    tone: "danger",
  },
  {
    amount: eur(2156800),
    dueDays: 0,
    label: "SAL 9 · firma DL",
    owner: "M. Bianchi",
    projectId: "milano-verona",
    tone: "warning",
  },
  {
    amount: eur(1124000),
    dueDays: 1,
    label: "Pacchetto allegati · chiusura pratica",
    owner: "S. Conti",
    projectId: "adriatica-quadruplicamento",
    tone: "danger",
  },
  {
    amount: eur(976500),
    dueDays: 2,
    label: "SAL 5 · check impianti",
    owner: "F. Greco",
    projectId: "catania-merci",
    tone: "warning",
  },
];

const activityFeed: ActivityItem[] = [
  {
    detail: "Napoli-Bari · 17:42",
    icon: FileText,
    label: "Verbale OS #45 caricato in revisione",
    projectId: "napoli-bari",
    tone: "danger",
  },
  {
    detail: "Milano-Verona · 16:10",
    icon: Bell,
    label: "Richiesta firma SAL 9 inviata a Direzione Lavori",
    projectId: "milano-verona",
    tone: "warning",
  },
  {
    detail: "Passante merci Catania · 15:24",
    icon: Wrench,
    label: "Consegna quadri elettrici ripianificata",
    projectId: "catania-merci",
    tone: "warning",
  },
  {
    detail: "Genova-Ventimiglia · 14:38",
    icon: CheckCircle2,
    label: "Scarpata sud validata dopo sopralluogo",
    projectId: "genova-ventimiglia",
    tone: "success",
  },
  {
    detail: "Nodo Firenze AV · 13:50",
    icon: HardHat,
    label: "Nuovo fronte armamento aperto in galleria",
    projectId: "firenze-av",
    tone: "warning",
  },
];

const focusOptions: { label: string; value: PortfolioFocus }[] = [
  { label: "Tutto il portfolio", value: "all" },
  { label: "Escalation e warning", value: "critical" },
  { label: "Finestra SAL", value: "sal" },
];

const fallbackProjectTariffBook = {
  id: "tariff_lombardia_2025",
  name: "Tariffario Lombardia 2025",
  sourceName: "Regione Lombardia",
  status: "validated",
  year: 2025,
};

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
    const handleTopbarAction = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "new-project") {
        setEditingProject(null);
        setIsCreateProjectModalOpen(true);
      }
    };

    window.addEventListener("project-workflow-action", handleTopbarAction);
    return () => {
      window.removeEventListener("project-workflow-action", handleTopbarAction);
    };
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

  useEffect(() => {
    const handleSalModalAction = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "create") {
        setIsCreateSalModalOpen(true);
      }

      if (customEvent.detail === "open") {
        setIsSalModalOpen(true);
      }
    };

    window.addEventListener("sal-modal-action", handleSalModalAction);
    return () => window.removeEventListener("sal-modal-action", handleSalModalAction);
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
        const project = contractorProjects.find((candidate) => candidate.id === item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.title} ${item.detail} ${item.owner}`,
          deferredQuery,
        );
      }),
    [contractorProjects, deferredQuery, focus],
  );

  const visibleApprovals = useMemo(
    () =>
      approvalWindow.filter((item) => {
        const project = contractorProjects.find((candidate) => candidate.id === item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.label} ${item.owner}`,
          deferredQuery,
        );
      }),
    [contractorProjects, deferredQuery, focus],
  );

  const visibleActivities = useMemo(
    () =>
      activityFeed.filter((item) => {
        const project = contractorProjects.find((candidate) => candidate.id === item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(`${project.title} ${item.label} ${item.detail}`, deferredQuery);
      }),
    [contractorProjects, deferredQuery, focus],
  );

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

  const managerLoad = buildManagerLoad(visibleProjects);
  const focusCounts = useMemo(() => {
    const counts: Record<PortfolioFocus, number> = { all: 0, critical: 0, sal: 0 };

    for (const project of contractorProjects) {
      if (!matchesProjectSearch(project, deferredQuery)) {
        continue;
      }

      counts.all += 1;

      if (matchesFocus(project, "critical")) {
        counts.critical += 1;
      }

      if (matchesFocus(project, "sal")) {
        counts.sal += 1;
      }
    }

    return counts;
  }, [contractorProjects, deferredQuery]);

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

function ContractorModal({
  contractorDraft,
  onChange,
  onClose,
  onCreate,
}: {
  contractorDraft: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi creazione appaltatore"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative w-full max-w-md rounded-[22px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Appaltatori
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Nuovo appaltatore</h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
              Nome appaltatore
            </span>
            <input
              className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCreate();
                }
              }}
              placeholder="Es. RFI"
              value={contractorDraft}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
          <Button onClick={onClose} type="button" variant="outline">
            Annulla
          </Button>
          <Button onClick={onCreate} type="button">
            Crea
          </Button>
        </div>
      </section>
    </div>
  );
}

function CreateSalModal({
  contractors,
  onClose,
  onCreate,
  projects,
  tariffBooks,
}: {
  contractors: ContractorFolder[];
  onClose: () => void;
  onCreate: (request: {
    date: string;
    description: string;
    notes: string;
    projectId: string;
    projectYear: number;
    title: string;
    voices: DesktopTariffVoice[];
  }) => void;
  projects: PortfolioProject[];
  tariffBooks: DesktopTariffBook[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [contractorId, setContractorId] = useState(
    projects[0]?.contractor ? createContractorId(projects[0].contractor) : "",
  );
  const contractorProjects = useMemo(
    () => projects.filter((project) => createContractorId(project.contractor) === contractorId),
    [contractorId, projects],
  );
  const [projectId, setProjectId] = useState(contractorProjects[0]?.id ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");
  const [selectedTariffBookIds, setSelectedTariffBookIds] = useState<string[]>([]);
  const [activeTariffBookId, setActiveTariffBookId] = useState("");
  const [voicesByBook, setVoicesByBook] = useState<Record<string, DesktopTariffVoice[]>>({});
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([]);
  const selectedProject = projects.find((project) => project.id === projectId);
  const activeVoices = activeTariffBookId ? (voicesByBook[activeTariffBookId] ?? []) : [];
  const selectedVoices = selectedTariffBookIds.flatMap((bookId) =>
    (voicesByBook[bookId] ?? []).filter((voice) =>
      selectedVoiceIds.includes(createDesktopVoiceKey(bookId, voice.id)),
    ),
  );

  useEffect(() => {
    const firstProject = contractorProjects[0];

    setProjectId((current) =>
      contractorProjects.some((project) => project.id === current)
        ? current
        : (firstProject?.id ?? ""),
    );
  }, [contractorProjects]);

  useEffect(() => {
    if (!activeTariffBookId && selectedTariffBookIds[0]) {
      setActiveTariffBookId(selectedTariffBookIds[0]);
    }
  }, [activeTariffBookId, selectedTariffBookIds]);

  useEffect(() => {
    for (const tariffBookId of selectedTariffBookIds) {
      if (voicesByBook[tariffBookId]) {
        continue;
      }

      void listDesktopTariffVoices(tariffBookId, buildFallbackTariffVoices(tariffBookId)).then(
        (result) => {
          setVoicesByBook((current) => ({
            ...current,
            [tariffBookId]: result.data,
          }));
        },
      );
    }
  }, [selectedTariffBookIds, voicesByBook]);

  function toggleTariffBook(tariffBookId: string) {
    setSelectedTariffBookIds((current) => {
      if (current.includes(tariffBookId)) {
        setSelectedVoiceIds((voiceIds) =>
          voiceIds.filter(
            (voiceId) =>
              !(voicesByBook[tariffBookId] ?? []).some(
                (voice) => voiceId === createDesktopVoiceKey(tariffBookId, voice.id),
              ),
          ),
        );
        return current.filter((id) => id !== tariffBookId);
      }

      return [...current, tariffBookId];
    });
    setActiveTariffBookId(tariffBookId);
  }

  function toggleVoice(voiceId: string) {
    setSelectedVoiceIds((current) =>
      current.includes(voiceId) ? current.filter((id) => id !== voiceId) : [...current, voiceId],
    );
  }

  function goNext() {
    if (step === 1 && !contractorId) {
      setError("Seleziona un appaltatore.");
      return;
    }

    if (step === 2 && !projectId) {
      setError("Seleziona un progetto.");
      return;
    }

    if (step === 3 && selectedTariffBookIds.length === 0) {
      setError("Seleziona almeno un tariffario.");
      return;
    }

    setError("");
    setStep((current) => (current < 4 ? ((current + 1) as 1 | 2 | 3 | 4) : current));
  }

  function handleCreate() {
    if (!projectId || !selectedProject) {
      setError("Seleziona un progetto.");
      return;
    }

    if (selectedVoices.length === 0) {
      setError("Seleziona almeno una voce.");
      return;
    }

    onCreate({
      date,
      description: "",
      notes: "",
      projectId,
      projectYear: new Date().getFullYear(),
      title: title.trim(),
      voices: selectedVoices,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi creazione SAL"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[22px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              SAL
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Nuova SAL</h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-0 overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-subtle bg-muted/30 p-4 lg:border-b-0 lg:border-r">
            {[1, 2, 3, 4].map((item) => (
              <button
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm",
                  step === item
                    ? "bg-card font-semibold text-foreground shadow-soft"
                    : "text-secondary",
                )}
                key={item}
                onClick={() => setStep(item as 1 | 2 | 3 | 4)}
                type="button"
              >
                <span className="flex size-6 items-center justify-center rounded-full border border-subtle text-xs">
                  {item}
                </span>
                <span>
                  {item === 1
                    ? "Appaltatore"
                    : item === 2
                      ? "Progetto"
                      : item === 3
                        ? "Tariffari"
                        : "Draft"}
                </span>
              </button>
            ))}
          </aside>

          <div className="overflow-y-auto p-5">
            {step === 1 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {contractors.map((contractor) => (
                  <button
                    className={cn(
                      "rounded-[18px] border p-4 text-left transition-colors",
                      contractorId === contractor.id
                        ? "border-primary bg-primary/10"
                        : "border-subtle bg-muted/25 hover:bg-muted",
                    )}
                    key={contractor.id}
                    onClick={() => setContractorId(contractor.id)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-foreground">
                      {contractor.contractor}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {contractor.projectCount} progetti
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-3">
                {contractorProjects.map((project) => (
                  <button
                    className={cn(
                      "rounded-[18px] border p-4 text-left transition-colors",
                      projectId === project.id
                        ? "border-primary bg-primary/10"
                        : "border-subtle bg-muted/25 hover:bg-muted",
                    )}
                    key={project.id}
                    onClick={() => setProjectId(project.id)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-foreground">{project.title}</div>
                    <div className="mt-1 text-xs text-secondary">
                      {project.lot} · {project.location}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {tariffBooks.map((book) => (
                    <button
                      className={cn(
                        "w-full rounded-[16px] border p-3 text-left",
                        selectedTariffBookIds.includes(book.id)
                          ? "border-primary bg-primary/10"
                          : "border-subtle bg-muted/25 hover:bg-muted",
                      )}
                      key={book.id}
                      onClick={() => toggleTariffBook(book.id)}
                      type="button"
                    >
                      <div className="text-sm font-semibold text-foreground">{book.name}</div>
                      <div className="mt-1 text-xs text-secondary">{book.year}</div>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedTariffBookIds.map((bookId) => {
                      const book = tariffBooks.find((item) => item.id === bookId);
                      return (
                        <Button
                          key={bookId}
                          onClick={() => setActiveTariffBookId(bookId)}
                          size="sm"
                          type="button"
                          variant={activeTariffBookId === bookId ? "default" : "outline"}
                        >
                          {book?.name ?? bookId}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto">
                    {activeVoices.map((voice) => {
                      const voiceKey = createDesktopVoiceKey(activeTariffBookId, voice.id);

                      return (
                        <label
                          className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-subtle bg-card p-3"
                          key={voiceKey}
                        >
                          <input
                            checked={selectedVoiceIds.includes(voiceKey)}
                            className="mt-1"
                            onChange={() => toggleVoice(voiceKey)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                              {voice.officialCode}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-secondary">
                              {voice.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                      Titolo
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      onChange={(event) => setTitle(event.target.value)}
                      value={title}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                      Data
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      onChange={(event) => setDate(event.target.value)}
                      type="date"
                      value={date}
                    />
                  </label>
                </div>
                <div className="rounded-[18px] border border-subtle">
                  {selectedVoices.map((voice) => (
                    <div
                      className="grid gap-3 border-b border-subtle p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_150px]"
                      key={voice.id}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {voice.officialCode}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-secondary">
                          {voice.description}
                        </div>
                      </div>
                      <input
                        className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                        disabled
                        placeholder="Quantita"
                      />
                      <select
                        className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                        disabled
                      >
                        <option>Nessuna</option>
                        <option>Diurna</option>
                        <option>Notturna</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <div className="mt-4 text-sm text-danger">{error}</div> : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
          <Button onClick={onClose} type="button" variant="outline">
            Annulla
          </Button>
          {step > 1 ? (
            <Button
              onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3 | 4)}
              type="button"
              variant="outline"
            >
              Indietro
            </Button>
          ) : null}
          {step < 4 ? (
            <Button onClick={goNext} type="button">
              Avanti
            </Button>
          ) : (
            <Button
              disabled={projects.length === 0 || selectedVoices.length === 0}
              onClick={handleCreate}
              type="button"
            >
              Crea draft
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export function mapContractToProject(
  contract: DesktopContract,
  contractorName?: unknown,
): PortfolioProject {
  const normalizedContractor =
    typeof contractorName === "string" ? normalizeContractorName(contractorName) : "";

  return {
    budget: contract.contractualAmount,
    contractor: normalizedContractor || "Senza appaltatore",
    forecastDeltaDays: 0,
    healthLabel: "Da pianificare",
    id: contract.id,
    location: contract.frameworkAgreementCode,
    lot: contract.applicationContractCode,
    manager: "Da assegnare",
    materialRisk: "Materiali da collegare",
    nextMilestone: "Configurare SAL e tariffari",
    phase: "Contratto locale",
    progress: 0,
    salDays: 14,
    salState: "SAL da creare",
    salValue: eur(0),
    title: contract.title,
    tone: "success",
    variance: "0,0%",
  };
}

function mapDesktopVoiceToSalVoice(voice: DesktopTariffVoice, projectYear: number) {
  return {
    category: voice.category,
    code: voice.officialCode,
    description: voice.description,
    id: `desktop_${voice.tariffBookId}_${voice.id}`,
    projectYear,
    unit: voice.unitOfMeasure,
    unitPrice: voice.unitPrice,
  };
}

function buildFallbackTariffVoices(tariffBookId: string): DesktopTariffVoice[] {
  return [
    {
      category: "Opere",
      description: "Voce tariffaria da configurare",
      id: `${tariffBookId}_fallback_1`,
      officialCode: "VOCE-001",
      tariffBookId,
      unitOfMeasure: "cad",
      unitPrice: 0,
    },
  ];
}

function ControlRailPanel({
  activities,
  signals,
}: {
  activities: ActivityItem[];
  signals: ControlSignal[];
}) {
  return (
    <SectionPanel>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Presidio trasversale
        </div>
        <h3 className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">
          Segnali e feed operativo
        </h3>
      </div>

      <div className="mt-5 space-y-3">
        {signals.map((signal) => {
          const palette = getTonePalette(signal.tone);
          const Icon = signal.icon;

          return (
            <div
              className="flex items-start gap-3 rounded-2xl border p-4"
              key={signal.label}
              style={{
                background: palette.panel,
                borderColor: palette.border,
              }}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: palette.soft, color: palette.accent }}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{signal.label}</div>
                  <div className="text-sm font-semibold text-foreground">{signal.value}</div>
                </div>
                <p className="mt-1 text-xs leading-5 text-secondary">{signal.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-subtle pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
              Feed operativo
            </div>
            <h4 className="mt-2 text-base font-semibold text-foreground">
              Ultimi eventi rilevanti
            </h4>
          </div>
          <Badge variant="neutral">{activities.length}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {activities.length > 0 ? (
            activities.map((item) => {
              const palette = getTonePalette(item.tone);
              const Icon = item.icon;

              return (
                <div className="flex items-start gap-3" key={`${item.projectId}-${item.label}`}>
                  <span
                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: palette.soft, color: palette.accent }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="mt-1 text-xs text-secondary">{item.detail}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              description="Nessun evento recente ricade nel perimetro scelto."
              title="Feed silenzioso"
            />
          )}
        </div>
      </div>
    </SectionPanel>
  );
}

function ProjectActionDialog({
  mode,
  onClose,
  onConfirmDelete,
  onDelete,
  onEdit,
  onOpen,
  project,
}: {
  mode: "actions" | "delete";
  onClose: () => void;
  onConfirmDelete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpen: () => void;
  project: PortfolioProject;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi azioni progetto"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={mode === "delete" ? "Conferma eliminazione progetto" : "Azioni progetto"}
        className="relative w-full max-w-lg rounded-[24px] border border-subtle bg-card p-5 shadow-panel"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {project.lot} · {project.location}
              </span>
              <StatusBadge label={project.healthLabel} tone={project.tone} />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{project.title}</h3>
            <p className="mt-1 text-sm leading-6 text-secondary">{project.materialRisk}</p>
          </div>
          <button
            aria-label="Chiudi"
            className="flex size-9 shrink-0 items-center justify-center rounded-[14px] text-secondary hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {mode === "delete" ? (
          <div className="mt-5 rounded-[18px] border border-danger/25 bg-danger/10 p-4">
            <div className="text-sm font-semibold text-danger">Eliminare questo progetto?</div>
            <p className="mt-1 text-sm leading-6 text-secondary">
              L'azione rimuove il contratto locale dal registro. I progetti demo non vengono
              eliminati dal dataset fallback.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={onClose} size="sm" type="button" variant="outline">
                Annulla
              </Button>
              <Button
                className="border-danger/25 bg-danger text-white hover:bg-danger/90"
                onClick={onConfirmDelete}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 className="size-4" />
                Elimina
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            <ProjectActionButton
              description="Apri la scheda completa con contesto operativo e indicatori."
              icon={ChevronRight}
              label="Apri dossier"
              onClick={onOpen}
            />
            <ProjectActionButton
              description="Modifica titolo, accordo quadro, contratto applicativo, importo e tariffario."
              icon={Pencil}
              label="Modifica progetto"
              onClick={onEdit}
            />
            <ProjectActionButton
              danger
              description="Passa alla conferma prima di rimuovere il progetto locale."
              icon={Trash2}
              label="Elimina progetto"
              onClick={onDelete}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectActionButton({
  danger,
  description,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-[18px] border border-subtle bg-muted/35 p-3 text-left transition-colors hover:bg-muted",
        danger && "border-danger/25 bg-danger/10 hover:bg-danger/15",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[16px] bg-card text-primary",
          danger && "text-danger",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span
          className={cn("block text-sm font-semibold text-foreground", danger && "text-danger")}
        >
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-secondary">{description}</span>
      </span>
    </button>
  );
}

function buildContractorFolders(
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

type SalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (salId: string, lineId: string, quantity: number) => void;
  onUpdateSurcharge: (salId: string, lineId: string, surcharge: "day" | "night" | "none") => void;
  projectIndex: Map<string, { name: string; year: number; client: string }>;
  sals: RecentSalItem[];
};

function SalModal({
  isOpen,
  onClose,
  onUpdateQuantity,
  onUpdateSurcharge,
  projectIndex,
  sals,
}: SalModalProps) {
  const deleteSal = useSalWorkflowStore((state) => state.deleteSal);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const { notify } = useToast();
  const [filter, setFilter] = useState<"all" | "draft" | "closed">("all");
  const [query, setQuery] = useState("");
  const [editingSal, setEditingSal] = useState<string | null>(null);
  const [deletingSal, setDeletingSal] = useState<string | null>(null);

  const filteredSals = useMemo(() => {
    return sals
      .filter((sal) => {
        if (filter !== "all" && sal.status !== filter) return false;
        if (query) {
          const project = projectIndex.get(sal.projectId);
          const searchText = `${sal.title} ${sal.description} ${project?.name ?? ""}`.toLowerCase();
          if (!searchText.includes(query.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.closedAt || a.date;
        const dateB = b.closedAt || b.date;
        return dateB.localeCompare(dateA);
      });
  }, [filter, query, projectIndex, sals]);

  function handleDelete(salId: string) {
    deleteSal(salId);
    setDeletingSal(null);
    notify({
      message: "SAL eliminata",
      title: "Eliminazione completata",
      tone: "success",
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[24px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Registro SAL
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Tutte le SAL</h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-subtle px-5 py-3">
          <div className="flex rounded-full border border-subtle bg-muted/45 p-1">
            {(["all", "draft", "closed"] as const).map((f) => (
              <button
                key={f}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-secondary hover:text-foreground",
                )}
                onClick={() => setFilter(f)}
                type="button"
              >
                {f === "all" ? "Tutte" : f === "draft" ? "Bozze" : "Chiuse"}
              </button>
            ))}
          </div>
          <label className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
            <input
              className="h-9 w-full rounded-full border border-subtle bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca SAL..."
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {filteredSals.length === 0 ? (
            <div className="py-8 text-center text-sm text-secondary">Nessuna SAL trovata</div>
          ) : (
            <div className="space-y-2">
              {filteredSals.map((sal) => {
                const project = projectIndex.get(sal.projectId);
                const isDeleting = deletingSal === sal.id;
                const isEditing = editingSal === sal.id;
                const voiceIndex = new Map(tariffVoices.map((voice) => [voice.id, voice]));

                return (
                  <div
                    key={sal.id}
                    className={cn(
                      "rounded-[18px] border p-4 transition-colors",
                      isDeleting
                        ? "border-danger/25 bg-danger/10"
                        : "border-subtle bg-muted/35 hover:bg-muted",
                    )}
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-danger">
                            Eliminare questa SAL?
                          </div>
                          <div className="mt-1 text-xs text-secondary">
                            L&apos;azione e irreversibile.
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setDeletingSal(null)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Annulla
                          </Button>
                          <Button
                            className="border-danger/25 bg-danger text-white hover:bg-danger/90"
                            onClick={() => handleDelete(sal.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 className="size-4" />
                            Elimina
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={sal.status === "closed" ? "success" : "warning"}>
                                {sal.status === "closed" ? "Chiusa" : "Bozza"}
                              </Badge>
                              <span className="text-xs text-secondary">{sal.date}</span>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-foreground">
                              {sal.title}
                            </div>
                            <div className="mt-1 text-xs text-secondary">
                              {project
                                ? `${project.name} (${project.year}) · ${project.client || "N/A"}`
                                : "Progetto non trovato"}
                            </div>
                            {sal.description && (
                              <div className="mt-2 text-xs text-secondary/80 line-clamp-2">
                                {sal.description}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              className="flex size-8 items-center justify-center rounded-[12px] text-secondary hover:bg-muted hover:text-foreground"
                              onClick={() => setEditingSal(sal.id)}
                              title="Modifica"
                              type="button"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="flex size-8 items-center justify-center rounded-[12px] text-secondary hover:bg-muted hover:text-danger"
                              onClick={() => setDeletingSal(sal.id)}
                              title="Elimina"
                              type="button"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                        {isEditing || sal.status === "draft" ? (
                          <div className="mt-4 overflow-hidden rounded-[14px] border border-subtle bg-card">
                            {sal.lines.length > 0 ? (
                              sal.lines.map((line) => {
                                const voice = voiceIndex.get(line.voiceId);

                                return (
                                  <div
                                    className="grid gap-3 border-b border-subtle p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_150px]"
                                    key={line.id}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-foreground">
                                        {voice?.code ?? "Voce"}
                                      </div>
                                      <div className="mt-1 line-clamp-2 text-xs text-secondary">
                                        {voice?.description ?? "Voce tariffaria non trovata"}
                                      </div>
                                    </div>
                                    <input
                                      className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                                      min={0}
                                      onChange={(event) =>
                                        onUpdateQuantity(
                                          sal.id,
                                          line.id,
                                          Number(event.target.value),
                                        )
                                      }
                                      type="number"
                                      value={line.quantity}
                                    />
                                    <select
                                      className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                                      onChange={(event) =>
                                        onUpdateSurcharge(
                                          sal.id,
                                          line.id,
                                          event.target.value as "day" | "night" | "none",
                                        )
                                      }
                                      value={line.surcharge}
                                    >
                                      <option value="none">Nessuna</option>
                                      <option value="day">Diurna</option>
                                      <option value="night">Notturna</option>
                                    </select>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 text-xs text-secondary">
                                Nessuna voce agganciata alla bozza.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-subtle px-5 py-4">
          <div className="text-sm text-secondary">{filteredSals.length} SAL</div>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            Chiudi
          </Button>
        </div>
      </section>
    </div>
  );
}
