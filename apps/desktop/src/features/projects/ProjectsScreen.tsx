import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  FileText,
  HardHat,
  Layers3,
  ListFilter,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Target,
  Wrench,
} from "lucide-react";
import type { Money } from "@quantara/shared-types";
import { eur } from "@quantara/domain-utils";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import {
  createDesktopContract,
  deleteDesktopContract,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
  type DesktopContract,
  type DesktopDataResult,
} from "@/lib/desktopData";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type LaneTone = Extract<StatusTone, "success" | "warning" | "danger">;
type PortfolioFocus = "all" | "critical" | "sal";
type ProjectFormState = {
  applicationContractCode: string;
  contractualAmount: string;
  frameworkAgreementCode: string;
  tariffBookId: string;
  title: string;
};

type PortfolioProject = {
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

const portfolioProjects: PortfolioProject[] = [
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

const initialProjectForm: ProjectFormState = {
  applicationContractCode: "",
  contractualAmount: "",
  frameworkAgreementCode: "",
  tariffBookId: fallbackProjectTariffBook.id,
  title: "",
};

export function ProjectsScreen() {
  const [createState, setCreateState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [createMessage, setCreateMessage] = useState("");
  const [contractsState, setContractsState] = useState<DesktopDataResult<DesktopContract[]>>({
    data: [],
    message: "Caricamento contratti locali.",
    source: "fallback",
  });
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [tariffBooksState, setTariffBooksState] = useState(
    [fallbackProjectTariffBook],
  );
  const [focus, setFocus] = useState<PortfolioFocus>("all");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const activeProjects =
    contractsState.source === "desktop"
      ? contractsState.data.map(mapContractToProject)
      : portfolioProjects;
  const projectIndex = useMemo(
    () => new Map(activeProjects.map((project) => [project.id, project])),
    [activeProjects],
  );

  useEffect(() => {
    let active = true;

    Promise.all([listDesktopContracts([]), listDesktopTariffBooks([fallbackProjectTariffBook])]).then(([contracts, tariffBooks]) => {
      if (active) {
        setContractsState(contracts);
        setTariffBooksState(tariffBooks.data);
        setSelectedContractId(contracts.data[0]?.id ?? "");
        setProjectForm((state) => ({
          ...state,
          tariffBookId: tariffBooks.data[0]?.id ?? state.tariffBookId,
        }));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  function buildContractRequest(contractId: string) {
    const amount = Number(projectForm.contractualAmount.replace(",", "."));

    if (
      !projectForm.title.trim() ||
      !projectForm.applicationContractCode.trim() ||
      !projectForm.frameworkAgreementCode.trim() ||
      !projectForm.tariffBookId ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return null;
    }

    return {
      applicationContractCode: projectForm.applicationContractCode.trim(),
      contractualAmount: amount,
      frameworkAgreementCode: projectForm.frameworkAgreementCode.trim(),
      id: contractId,
      tariffPriorities: [
        {
          priority: 1,
          reason: "Tariffario principale",
          tariffBookId: projectForm.tariffBookId,
        },
      ],
      title: projectForm.title.trim(),
    };
  }

  async function handleCreateProject() {
    setCreateState("saving");
    setCreateMessage("");

    const request = buildContractRequest(`contract_locale_${Date.now()}`);

    if (!request) {
      setCreateState("error");
      setCreateMessage("Compila titolo, codici, importo e tariffario principale.");
      return;
    }

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
      setProjectForm((state) => ({
        ...initialProjectForm,
        tariffBookId: state.tariffBookId,
      }));
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function handleSelectProject(projectId: string) {
    const contract = contractsState.data.find((item) => item.id === projectId);

    if (!contract) {
      setCreateState("error");
      setCreateMessage("Modifica disponibile sui progetti locali creati nel database.");
      return;
    }

    setSelectedContractId(contract.id);
    setProjectForm({
      applicationContractCode: contract.applicationContractCode,
      contractualAmount: String(contract.contractualAmount.amount),
      frameworkAgreementCode: contract.frameworkAgreementCode,
      tariffBookId: contract.tariffPriorities[0]?.tariffBookId ?? tariffBooksState[0]?.id ?? "",
      title: contract.title,
    });
    setCreateState("idle");
    setCreateMessage(`${contract.title} selezionato per modifica.`);
  }

  async function handleDeleteFromDropdown(projectId: string) {
    setCreateState("saving");
    setCreateMessage("");

    try {
      const deletedContract = contractsState.data.find(
        (contract) => contract.id === projectId,
      );

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
    } catch (error) {
      setCreateState("error");
      setCreateMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const visibleProjects = activeProjects
    .filter(
      (project) => matchesFocus(project, focus) && matchesProjectSearch(project, deferredQuery),
    )
    .sort(compareProjects);

  const visibleQueue = priorityQueue.filter((item) => {
    const project = projectIndex.get(item.projectId);

    if (!project || !matchesFocus(project, focus)) {
      return false;
    }

    return matchesSearch(
      `${project.title} ${project.lot} ${project.location} ${item.title} ${item.detail} ${item.owner}`,
      deferredQuery,
    );
  });

  const visibleApprovals = approvalWindow.filter((item) => {
    const project = projectIndex.get(item.projectId);

    if (!project || !matchesFocus(project, focus)) {
      return false;
    }

    return matchesSearch(
      `${project.title} ${project.lot} ${project.location} ${item.label} ${item.owner}`,
      deferredQuery,
    );
  });

  const visibleActivities = activityFeed.filter((item) => {
    const project = projectIndex.get(item.projectId);

    if (!project || !matchesFocus(project, focus)) {
      return false;
    }

    return matchesSearch(`${project.title} ${item.label} ${item.detail}`, deferredQuery);
  });

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

  const focusCounts = {
    all: activeProjects.filter((project) => matchesProjectSearch(project, deferredQuery)).length,
    critical: activeProjects.filter(
      (project) =>
        matchesFocus(project, "critical") && matchesProjectSearch(project, deferredQuery),
    ).length,
    sal: activeProjects.filter(
      (project) => matchesFocus(project, "sal") && matchesProjectSearch(project, deferredQuery),
    ).length,
  };

  return (
    <main className="p-6 pb-8">
      <section className="projects-command-surface relative overflow-hidden rounded-[28px] border border-subtle shadow-panel">
        <div className="relative z-10 grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
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

              <div className="flex flex-wrap gap-3">
                <Button size="sm" variant="outline">
                  <ListFilter className="size-4" />
                  Filtri avanzati
                </Button>
                <Button size="sm" variant="outline">
                  <BriefcaseBusiness className="size-4" />
                  Nuova SAL
                </Button>
              </div>
            </div>

            <form
              className="mt-6 rounded-[24px] border border-subtle bg-card/86 p-4 shadow-soft"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateProject();
              }}
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                <ProjectTextField
                  label="Nome progetto"
                  onChange={(value) => setProjectForm((state) => ({ ...state, title: value }))}
                  placeholder="Linea AV/AC Milano-Verona"
                  value={projectForm.title}
                />
                <ProjectTextField
                  label="Contratto applicativo"
                  onChange={(value) =>
                    setProjectForm((state) => ({ ...state, applicationContractCode: value }))
                  }
                  placeholder="CA-MV-001"
                  value={projectForm.applicationContractCode}
                />
                <ProjectTextField
                  label="Accordo quadro"
                  onChange={(value) =>
                    setProjectForm((state) => ({ ...state, frameworkAgreementCode: value }))
                  }
                  placeholder="AQ-RFI-2026"
                  value={projectForm.frameworkAgreementCode}
                />
                <ProjectTextField
                  label="Importo"
                  onChange={(value) =>
                    setProjectForm((state) => ({ ...state, contractualAmount: value }))
                  }
                  placeholder="26150000"
                  type="number"
                  value={projectForm.contractualAmount}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <label className="block min-w-[260px]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                    Tariffario principale
                  </span>
                  <select
                    className="mt-2 h-10 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    onChange={(event) =>
                      setProjectForm((state) => ({ ...state, tariffBookId: event.target.value }))
                    }
                    value={projectForm.tariffBookId}
                  >
                    {tariffBooksState.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-2 xl:items-end">
                  {createMessage ? (
                    <div
                      className={`text-xs ${
                        createState === "error" ? "text-danger" : "text-secondary"
                      }`}
                    >
                      {createMessage}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button disabled={createState === "saving"} type="submit">
                      <Plus className="size-4" />
                      {createState === "saving" ? "Salvataggio" : "Crea progetto"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <ApprovalWindowPanel items={visibleApprovals} projectIndex={projectIndex} />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <PriorityQueuePanel items={visibleQueue} projectIndex={projectIndex} />
          <ManagerLoadPanel
            rows={managerLoad}
            totalManagers={new Set(visibleProjects.map((project) => project.manager)).size}
          />
        </div>

        <PortfolioBoard
          onDeleteProject={handleDeleteFromDropdown}
          onSelectProject={handleSelectProject}
          projects={visibleProjects}
        />

        <ControlRailPanel activities={visibleActivities} signals={controlSignals} />
      </section>

      <ProjectsWorkbench
        onDeleteProject={handleDeleteFromDropdown}
        onSelectProject={handleSelectProject}
        projects={visibleProjects}
        query={query}
        selectedProjectId={selectedContractId}
      />
    </main>
  );
}

function mapContractToProject(contract: DesktopContract): PortfolioProject {
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

function ProjectTextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="block min-w-[180px] flex-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </span>
      <input
        className="mt-2 h-10 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
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
    <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
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
    </section>
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
    <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
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
    </section>
  );
}

function PortfolioBoard({
  onDeleteProject,
  onSelectProject,
  projects,
}: {
  onDeleteProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  projects: PortfolioProject[];
}) {
  return (
    <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
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
            onDeleteProject={onDeleteProject}
            onSelectProject={onSelectProject}
            tone={tone}
          />
        ))}
      </div>
    </section>
  );
}

function PortfolioLane({
  items,
  onDeleteProject,
  onSelectProject,
  tone,
}: {
  items: PortfolioProject[];
  onDeleteProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
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
              onDelete={() => onDeleteProject(project.id)}
              onSelect={() => onSelectProject(project.id)}
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
  onDelete,
  onSelect,
  project,
}: {
  onDelete: () => void;
  onSelect: () => void;
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
          onClick={openProjectDetail}
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
        <Button onClick={openProjectDetail} size="sm">
          Apri dossier
        </Button>
        <WorkbenchRowDropdown
          onDelete={onDelete}
          onSelect={onSelect}
          projectTitle={project.title}
        />
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
    <section className="rounded-[28px] border border-subtle bg-card p-5 shadow-soft">
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
    </section>
  );
}

function ProjectsWorkbench({
  onDeleteProject,
  onSelectProject,
  projects,
  query,
  selectedProjectId,
}: {
  onDeleteProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  projects: PortfolioProject[];
  query: string;
  selectedProjectId: string;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-[28px] border border-subtle bg-card shadow-soft">
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

      <div className="hidden grid-cols-[1.7fr_1fr_1fr_1fr_1.1fr_auto] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary xl:grid">
        <span>Progetto</span>
        <span>Presidio</span>
        <span>Economico</span>
        <span>SAL</span>
        <span>Forecast e progresso</span>
        <span>Azioni</span>
      </div>

      <div>
        {projects.length > 0 ? (
          projects.map((project) => (
            <WorkbenchRow
              isSelected={project.id === selectedProjectId}
              key={project.id}
              onDeleteProject={onDeleteProject}
              onSelectProject={onSelectProject}
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
    </section>
  );
}

function WorkbenchRow({
  isSelected,
  onDeleteProject,
  onSelectProject,
  project,
}: {
  isSelected: boolean;
  onDeleteProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  project: PortfolioProject;
}) {
  const palette = getTonePalette(project.tone);
  const salTone = getSalTone(project);

  return (
    <div
      className={cn(
        "projects-workbench-row group relative grid gap-4 border-t border-subtle px-5 py-4 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1.1fr_auto] xl:items-center",
        isSelected ? "bg-primary/10" : "",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: palette.accent }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            {project.phase}
          </span>
        </div>
        <div className="mt-2 text-sm font-semibold text-foreground">{project.title}</div>
        <div className="mt-1 text-xs text-secondary">
          {project.lot} · {project.location}
        </div>
        <div className="mt-3 xl:hidden">
          <StatusBadge label={project.healthLabel} tone={project.tone} />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-foreground">{project.manager}</div>
        <div className="mt-1 text-xs leading-5 text-secondary">{project.materialRisk}</div>
      </div>

      <div>
        <div className="text-sm font-semibold text-foreground">{formatMoney(project.budget)}</div>
        <div
          className={cn(
            "mt-1 text-xs font-semibold",
            project.variance.startsWith("+") ? "text-warning" : "text-success",
          )}
        >
          vs contratto {project.variance}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={project.healthLabel} tone={project.tone} />
          <Badge variant={salTone}>{project.salState}</Badge>
        </div>
        <div className="mt-2 text-sm font-semibold text-foreground">
          {formatMoney(project.salValue)}
        </div>
        <div className="mt-1 text-xs text-secondary">{formatDueWindow(project.salDays)}</div>
      </div>

      <div>
        <div className="text-sm font-semibold text-foreground">
          {formatForecastDelta(project.forecastDeltaDays)}
        </div>
        <div className="mt-1 text-xs leading-5 text-secondary">{project.nextMilestone}</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: palette.accent,
              width: `${project.progress}%`,
            }}
          />
        </div>
        <div className="mt-1 text-xs font-medium text-secondary">
          Avanzamento {formatPercent(project.progress)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => onSelectProject(project.id)} size="sm" variant="outline">
          Modifica
        </Button>
        <Button onClick={openProjectDetail} size="sm" variant="outline">
          Apri
        </Button>
        <WorkbenchRowDropdown
          onDelete={() => onDeleteProject(project.id)}
          onSelect={() => onSelectProject(project.id)}
          projectTitle={project.title}
        />
      </div>
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

function WorkbenchRowDropdown({
  onDelete,
  onSelect,
  projectTitle,
}: {
  onDelete: () => void;
  onSelect: () => void;
  projectTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        aria-expanded={isOpen}
        aria-label={`Azioni per ${projectTitle}`}
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </Button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-[14px] border border-subtle bg-card py-1 shadow-soft">
            <button
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                onSelect();
                setIsOpen(false);
              }}
              type="button"
            >
              Modifica
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-muted"
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              type="button"
            >
              Elimina
            </button>
          </div>
        </>
      )}
    </div>
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

function formatDueWindow(days: number) {
  if (days <= 0) {
    return "Oggi";
  }

  if (days === 1) {
    return "Domani";
  }

  return `${days} giorni`;
}

function formatForecastDelta(days: number) {
  if (days === 0) {
    return "In data";
  }

  if (days < 0) {
    return `${days} gg`;
  }

  return `+${days} gg`;
}

function getSalTone(project: PortfolioProject): StatusTone {
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

function openProjectDetail() {
  window.dispatchEvent(new CustomEvent("navigate", { detail: "project-detail" }));
}
