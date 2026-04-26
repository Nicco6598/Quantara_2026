import {
  ArrowLeft,
  ArrowRight,
  FolderPlus,
  Layers3,
  Lock,
  Plus,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  CommandPanel,
  MetricTile,
  ScreenShell,
  SectionHeading,
  SectionPanel,
} from "@/components/shared/Screen";
import { useToast } from "@/components/shared/ToastProvider";
import {
  groupSalsByProject,
  PAGE_SIZE,
  PaginationControls,
  ProjectSalGroup,
  SalTable,
} from "@/features/sal/components/SalTables";
import {
  buildSalDocumentView,
  createId,
  normalizeDecimal,
  surchargeOptions,
  type SalLine,
  type SalProject,
  type SalSurchargeKind,
  type SalTariffVoice,
} from "@/features/sal/domain/sal-workflow";
import { formatMoney } from "@/lib/formatters";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

type SalModalStep = 1 | 2;
type StatusFilter = "all" | "closed" | "draft";
type GroupMode = "flat" | "project";

type ProjectFormState = {
  client: string;
  description: string;
  name: string;
  year: string;
};

type SalDraftState = {
  date: string;
  description: string;
  notes: string;
  projectId: string;
  title: string;
};

type DraftLine = {
  id: string;
  quantity: string;
  surcharge: SalSurchargeKind;
  voiceId: string;
};

type VoiceFormState = {
  category: string;
  code: string;
  description: string;
  unit: string;
  unitPrice: string;
};

const initialProjectForm: ProjectFormState = {
  client: "",
  description: "",
  name: "",
  year: String(new Date().getFullYear()),
};

const initialVoiceForm: VoiceFormState = {
  category: "",
  code: "",
  description: "",
  unit: "m",
  unitPrice: "",
};

function createInitialDraft(projectId: string): SalDraftState {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: "",
    notes: "",
    projectId,
    title: "",
  };
}

export function SalScreen() {
  const { notify } = useToast();
  const activeProjectId = useSalWorkflowStore((state) => state.activeProjectId);
  const createClosedSal = useSalWorkflowStore((state) => state.createClosedSal);
  const createProject = useSalWorkflowStore((state) => state.createProject);
  const createTariffVoice = useSalWorkflowStore((state) => state.createTariffVoice);
  const projects = useSalWorkflowStore((state) => state.projects);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const [groupMode, setGroupMode] = useState<GroupMode>("project");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState("all");
  const [projectForm, setProjectForm] = useState<ProjectFormState>(initialProjectForm);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const salViews = useMemo(
    () => salDocuments.map((sal) => buildSalDocumentView(sal, tariffVoices)),
    [salDocuments, tariffVoices],
  );
  const visibleSals = useMemo(
    () =>
      salViews
        .filter((sal) => {
          const project = projectById.get(sal.projectId);
          const searchValue = `${sal.title} ${sal.description} ${sal.date} ${project?.name ?? ""} ${
            project?.client ?? ""
          }`;
          const matchesQuery = searchValue.toLowerCase().includes(query.trim().toLowerCase());
          const matchesProject = projectFilter === "all" || sal.projectId === projectFilter;
          const matchesStatus = statusFilter === "all" || sal.status === statusFilter;

          return matchesQuery && matchesProject && matchesStatus;
        })
        .sort((left, right) => right.date.localeCompare(left.date)),
    [projectById, projectFilter, query, salViews, statusFilter],
  );
  const paginatedSals = useMemo(
    () => visibleSals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleSals, page],
  );
  const totalPages = Math.ceil(visibleSals.length / PAGE_SIZE);
  const groupedSals = useMemo(() => groupSalsByProject(visibleSals), [visibleSals]);
  const groupedTotalPages = Math.ceil(groupedSals.length / PAGE_SIZE);
  const totalVisibleAmount = visibleSals.reduce((sum, sal) => sum + sal.total, 0);
  const closedCount = salViews.filter((sal) => sal.status === "closed").length;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];

  useEffect(() => {
    const maxPage = groupMode === "project" ? groupedTotalPages : totalPages;

    if (maxPage > 0 && page > maxPage) {
      setPage(maxPage);
    }
  }, [groupMode, groupedTotalPages, page, totalPages]);

  useEffect(() => {
    const handleWorkflowAction = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "new-sal") {
        setIsModalOpen(true);
      }
    };

    window.addEventListener("sal-workflow-action", handleWorkflowAction);
    return () => window.removeEventListener("sal-workflow-action", handleWorkflowAction);
  }, []);

  function handleCreateProject() {
    const year = Number(projectForm.year);

    if (!projectForm.name.trim() || !Number.isInteger(year)) {
      setMessage("Inserisci nome progetto e anno valido.");
      notify({
        message: "Inserisci nome progetto e anno valido.",
        title: "Progetto SAL non creato",
        tone: "warning",
      });
      return;
    }

    const project = createProject({
      client: projectForm.client.trim(),
      description: projectForm.description.trim(),
      name: projectForm.name.trim(),
      year,
    });

    setProjectForm(initialProjectForm);
    setProjectFilter(project.id);
    setMessage(`${project.name} creato. Ora puoi aprire + Nuova SAL.`);
    notify({
      message: `${project.name} creato. Ora puoi aprire una nuova SAL.`,
      title: "Progetto SAL creato",
      tone: "success",
    });
  }

  return (
    <ScreenShell>
      <CommandPanel>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Registro SAL</Badge>
              <span className="text-xs text-secondary">
                {visibleSals.length} visibili · {projects.length} progetti · {tariffVoices.length}{" "}
                voci tariffario
              </span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              SAL filtrabili, raggruppate per progetto.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
              La vista resta consultabile: filtri, gruppi e totali sono sempre a disposizione. La
              creazione passa dalla modal collegata alla CTA in topbar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[480px]">
            <MetricTile label="SAL totali" value={String(salViews.length)} />
            <MetricTile label="Chiuse" tone="success" value={String(closedCount)} />
            <MetricTile
              label="Totale vista"
              tone="success"
              value={formatAmount(totalVisibleAmount)}
            />
          </div>
        </div>
      </CommandPanel>

      {message ? (
        <div className="rounded-[18px] border border-subtle bg-muted/50 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <SectionPanel>
            <SectionHeading icon={FolderPlus} kicker="Setup" title="Nuovo progetto" />
            <div className="mt-5 space-y-4">
              <TextField
                label="Nome progetto"
                onChange={(value) => setProjectForm((state) => ({ ...state, name: value }))}
                placeholder="Riqualificazione Via Roma"
                value={projectForm.name}
              />
              <TextField
                label="Anno"
                onChange={(value) => setProjectForm((state) => ({ ...state, year: value }))}
                placeholder="2026"
                type="number"
                value={projectForm.year}
              />
              <TextField
                label="Committente"
                onChange={(value) => setProjectForm((state) => ({ ...state, client: value }))}
                placeholder="Comune di Milano"
                value={projectForm.client}
              />
              <TextArea
                label="Descrizione"
                onChange={(value) => setProjectForm((state) => ({ ...state, description: value }))}
                placeholder="Interventi principali"
                value={projectForm.description}
              />
              <Button className="w-full" onClick={handleCreateProject} type="button">
                Salva progetto
              </Button>
            </div>
          </SectionPanel>

          <SectionPanel>
            <SectionHeading icon={Layers3} kicker="Filtri" title="Perimetro vista" />
            <div className="mt-5 space-y-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                <input
                  className="h-10 w-full rounded-[18px] border border-subtle bg-card pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cerca SAL o progetto"
                  type="search"
                  value={query}
                />
              </label>
              <SelectField
                label="Progetto"
                onChange={(value) => {
                  setProjectFilter(value);
                  setPage(1);
                }}
                options={[
                  { label: "Tutti i progetti", value: "all" },
                  ...projects.map((project) => ({ label: project.name, value: project.id })),
                ]}
                value={projectFilter}
              />
              <SelectField
                label="Stato"
                onChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  setPage(1);
                }}
                options={[
                  { label: "Tutti gli stati", value: "all" },
                  { label: "Chiuse", value: "closed" },
                  { label: "Bozze", value: "draft" },
                ]}
                value={statusFilter}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setGroupMode("project");
                    setPage(1);
                  }}
                  type="button"
                  variant={groupMode === "project" ? "default" : "outline"}
                >
                  Progetti
                </Button>
                <Button
                  onClick={() => {
                    setGroupMode("flat");
                    setPage(1);
                  }}
                  type="button"
                  variant={groupMode === "flat" ? "default" : "outline"}
                >
                  Lista
                </Button>
              </div>
              <Button
                className="w-full"
                disabled={projects.length === 0}
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                <Plus className="size-4" />
                Nuova SAL
              </Button>
            </div>
          </SectionPanel>
        </aside>

        <SectionPanel className="p-0">
          <div className="flex flex-col gap-3 border-b border-subtle p-5 xl:flex-row xl:items-center xl:justify-between">
            <SectionHeading icon={ReceiptText} kicker="Registro" title="SAL operative" />
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{visibleSals.length} righe</Badge>
              <Badge variant="success">{formatAmount(totalVisibleAmount)}</Badge>
            </div>
          </div>

          {visibleSals.length === 0 ? (
            <div className="p-8">
              <EmptyState text="Nessuna SAL nel perimetro corrente. Crea un progetto, poi usa + Nuova SAL." />
            </div>
          ) : groupMode === "project" ? (
            <>
              <div className="divide-y divide-subtle">
                {groupedSals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((group) => (
                  <ProjectSalGroup
                    key={group.projectId}
                    project={projectById.get(group.projectId)}
                    sals={group.sals}
                  />
                ))}
              </div>
              <PaginationControls
                current={page}
                total={groupedTotalPages}
                totalItems={groupedSals.length}
                onPageChange={setPage}
              />
            </>
          ) : (
            <>
              <SalTable projectById={projectById} sals={paginatedSals} />
              <PaginationControls
                current={page}
                total={totalPages}
                totalItems={visibleSals.length}
                onPageChange={setPage}
              />
            </>
          )}
        </SectionPanel>
      </section>

      {isModalOpen ? (
        <CreateSalModal
          activeProjectId={activeProject?.id ?? ""}
          createClosedSal={createClosedSal}
          createTariffVoice={createTariffVoice}
          onClose={() => setIsModalOpen(false)}
          onCreated={(sal) => {
            setIsModalOpen(false);
            setProjectFilter(sal.projectId);
            setMessage(`${sal.title} chiusa e salvata nel registro.`);
            notify({
              message: `${sal.title} chiusa e salvata nel registro.`,
              title: "SAL salvata",
              tone: "success",
            });
          }}
          projects={projects}
          tariffVoices={tariffVoices}
        />
      ) : null}
    </ScreenShell>
  );
}

function CreateSalModal({
  activeProjectId,
  createClosedSal,
  createTariffVoice,
  onClose,
  onCreated,
  projects,
  tariffVoices,
}: {
  activeProjectId: string;
  createClosedSal: ReturnType<typeof useSalWorkflowStore.getState>["createClosedSal"];
  createTariffVoice: ReturnType<typeof useSalWorkflowStore.getState>["createTariffVoice"];
  onClose: () => void;
  onCreated: (sal: { projectId: string; title: string }) => void;
  projects: SalProject[];
  tariffVoices: SalTariffVoice[];
}) {
  const initialProjectId = activeProjectId || projects[0]?.id || "";
  const [draft, setDraft] = useState<SalDraftState>(() => createInitialDraft(initialProjectId));
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState<SalModalStep>(1);
  const [voiceForm, setVoiceForm] = useState<VoiceFormState>(initialVoiceForm);
  const selectedProject = projects.find((project) => project.id === draft.projectId);
  const availableVoices = useMemo(
    () =>
      selectedProject
        ? tariffVoices.filter((voice) => voice.projectYear === selectedProject.year)
        : [],
    [selectedProject, tariffVoices],
  );
  const voiceById = useMemo(
    () => new Map(availableVoices.map((voice) => [voice.id, voice])),
    [availableVoices],
  );
  const lineViews = useMemo(
    () =>
      draftLines.flatMap((line) => {
        const voice = voiceById.get(line.voiceId);
        const quantity = normalizeDecimal(line.quantity);

        if (!voice || !Number.isFinite(quantity)) {
          return [];
        }

        const surcharge = surchargeOptions.find((option) => option.kind === line.surcharge);
        const multiplier = surcharge?.multiplier ?? 1;

        return [
          {
            ...line,
            lineTotal: Math.max(0, quantity) * voice.unitPrice * multiplier,
            quantityValue: Math.max(0, quantity),
            voice,
          },
        ];
      }),
    [draftLines, voiceById],
  );
  const total = lineViews.reduce((sum, line) => sum + line.lineTotal, 0);

  function handleNext() {
    if (!draft.title.trim() || !draft.projectId || !draft.date) {
      setError("Inserisci nome SAL, data e progetto associato.");
      return;
    }

    setError("");
    setStep(2);
  }

  function handleAddDraftLine() {
    setDraftLines((current) => [
      ...current,
      {
        id: createId("draft_line"),
        quantity: "0",
        surcharge: "none",
        voiceId: availableVoices[0]?.id ?? "",
      },
    ]);
  }

  function handleCreateVoice() {
    if (!selectedProject) {
      setError("Seleziona un progetto prima di creare una voce tariffario.");
      return;
    }

    const unitPrice = normalizeDecimal(voiceForm.unitPrice);

    if (
      !voiceForm.code.trim() ||
      !voiceForm.description.trim() ||
      !voiceForm.unit.trim() ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      setError("Completa codice, descrizione, unita e prezzo unitario della voce.");
      return;
    }

    const voice = createTariffVoice({
      category: voiceForm.category.trim() || `Tariffario ${selectedProject.year}`,
      code: voiceForm.code.trim(),
      description: voiceForm.description.trim(),
      projectYear: selectedProject.year,
      unit: voiceForm.unit.trim(),
      unitPrice,
    });

    setVoiceForm(initialVoiceForm);
    setDraftLines((current) => [
      ...current,
      { id: createId("draft_line"), quantity: "0", surcharge: "none", voiceId: voice.id },
    ]);
    setError("");
  }

  function handleCloseSal() {
    if (!selectedProject) {
      setError("Seleziona un progetto associato.");
      return;
    }

    const lines: SalLine[] = lineViews.map((line) => ({
      id: createId("sal_line"),
      quantity: line.quantityValue,
      surcharge: line.surcharge,
      voiceId: line.voice.id,
    }));

    if (lines.length === 0) {
      setError("Aggiungi almeno una voce valida prima di chiudere la SAL.");
      return;
    }

    const sal = createClosedSal({
      date: draft.date,
      description: draft.description.trim(),
      lines,
      notes: draft.notes.trim(),
      projectId: selectedProject.id,
      title: draft.title.trim(),
    });

    onCreated(sal);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[24px] border border-subtle bg-card shadow-panel">
        <div className="flex items-center justify-between gap-4 border-b border-subtle px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Nuova SAL
            </div>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              {step === 1 ? "Dati generali e progetto" : "Voci, quantita e maggiorazioni"}
            </h3>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[14px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translate3d(${step === 1 ? "0" : "-50%"}, 0, 0)`, width: "200%" }}
          >
            <div className="w-1/2 shrink-0 p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField
                  label="Nome SAL"
                  onChange={(value) => setDraft((state) => ({ ...state, title: value }))}
                  placeholder="SAL 1"
                  value={draft.title}
                />
                <TextField
                  label="Data"
                  onChange={(value) => setDraft((state) => ({ ...state, date: value }))}
                  type="date"
                  value={draft.date}
                />
                <SelectField
                  label="Progetto associato"
                  onChange={(value) =>
                    setDraft((state) => ({
                      ...state,
                      projectId: value,
                    }))
                  }
                  options={projects.map((project) => ({
                    label: `${project.name} · ${project.year}`,
                    value: project.id,
                  }))}
                  value={draft.projectId}
                />
                <TextField
                  label="Descrizione"
                  onChange={(value) => setDraft((state) => ({ ...state, description: value }))}
                  placeholder="Prima SAL - Opere stradali"
                  value={draft.description}
                />
                <div className="lg:col-span-2">
                  <TextArea
                    label="Note"
                    onChange={(value) => setDraft((state) => ({ ...state, notes: value }))}
                    placeholder="Note operative"
                    value={draft.notes}
                  />
                </div>
              </div>
            </div>

            <div className="w-1/2 shrink-0 p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <section className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Righe SAL</div>
                      <div className="mt-1 text-xs text-secondary">
                        Tariffario {selectedProject?.year ?? "-"} · totale {formatAmount(total)}
                      </div>
                    </div>
                    <Button
                      disabled={availableVoices.length === 0}
                      onClick={handleAddDraftLine}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Plus className="size-4" />
                      Voce
                    </Button>
                  </div>

                  <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto pr-1">
                    {draftLines.length > 0 ? (
                      draftLines.map((line) => (
                        <DraftLineEditor
                          availableVoices={availableVoices}
                          key={line.id}
                          line={line}
                          onRemove={() =>
                            setDraftLines((current) =>
                              current.filter((item) => item.id !== line.id),
                            )
                          }
                          onUpdate={(patch) =>
                            setDraftLines((current) =>
                              current.map((item) =>
                                item.id === line.id ? { ...item, ...patch } : item,
                              ),
                            )
                          }
                          voice={voiceById.get(line.voiceId)}
                        />
                      ))
                    ) : (
                      <EmptyState text="Aggiungi una voce dal tariffario. Se il tariffario e vuoto, crea una voce dal pannello a destra." />
                    )}
                  </div>
                </section>

                <aside className="rounded-[20px] border border-subtle bg-muted/35 p-4">
                  <div className="text-sm font-semibold text-foreground">Nuova voce tariffario</div>
                  <div className="mt-4 space-y-3">
                    <TextField
                      label="Codice"
                      onChange={(value) => setVoiceForm((state) => ({ ...state, code: value }))}
                      placeholder="01.01.001"
                      value={voiceForm.code}
                    />
                    <TextField
                      label="Descrizione"
                      onChange={(value) =>
                        setVoiceForm((state) => ({ ...state, description: value }))
                      }
                      placeholder="Scavo a sezione obbligata"
                      value={voiceForm.description}
                    />
                    <TextField
                      label="Categoria"
                      onChange={(value) => setVoiceForm((state) => ({ ...state, category: value }))}
                      placeholder="Scavi"
                      value={voiceForm.category}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <TextField
                        label="Unita"
                        onChange={(value) => setVoiceForm((state) => ({ ...state, unit: value }))}
                        placeholder="m3"
                        value={voiceForm.unit}
                      />
                      <TextField
                        label="Prezzo"
                        onChange={(value) =>
                          setVoiceForm((state) => ({ ...state, unitPrice: value }))
                        }
                        placeholder="25,60"
                        value={voiceForm.unitPrice}
                      />
                    </div>
                    <Button className="w-full" onClick={handleCreateVoice} type="button">
                      <Plus className="size-4" />
                      Aggiungi
                    </Button>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="px-5 pb-2 text-sm text-danger">{error}</div> : null}

        <div className="flex items-center justify-between border-t border-subtle px-5 py-4">
          <Button disabled={step === 1} onClick={() => setStep(1)} type="button" variant="outline">
            <ArrowLeft className="size-4" />
            Indietro
          </Button>
          <div className="text-sm font-semibold text-success">{formatAmount(total)}</div>
          {step === 1 ? (
            <Button disabled={projects.length === 0} onClick={handleNext} type="button">
              Avanti
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleCloseSal} type="button">
              <Lock className="size-4" />
              Chiudi SAL
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function DraftLineEditor({
  availableVoices,
  line,
  onRemove,
  onUpdate,
  voice,
}: {
  availableVoices: SalTariffVoice[];
  line: DraftLine;
  onRemove: () => void;
  onUpdate: (patch: Partial<DraftLine>) => void;
  voice: SalTariffVoice | undefined;
}) {
  const surcharge = surchargeOptions.find((option) => option.kind === line.surcharge);
  const quantity = normalizeDecimal(line.quantity);
  const total =
    voice && Number.isFinite(quantity)
      ? Math.max(0, quantity) * voice.unitPrice * (surcharge?.multiplier ?? 1)
      : 0;

  return (
    <div className="rounded-[18px] border border-subtle bg-card p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_110px_150px_auto] lg:items-end">
        <SelectField
          label="Voce"
          onChange={(value) => onUpdate({ voiceId: value })}
          options={availableVoices.map((item) => ({
            label: `${item.code} · ${item.description}`,
            value: item.id,
          }))}
          value={line.voiceId}
        />
        <TextField
          label="Quantita"
          onChange={(value) => onUpdate({ quantity: value })}
          type="number"
          value={line.quantity}
        />
        <SelectField
          label="Maggiorazione"
          onChange={(value) => onUpdate({ surcharge: value as SalSurchargeKind })}
          options={surchargeOptions.map((option) => ({
            label: option.label,
            value: option.kind,
          }))}
          value={line.surcharge}
        />
        <Button onClick={onRemove} size="icon" type="button" variant="ghost">
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-secondary">
          {voice ? `${formatAmount(voice.unitPrice)} / ${voice.unit}` : "Voce non selezionata"}
        </span>
        <span className="font-semibold text-foreground">{formatAmount(total)}</span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </span>
      <select
        className="mt-2 h-10 w-full rounded-[14px] border border-subtle bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
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

function TextArea({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
        {label}
      </span>
      <textarea
        className="mt-2 min-h-20 w-full resize-y rounded-[14px] border border-subtle bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-subtle bg-muted/35 p-4 text-sm leading-6 text-secondary">
      {text}
    </div>
  );
}

function formatAmount(amount: number) {
  return formatMoney({ amount, currency: "EUR" });
}
