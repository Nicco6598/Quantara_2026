import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  HardHat,
  Layers3,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Search,
  Target,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import type { Money } from "@quantara/shared-types";
import { eur } from "@quantara/domain-utils";
import {
  parseQuantaraMigrationWorkbook,
  serializeQuantaraMigrationWorkbook,
  validateQuantaraMigrationWorkbook,
  type MigrationSheetName,
  type MigrationValidationResult,
  type QuantaraMigrationWorkbook,
} from "@quantara/excel-import";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { CommandPanel, ScreenShell, SectionPanel } from "@/components/shared/Screen";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { CreateProjectModal } from "@/features/projects/dialogs/CreateProjectModal";
import { useNavigate } from "@/hooks/useNavigate";
import {
  createDesktopContract,
  deleteDesktopContract,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
  type CreateDesktopContractRequest,
  type DesktopContract,
  type DesktopDataResult,
} from "@/lib/desktopData";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type LaneTone = Extract<StatusTone, "success" | "warning" | "danger">;
type PortfolioFocus = "all" | "critical" | "sal";
type ProjectsViewMode = "board" | "workbench";
type MigrationAction = "commit" | "export" | "idle" | "import" | "template";
type ProjectEditState = {
  contractId: string;
  values: {
    applicationContractCode: string;
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

type MigrationPreview = {
  fileName: string;
  data: QuantaraMigrationWorkbook;
  validation: MigrationValidationResult;
};

export type PortfolioProject = {
  budget: Money;
  forecastDeltaDays: number;
  healthLabel: string;
  id: string;
  location: string;
  lot: string;
  manager: string;
  materialRisk: string;
  nextMilestone: string;
  phase: string;
  progress: number;
  salDays: number;
  salState: string;
  salValue: Money;
  title: string;
  tone: LaneTone;
  variance: string;
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

export const portfolioProjects: PortfolioProject[] = [
  {
    budget: eur(26150000),
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

const controlSignals: ControlSignal[] = [
  {
    detail: "tra verbali, perizie e pacchetti allegati con scadenza settimanale",
    icon: FileText,
    label: "Pratiche da chiudere",
    tone: "warning",
    value: "6",
  },
  {
    detail: "forniture con impatto diretto sul forecast e sulla finestra SAL",
    icon: Layers3,
    label: "Materiali sensibili",
    tone: "danger",
    value: "4",
  },
  {
    detail: "cantieri che stanno recuperando ritardo sulla curva lavori",
    icon: Target,
    label: "Lotti in recupero",
    tone: "success",
    value: "2",
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

const laneOrder: LaneTone[] = ["danger", "warning", "success"];

const laneMeta: Record<LaneTone, { description: string; label: string }> = {
  danger: {
    description: "lotti che richiedono escalation o sblocco immediato",
    label: "Escalation",
  },
  success: {
    description: "cantieri stabili, da tenere in spinta senza perdere ritmo",
    label: "Stabili",
  },
  warning: {
    description: "interventi sotto presidio operativo stretto",
    label: "Sotto presidio",
  },
};

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
  const [selectedContractId, setSelectedContractId] = useState("");
  const [tariffBooksState, setTariffBooksState] = useState([fallbackProjectTariffBook]);
  const [focus, setFocus] = useState<PortfolioFocus>("all");
  const [migrationAction, setMigrationAction] = useState<MigrationAction>("idle");
  const [migrationPreview, setMigrationPreview] = useState<MigrationPreview | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ProjectsViewMode>("board");
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const activeProjects = useMemo(
    () =>
      contractsState.source === "desktop" || contractsState.data.length > 0
        ? contractsState.data.map(mapContractToProject)
        : portfolioProjects,
    [contractsState.data, contractsState.source],
  );
  const projectIndex = useMemo(
    () => new Map(activeProjects.map((project) => [project.id, project])),
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

  async function handleCreateProject(request: CreateDesktopContractRequest) {
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

  async function handleUpdateProject(request: CreateDesktopContractRequest) {
    if (!editingProject) {
      return handleCreateProject(request);
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

  async function handleDownloadMigrationTemplate() {
    setMigrationAction("template");
    setCreateState("saving");
    setCreateMessage("Preparazione template Excel standard...");

    try {
      await waitForUiPaint();
      downloadWorkbook(
        serializeQuantaraMigrationWorkbook({ materials: [], projects: [], sal: [] }),
        "quantara-migration-template.xlsx",
      );
      setCreateState("saved");
      setCreateMessage("Template Excel standard scaricato.");
      notify({
        message: "Template Excel standard scaricato.",
        title: "Template migrazione",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Template non generato",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
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

      setMigrationPreview({
        data,
        fileName: file.name,
        validation,
      });
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
      setMigrationPreview(null);
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

  async function handleCommitMigrationPreview() {
    if (!migrationPreview?.validation.valid) {
      return;
    }

    setMigrationAction("commit");
    setCreateState("saving");
    setCreateMessage("Commit migrazione in corso...");

    try {
      const timestamp = Date.now();
      const createdContracts = await Promise.all(
        migrationPreview.data.projects.map((project, index) =>
          createDesktopContract({
            applicationContractCode: project.applicationContractCode,
            contractualAmount: project.contractualAmount,
            frameworkAgreementCode: project.frameworkAgreementCode,
            id: createMigrationId(project.title, timestamp, index),
            tariffPriorities: [
              {
                priority: 1,
                reason: "Import Excel",
                tariffBookId:
                  project.tariffBookId || tariffBooksState[0]?.id || fallbackProjectTariffBook.id,
              },
            ],
            title: project.title,
          }),
        ),
      );

      setContractsState((current) => ({
        data: mergeContracts(createdContracts, current.data),
        ...(current.source === "fallback"
          ? { message: "Runtime browser: import in anteprima.", source: "fallback" }
          : { source: "desktop" }),
      }));
      setSelectedContractId(createdContracts[0]?.id ?? selectedContractId);
      setMigrationPreview(null);
      setCreateState("saved");
      setCreateMessage(
        `Import completato: ${createdContracts.length} progetti creati. SAL e materiali restano in preview.`,
      );
      notify({
        message: `${createdContracts.length} progetti creati. SAL e materiali restano in preview.`,
        title: "Migrazione completata",
        tone: "success",
      });
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Commit migrazione non riuscito",
        tone: "danger",
      });
    } finally {
      setMigrationAction("idle");
    }
  }

  const visibleProjects = useMemo(
    () =>
      activeProjects
        .filter(
          (project) => matchesFocus(project, focus) && matchesProjectSearch(project, deferredQuery),
        )
        .sort(compareProjects),
    [activeProjects, deferredQuery, focus],
  );

  const visibleQueue = useMemo(
    () =>
      priorityQueue.filter((item) => {
        const project = projectIndex.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.title} ${item.detail} ${item.owner}`,
          deferredQuery,
        );
      }),
    [deferredQuery, focus, projectIndex],
  );

  const visibleApprovals = useMemo(
    () =>
      approvalWindow.filter((item) => {
        const project = projectIndex.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(
          `${project.title} ${project.lot} ${project.location} ${item.label} ${item.owner}`,
          deferredQuery,
        );
      }),
    [deferredQuery, focus, projectIndex],
  );

  const visibleActivities = useMemo(
    () =>
      activityFeed.filter((item) => {
        const project = projectIndex.get(item.projectId);

        if (!project || !matchesFocus(project, focus)) {
          return false;
        }

        return matchesSearch(`${project.title} ${item.label} ${item.detail}`, deferredQuery);
      }),
    [deferredQuery, focus, projectIndex],
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

    for (const project of activeProjects) {
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
  }, [activeProjects, deferredQuery]);

  return (
    <ScreenShell>
      {createMessage ? (
        <div
          className={cn(
            "mb-4 rounded-[18px] border px-4 py-3 text-sm font-medium shadow-soft",
            createState === "error"
              ? "border-danger/25 bg-danger/10 text-danger"
              : "border-success/25 bg-success/10 text-success",
          )}
          role="status"
        >
          {createMessage}
        </div>
      ) : null}

      <CommandPanel className="p-0" variant="projects">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">Sala controllo portfolio</Badge>
              <span className="text-xs font-medium text-secondary">
                {contractsState.source === "desktop"
                  ? "Contratti caricati dal database locale"
                  : contractsState.message}{" "}
                · {visibleProjects.length} lotti nel perimetro attivo
              </span>
              {isPending ? <Badge variant="warning">Filtri in aggiornamento</Badge> : null}
            </div>

            <div className="mt-5 max-w-3xl">
              <h2 className="text-[2rem] font-semibold tracking-tight text-foreground md:text-[2.6rem]">
                Portafoglio lavori sotto presidio operativo.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary md:text-[15px]">
                Vista unica su forecast, SAL, materiali critici e milestone di approvazione. Il
                filtro guida board, coda prioritaria e registro operativo senza spezzare il flusso.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PortfolioMetric
                label="EAC presidiato"
                note="Valore totale dei lotti nel perimetro corrente"
                value={formatMoney({ amount: totalBudget, currency: "EUR" })}
              />
              <PortfolioMetric
                label="Importo SAL in corsa"
                note={`${salWindowCount} lotti tra emissioni, firme e dossier aperti nei prossimi 7 giorni`}
                tone={salWindowCount > 0 ? "warning" : "success"}
                value={formatMoney({ amount: salExposure, currency: "EUR" })}
              />
              <PortfolioMetric
                label="Escalation"
                note="Cantieri con forecast e documentazione fuori soglia"
                tone={criticalCount > 0 ? "danger" : "success"}
                value={`${criticalCount} cantieri`}
              />
              <PortfolioMetric
                label="Avanzamento medio"
                note="Media ponderata sul portafoglio visibile"
                tone="success"
                value={formatPercent(averageProgress)}
              />
            </div>

            <div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex max-w-3xl flex-1 flex-col gap-3">
                <div className="flex flex-wrap gap-2">
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

                <label className="relative block max-w-2xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                  <input
                    className="h-12 w-full rounded-2xl border border-subtle bg-card/90 pl-11 pr-4 text-sm text-foreground outline-none transition-all duration-base focus:border-primary focus:ring-2 focus:ring-ring"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca lotto, PM, milestone o materiale critico"
                    type="search"
                    value={query}
                  />
                </label>
              </div>
            </div>
          </div>

          <ApprovalWindowPanel items={visibleApprovals} projectIndex={projectIndex} />
        </div>
      </CommandPanel>

      <MigrationPanel
        action={migrationAction}
        isCommitDisabled={
          !migrationPreview?.validation.valid ||
          (migrationPreview?.data.projects.length ?? 0) === 0 ||
          migrationAction !== "idle"
        }
        isBusy={migrationAction !== "idle"}
        onClearPreview={() => {
          setMigrationPreview(null);
          setCreateState("idle");
          setCreateMessage("");
        }}
        onCommit={handleCommitMigrationPreview}
        onDownloadTemplate={handleDownloadMigrationTemplate}
        onExport={handleExportMigrationWorkbook}
        onOpenFilePicker={() => fileInputRef.current?.click()}
        preview={migrationPreview}
      />
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <PriorityQueuePanel items={visibleQueue} projectIndex={projectIndex} />
          <ManagerLoadPanel
            rows={managerLoad}
            totalManagers={new Set(visibleProjects.map((project) => project.manager)).size}
          />
        </div>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-subtle bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                Vista operativa
              </div>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                {viewMode === "board" ? "Board per priorita" : "Registro progetti"}
              </h3>
            </div>
            <div className="flex rounded-[18px] border border-subtle bg-muted/45 p-1">
              <ViewModeButton
                active={viewMode === "board"}
                label="Board"
                onClick={() => setViewMode("board")}
              />
              <ViewModeButton
                active={viewMode === "workbench"}
                label="Registro"
                onClick={() => setViewMode("workbench")}
              />
            </div>
          </div>

          {viewMode === "board" ? (
            <PortfolioBoard
              onOpenProject={handleOpenProject}
              onOpenProjectActions={handleOpenProjectActions}
              projects={visibleProjects}
            />
          ) : (
            <ProjectsWorkbench
              onOpenProject={handleOpenProject}
              onOpenProjectActions={handleOpenProjectActions}
              projects={visibleProjects}
              query={query}
              selectedProjectId={selectedContractId}
            />
          )}
        </section>

        <ControlRailPanel activities={visibleActivities} signals={controlSignals} />
      </section>

      {isCreateProjectModalOpen ? (
        <CreateProjectModal
          defaultTariffBookId={tariffBooksState[0]?.id ?? fallbackProjectTariffBook.id}
          {...(editingProject ? { initialValues: editingProject.values } : {})}
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
    </ScreenShell>
  );
}

function MigrationPanel({
  action,
  isCommitDisabled,
  isBusy,
  onClearPreview,
  onCommit,
  onDownloadTemplate,
  onExport,
  onOpenFilePicker,
  preview,
}: {
  action: MigrationAction;
  isCommitDisabled: boolean;
  isBusy: boolean;
  onClearPreview: () => void;
  onCommit: () => void;
  onDownloadTemplate: () => void;
  onExport: () => void;
  onOpenFilePicker: () => void;
  preview: MigrationPreview | null;
}) {
  const errors = preview ? countValidationIssues(preview.validation, "error") : 0;
  const warnings = preview ? countValidationIssues(preview.validation, "warning") : 0;

  return (
    <SectionPanel aria-busy={isBusy} className="mt-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Migrazione Excel</Badge>
            {isBusy ? <Badge variant="warning">{formatMigrationAction(action)}</Badge> : null}
            {preview ? (
              <>
                <Badge variant={errors > 0 ? "danger" : "success"}>
                  {preview.validation.importableRows}/{preview.validation.rowCount} righe
                </Badge>
                {warnings > 0 ? <Badge variant="warning">{warnings} warning</Badge> : null}
              </>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            Import progetti e template standard
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
            Il workbook standard contiene Progetti, SAL e Materiali. In questa fase il commit crea i
            contratti progetto validati; SAL e materiali vengono validati e conteggiati nella
            preview.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isBusy}
            onClick={onDownloadTemplate}
            size="sm"
            type="button"
            variant="outline"
          >
            {action === "template" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Template
          </Button>
          <Button disabled={isBusy} onClick={onExport} size="sm" type="button" variant="outline">
            {action === "export" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Export
          </Button>
          <Button
            disabled={isBusy}
            onClick={onOpenFilePicker}
            size="sm"
            type="button"
            variant="outline"
          >
            {action === "import" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Importa
          </Button>
          <Button disabled={isCommitDisabled} onClick={onCommit} size="sm" type="button">
            {action === "commit" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Commit...
              </>
            ) : (
              "Commit"
            )}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-subtle bg-muted/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-semibold text-foreground">
                {preview.fileName}
              </div>
              <Button
                disabled={isBusy}
                onClick={onClearPreview}
                size="sm"
                type="button"
                variant="ghost"
              >
                Reset
              </Button>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <PreviewMetric label="Progetti" value={String(preview.data.projects.length)} />
              <PreviewMetric label="SAL" value={String(preview.data.sal.length)} />
              <PreviewMetric label="Materiali" value={String(preview.data.materials.length)} />
            </dl>
          </div>

          <div className="max-h-52 overflow-y-auto rounded-[18px] border border-subtle">
            {preview.validation.issues.length > 0 ? (
              preview.validation.issues.slice(0, 8).map((issue) => (
                <div
                  className="flex flex-col gap-1 border-b border-subtle px-4 py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
                  key={`${issue.sheet}-${issue.rowIndex}-${issue.field}-${issue.message}`}
                >
                  <div className="text-sm font-medium text-foreground">
                    {formatSheetName(issue.sheet)} riga {issue.rowIndex + 2} · {issue.field}
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      issue.severity === "error" ? "text-danger" : "text-warning",
                    )}
                  >
                    {issue.message}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-secondary">
                Nessun errore di validazione nel workbook selezionato.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SectionPanel>
  );
}

function formatMigrationAction(action: MigrationAction) {
  if (action === "template") {
    return "Template in preparazione";
  }

  if (action === "export") {
    return "Export in corso";
  }

  if (action === "import") {
    return "Import in lettura";
  }

  if (action === "commit") {
    return "Commit in corso";
  }

  return "Pronto";
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function mapContractToProject(contract: DesktopContract): PortfolioProject {
  return {
    budget: contract.contractualAmount,
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

function mergeContracts(created: DesktopContract[], current: DesktopContract[]) {
  const createdIds = new Set(created.map((contract) => contract.id));

  return [...created, ...current.filter((contract) => !createdIds.has(contract.id))];
}

function createMigrationId(title: string, timestamp: number, index: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);

  return `migration_${slug || "project"}_${timestamp}_${index}`;
}

function countValidationIssues(
  validation: MigrationValidationResult,
  severity: "error" | "warning",
) {
  return validation.issues.filter((issue) => issue.severity === severity).length;
}

function formatSheetName(sheet: MigrationSheetName) {
  if (sheet === "projects") {
    return "Progetti";
  }

  if (sheet === "materials") {
    return "Materiali";
  }

  return "SAL";
}

function waitForUiPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function downloadWorkbook(bytes: Uint8Array, fileName: string) {
  const buffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(buffer).set(bytes);

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function ApprovalWindowPanel({
  items,
  projectIndex,
}: {
  items: ApprovalItem[];
  projectIndex: Map<string, PortfolioProject>;
}) {
  const activeEscalations = items.filter((item) => item.tone === "danger").length;

  return (
    <aside className="relative border-t border-subtle/80 p-6 xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Finestra 72 ore
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Approvazioni e snodi</h3>
        </div>
        <Badge variant={activeEscalations > 0 ? "danger" : "success"}>
          {activeEscalations} escalation
        </Badge>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const project = projectIndex.get(item.projectId);

            if (!project) {
              return null;
            }

            const palette = getTonePalette(item.tone);

            return (
              <article
                className="rounded-2xl border p-4"
                key={`${item.projectId}-${item.label}`}
                style={{
                  background: palette.panel,
                  borderColor: palette.border,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
                      {project.title}
                    </p>
                    <h4 className="mt-2 text-sm font-semibold text-foreground">{item.label}</h4>
                  </div>
                  <Badge variant={item.tone}>{formatDueWindow(item.dueDays)}</Badge>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <ApprovalMeta label="Responsabile" value={item.owner} />
                  <ApprovalMeta label="Importo" value={formatMoney(item.amount)} />
                  <ApprovalMeta label="Contesto" value={`${project.lot} · ${project.location}`} />
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            description="Nessuna approvazione ricade nel perimetro selezionato."
            title="Finestra pulita"
          />
        )}
      </div>
    </aside>
  );
}

function ApprovalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-secondary">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function PortfolioMetric({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note: string;
  tone?: StatusTone;
  value: string;
}) {
  const palette = getTonePalette(tone ?? "neutral");

  return (
    <div
      className="rounded-2xl border p-4 backdrop-blur-sm"
      style={{
        background: tone
          ? palette.panel
          : "color-mix(in srgb, var(--surface-base) 88%, transparent)",
        borderColor: tone
          ? palette.border
          : "color-mix(in srgb, var(--border-subtle) 84%, transparent)",
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">{label}</p>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <p className="mt-2 text-xs leading-5 text-secondary">{note}</p>
    </div>
  );
}

function FocusChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-base",
        active
          ? "border-primary bg-primary text-white shadow-soft"
          : "border-subtle bg-card text-foreground hover:border-border hover:bg-muted",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
          active ? "bg-white/16 text-white" : "bg-muted text-secondary",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ViewModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-9 rounded-[14px] px-4 text-sm font-medium transition-colors",
        active ? "bg-card text-foreground shadow-soft" : "text-secondary hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PriorityQueuePanel({
  items,
  projectIndex,
}: {
  items: PriorityItem[];
  projectIndex: Map<string, PortfolioProject>;
}) {
  return (
    <SectionPanel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Coda prioritaria
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Azioni che non possono aspettare
          </h3>
        </div>
        <Badge variant={items.some((item) => item.tone === "danger") ? "danger" : "neutral"}>
          {items.length}
        </Badge>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const project = projectIndex.get(item.projectId);

            if (!project) {
              return null;
            }

            const palette = getTonePalette(item.tone);

            return (
              <article
                className="rounded-2xl border p-4"
                key={`${item.projectId}-${item.title}`}
                style={{
                  background: palette.panel,
                  borderColor: palette.border,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: palette.accent }}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
                        {project.title}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-foreground">{item.title}</h4>
                  </div>
                  <Badge variant={item.tone}>{item.deadline}</Badge>
                </div>

                <p className="mt-3 text-xs leading-5 text-secondary">{item.detail}</p>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                  <span className="text-secondary">{item.owner}</span>
                  <span className="font-semibold text-foreground">{project.lot}</span>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            description="I filtri correnti non lasciano task critici in evidenza."
            title="Coda stabile"
          />
        )}
      </div>
    </SectionPanel>
  );
}

function ManagerLoadPanel({
  rows,
  totalManagers,
}: {
  rows: { count: number; name: string; urgentWindow: number }[];
  totalManagers: number;
}) {
  const maxLoad = rows[0]?.count ?? 1;

  return (
    <SectionPanel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Copertura PM
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Carico per responsabile</h3>
        </div>
        <Badge variant="neutral">{totalManagers}</Badge>
      </div>

      <div className="mt-5 space-y-4">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.name}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{row.name}</div>
                  <div className="text-xs text-secondary">
                    Scadenza piu vicina {formatDueWindow(row.urgentWindow).toLowerCase()}
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground">{row.count} lotti</div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.count / maxLoad) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            description="Nessun responsabile rientra nel perimetro corrente."
            title="Nessun carico visibile"
          />
        )}
      </div>
    </SectionPanel>
  );
}

function PortfolioBoard({
  onOpenProjectActions,
  onOpenProject,
  projects,
}: {
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  projects: PortfolioProject[];
}) {
  return (
    <SectionPanel>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Board operativo
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Distribuzione per fascia di controllo
          </h3>
          <p className="mt-1 text-sm text-secondary">
            Ogni colonna tiene insieme stato, forecast, SAL e materiale sensibile per scendere
            subito sul lotto giusto.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <MapPin className="size-4" />
          Portafoglio nazionale · vista per priorita
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {laneOrder.map((tone) => (
          <PortfolioLane
            items={projects.filter((project) => project.tone === tone)}
            key={tone}
            onOpenProjectActions={onOpenProjectActions}
            onOpenProject={onOpenProject}
            tone={tone}
          />
        ))}
      </div>
    </SectionPanel>
  );
}

function PortfolioLane({
  items,
  onOpenProjectActions,
  onOpenProject,
  tone,
}: {
  items: PortfolioProject[];
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  tone: LaneTone;
}) {
  const palette = getTonePalette(tone);
  const meta = laneMeta[tone];

  return (
    <section
      className="rounded-[24px] border p-4"
      style={{
        background: palette.surface,
        borderColor: palette.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
            {meta.label}
          </div>
          <p className="mt-2 text-sm text-secondary">{meta.description}</p>
        </div>
        <Badge variant={tone}>{items.length}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((project) => (
            <PortfolioLaneCard
              key={project.id}
              onOpen={() => onOpenProject(project)}
              onOpenActions={() => onOpenProjectActions(project)}
              project={project}
            />
          ))
        ) : (
          <EmptyState
            description="Nessun lotto rientra in questa fascia con i filtri correnti."
            title="Colonna vuota"
          />
        )}
      </div>
    </section>
  );
}

function PortfolioLaneCard({
  onOpenActions,
  onOpen,
  project,
}: {
  onOpenActions: () => void;
  onOpen: () => void;
  project: PortfolioProject;
}) {
  const palette = getTonePalette(project.tone);
  const salTone = getSalTone(project);

  return (
    <article
      className="rounded-[22px] border p-4 shadow-soft"
      style={{
        background: "color-mix(in srgb, var(--surface-base) 94%, transparent)",
        borderColor: palette.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
            {project.phase}
          </div>
          <h4 className="mt-2 text-sm font-semibold text-foreground">{project.title}</h4>
          <p className="mt-1 text-xs text-secondary">
            {project.lot} · {project.location}
          </p>
        </div>

        <button
          aria-label={`Apri ${project.title}`}
          className="rounded-full p-2 text-secondary transition-colors hover:bg-muted hover:text-foreground"
          onClick={onOpen}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge label={project.healthLabel} tone={project.tone} />
        <Badge variant={salTone}>{project.salState}</Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-secondary">Avanzamento</span>
          <span className="font-semibold text-foreground">{formatPercent(project.progress)}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: palette.accent,
              width: `${project.progress}%`,
            }}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <LaneMetric
          detail={`vs contratto ${project.variance}`}
          label="EAC"
          value={formatMoney(project.budget)}
        />
        <LaneMetric
          detail={project.nextMilestone}
          label="Forecast"
          value={formatForecastDelta(project.forecastDeltaDays)}
        />
        <LaneMetric
          detail={formatDueWindow(project.salDays)}
          label="SAL"
          value={formatMoney(project.salValue)}
        />
        <LaneMetric detail={project.materialRisk} label="Presidio" value={project.manager} />
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onOpen} size="sm">
          Apri dossier
        </Button>
        <Button
          aria-label={`Azioni per ${project.title}`}
          onClick={onOpenActions}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreVertical className="size-4" />
        </Button>
      </div>
    </article>
  );
}

function LaneMetric({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
      <p className="mt-1 text-xs leading-5 text-secondary">{detail}</p>
    </div>
  );
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
          Presidio trasversale
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Segnali e feed operativo</h3>
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

function ProjectsWorkbench({
  onOpenProjectActions,
  onOpenProject,
  projects,
  query,
  selectedProjectId,
}: {
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  projects: PortfolioProject[];
  query: string;
  selectedProjectId: string;
}) {
  return (
    <SectionPanel className="p-0">
      <div className="flex flex-col gap-3 border-b border-subtle p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Registro operativo
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">Workbench dei progetti</h3>
          <p className="mt-1 text-sm text-secondary">
            Riga per riga: presidio, EAC, SAL, forecast e rischio materiale.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{projects.length} visibili</Badge>
          {query.trim().length > 0 ? <Badge variant="info">Filtro: {query.trim()}</Badge> : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <WorkbenchRow
              isSelected={project.id === selectedProjectId}
              key={project.id}
              onOpenProjectActions={onOpenProjectActions}
              onOpenProject={onOpenProject}
              project={project}
            />
          ))
        ) : (
          <div className="p-8">
            <EmptyState
              description="Prova a cambiare perimetro o a ripulire la ricerca."
              title="Nessun progetto trovato"
            />
          </div>
        )}
      </div>
    </SectionPanel>
  );
}

function WorkbenchRow({
  isSelected,
  onOpenProjectActions,
  onOpenProject,
  project,
}: {
  isSelected: boolean;
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  project: PortfolioProject;
}) {
  const palette = getTonePalette(project.tone);
  const salTone = getSalTone(project);

  return (
    <article
      className={cn(
        "projects-workbench-row group relative rounded-[22px] border border-subtle bg-muted/30 p-4 transition-colors hover:bg-muted/50",
        isSelected ? "border-primary bg-primary/10" : "",
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpenProject(project)}
          type="button"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: palette.accent }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              {project.phase}
            </span>
            <StatusBadge label={project.healthLabel} tone={project.tone} />
            <Badge variant={salTone}>{project.salState}</Badge>
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">{project.title}</div>
          <div className="mt-1 text-xs text-secondary">
            {project.lot} · {project.location} · {project.manager}
          </div>
        </button>

        <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:w-[430px]">
          <WorkbenchMetric
            detail={project.variance}
            label="EAC"
            value={formatMoney(project.budget)}
          />
          <WorkbenchMetric
            detail={formatDueWindow(project.salDays)}
            label="SAL"
            value={formatMoney(project.salValue)}
          />
          <WorkbenchMetric
            detail={project.nextMilestone}
            label="Forecast"
            value={formatForecastDelta(project.forecastDeltaDays)}
          />
        </div>

        <div className="flex items-center gap-2 xl:justify-end">
          <Button onClick={() => onOpenProject(project)} size="sm" variant="outline">
            Apri dossier
          </Button>
          <Button
            aria-label={`Azioni per ${project.title}`}
            onClick={() => onOpenProjectActions(project)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-secondary">{project.materialRisk}</span>
          <span className="font-medium text-secondary">
            Avanzamento {formatPercent(project.progress)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ backgroundColor: palette.accent, width: `${project.progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function WorkbenchMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[16px] border border-subtle bg-card px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
      <div className="mt-0.5 truncate text-xs text-secondary">{detail}</div>
    </div>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-subtle bg-muted/50 p-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs leading-5 text-secondary">{description}</p>
    </div>
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
  const palette = getTonePalette(project.tone);

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
              <span className="size-2 rounded-full" style={{ backgroundColor: palette.accent }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
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

function compareProjects(left: PortfolioProject, right: PortfolioProject): number {
  const toneOrder: Record<LaneTone, number> = { danger: 0, warning: 1, success: 2 };

  if (toneOrder[left.tone] !== toneOrder[right.tone]) {
    return toneOrder[left.tone] - toneOrder[right.tone];
  }

  if (left.salDays !== right.salDays) {
    return left.salDays - right.salDays;
  }

  return right.progress - left.progress;
}

function buildManagerLoad(projects: PortfolioProject[]) {
  const managerMap = new Map<string, { count: number; urgentWindow: number }>();

  for (const project of projects) {
    const current = managerMap.get(project.manager);

    if (!current) {
      managerMap.set(project.manager, {
        count: 1,
        urgentWindow: project.salDays,
      });
      continue;
    }

    current.count += 1;
    current.urgentWindow = Math.min(current.urgentWindow, project.salDays);
  }

  return [...managerMap.entries()]
    .map(([name, value]) => ({
      count: value.count,
      name,
      urgentWindow: value.urgentWindow,
    }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.urgentWindow - right.urgentWindow;
    })
    .slice(0, 4);
}

function matchesFocus(project: PortfolioProject, focus: PortfolioFocus) {
  if (focus === "critical") {
    return project.tone !== "success";
  }

  if (focus === "sal") {
    return isSalWindow(project);
  }

  return true;
}

function isSalWindow(project: PortfolioProject) {
  return (
    project.salDays <= 7 ||
    project.salState.toLowerCase().includes("blocc") ||
    project.salState.toLowerCase().includes("document")
  );
}

function matchesProjectSearch(project: PortfolioProject, query: string) {
  return matchesSearch(
    `${project.title} ${project.lot} ${project.location} ${project.manager} ${project.phase} ${project.materialRisk} ${project.nextMilestone}`,
    query,
  );
}

function matchesSearch(value: string, query: string) {
  return query.length === 0 || value.toLowerCase().includes(query);
}

export function formatDueWindow(days: number) {
  if (days <= 0) {
    return "Oggi";
  }

  if (days === 1) {
    return "Domani";
  }

  return `${days} giorni`;
}

export function formatForecastDelta(days: number) {
  if (days === 0) {
    return "In data";
  }

  if (days < 0) {
    return `${days} gg`;
  }

  return `+${days} gg`;
}

export function getSalTone(project: PortfolioProject): StatusTone {
  if (project.salDays <= 1 || project.salState.toLowerCase().includes("blocc")) {
    return "danger";
  }

  if (project.salDays <= 7 || project.salState.toLowerCase().includes("document")) {
    return "warning";
  }

  return "neutral";
}

function getTonePalette(tone: StatusTone) {
  if (tone === "danger") {
    return {
      accent: "var(--danger-base)",
      border: "color-mix(in srgb, var(--danger-base) 16%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--danger-soft) 72%, var(--surface-base)), var(--surface-base))",
      soft: "var(--danger-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--danger-soft) 52%, var(--surface-base)), var(--surface-base))",
    };
  }

  if (tone === "warning") {
    return {
      accent: "var(--warning-base)",
      border: "color-mix(in srgb, var(--warning-base) 16%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--warning-soft) 78%, var(--surface-base)), var(--surface-base))",
      soft: "var(--warning-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--warning-soft) 56%, var(--surface-base)), var(--surface-base))",
    };
  }

  if (tone === "success") {
    return {
      accent: "var(--success-base)",
      border: "color-mix(in srgb, var(--success-base) 14%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--success-soft) 78%, var(--surface-base)), var(--surface-base))",
      soft: "var(--success-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--success-soft) 54%, var(--surface-base)), var(--surface-base))",
    };
  }

  if (tone === "info") {
    return {
      accent: "var(--info-base)",
      border: "color-mix(in srgb, var(--info-base) 14%, var(--border-subtle))",
      panel:
        "linear-gradient(180deg, color-mix(in srgb, var(--info-soft) 78%, var(--surface-base)), var(--surface-base))",
      soft: "var(--info-soft)",
      surface:
        "linear-gradient(180deg, color-mix(in srgb, var(--info-soft) 54%, var(--surface-base)), var(--surface-base))",
    };
  }

  return {
    accent: "var(--text-secondary)",
    border: "var(--border-subtle)",
    panel:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg-muted) 74%, var(--surface-base)), var(--surface-base))",
    soft: "var(--bg-muted)",
    surface:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg-muted) 56%, var(--surface-base)), var(--surface-base))",
  };
}
