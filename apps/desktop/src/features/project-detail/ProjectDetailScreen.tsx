import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Layers3,
  MoreVertical,
  Play,
  Plus,
  Radio,
  ReceiptText,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContextToolbar } from "@/components/shared/ContextToolbar";
import { SPRING_EASE } from "@/components/shared/easings";

import { useToast } from "@/components/shared/ToastProvider";
import { StatusPill } from "@/components/shared/StatusPill";

import { BezelSurface, ProjectControlButton } from "@/components/shared/ui-primitives";

import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import type { PortfolioProject } from "@/features/projects/types";

import { formatDueWindow, formatForecastDelta } from "@/features/projects/utils/projects-helpers";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { useNavigate } from "@/hooks/useNavigate";
import { listDesktopContracts } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import { readStringRecord } from "@/lib/shared-utils";

import { cn } from "@/lib/utils";

import { useSalWorkflowStore } from "@/store/sal-workflow-store";

import { useSelectionStore } from "@/store/selection-store";

import { ProjectTimeline } from "./components/ProjectTimeline";
export function ProjectDetailScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);

  useEffect(() => {
    let active = true;

    listDesktopContracts([])
      .then((contracts) => {
        if (!active) {
          return;
        }

        const projectContractors = readStringRecord("quantara.projectContractors.v1");
        setProjects(
          contracts.data.map((contract) =>
            mapContractToProject(contract, projectContractors[contract.id]),
          ),
        );
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        notify({
          message: "Impossibile caricare i dettagli del progetto.",
          title: "Caricamento fallito",
          tone: "danger",
        });
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [notify]);

  const selectedProject = useMemo(() => {
    const selectedProjectId = readSelectedProjectId();

    if (selectedProjectId) {
      return projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
    }

    return projects[0] ?? null;
  }, [projects]);

  const salViews = useMemo(() => {
    if (!selectedProject) {
      return [];
    }
    return salDocuments
      .filter((document) => document.projectId === selectedProject.id)
      .map((document) => buildSalDocumentView(document, tariffVoices))
      .sort((left, right) => {
        const leftDate = left.closedAt ?? left.date;
        const rightDate = right.closedAt ?? right.date;
        return rightDate.localeCompare(leftDate);
      });
  }, [salDocuments, selectedProject, tariffVoices]);

  const financials = useMemo(() => {
    const contractual = selectedProject?.budget.amount ?? 0;
    const committed = salViews.reduce((sum, row) => sum + row.total, 0);
    const executed = salViews
      .filter((row) => row.status === "closed")
      .reduce((sum, row) => sum + row.total, 0);
    const residual = contractual - committed;
    const progress = contractual > 0 ? Math.min(100, (committed / contractual) * 100) : 0;
    const currentSalAmount = salViews[0]?.total ?? 0;

    return { committed, contractual, currentSalAmount, executed, progress, residual };
  }, [salViews, selectedProject]);

  const [filterSalStatus, setFilterSalStatus] = useState<string>("Tutti");

  const salRows = useMemo(
    () =>
      salViews.map((row) => ({
        amount: row.total,
        date: row.closedAt ?? row.date,
        id: row.id,
        isClosed: row.status === "closed",
        isApproved: row.status === "approved",
        isDraft: row.status === "draft",
        isReview: row.status === "in-review",
        period: row.description || row.title,
        sal: row.title,
        status:
          row.status === "closed"
            ? "Approvata"
            : row.status === "approved"
              ? "Approvata"
              : row.status === "in-review"
                ? "In revisione"
                : "Bozza",
        tone: (row.status === "closed" || row.status === "approved"
          ? "success"
          : row.status === "in-review"
            ? "info"
            : "warning") as "danger" | "info" | "success" | "warning",
      })),
    [salViews],
  );

  const filteredSalRows = useMemo(
    () => salRows.filter((r) => filterSalStatus === "Tutti" || r.status === filterSalStatus),
    [salRows, filterSalStatus],
  );

  const detail = useMemo(
    () =>
      selectedProject
        ? buildProjectDetail(selectedProject, financials, salRows[0]?.sal ?? "SAL da creare")
        : null,
    [financials, salRows, selectedProject],
  );
  const milestoneRows = useMemo(
    () => (selectedProject ? buildMilestoneRows(selectedProject, salRows.length) : []),
    [salRows.length, selectedProject],
  );
  const projectTeam = useMemo(
    () => (selectedProject ? buildProjectTeam(selectedProject) : []),
    [selectedProject],
  );
  const recentActivities = useMemo(
    () => (selectedProject ? buildRecentActivities(selectedProject, salRows) : []),
    [salRows, selectedProject],
  );

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteSal = useSalWorkflowStore((state) => state.deleteSal);
  const setSalStatus = useSalWorkflowStore((state) => state.setSalStatus);

  function handleCreateSal() {
    if (!selectedProject) {
      return;
    }
    try {
      window.sessionStorage.setItem(
        "quantara.selectedProjectDetail.v1",
        JSON.stringify(selectedProject),
      );
    } catch {
      // Continue with navigation even if session storage is unavailable.
    }
    navigate("sal-create");
  }

  const handleDeleteSal = useCallback(
    (salId: string) => {
      const sal = salDocuments.find((d) => d.id === salId);
      deleteSal(salId);
      setDeleteTargetId(null);
      notify({
        message: `"${sal?.title ?? salId}" eliminato dal registro locale.`,
        title: "SAL eliminata",
        tone: "success",
      });
    },
    [deleteSal, notify, salDocuments],
  );

  const handleSetSalStatus = useCallback(
    (salId: string, status: "in-review" | "approved" | "closed") => {
      const sal = salDocuments.find((d) => d.id === salId);
      setSalStatus(salId, status);
      notify({
        message:
          status === "in-review"
            ? `"${sal?.title ?? salId}" inviata in revisione.`
            : `"${sal?.title ?? salId}" ${status === "closed" ? "approvata e chiusa." : "approvata."}`,
        title: status === "in-review" ? "In revisione" : "Approvata",
        tone: "success",
      });
    },
    [setSalStatus, notify, salDocuments],
  );

  if (isLoading) {
    return (
      <div className="pt-4 text-sm font-medium text-[var(--text-secondary)]">
        Caricamento progetto...
      </div>
    );
  }

  if (!selectedProject || !detail) {
    return (
      <div className="pt-4">
        <BezelSurface innerClassName="p-5 text-sm text-[var(--text-secondary)]">
          Nessun progetto locale disponibile.
        </BezelSurface>
      </div>
    );
  }

  const kpiCards = [
    {
      caption: "Budget totale del contratto",
      icon: WalletCards,
      label: "Budget contrattuale",
      tone: "blue" as const,
      value: formatMoney({ amount: detail.budget.contractual, currency: "EUR" }),
    },
    {
      caption: "Valore impegnato sul contratto",
      icon: Layers3,
      label: "Impegnato",
      tone: "success" as const,
      value: formatMoney({ amount: financials.committed, currency: "EUR" }),
    },
    {
      caption: "Ultima SAL approvata",
      icon: Clock3,
      label: "SAL corrente",
      tone: "warning" as const,
      value: formatMoney({ amount: financials.currentSalAmount, currency: "EUR" }),
    },
    {
      caption: "Avanzamento fisico del lotto",
      icon: TrendingUp,
      label: "Progresso",
      tone: "info" as const,
      value: `${detail.progress}%`,
    },
  ];

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      <section className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-10px font-semibold uppercase tracking-uppercase-wide text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Dossier {detail.lot}
          </span>
          <h2 className="mt-5 max-w-4xl text-38px font-semibold leading-tight text-[var(--text-primary)] md:text-56px">
            {detail.name}
          </h2>
          <p className="mt-4 max-w-2xl text-15px leading-6 text-[var(--text-secondary)]">
            {detail.lot} &middot; {detail.location}. Presidio economico, SAL e segnali di
            avanzamento in un solo dossier operativo.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <StatusPill tone={detail.healthTone}>{detail.health}</StatusPill>
            <StatusPill tone="info">{String(detail.sal.current)}</StatusPill>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ProjectControlButton
              className="h-10 px-4 text-13px"
              icon={Plus}
              onClick={handleCreateSal}
              variant="primary"
            >
              Nuova SAL
            </ProjectControlButton>
            <ProjectControlButton className="h-10 px-4 text-13px" variant="neutral">
              Presidio economico
            </ProjectControlButton>
          </div>
        </div>

        <BezelSurface className="self-start md:translate-y-2" innerClassName="p-0 overflow-hidden">
          <div className="relative min-h-[220px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center opacity-70 grayscale contrast-125"
              style={{
                backgroundImage:
                  "url(https://picsum.photos/seed/rail-construction-dossier/900/700)",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.56))]" />
            <div className="absolute inset-x-4 bottom-4 rounded-18px bg-[rgba(255,255,255,0.86)] p-4 text-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-10px font-semibold uppercase tracking-0_2em text-slate-500">
                    Avanzamento dossier
                  </div>
                  <div className="mt-2 text-28px font-semibold leading-none tracking-tight">
                    {detail.progress}%
                  </div>
                </div>
                <div className="text-right text-11px font-semibold leading-5 text-slate-600">
                  {detail.manager}
                  <br />
                  27 Apr 2025 &middot; 17:40
                </div>
              </div>
            </div>
          </div>
        </BezelSurface>
      </section>

      <section className="mt-8 grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <h3 className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Milestone
            </h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-4">
              {milestoneRows.map((row, index) => (
                <MilestoneItem
                  isLast={index === milestoneRows.length - 1}
                  key={row.label}
                  row={row}
                />
              ))}
            </div>
          </Panel>

          <Panel>
            <h3 className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Economico ed esecuzione
            </h3>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] p-4">
                <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                  Quadro economico
                </div>
                <dl className="mt-3 divide-y divide-[var(--border-subtle)]/70">
                  <SummaryRow
                    label="Budget contrattuale"
                    value={formatMoney({ amount: detail.budget.contractual, currency: "EUR" })}
                  />
                  <SummaryRow
                    label="Impegnato"
                    value={formatMoney({ amount: detail.budget.committed, currency: "EUR" })}
                  />
                  <SummaryRow
                    label="Eseguito"
                    value={formatMoney({ amount: detail.budget.executed, currency: "EUR" })}
                  />
                </dl>
              </div>

              <div className="grid rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] p-4 md:grid-cols-2">
                <div className="border-b border-[var(--border-subtle)]/70 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                  <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                    Forecast
                  </div>
                  <InfoBlock label="Fine prevista" value={detail.endDate} />
                  <InfoBlock label="CPI" value={detail.cpi} note="Sotto budget rispetto al piano" />
                </div>
                <div className="pt-4 md:pl-4 md:pt-0">
                  <div className="flex items-center justify-between text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                    <span>Impatto</span>
                    <span className="text-14px tracking-normal text-[var(--danger-base)]">
                      {detail.forecastImpact}
                    </span>
                  </div>
                  <div className="mt-5 border-t border-[var(--border-subtle)]/70 pt-4">
                    <InfoBlock label="Rischio materiale" value={detail.materialRisk} />
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                <FileText className="size-4 text-[var(--info-base)]" />
                Registro SAL
              </div>
              <ProjectControlButton
                icon={Plus}
                onClick={handleCreateSal}
                className="h-9 px-3 text-13px"
                variant="primary"
              >
                Nuova SAL
              </ProjectControlButton>
            </div>

            <div className="mt-4 space-y-2">
              <ContextToolbar
                actions={[
                  {
                    ...ContextToolbar.actions.export,
                    run: () =>
                      notify({
                        message: "Esportazione in arrivo con un prossimo aggiornamento.",
                        title: "Esporta",
                        tone: "info",
                      }),
                  },
                  {
                    ...ContextToolbar.actions.delete,
                    run: () => {
                      const ids = [...useSelectionStore.getState().ids];
                      const count = ids.length;
                      ids.forEach((id) => {
                        const sal = salDocuments.find((d) => d.id === id);
                        if (sal) deleteSal(sal.id);
                      });
                      useSelectionStore.getState().clear();
                      notify({
                        message: `${count} SAL eliminat${count === 1 ? "a" : "e"} con successo.`,
                        title: "Eliminate",
                        tone: "success",
                      });
                    },
                  },
                ]}
                entityLabel="SAL"
              />
              {/* Status filter tabs */}
              <div className="flex flex-wrap items-center gap-1.5 px-1 pt-3">
                {["Tutti", "Bozza", "In revisione", "Approvata"].map((s) => (
                  <button
                    className={cn(
                      "rounded-full px-3 py-1 text-11px font-semibold transition-colors",
                      filterSalStatus === s
                        ? s === "Bozza"
                          ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                          : s === "In revisione"
                            ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                            : s === "Approvata"
                              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                              : "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-strong)]",
                    )}
                    key={s}
                    onClick={() => setFilterSalStatus(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {filteredSalRows.map((row) => (
                <SalCard
                  key={row.id}
                  date={row.date}
                  id={row.id}
                  isApproved={row.isApproved}
                  isClosed={row.isClosed}
                  isDraft={row.isDraft}
                  isReview={row.isReview}
                  onClose={() =>
                    handleSetSalStatus(
                      row.id,
                      row.isDraft ? "in-review" : row.isReview ? "approved" : "closed",
                    )
                  }
                  onContinue={
                    row.isDraft
                      ? () => {
                          try {
                            window.sessionStorage.setItem(
                              "quantara.selectedProjectDetail.v1",
                              JSON.stringify(selectedProject),
                            );
                            window.sessionStorage.setItem("quantara.salResumeDraft.v1", row.id);
                          } catch {
                            /* no-op */
                          }
                          navigate("sal-create");
                        }
                      : undefined
                  }
                  onDelete={() => setDeleteTargetId(row.id)}
                  period={row.period}
                  sal={row.sal}
                  status={row.status}
                  tone={row.tone}
                  value={formatMoney({ amount: row.amount, currency: "EUR" })}
                />
              ))}
              {filteredSalRows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border-[0.5px] border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)]/35 px-4 py-8 text-center">
                  <FileText className="size-8 text-[var(--text-secondary)]" />
                  <p className="text-13px font-medium text-[var(--text-secondary)]">
                    Nessuna SAL registrata per questo progetto.
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <aside className="min-w-0 space-y-4">
          <ProjectTimeline project={selectedProject} salDocuments={salDocuments} />
          <Panel>
            <PanelTitle icon={Radio}>Presidio rapido</PanelTitle>
            <dl className="mt-4 divide-y divide-[var(--border-subtle)]/70">
              <SummaryRow label="Inizio" value={detail.startDate} />
              <SummaryRow label="Fine prevista" value={detail.endDate} />
              <SummaryRow label="Ultimo aggiornamento" value={detail.lastUpdate} />
              <SummaryRow label="SAL" value={String(detail.sal.current)} />
              <SummaryRow label="Responsabile" value={detail.manager} />
              <SummaryRow label="Prossima milestone" value={detail.nextMilestone} />
              <SummaryRow label="Rischio materiale" value={detail.materialRisk} />
              <SummaryRow
                label="Residuo budget"
                value={formatMoney({ amount: financials.residual, currency: "EUR" })}
              />
            </dl>
          </Panel>

          <Panel>
            <PanelTitle icon={UsersRound}>Team progetto</PanelTitle>
            <div className="mt-4 space-y-2.5">
              {projectTeam.map((member) => (
                <div
                  className="flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] px-3 py-2.5"
                  key={member.initials}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-13px bg-[var(--accent-primary)] text-12px font-bold text-[var(--text-inverse)]">
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                      {member.name}
                    </div>
                    <div className="truncate text-12px font-medium text-[var(--text-secondary)]">
                      {member.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle icon={Activity}>Attivita recenti</PanelTitle>
            <div className="mt-4 space-y-3">
              {recentActivities.slice(0, 1).map((activity) => (
                <div
                  className="flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] px-3 py-3"
                  key={activity.text}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-base)] text-[var(--text-secondary)]">
                    <ReceiptText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                      {activity.text}
                    </div>
                    <div className="mt-0.5 text-12px font-medium text-[var(--text-secondary)]">
                      Operazione in attesa
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-12px font-medium text-[var(--text-secondary)]">
                    Oggi
                    <br />
                    17:40
                  </div>
                </div>
              ))}
              <ProjectControlButton className="mt-1 w-full justify-between px-3" variant="soft">
                Vedi tutte le attivita
                <ChevronRight className="size-4" />
              </ProjectControlButton>
            </div>
          </Panel>
        </aside>
      </section>

      {deleteTargetId ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
          <button
            aria-label="Chiudi"
            className="absolute inset-0 cursor-default"
            onClick={() => setDeleteTargetId(null)}
            type="button"
          />
          <motion.div
            className="relative w-full max-w-sm rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.5, ease: SPRING_EASE }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div className="rounded-22px bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger-base)]">
                  <Trash2 className="size-5" />
                </span>
                <div>
                  <div className="text-14px font-semibold text-[var(--text-primary)]">
                    Eliminare questa SAL?
                  </div>
                  <p className="mt-2 text-13px leading-5 text-[var(--text-secondary)]">
                    L'operazione rimuove definitivamente il documento. I dati non possono essere
                    recuperati.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--bg-muted)] px-5 text-13px font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
                  onClick={() => setDeleteTargetId(null)}
                  type="button"
                >
                  Annulla
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--danger-base)] px-5 text-13px font-semibold text-white transition-colors hover:bg-[var(--danger-base)]/90"
                  onClick={() => handleDeleteSal(deleteTargetId)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Elimina
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-5", className)}>{children}</BezelSurface>;
}

function PanelTitle({ children, icon: Icon }: { children: string; icon: typeof Radio }) {
  return (
    <div className="flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
      <Icon className="size-4 text-[var(--info-base)]" />
      {children}
    </div>
  );
}

function MetricCard({
  caption,
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: typeof WalletCards;
  label: string;
  tone: "blue" | "info" | "success" | "warning";
  value: string;
}) {
  return (
    <BezelSurface
      innerClassName={cn(
        "group flex min-h-[112px] items-center gap-4 p-4 2xl:min-h-[128px] 2xl:gap-5",
        tone === "blue" ? "bg-[var(--info-soft)]/20" : "",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl 2xl:size-14",
          (!tone || tone === "blue" || tone === "info") &&
            "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 truncate text-20px font-bold leading-none md:text-22px",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--info-base)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-2 text-12px font-medium text-[var(--text-secondary)]">{caption}</div>
      </div>
    </BezelSurface>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-12px font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="max-w-[58%] text-right text-13px font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function MilestoneItem({
  isLast,
  row,
}: {
  isLast: boolean;
  row: { date: string; label: string; status: string };
}) {
  const isComplete = row.status === "complete";
  const isActive = row.status === "active";

  return (
    <div className="relative flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border",
          isComplete && "border-[var(--info-base)] bg-[var(--info-soft)] text-[var(--info-base)]",
          isActive && "border-[var(--info-base)] bg-[var(--info-soft)] text-[var(--info-base)]",
          !isComplete &&
            !isActive &&
            "border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <span className="size-3 rounded-full bg-current" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
          {row.label}
        </div>
        <div className="mt-1 truncate text-12px font-medium text-[var(--text-secondary)]">
          {row.date}
        </div>
      </div>
      {!isLast ? (
        <div className="pointer-events-none absolute left-10 right-0 top-5 hidden border-t border-dashed border-[var(--border-subtle)] lg:block" />
      ) : null}
    </div>
  );
}

function InfoBlock({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="mt-4">
      <div className="text-12px font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-15px font-semibold text-[var(--text-primary)]">{value}</div>
      {note ? (
        <div className="mt-1 text-11px font-semibold text-[var(--danger-base)]">{note}</div>
      ) : null}
    </div>
  );
}

function SalCard({
  date,
  id,
  isApproved = false,
  isClosed = false,
  isDraft = false,
  isReview = false,
  onClose,
  onContinue,
  onDelete,
  period,
  sal,
  status,
  tone,
  value,
}: {
  date: string;
  id: string;
  isApproved?: boolean;
  isClosed?: boolean;
  isDraft?: boolean;
  isReview?: boolean;
  onClose: () => void;
  onContinue?: (() => void) | undefined;
  onDelete: () => void;
  period: string;
  sal: string;
  status: string;
  tone: "danger" | "info" | "success" | "warning";
  value: string;
}) {
  const isSelected = useSelectionStore((state) => state.ids.has(id));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-3 py-3 ring-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[color-mix(in_srgb,var(--bg-muted)_84%,var(--surface-base)_16%)]",
        isSelected
          ? "ring-[var(--accent-primary)]/50 bg-[var(--selection-bg)]"
          : "ring-[var(--border-subtle)]/60 hover:ring-[var(--border-subtle)]",
      )}
    >
      <button
        className="absolute inset-0 cursor-pointer rounded-xl"
        onClick={() => useSelectionStore.getState().toggle(id)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            useSelectionStore.getState().toggle(id);
          }
        }}
        aria-label={`Seleziona ${sal}`}
        type="button"
      />

      <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3">
        <motion.button
          aria-checked={isSelected}
          className={cn(
            "flex size-[20px] shrink-0 items-center justify-center rounded-5px border transition-all",
            isSelected
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] opacity-100"
              : "border-[var(--border-subtle)] bg-[var(--surface-base)] opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            useSelectionStore.getState().toggle(id);
          }}
          role="checkbox"
          type="button"
        >
          {isSelected && (
            <svg
              aria-label="Selezionato"
              className="size-2.5 text-white"
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          )}
        </motion.button>

        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            isClosed
              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
              : "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          )}
        >
          {isClosed ? <CheckCircle2 className="size-5" /> : <Clock3 className="size-5" />}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-13px font-semibold text-[var(--text-primary)]">
              {sal}
            </span>
            <StatusPill tone={tone}>{status}</StatusPill>
          </div>
          <div className="mt-0.5 truncate text-12px font-medium text-[var(--text-secondary)]">
            {period} &middot; {value}
          </div>
          <div className="mt-0.5 text-11px font-medium text-[var(--text-secondary)]">{date}</div>
        </div>
      </div>

      <div className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-1">
        {isDraft ? (
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 text-11px font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-primary)]/90"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onContinue?.();
            }}
            type="button"
          >
            <Play className="size-3.5" />
            Continua
          </button>
        ) : isReview ? (
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--info-soft)] px-3.5 text-11px font-bold text-[var(--info-base)] ring-1 ring-[var(--info-base)]/30 transition-all hover:bg-[var(--info-soft)]/80"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onClose();
            }}
            type="button"
          >
            <ThumbsUp className="size-3.5" />
            Approva
          </button>
        ) : isClosed || isApproved ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-11px font-semibold",
              "bg-[var(--success-soft)] text-[var(--success-base)]",
            )}
          >
            <ThumbsUp className="size-3.5" />
            Approvata
          </span>
        ) : null}

        <div className="relative">
          <button
            ref={menuBtnRef}
            aria-label="Azioni SAL"
            className="projects-control-button-neutral flex size-9 shrink-0 items-center justify-center gap-2 rounded-full text-[var(--text-secondary)] outline-none projects-control-button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (!menuOpen && menuBtnRef.current) {
                const rect = menuBtnRef.current.getBoundingClientRect();
                setMenuPos({
                  top: rect.bottom + 6,
                  right: document.documentElement.clientWidth - rect.right,
                });
              }
              setMenuOpen((v) => !v);
            }}
            type="button"
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen ? (
            <>
              <button
                aria-label="Chiudi menu"
                className="fixed inset-0 z-[9998] cursor-default"
                onClick={() => setMenuOpen(false)}
                type="button"
              />
              <div
                className="fixed z-[9999] w-52 overflow-hidden rounded-xl bg-[var(--surface-base)] p-1 shadow-[0_18px_44px_-18px_rgba(15,23,42,0.35)] ring-1 ring-[var(--border-subtle)]/70"
                style={{ top: menuPos.top, right: menuPos.right }}
              >
                {isDraft ? (
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-13px font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onContinue?.();
                    }}
                    type="button"
                  >
                    <Play className="size-4 text-[var(--info-base)]" />
                    Continua bozza
                  </button>
                ) : null}
                {isDraft || isReview ? (
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-13px font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onClose();
                    }}
                    type="button"
                  >
                    <ThumbsUp className="size-4 text-[var(--info-base)]" />
                    {isDraft ? "Invia in revisione" : "Approva"}
                  </button>
                ) : null}
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-13px font-medium text-[var(--danger-base)] transition-colors hover:bg-[var(--danger-soft)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete();
                  }}
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Elimina
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function readSelectedProjectId(): string | null {
  try {
    const rawValue = window.sessionStorage.getItem("quantara.selectedProjectDetail.v1");

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

function buildProjectDetail(
  project: PortfolioProject,
  financials: {
    committed: number;
    contractual: number;
    currentSalAmount: number;
    executed: number;
    progress: number;
    residual: number;
  },
  currentSalLabel: string,
) {
  const costPerformance = financials.committed > 0 ? financials.executed / financials.committed : 1;

  return {
    budget: {
      committed: financials.committed,
      contractual: financials.contractual,
      executed: financials.executed,
    },
    cpi: costPerformance.toLocaleString("it-IT", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }),
    endDate:
      project.forecastDeltaDays === 0
        ? "In linea con piano"
        : `${formatForecastDelta(project.forecastDeltaDays)} forecast`,
    forecastImpact: project.variance,
    health: project.healthLabel,
    healthTone: project.tone,
    lastUpdate: "Aggiornato da registro progetti",
    location: project.location,
    lot: project.lot,
    manager: project.manager,
    materialRisk: project.materialRisk,
    name: project.title,
    nextMilestone: project.nextMilestone,
    progress: Number(financials.progress.toFixed(1)),
    sal: {
      amount: financials.currentSalAmount,
      current: currentSalLabel,
    },
    startDate: "Dossier operativo",
  };
}

function buildMilestoneRows(project: PortfolioProject, salCount: number) {
  const completed = Math.max(1, Math.min(3, Math.floor(project.progress / 30)));
  const labels = ["Avvio lotto", project.phase, project.nextMilestone, "Chiusura contabilita"];

  return labels.map((label, index) => ({
    date:
      index === 0
        ? "Completata"
        : index === completed && salCount > 0
          ? formatDueWindow(project.salDays)
          : formatForecastDelta(project.forecastDeltaDays),
    label,
    status: index < completed ? "complete" : index === completed ? "active" : "planned",
  }));
}

function buildProjectTeam(project: PortfolioProject) {
  return [
    { initials: getInitials(project.manager), name: project.manager, role: "Project Manager" },
    { initials: "DL", name: "Direzione Lavori", role: "Validazione SAL" },
    { initials: "CC", name: "Controllo Costi", role: "Forecast e budget" },
    { initials: "PR", name: "Procurement", role: project.materialRisk },
  ];
}

function buildRecentActivities(
  project: PortfolioProject,
  salRows: Array<{ date: string; sal: string; status: string }>,
) {
  const latestSal = salRows[0];
  return [
    {
      date: latestSal?.date ?? "N/A",
      text: `${latestSal?.sal ?? "Nessuna SAL"} su ${project.title}`,
    },
    { date: formatDueWindow(project.salDays), text: project.nextMilestone },
    { date: "Ultimo aggiornamento", text: project.materialRisk },
    { date: "Registro", text: `Avanzamento fisico al ${project.progress}%` },
  ];
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
