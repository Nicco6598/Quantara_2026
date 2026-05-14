import { AnimatePresence, m } from "framer-motion";
import {
  Activity,
  Check,
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
  Search,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ContextToolbar } from "@/components/shared/ContextToolbar";
import { DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { MOTION_VARIANTS } from "@/components/shared/easings";

import { useToast } from "@/components/shared/ToastProvider";
import { StatusPill } from "@/components/shared/StatusPill";

import { BezelSurface, ProjectControlButton } from "@/components/shared/ui-primitives";

import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import type { PortfolioProject } from "@/features/projects/types";

import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { useNavigate } from "@/hooks/useNavigate";
import {
  type DesktopContract,
  type DesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  updateDesktopContract,
} from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import { readStringRecord } from "@/lib/shared-utils";

import { cn } from "@/lib/utils";

import { useSalWorkflowStore } from "@/store/sal-workflow-store";

import { useSelectionStore } from "@/store/selection-store";

import { ProjectTimeline } from "./components/ProjectTimeline";
import {
  buildMilestoneRows,
  buildProjectDetail,
  buildProjectTeam,
  buildRecentActivities,
} from "./domain/project-detail-model";
type ProjectState = {
  contracts: DesktopContract[];
  tariffBooks: DesktopTariffBook[];
  projects: PortfolioProject[];
};

type ProjectAction =
  | {
      type: "INIT";
      contracts: DesktopContract[];
      tariffBooks: DesktopTariffBook[];
      projects: PortfolioProject[];
    }
  | { type: "UPDATE_CONTRACT"; contract: DesktopContract };

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "INIT":
      return {
        contracts: action.contracts,
        tariffBooks: action.tariffBooks,
        projects: action.projects,
      };
    case "UPDATE_CONTRACT":
      return {
        ...state,
        contracts: state.contracts.map((c) => (c.id === action.contract.id ? action.contract : c)),
      };
    default:
      return state;
  }
}

export function ProjectDetailScreen() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(projectReducer, {
    contracts: [],
    tariffBooks: [],
    projects: [],
  });
  const { contracts, tariffBooks, projects } = state;
  const isLoadingRef = useRef(true);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);

  useEffect(() => {
    let active = true;

    Promise.all([listDesktopContracts([]), listDesktopTariffBooks([])])
      .then(([contractsResult, tariffBooksResult]) => {
        if (!active) {
          return;
        }

        const projectContractors = readStringRecord("quantara.projectContractors.v1");
        dispatch({
          type: "INIT",
          contracts: contractsResult.data,
          tariffBooks: tariffBooksResult.data,
          projects: contractsResult.data.map((contract) =>
            mapContractToProject(contract, projectContractors[contract.id]),
          ),
        });
        isLoadingRef.current = false;
      })
      .catch(() => {
        if (!active) return;
        notify({
          message: "Impossibile caricare i dettagli del progetto.",
          title: "Caricamento fallito",
          tone: "danger",
        });
        isLoadingRef.current = false;
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
  const salDocumentById = useMemo(
    () => new Map(salDocuments.map((document) => [document.id, document])),
    [salDocuments],
  );

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedProject?.id) ?? null,
    [contracts, selectedProject?.id],
  );

  const projectTariffBookIds = useMemo(
    () => selectedContract?.tariffPriorities.map((p) => p.tariffBookId) ?? [],
    [selectedContract],
  );

  const salViews = useMemo(() => {
    if (!selectedProject) {
      return [];
    }
    const views: ReturnType<typeof buildSalDocumentView>[] = [];
    for (const document of salDocuments) {
      if (document.projectId === selectedProject.id) {
        views.push(buildSalDocumentView(document, tariffVoices));
      }
    }
    views.sort((left, right) => {
      const leftDate = left.closedAt ?? left.date;
      const rightDate = right.closedAt ?? right.date;
      return rightDate.localeCompare(leftDate);
    });
    return views;
  }, [salDocuments, selectedProject, tariffVoices]);

  const financials = useMemo(() => {
    const contractual = selectedProject?.budget.amount ?? 0;
    let approvedAmount = 0;
    let draftAmount = 0;

    for (const row of salViews) {
      if (row.status === "closed" || row.status === "approved") {
        approvedAmount += row.total;
      } else if (row.status === "draft" || row.status === "in-review") {
        draftAmount += row.total;
      }
    }

    const committed = approvedAmount + draftAmount;
    const residual = contractual - committed;
    const progress = contractual > 0 ? Math.min(100, (committed / contractual) * 100) : 0;
    const currentSalAmount = salViews[0]?.total ?? 0;

    return {
      approvedAmount,
      committed,
      contractual,
      currentSalAmount,
      draftAmount,
      progress,
      residual,
    };
  }, [salViews, selectedProject]);

  const [filterSalStatus, setFilterSalStatus] = useState<string>("Tutti");

  const salRows = useMemo(
    () =>
      salViews.map((row) => ({
        amount: row.total,
        cardStatus: row.status,
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
  const [isTariffPanelOpen, setIsTariffPanelOpen] = useState(false);
  const [pendingTariffIds, setPendingTariffIds] = useState<string[]>([]);
  const [tariffSearchQuery, setTariffSearchQuery] = useState("");

  const filteredTariffBooks = useMemo(() => {
    const q = tariffSearchQuery.trim().toLowerCase();
    if (!q) return tariffBooks;
    return tariffBooks.filter(
      (book) =>
        book.name.toLowerCase().includes(q) ||
        book.sourceName.toLowerCase().includes(q) ||
        String(book.year).includes(q),
    );
  }, [tariffBooks, tariffSearchQuery]);

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
      const sal = salDocumentById.get(salId);
      deleteSal(salId);
      setDeleteTargetId(null);
      notify({
        message: `"${sal?.title ?? salId}" eliminato dal registro locale.`,
        title: "SAL eliminata",
        tone: "success",
      });
    },
    [deleteSal, notify, salDocumentById],
  );

  const handleSaveTariffBooks = useCallback(
    async (tariffBookIds: string[]) => {
      if (!selectedContract) return;
      try {
        const tariffPriorities = tariffBookIds.map((bookId, index) => ({
          priority: (index + 1) * 10,
          reason: "Tariffario associato al progetto",
          tariffBookId: bookId,
        }));
        const updated = await updateDesktopContract(selectedContract.id, {
          applicationContractCode: selectedContract.applicationContractCode,
          contractorName: selectedContract.contractorName ?? null,
          contractualAmount: selectedContract.contractualAmount.amount,
          frameworkAgreementCode: selectedContract.frameworkAgreementCode,
          id: selectedContract.id,
          tenderDiscountPercent: selectedContract.tenderDiscountPercent,
          tariffPriorities,
          title: selectedContract.title,
          osExcludedAmount: selectedContract.osExcludedAmount ?? null,
        });
        dispatch({ type: "UPDATE_CONTRACT", contract: updated });
        notify({
          message: "Tariffari del progetto aggiornati.",
          title: "Tariffari aggiornati",
          tone: "success",
        });
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Errore salvataggio",
          tone: "danger",
        });
      }
    },
    [selectedContract, notify],
  );

  const handleSetSalStatus = useCallback(
    (salId: string, status: "in-review" | "approved" | "closed") => {
      const sal = salDocumentById.get(salId);
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
    [setSalStatus, notify, salDocumentById],
  );

  if (isLoadingRef.current) {
    return (
      <div className="pt-4 text-sm font-medium text-[var(--text-secondary)]">
        Caricamento progetto…
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

  const residualPct =
    financials.contractual > 0
      ? Math.round((financials.residual / financials.contractual) * 100)
      : 0;

  const kpiCards = [
    {
      caption: "Contratto di appalto",
      icon: WalletCards,
      label: "Budget",
      tone: "blue" as const,
      value: formatMoney({ amount: financials.contractual, currency: "EUR" }),
      badge: `${detail.progress}% utilizzato`,
    },
    {
      caption: financials.residual >= 0 ? `Ancora ${residualPct}% del budget` : "Budget superato",
      icon: TrendingUp,
      label: "Residuo",
      tone: (financials.residual >= 0 ? "success" : "danger") as "success" | "danger",
      value: formatMoney({ amount: Math.abs(financials.residual), currency: "EUR" }),
    },
    {
      caption:
        financials.approvedAmount > 0
          ? `${formatMoney({ amount: financials.approvedAmount, currency: "EUR" })} approvati`
          : "Nessuna SAL approvata",
      icon: Layers3,
      label: "Approvato",
      tone: "success" as const,
      value: `${salRows.filter((r) => r.isClosed || r.isApproved).length} SAL`,
      badge:
        financials.approvedAmount > 0
          ? `${Math.round((financials.approvedAmount / financials.contractual) * 100)}% budget`
          : "",
    },
    {
      caption: salRows[0] ? `${salRows[0].sal} del ${salRows[0].date}` : "Nessuna SAL",
      icon: Clock3,
      label: "Ultima SAL",
      tone: "warning" as const,
      value: salRows[0] ? formatMoney({ amount: salRows[0].amount, currency: "EUR" }) : "—",
      badge: salRows[0]?.status ?? "",
    },
  ];

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--accent-primary)_15%,transparent),transparent_32%)]" />

      <section className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-10px font-semibold uppercase tracking-uppercase-wide text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Dossier {detail.lot}
          </span>
          <h2 className="mt-5 max-w-4xl text-38px font-semibold leading-tight text-[var(--text-primary)] md:text-56px">
            {detail.name}
          </h2>
          <p className="mt-4 max-w-2xl text-15px leading-6 text-[var(--text-secondary)]">
            {detail.lot} &middot; {detail.location}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <StatusPill tone={detail.healthTone}>{detail.health}</StatusPill>
            <StatusPill tone="info">{String(detail.sal.current)}</StatusPill>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-4 ring-1 ring-[var(--border-subtle)]/60">
            <div className="flex items-center justify-between">
              <span className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                Avanzamento finanziario
              </span>
              <span className="text-22px font-semibold tabular-nums text-[var(--text-primary)]">
                {detail.progress}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
              <m.div
                className="h-full rounded-full bg-[var(--accent-primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${detail.progress}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-11px">
              <div>
                <span className="text-[var(--text-tertiary)]">Budget</span>
                <span className="ml-1.5 font-semibold text-[var(--text-primary)]">
                  {formatMoney({ amount: financials.contractual, currency: "EUR" })}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Residuo</span>
                <span
                  className={cn(
                    "ml-1.5 font-semibold",
                    financials.residual >= 0
                      ? "text-[var(--success-base)]"
                      : "text-[var(--danger-base)]",
                  )}
                >
                  {formatMoney({ amount: Math.abs(financials.residual), currency: "EUR" })}
                </span>
              </div>
              <div className="col-span-2 mt-1 grid grid-cols-2 gap-4 rounded-lg bg-[var(--bg-muted)]/40 px-3 py-2">
                <div>
                  <span className="text-[var(--success-base)]">●</span>
                  <span className="ml-1 text-[var(--text-tertiary)]">Approvato</span>
                  <span className="ml-1.5 font-semibold text-[var(--text-primary)]">
                    {formatMoney({ amount: financials.approvedAmount, currency: "EUR" })}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--warning-base)]">●</span>
                  <span className="ml-1 text-[var(--text-tertiary)]">In bozza</span>
                  <span className="ml-1.5 font-semibold text-[var(--text-primary)]">
                    {formatMoney({ amount: financials.draftAmount, currency: "EUR" })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-3 ring-1 ring-[var(--border-subtle)]/60">
              <span className="text-10px font-medium text-[var(--text-tertiary)]">Ultima SAL</span>
              <div className="mt-1 truncate text-13px font-semibold text-[var(--text-primary)]">
                {salRows[0]?.sal ?? "—"}
              </div>
              <div className="mt-0.5 text-11px text-[var(--text-tertiary)]">
                {salRows[0]?.date ?? "Nessuna SAL"}
              </div>
            </div>
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-3 ring-1 ring-[var(--border-subtle)]/60">
              <span className="text-10px font-medium text-[var(--text-tertiary)]">
                Responsabile
              </span>
              <div className="mt-1 truncate text-13px font-semibold text-[var(--text-primary)]">
                {detail.manager}
              </div>
              <div className="mt-0.5 text-11px text-[var(--text-tertiary)]">{detail.startDate}</div>
            </div>
          </div>
        </div>
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
                    label="Approvato"
                    value={formatMoney({ amount: detail.budget.approvedAmount, currency: "EUR" })}
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
                  cardStatus={row.cardStatus}
                  date={row.date}
                  id={row.id}
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
            <div className="flex items-center justify-between">
              <PanelTitle icon={FileText}>Tariffari associati</PanelTitle>
              {projectTariffBookIds.length > 0 ? (
                <span className="rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-11px font-semibold text-[var(--info-base)]">
                  {projectTariffBookIds.length}
                </span>
              ) : null}
            </div>
            <div className="mt-4 space-y-2">
              {projectTariffBookIds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/30 px-4 py-5 text-center">
                  <FileText className="mx-auto size-6 text-[var(--text-tertiary)]" />
                  <p className="mt-2 text-12px font-medium text-[var(--text-secondary)]">
                    Nessun tariffario
                  </p>
                  <p className="mt-0.5 text-11px text-[var(--text-tertiary)]">
                    Collega i tariffari al progetto per usarli in SAL.
                  </p>
                  <button
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--info-soft)] px-3 py-1.5 text-11px font-semibold text-[var(--info-base)] transition-colors hover:bg-[var(--info-soft)]/80"
                    onClick={() => {
                      setPendingTariffIds([...projectTariffBookIds]);
                      setIsTariffPanelOpen(true);
                    }}
                    type="button"
                  >
                    <Plus className="size-3.5" />
                    Aggiungi
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {projectTariffBookIds.map((bookId, index) => {
                    const book = tariffBooks.find((b) => b.id === bookId);
                    if (!book) return null;
                    return (
                      <m.div
                        key={bookId}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: index * 0.04,
                          duration: 0.25,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]/50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-12px font-semibold text-[var(--text-primary)]">
                            {book.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-11px text-[var(--text-tertiary)]">
                            <span>{book.year}</span>
                            <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                            <span
                              className={
                                book.status === "active"
                                  ? "text-[var(--success-base)]"
                                  : "text-[var(--warning-base)]"
                              }
                            >
                              {book.status === "active"
                                ? "Attivo"
                                : book.status === "draft"
                                  ? "Bozza"
                                  : book.status}
                            </span>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                </div>
              )}
              {projectTariffBookIds.length > 0 ? (
                <m.button
                  className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--info-base)_8%,transparent)] px-3 py-2 text-11px font-semibold text-[var(--info-base)] ring-1 ring-[var(--info-base)]/20 transition-colors hover:bg-[color-mix(in_srgb,var(--info-base)_16%,transparent)]"
                  onClick={() => {
                    setPendingTariffIds([...projectTariffBookIds]);
                    setIsTariffPanelOpen(true);
                  }}
                  type="button"
                >
                  <Plus className="size-3.5" />
                  Gestisci
                </m.button>
              ) : null}
            </div>
          </Panel>

          <TariffPanelDialog
            filteredTariffBooks={filteredTariffBooks}
            isOpen={isTariffPanelOpen}
            onClose={() => setIsTariffPanelOpen(false)}
            onSave={handleSaveTariffBooks}
            pendingTariffIds={pendingTariffIds}
            onPendingTariffIdsChange={setPendingTariffIds}
            searchQuery={tariffSearchQuery}
            onSearchQueryChange={setTariffSearchQuery}
            tariffBooks={tariffBooks}
          />

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

      <DeleteConfirmDialog
        deleteTargetId={deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteSal}
      />
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
  badge,
  caption,
  icon: Icon,
  label,
  tone,
  value,
}: {
  badge?: string;
  caption: string;
  icon: typeof WalletCards;
  label: string;
  tone: "blue" | "info" | "success" | "warning" | "danger";
  value: string;
}) {
  return (
    <BezelSurface
      innerClassName={cn(
        "group flex min-h-[104px] items-center gap-4 p-4 2xl:min-h-[120px]",
        tone === "blue" ? "bg-[var(--info-soft)]/20" : "",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          (!tone || tone === "blue" || tone === "info") &&
            "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-1.5 truncate text-19px font-semibold leading-none",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--text-primary)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-11px font-medium text-[var(--text-tertiary)]">{caption}</span>
          {badge ? (
            <span className="rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {badge}
            </span>
          ) : null}
        </div>
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
  cardStatus,
  date,
  id,
  onClose,
  onContinue,
  onDelete,
  period,
  sal,
  status,
  tone,
  value,
}: {
  cardStatus: string;
  date: string;
  id: string;
  onClose: () => void;
  onContinue?: (() => void) | undefined;
  onDelete: () => void;
  period: string;
  sal: string;
  status: string;
  tone: "danger" | "info" | "success" | "warning";
  value: string;
}) {
  const isDraft = cardStatus === "draft";
  const isReview = cardStatus === "in-review";
  const isApproved = cardStatus === "approved";
  const isClosed = cardStatus === "closed";
  const isSelected = useSelectionStore((state) => state.ids.has(id));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLDivElement>(null);

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
        <m.button
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
        </m.button>

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

        <div ref={menuBtnRef}>
          <ProjectControlButton
            aria-label="Azioni SAL"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            variant="icon"
          >
            <MoreVertical className="size-4" />
          </ProjectControlButton>
          <DropdownMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            triggerRef={menuBtnRef}
          >
            {isDraft ? (
              <DropdownItem
                icon={Play}
                label="Continua bozza"
                onClick={() => {
                  setMenuOpen(false);
                  onContinue?.();
                }}
              />
            ) : null}
            {isDraft || isReview ? (
              <DropdownItem
                icon={ThumbsUp}
                label={isDraft ? "Invia in revisione" : "Approva"}
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                }}
              />
            ) : null}
            <DropdownItem
              icon={Trash2}
              label="Elimina"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              tone="danger"
            />
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function TariffPanelDialog({
  filteredTariffBooks,
  isOpen,
  onClose,
  onSave,
  pendingTariffIds,
  onPendingTariffIdsChange,
  searchQuery,
  onSearchQueryChange,
  tariffBooks,
}: {
  filteredTariffBooks: DesktopTariffBook[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
  pendingTariffIds: string[];
  onPendingTariffIdsChange: Dispatch<SetStateAction<string[]>>;
  searchQuery: string;
  onSearchQueryChange: Dispatch<SetStateAction<string>>;
  tariffBooks: DesktopTariffBook[];
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <m.div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            aria-label="Chiudi"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
            type="button"
          />
          <m.div
            className="relative w-full max-w-lg rounded-3xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
            initial={MOTION_VARIANTS.dialog.initial}
            animate={MOTION_VARIANTS.dialog.animate}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={MOTION_VARIANTS.dialog.transition}
          >
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
                <div>
                  <h3 className="text-16px font-semibold text-[var(--text-primary)]">
                    Tariffari del progetto
                  </h3>
                  <p className="mt-0.5 text-12px text-[var(--text-secondary)]">
                    {pendingTariffIds.length} selezionat
                    {pendingTariffIds.length !== 1 ? "i" : "o"} · {tariffBooks.length} disponibili
                  </p>
                </div>
                <button
                  aria-label="Chiudi"
                  className="flex size-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
                  onClick={onClose}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="px-5 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    className="h-10 w-full rounded-xl border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 pl-10 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="Cerca per nome, ente o anno…"
                    value={searchQuery}
                  />
                  {searchQuery ? (
                    <button
                      className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => onSearchQueryChange("")}
                      type="button"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto border-t border-[var(--border-subtle)]/50 px-5 py-2">
                {filteredTariffBooks.length === 0 ? (
                  <p className="py-6 text-center text-12px font-medium text-[var(--text-tertiary)]">
                    {searchQuery
                      ? "Nessun tariffario corrisponde alla ricerca."
                      : "Nessun tariffario disponibile."}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredTariffBooks.map((book, index) => {
                      const isSelected = pendingTariffIds.includes(book.id);
                      return (
                        <m.button
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                            isSelected
                              ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)]"
                              : "border-transparent bg-[var(--bg-muted)]/40 hover:border-[var(--border-subtle)]"
                          }`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: index * 0.025,
                            duration: 0.2,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          key={book.id}
                          onClick={() =>
                            onPendingTariffIdsChange((prev) =>
                              isSelected ? prev.filter((id) => id !== book.id) : [...prev, book.id],
                            )
                          }
                          type="button"
                        >
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                              isSelected
                                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                                : "border-[var(--border-subtle)]"
                            }`}
                          >
                            {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                              {book.name}
                            </div>
                            <div className="flex items-center gap-2 text-11px text-[var(--text-tertiary)]">
                              <span>Anno {book.year}</span>
                              <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                              <span>{book.sourceName}</span>
                              <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                              <span
                                className={
                                  book.status === "active"
                                    ? "text-[var(--success-base)]"
                                    : "text-[var(--warning-base)]"
                                }
                              >
                                {book.status === "active"
                                  ? "Attivo"
                                  : book.status === "draft"
                                    ? "Bozza"
                                    : book.status}
                              </span>
                            </div>
                          </div>
                        </m.button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)]/70 px-5 py-4">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--bg-muted)] px-5 text-13px font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
                  onClick={onClose}
                  type="button"
                >
                  Annulla
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-13px font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-primary)]/90"
                  onClick={() => {
                    void onSave(pendingTariffIds);
                    onClose();
                  }}
                  type="button"
                >
                  <Check className="size-4" />
                  Salva
                </button>
              </div>
            </div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function DeleteConfirmDialog({
  deleteTargetId,
  onClose,
  onConfirm,
}: {
  deleteTargetId: string | null;
  onClose: () => void;
  onConfirm: (salId: string) => void;
}) {
  return deleteTargetId ? (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <m.div
        className="relative w-full max-w-sm rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={MOTION_VARIANTS.dialog.initial}
        transition={MOTION_VARIANTS.dialog.transition}
        animate={MOTION_VARIANTS.dialog.animate}
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
              onClick={onClose}
              type="button"
            >
              Annulla
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--danger-base)] px-5 text-13px font-semibold text-white transition-colors hover:bg-[var(--danger-base)]/90"
              onClick={() => onConfirm(deleteTargetId)}
              type="button"
            >
              <Trash2 className="size-4" />
              Elimina
            </button>
          </div>
        </div>
      </m.div>
    </div>
  ) : null;
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
