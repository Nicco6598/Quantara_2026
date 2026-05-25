import { m } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Layers3,
  Plus,
  Radio,
  ReceiptText,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { SalHistoryBars, SpendingTrend } from "@/components/shared/charts";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { MultiSelectBulkDeleteBar } from "@/components/shared/MultiSelectBulkDeleteBar";
import { MultiSelectToggle } from "@/components/shared/MultiSelectControls";
import { Panel } from "@/components/shared/Panel";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { SortIndicator } from "@/components/shared/SortIndicator";
import { StatusPill } from "@/components/shared/StatusPill";
import { useToast } from "@/components/shared/ToastProvider";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";

import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { useMultiSelectDelete } from "@/hooks/use-multi-select-delete";
import { useTableSort } from "@/hooks/use-table-sort";
import { useNavigate } from "@/hooks/useNavigate";
import {
  listDesktopContracts,
  listDesktopTariffBooks,
  restoreMaterialsFromSalUsage,
  updateDesktopContract,
} from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import {
  deleteSalDocument,
  listDesktopSalDocuments,
  listDesktopSalProjects,
  migrateSalLocalStorageToBackend,
  saveSalDocument,
} from "@/lib/sal-data";
import { readStringRecord } from "@/lib/shared-utils";
import { dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";
import { MOTION_VARIANTS } from "@/motion";
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from "@/persistence/storage-keys";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { useUndoStore } from "@/store/undo-store";
import { DetailList, DetailRow } from "@/components/shared/DetailList";

import {
  DeleteConfirmDialog,
  InfoBlock,
  MilestoneItem,
  PerformanceIndexBar,
  SalCard,
  TariffPanelDialog,
} from "./components/ProjectDetailPanels";
import { ProjectTimeline } from "./components/ProjectTimeline";
import {
  buildMilestoneRows,
  buildProjectDetail,
  buildProjectTeam,
  buildRecentActivities,
} from "./domain/project-detail-model";
import { projectReducer, readSelectedProjectId } from "./state/project-detail-state";

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

        const projectContractors = readStringRecord(STORAGE_KEYS.projectContractors);
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

  // Load SALs from backend (SQLite in Tauri, localStorage fallback in browser)
  useEffect(() => {
    let active = true;
    const pid = selectedProject?.id;
    if (!pid) return;

    // Migrazione one-time: sposta vecchi dati localStorage → SQLite
    migrateSalLocalStorageToBackend().then(() => {
      if (!active) return;
      Promise.all([listDesktopSalDocuments(pid), listDesktopSalProjects()])
        .then(([docsResult, projsResult]) => {
          if (!active) return;
          useSalWorkflowStore.getState().initializeFromBackend(
            docsResult.data,
            projsResult.data.filter((p) => p.id === pid),
            [],
          );
        })
        .catch(() => {
          /* silent */
        });
    });

    return () => {
      active = false;
    };
  }, [selectedProject?.id]);

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
    const views: Array<{
      id: string;
      total: number;
      status: string;
      title: string;
      date: string;
      closedAt: string | undefined;
      description: string;
      lineCount: number;
    }> = [];
    for (const doc of salDocuments) {
      if (doc.projectId !== selectedProject.id) continue;
      if (doc.totalCents != null && doc.lineCount != null) {
        views.push({
          id: doc.id,
          total: doc.totalCents / 100,
          lineCount: doc.lineCount,
          status: doc.status,
          title: doc.title,
          date: doc.date,
          closedAt: doc.closedAt,
          description: doc.description,
        });
      } else {
        const view = buildSalDocumentView(doc, tariffVoices);
        views.push({
          id: doc.id,
          total: view.total,
          lineCount: view.lines.length,
          status: doc.status,
          title: doc.title,
          date: doc.date,
          closedAt: doc.closedAt,
          description: doc.description,
        });
      }
    }
    views.sort((left, right) => {
      const leftDate = left.closedAt ?? left.date;
      const rightDate = right.closedAt ?? right.date;
      return rightDate.localeCompare(leftDate);
    });
    return views;
  }, [salDocuments, selectedProject, tariffVoices]);

  const salChartViews = useMemo(
    () => salViews.map(({ closedAt: _closedAt, ...view }) => view),
    [salViews],
  );

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

  const salRows = useMemo(() => {
    const total = salViews.length;
    return salViews.map((row, index) => {
      const progressiveNumber = total - index;
      return {
        amount: row.total,
        cardStatus: row.status,
        date: row.date,
        id: row.id,
        incidence:
          financials.contractual > 0 ? Math.round((row.total / financials.contractual) * 100) : 0,
        isClosed: row.status === "closed",
        isApproved: row.status === "approved",
        isDraft: row.status === "draft",
        isReview: row.status === "in-review",
        lineCount: row.lineCount,
        period: row.description || row.title,
        progressiveNumber,
        sal: row.title,
        progressiveLabel: total > 1 ? `SAL ${progressiveNumber}/${total}` : row.title,
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
      };
    });
  }, [financials.contractual, salViews]);

  const draftRows = useMemo(() => salRows.filter((r) => r.isDraft), [salRows]);

  const filteredSalRows = useMemo(
    () => salRows.filter((r) => filterSalStatus === "Tutti" || r.status === filterSalStatus),
    [salRows, filterSalStatus],
  );

  const sortableSalRows = useMemo(
    () =>
      filteredSalRows.map((r) => ({
        ...r,
        sortProgressive: r.progressiveNumber,
        sortTitle: r.sal,
        sortDate: r.date,
        sortAmount: r.amount,
        sortStatus: r.status,
      })),
    [filteredSalRows],
  );

  const {
    sortedItems: sortedSalRows,
    sortKey: salSortKey,
    sortDirection: salSortDirection,
    onSort: onSalSort,
  } = useTableSort(sortableSalRows);

  const salMultiSelect = useMultiSelectDelete(sortedSalRows);

  const detail = useMemo(
    () =>
      selectedProject
        ? buildProjectDetail(
            selectedProject,
            financials,
            salRows[0]?.progressiveLabel ?? "SAL da creare",
            salRows,
          )
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

  const handleBulkDelete = useCallback(async () => {
    const ids = [...salMultiSelect.selectedIds];
    const count = ids.length;
    const deletedSals = ids
      .map((id) => salDocuments.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);

    for (const id of ids) {
      const sal = salDocuments.find((d) => d.id === id);
      if (sal?.materialUsage) {
        void restoreMaterialsFromSalUsage(sal.materialUsage);
      }
      if (sal) useSalWorkflowStore.getState().deleteSal(sal.id);
      try {
        await deleteSalDocument(id);
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Eliminazione SAL non riuscita",
          tone: "danger",
        });
        return;
      }
    }
    dispatchDataChanged();

    const execute = async () => {
      for (const sal of deletedSals) {
        deleteSal(sal.id);
        try {
          await deleteSalDocument(sal.id);
        } catch {
          /* best-effort in undo execution */
        }
      }
      dispatchDataChanged();
    };
    const undo = async () => {
      for (const sal of deletedSals) {
        const salInput = {
          projectId: sal.projectId,
          date: sal.date,
          description: sal.description,
          notes: sal.notes,
          title: sal.title,
          lines: sal.lines,
          voices: [] as never[],
          status: sal.status,
          ...(sal.economicRules ? { economicRules: sal.economicRules } : {}),
          ...(sal.materialUsage ? { materialUsage: sal.materialUsage } : {}),
          ...(typeof sal.total === "number" ? { total: sal.total } : {}),
        };
        useSalWorkflowStore.getState().createSal(salInput);
        try {
          await saveSalDocument(sal.projectId, sal);
        } catch (error) {
          notify({
            message: error instanceof Error ? error.message : String(error),
            title: "Ripristino SAL non riuscito",
            tone: "danger",
          });
          return;
        }
        if (sal.materialUsage) {
          await restoreMaterialsFromSalUsage(sal.materialUsage);
        }
      }
      dispatchDataChanged();
    };

    useUndoStore.getState().push({
      label: `${count} SAL eliminat${count === 1 ? "a" : "e"}`,
      execute,
      undo,
    });
    notify({
      actionLabel: "Annulla",
      message: `${count} SAL eliminat${count === 1 ? "a" : "e"} con successo.`,
      onAction: async () => {
        await undo();
        notify({
          message: "Azione annullata",
          title: "Annullato",
          tone: "info",
        });
      },
      title: "Eliminate",
      tone: "success",
    });
    salMultiSelect.onDeleted();
  }, [deleteSal, notify, salDocuments, salMultiSelect]);

  const [isTariffPanelOpen, setIsTariffPanelOpen] = useState(false);
  const [isExpandedTariffs, setIsExpandedTariffs] = useState(false);
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
        SESSION_STORAGE_KEYS.selectedProjectDetail,
        JSON.stringify(selectedProject),
      );
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.salResumeDraft);
    } catch {
      // Continue with navigation even if session storage is unavailable.
    }
    navigate("sal-create");
  }

  const handleDeleteSal = useCallback(
    async (salId: string) => {
      const sal = salDocuments.find((d) => d.id === salId);
      if (sal?.materialUsage) {
        await restoreMaterialsFromSalUsage(sal.materialUsage);
      }
      deleteSal(salId);
      try {
        await deleteSalDocument(salId);
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Eliminazione SAL non riuscita",
          tone: "danger",
        });
        return;
      }
      dispatchDataChanged();
      setDeleteTargetId(null);
      notify({
        message: `"${sal?.title ?? salId}" eliminato dal registro locale.`,
        title: "SAL eliminata",
        tone: "success",
      });
    },
    [deleteSal, notify, salDocuments],
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
      dispatchDataChanged();
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
        <Panel padding="lg">
          <span className="font-semibold text-[var(--text-primary)]">Attenzione:</span> Progetto non
          trovato o dati non disponibili.
        </Panel>
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
      caption: salRows[0] ? `${salRows[0].progressiveLabel} del ${salRows[0].date}` : "Nessuna SAL",
      icon: Clock3,
      label: "Ultima SAL",
      tone: "warning" as const,
      value: salRows[0] ? formatMoney({ amount: salRows[0].amount, currency: "EUR" }) : "—",
      badge: salRows[0]?.status ?? "",
    },
  ];

  return (
    <ScreenLayout>
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
                animate={{ scaleX: detail.progress / 100 }}
                initial={MOTION_VARIANTS.progress.initial}
                style={{ originX: 0 }}
                transition={MOTION_VARIANTS.progress.transition}
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
                {salRows[0]?.progressiveLabel ?? "—"}
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

      {draftRows.length > 0 ? (
        <m.section
          className="mt-8"
          initial={MOTION_VARIANTS.card.initial}
          whileInView={MOTION_VARIANTS.card.whileInView}
          viewport={MOTION_VARIANTS.card.viewport}
          transition={MOTION_VARIANTS.card.transition}
        >
          <div className="mb-3 flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--warning-base)]">
            <FileText className="size-4" />
            Riprendi bozza
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {draftRows.slice(0, 4).map((row, index) => (
              <m.div
                key={row.id}
                className="rounded-xl bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] p-4 ring-1 ring-[var(--border-subtle)]/60"
                initial={MOTION_VARIANTS.row.initial}
                whileInView={MOTION_VARIANTS.row.whileInView}
                viewport={MOTION_VARIANTS.row.viewport}
                transition={{
                  ...MOTION_VARIANTS.row.transition,
                  delay: index * 0.035,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-13px font-semibold text-[var(--text-primary)]">
                    {row.sal}
                  </span>
                  <span className="shrink-0 text-12px font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatMoney({ amount: row.amount, currency: "EUR" })}
                  </span>
                </div>
                <div className="mt-1 text-11px text-[var(--text-tertiary)]">{row.date}</div>
                <Button
                  className="mt-3 w-full"
                  onClick={() => {
                    try {
                      window.sessionStorage.setItem(
                        SESSION_STORAGE_KEYS.selectedProjectDetail,
                        JSON.stringify(selectedProject),
                      );
                      window.sessionStorage.setItem(SESSION_STORAGE_KEYS.salResumeDraft, row.id);
                    } catch {
                      /* no-op */
                    }
                    navigate("sal-create");
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Continua
                </Button>
              </m.div>
            ))}
          </div>
          {draftRows.length > 4 && (
            <p className="mt-2 text-center text-11px text-[var(--text-tertiary)]">
              +{draftRows.length - 4} bozze nel registro completo qui sotto
            </p>
          )}
        </m.section>
      ) : null}

      {salViews.length > 0 ? (
        <m.section
          className="mt-8"
          initial={MOTION_VARIANTS.card.initial}
          whileInView={MOTION_VARIANTS.card.whileInView}
          viewport={MOTION_VARIANTS.card.viewport}
          transition={MOTION_VARIANTS.card.transition}
        >
          <div className="mb-4 flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--info-base)]">
            <TrendingUp className="size-4" />
            Andamento spesa
          </div>
          <SpendingTrend contractualAmount={financials.contractual} views={salChartViews} />
        </m.section>
      ) : null}

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
                <DetailList className="mt-3">
                  <DetailRow
                    label="Budget contrattuale"
                    value={formatMoney({ amount: detail.budget.contractual, currency: "EUR" })}
                  />
                  <DetailRow
                    label="Impegnato"
                    value={formatMoney({ amount: detail.budget.committed, currency: "EUR" })}
                  />
                  <DetailRow
                    label="Approvato"
                    value={formatMoney({ amount: detail.budget.approvedAmount, currency: "EUR" })}
                  />
                </DetailList>
              </div>

              <div className="grid rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] p-4 md:grid-cols-2">
                <div className="border-b border-[var(--border-subtle)]/70 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                  <div className="text-11px font-semibold uppercase tracking-uppercase text-[var(--text-secondary)]">
                    Forecast
                  </div>
                  <InfoBlock label="Fine prevista" value={detail.endDate} />
                  <PerformanceIndexBar label="CPI" value={detail.cpiValue} note={detail.cpiNote} />
                  <PerformanceIndexBar label="SPI" value={detail.spiValue} note={detail.spiNote} />
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
              <div className="flex items-center gap-2">
                <MultiSelectToggle
                  isEnabled={salMultiSelect.isEnabled}
                  onToggle={salMultiSelect.toggleEnable}
                  count={salMultiSelect.count}
                />
                <Button icon={Plus} onClick={handleCreateSal} size="sm" variant="secondary">
                  Nuova SAL
                </Button>
              </div>
            </div>

            {salMultiSelect.count > 0 && (
              <div className="mt-3">
                <MultiSelectBulkDeleteBar
                  allSelected={salMultiSelect.allSelected}
                  count={salMultiSelect.count}
                  entityLabel="SAL"
                  entityLabelSingular="SAL"
                  isDeleteConfirmOpen={salMultiSelect.isConfirmOpen}
                  onClear={salMultiSelect.clear}
                  onClose={salMultiSelect.disable}
                  onDeleteConfirm={handleBulkDelete}
                  onDeleteConfirmDismiss={salMultiSelect.dismissDelete}
                  onDeleteRequest={salMultiSelect.requestDelete}
                  onSelectAll={() => salMultiSelect.selectAll(sortedSalRows.map((r) => r.id))}
                  selectedItemNames={salMultiSelect.selectedItems.map((r) => r.sal)}
                  someSelected={salMultiSelect.someSelected}
                >
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3.5 text-12px font-bold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]"
                    onClick={() =>
                      notify({
                        message: "Esportazione in arrivo con un prossimo aggiornamento.",
                        title: "Esporta",
                        tone: "info",
                      })
                    }
                    type="button"
                  >
                    <Download className="size-4" />
                    Esporta
                  </button>
                </MultiSelectBulkDeleteBar>
              </div>
            )}

            <div className="mt-4 space-y-2">
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
              {salViews.length > 1 ? (
                <div className="pt-4">
                  <SalHistoryBars views={salChartViews} />
                </div>
              ) : null}
              {sortedSalRows.length > 0 ? (
                <>
                  <div className="mx-1 mb-2 hidden rounded-xl bg-[var(--bg-muted)]/40 px-4 py-2.5 md:grid md:grid-cols-[minmax(220px,1fr)_176px_120px_minmax(240px,max-content)] md:items-center md:gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                        SAL
                      </span>
                      <SortIndicator
                        active={salSortKey === "sortProgressive"}
                        direction={salSortKey === "sortProgressive" ? salSortDirection : null}
                        onClick={() => onSalSort("sortProgressive")}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                        Importo
                      </span>
                      <SortIndicator
                        active={salSortKey === "sortAmount"}
                        direction={salSortKey === "sortAmount" ? salSortDirection : null}
                        onClick={() => onSalSort("sortAmount")}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                        Data
                      </span>
                      <SortIndicator
                        active={salSortKey === "sortDate"}
                        direction={salSortKey === "sortDate" ? salSortDirection : null}
                        onClick={() => onSalSort("sortDate")}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                        Stato
                      </span>
                      <SortIndicator
                        active={salSortKey === "sortStatus"}
                        direction={salSortKey === "sortStatus" ? salSortDirection : null}
                        onClick={() => onSalSort("sortStatus")}
                      />
                    </div>
                  </div>
                  {sortedSalRows.map((row) => (
                    <SalCard
                      key={row.id}
                      cardStatus={row.cardStatus}
                      date={row.date}
                      incidence={row.incidence}
                      lineCount={row.lineCount}
                      isSelected={
                        salMultiSelect.isEnabled && salMultiSelect.selectedIds.has(row.id)
                      }
                      {...(salMultiSelect.isEnabled
                        ? { onSelect: () => salMultiSelect.toggle(row.id) }
                        : {})}
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
                                  SESSION_STORAGE_KEYS.selectedProjectDetail,
                                  JSON.stringify(selectedProject),
                                );
                                window.sessionStorage.setItem(
                                  SESSION_STORAGE_KEYS.salResumeDraft,
                                  row.id,
                                );
                              } catch {
                                /* no-op */
                              }
                              navigate("sal-create");
                            }
                          : undefined
                      }
                      onDelete={() => setDeleteTargetId(row.id)}
                      period={row.period}
                      progressiveLabel={row.progressiveLabel}
                      sal={row.sal}
                      status={row.status}
                      tone={row.tone}
                      value={formatMoney({ amount: row.amount, currency: "EUR" })}
                    />
                  ))}
                </>
              ) : null}
              {sortedSalRows.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nessuna SAL registrata per questo progetto."
                  description="Le SAL compariranno qui dopo la prima registrazione."
                  className="rounded-xl"
                />
              ) : null}
            </div>
          </Panel>
        </div>

        <aside className="min-w-0 space-y-4">
          <ProjectTimeline project={selectedProject} salDocuments={salDocuments} />
          <Panel icon={Radio} title="Presidio rapido">
            <DetailList>
              <DetailRow label="Inizio" value={detail.startDate} />
              <DetailRow label="Fine prevista" value={detail.endDate} />
              <DetailRow label="Ultimo aggiornamento" value={detail.lastUpdate} />
              <DetailRow label="SAL" value={String(detail.sal.current)} />
              <DetailRow label="Responsabile" value={detail.manager} />
              <DetailRow label="Prossima milestone" value={detail.nextMilestone} />
              <DetailRow label="Rischio materiale" value={detail.materialRisk} />
              <DetailRow
                label="Residuo budget"
                value={formatMoney({ amount: financials.residual, currency: "EUR" })}
              />
            </DetailList>
          </Panel>

          <Panel
            icon={FileText}
            title="Tariffari associati"
            action={
              projectTariffBookIds.length > 0 ? (
                <span className="rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-11px font-semibold text-[var(--info-base)]">
                  {projectTariffBookIds.length}
                </span>
              ) : undefined
            }
          >
            <div className="space-y-2">
              {projectTariffBookIds.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nessun tariffario"
                  description="Collega i tariffari al progetto per usarli in SAL."
                  action={{
                    label: "Aggiungi",
                    onClick: () => {
                      setPendingTariffIds([...projectTariffBookIds]);
                      setIsTariffPanelOpen(true);
                    },
                  }}
                />
              ) : (
                <div className="space-y-1.5">
                  {(isExpandedTariffs
                    ? projectTariffBookIds
                    : projectTariffBookIds.slice(0, 5)
                  ).map((bookId, index) => {
                    const book = tariffBooks.find((b) => b.id === bookId);
                    if (!book) return null;
                    return (
                      <m.div
                        key={bookId}
                        animate={MOTION_VARIANTS.row.whileInView}
                        initial={MOTION_VARIANTS.row.initial}
                        transition={{
                          ...MOTION_VARIANTS.row.transition,
                          delay: index * 0.035,
                        }}
                        className="group flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]/50 transition-colors hover:bg-[var(--bg-muted)]/50"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info-base)]">
                          <FileText className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-12px font-semibold text-[var(--text-primary)]">
                            {book.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-11px text-[var(--text-tertiary)]">
                            <span>{book.sourceName}</span>
                            <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                            <span>{book.year}</span>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                  {projectTariffBookIds.length > 5 && (
                    <m.button
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--bg-muted)]/40 px-3 py-2.5 text-12px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/50 transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => setIsExpandedTariffs((v) => !v)}
                      type="button"
                    >
                      {isExpandedTariffs
                        ? "Mostra meno"
                        : `Mostra tutti i ${projectTariffBookIds.length} tariffari`}
                    </m.button>
                  )}
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
            onClearAll={() => setPendingTariffIds([])}
            onClose={() => setIsTariffPanelOpen(false)}
            onConfirm={() => void handleSaveTariffBooks(pendingTariffIds)}
            onSelectAll={() => setPendingTariffIds(filteredTariffBooks.map((b) => b.id))}
            onToggleTariffBook={(bookId) =>
              setPendingTariffIds((prev) =>
                prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId],
              )
            }
            pendingTariffIds={pendingTariffIds}
            searchQuery={tariffSearchQuery}
            onSearchQueryChange={setTariffSearchQuery}
            tariffBooks={tariffBooks}
          />

          <Panel icon={UsersRound} title="Team progetto">
            <div className="space-y-2.5">
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

          <Panel icon={Activity} title="Attivita recenti">
            <div className="space-y-3">
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
              <Button className="mt-1 w-full justify-between px-3" variant="secondary">
                Vedi tutte le attivita
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </Panel>
        </aside>
      </section>

      <DeleteConfirmDialog
        deleteTargetId={deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteSal}
      />
    </ScreenLayout>
  );
}
