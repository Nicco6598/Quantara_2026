import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  Coins,
  Download,
  FileBadge,
  ReceiptText,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClearFiltersButton,
  FilterDateInput,
  FilterSearch,
  FilterSelect,
  FilterTemplatePicker,
} from "@/components/filters";
import { Button } from "@/components/shared/Button";
import { MultiSelectBulkBar, MultiSelectToggle } from "@/components/shared/MultiSelectControls";
import { SavedViewSelector } from "@/components/shared/SavedViewSelector";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { SeverityBar, severityToneForPercentage } from "@/components/shared/SeverityBar";
import { SortIndicator } from "@/components/shared/SortIndicator";
import { StatusPill } from "@/components/shared/StatusPill";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import { useMultiSelect } from "@/hooks/use-multi-select";
import { useTableSort } from "@/hooks/use-table-sort";
import { listDesktopContracts, restoreMaterialsFromSalUsage } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import { saveSalDocument } from "@/lib/sal-data";
import { dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { useUndoStore } from "@/store/undo-store";

const STATUS_OPTIONS = ["Tutti", "Bozza", "In revisione", "Approvata", "Chiuso"] as const;

export function AccountingScreen() {
  const { notify } = useToast();
  const [contracts, setContracts] = useState<
    { id: string; budget: { amount: number }; title: string; contractor: string }[]
  >([]);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const projects = useSalWorkflowStore((state) => state.projects);

  const [filterProject, setFilterProject] = useState("all");
  const [filterContractor, setFilterContractor] = useState("Tutti");
  const [filterStatus, setFilterStatus] = useState<string>("Tutti");
  const [filterQuery, setFilterQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadContracts = useCallback(() => {
    let active = true;
    listDesktopContracts([]).then((result) => {
      if (!active) return;
      setContracts(
        result.data.map((c) => {
          const p = mapContractToProject(c);
          return {
            id: c.id,
            budget: c.contractualAmount,
            title: c.title,
            contractor: p.contractor,
          };
        }),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadContracts();
    return cleanup;
  }, [loadContracts]);

  useDataChangedListener(loadContracts);

  const salViews = useMemo(
    () => salDocuments.map((doc) => buildSalDocumentView(doc, tariffVoices)),
    [salDocuments, tariffVoices],
  );

  const projectMap = useMemo(() => {
    const m = new Map(projects.map((p) => [p.id, p.name]));
    for (const c of contracts) {
      if (!m.has(c.id)) m.set(c.id, c.title);
    }
    return m;
  }, [projects, contracts]);

  const projectContractorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      if (p.client) m.set(p.id, p.client);
    }
    for (const c of contracts) {
      if (!m.has(c.id) && c.contractor && c.contractor !== "Senza appaltatore") {
        m.set(c.id, c.contractor);
      }
    }
    return m;
  }, [projects, contracts]);

  const contractorOptions = useMemo(() => {
    const set = new Set(projectContractorMap.values());
    return ["Tutti", ...set].sort((a, b) =>
      a === "Tutti" ? -1 : b === "Tutti" ? 1 : a.localeCompare(b),
    );
  }, [projectContractorMap]);

  const projectOptions = useMemo(() => {
    const list = contracts.map((c) => ({ id: c.id, title: c.title, contractor: c.contractor }));
    return [{ id: "all", title: "Tutti i progetti", contractor: "" }, ...list];
  }, [contracts]);

  const filteredSalIds = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    return salDocuments
      .map((doc, idx) => ({ doc, view: salViews[idx] }))
      .filter(({ doc }) => {
        if (filterProject !== "all" && doc.projectId !== filterProject) return false;
        if (filterContractor !== "Tutti") {
          const contractor = projectContractorMap.get(doc.projectId);
          if (contractor !== filterContractor) return false;
        }
        if (filterStatus !== "Tutti") {
          const statusMap: Record<string, string> = {
            Bozza: "draft",
            "In revisione": "in-review",
            Approvata: "approved",
            Chiuso: "closed",
          };
          if (doc.status !== statusMap[filterStatus]) return false;
        }
        if (dateFrom && doc.date < dateFrom) return false;
        if (dateTo && doc.date > dateTo) return false;
        if (
          q &&
          !doc.title.toLowerCase().includes(q) &&
          !(projectMap.get(doc.projectId) ?? "").toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .map(({ doc }) => doc.id);
  }, [
    salDocuments,
    salViews,
    filterProject,
    filterContractor,
    filterStatus,
    dateFrom,
    dateTo,
    filterQuery,
    projectContractorMap,
    projectMap,
  ]);

  const filteredData = useMemo(() => {
    return salDocuments
      .map((doc, idx) => ({ doc, view: salViews[idx] }))
      .filter(({ doc }) => filteredSalIds.includes(doc.id))
      .sort((a, b) =>
        (b.view?.closedAt ?? b.doc.date).localeCompare(a.view?.closedAt ?? a.doc.date),
      );
  }, [salDocuments, salViews, filteredSalIds]);

  const sortableRows = useMemo(
    () =>
      filteredData.map(({ doc, view }) => ({
        id: doc.id,
        doc,
        view,
        sortTitle: doc.title,
        sortDate: doc.date,
        sortAmount: view?.total ?? 0,
        sortStatus: doc.status,
      })),
    [filteredData],
  );

  const { sortedItems: sortedRows, sortKey, sortDirection, onSort } = useTableSort(sortableRows);

  const multiSelect = useMultiSelect(sortedRows);

  const selection = useMemo(() => {
    const ids = multiSelect.selectedIds;
    if (ids.size === 0) return sortedRows.map((r) => ({ doc: r.doc, view: r.view }));
    return sortedRows
      .filter((r) => ids.has(r.doc.id))
      .map((r) => ({ doc: r.doc, view: r.view }));
  }, [sortedRows, multiSelect.selectedIds]);

  const metrics = useMemo(() => {
    const total = selection.reduce((s, { view }) => s + (view?.total ?? 0), 0);
    const budget = contracts.reduce((s, c) => s + c.budget.amount, 0);
    const draftCount = selection.filter(({ doc }) => doc.status === "draft").length;
    const closedCount = selection.filter(({ doc }) => doc.status === "closed").length;
    return { total, budget, draftCount, closedCount, count: selection.length };
  }, [selection, contracts]);

  const clearFilters = useCallback(() => {
    setFilterProject("all");
    setFilterContractor("Tutti");
    setFilterStatus("Tutti");
    setFilterQuery("");
    setDateFrom("");
    setDateTo("");
  }, []);

  const applyTemplateFilters = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.filterProject === "string") setFilterProject(filters.filterProject);
    if (typeof filters.filterContractor === "string") setFilterContractor(filters.filterContractor);
    if (typeof filters.filterStatus === "string") setFilterStatus(filters.filterStatus);
    if (typeof filters.filterQuery === "string") setFilterQuery(filters.filterQuery);
    if (typeof filters.dateFrom === "string") setDateFrom(filters.dateFrom);
    if (typeof filters.dateTo === "string") setDateTo(filters.dateTo);
  }, []);

  const hasActiveFilters =
    filterProject !== "all" ||
    filterContractor !== "Tutti" ||
    filterStatus !== "Tutti" ||
    filterQuery ||
    dateFrom ||
    dateTo;

  return (
    <ScreenLayout gradient="success-info">
      <section className="animate-entry">
        <ScreenHero
          badge="Contabilità"
          title="Report contabile"
          description="Seleziona i SAL da includere nel report, applica i filtri per periodo / appaltatore / progetto e genera il documento contabile."
          sidePanel={
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                    {multiSelect.count > 0
                      ? `${multiSelect.count} selezionati`
                      : `${selection.length} nel filtro`}
                  </div>
                  <div className="mt-2 text-28px font-semibold leading-none text-[var(--text-primary)]">
                    {formatMoney({ amount: metrics.total, currency: "EUR" })}
                  </div>
                </div>
                <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                  <Calculator className="size-6" />
                </span>
              </div>
              <p className="mt-5 text-12px font-medium leading-5 text-[var(--text-secondary)]">
                {metrics.closedCount} chiusi · {metrics.draftCount} bozze · su {contracts.length}{" "}
                contratti
              </p>
            </div>
          }
        />

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Appaltatore"
              onChange={(v) => {
                setFilterContractor(v);
                setFilterProject("all");
              }}
              options={[...contractorOptions]}
              value={filterContractor}
            />
            <FilterSelect
              label="Progetto"
              onChange={(v) => {
                setFilterProject(v);
                if (v !== "all") {
                  const c = contracts.find((cc) => cc.id === v);
                  if (c) setFilterContractor(c.contractor);
                }
              }}
              options={projectOptions.map((o) => o.id)}
              displayMap={new Map(projectOptions.map((o) => [o.id, o.title]))}
              value={filterProject}
            />
            <FilterSelect
              label="Stato"
              onChange={setFilterStatus}
              options={[...STATUS_OPTIONS]}
              value={filterStatus}
            />
            <FilterDateInput label="Da" onChange={setDateFrom} value={dateFrom} />
            <FilterDateInput label="A" onChange={setDateTo} value={dateTo} />
            <FilterSearch
              onChange={setFilterQuery}
              placeholder="Cerca SAL..."
              value={filterQuery}
            />
            {hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}
          </div>
          <div className="flex items-center gap-3 pl-2 before:block before:h-6 before:w-px before:bg-[var(--border-subtle)]">
            <SavedViewSelector
              currentFilters={{
                contractor: filterContractor,
                project: filterProject,
                status: filterStatus,
                dateFrom,
                dateTo,
                query: filterQuery,
              }}
              onApplyFilters={(filters) => {
                if (filters.contractor) setFilterContractor(filters.contractor);
                if (filters.project) setFilterProject(filters.project);
                if (filters.status) setFilterStatus(filters.status);
                if (filters.dateFrom) setDateFrom(filters.dateFrom);
                if (filters.dateTo) setDateTo(filters.dateTo);
                if (filters.query) setFilterQuery(filters.query);
              }}
              route="accounting"
            />
            <FilterTemplatePicker
              scope="accounting"
              currentFilters={{
                filterProject,
                filterContractor,
                filterStatus,
                filterQuery,
                dateFrom,
                dateTo,
              }}
              onApplyFilters={applyTemplateFilters}
            />
            <MultiSelectToggle
              isEnabled={multiSelect.isEnabled}
              onToggle={multiSelect.toggleEnable}
              count={multiSelect.count}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Panel className="p-0">
            <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0">
                <div className="flex items-center justify-between px-2 pt-2">
                  <div className="flex items-center gap-3">
                    <ReceiptText className="size-5 text-[var(--info-base)]" />
                    <h3 className="text-16px font-bold text-[var(--text-primary)] 2xl:text-18px">
                      SAL da includere
                    </h3>
                  </div>
                  {multiSelect.isEnabled && (
                    <button
                      className="text-12px font-semibold text-[var(--accent-primary)] hover:underline"
                      onClick={() => {
                        if (multiSelect.allSelected) {
                          multiSelect.clear();
                        } else {
                          multiSelect.selectAll(sortedRows.map((r) => r.doc.id));
                        }
                      }}
                      type="button"
                    >
                      {multiSelect.allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                    </button>
                  )}
                </div>

                {multiSelect.count > 0 && (
                  <div className="px-2 pt-3">
                    <MultiSelectBulkBar
                      count={multiSelect.count}
                      entityLabel="SAL"
                      allSelected={multiSelect.allSelected}
                      someSelected={multiSelect.someSelected}
                      onSelectAll={() => multiSelect.selectAll(sortedRows.map((r) => r.doc.id))}
                      onClear={multiSelect.clear}
                      onClose={multiSelect.disable}
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
                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3.5 text-12px font-bold text-[var(--danger-base)] ring-1 ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger-soft)_80%,var(--danger-base)_20%)]"
                        onClick={() => {
                          const ids = [...multiSelect.selectedIds];
                          const count = ids.length;
                          const deletedSals = ids
                            .map((id) =>
                              useSalWorkflowStore.getState().salDocuments.find((d) => d.id === id),
                            )
                            .filter((d): d is NonNullable<typeof d> => d !== undefined);

                          for (const id of ids) {
                            const doc = useSalWorkflowStore
                              .getState()
                              .salDocuments.find((d) => d.id === id);
                            if (doc?.materialUsage) {
                              void restoreMaterialsFromSalUsage(doc.materialUsage);
                            }
                            useSalWorkflowStore.getState().deleteSal(id);
                          }
                          dispatchDataChanged();

                          const execute = () => {
                            for (const doc of deletedSals) {
                              useSalWorkflowStore.getState().deleteSal(doc.id);
                            }
                            dispatchDataChanged();
                          };
                          const undo = async () => {
                            for (const doc of deletedSals) {
                              const salInput = {
                                projectId: doc.projectId,
                                date: doc.date,
                                description: doc.description,
                                notes: doc.notes,
                                title: doc.title,
                                lines: doc.lines,
                                voices: [] as never[],
                                status: doc.status,
                                ...(doc.economicRules ? { economicRules: doc.economicRules } : {}),
                                ...(doc.materialUsage ? { materialUsage: doc.materialUsage } : {}),
                                ...(typeof doc.total === "number" ? { total: doc.total } : {}),
                              };
                              useSalWorkflowStore.getState().createSal(salInput);
                              await saveSalDocument(doc.projectId, doc);
                              if (doc.materialUsage) {
                                await restoreMaterialsFromSalUsage(doc.materialUsage);
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
                          multiSelect.disable();
                        }}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                        Elimina
                      </button>
                    </MultiSelectBulkBar>
                  </div>
                )}

                {sortedRows.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-14px border-[0.5px] border-[var(--border-subtle)]">
                    <div className="grid grid-cols-[1fr_auto] border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/40 px-4 py-2.5 2xl:px-5">
                      <div className="flex items-center gap-2">
                        <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                          Titolo
                        </span>
                        <SortIndicator
                          active={sortKey === "sortTitle"}
                          direction={sortKey === "sortTitle" ? sortDirection : null}
                          onClick={() => onSort("sortTitle")}
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                            Data
                          </span>
                          <SortIndicator
                            active={sortKey === "sortDate"}
                            direction={sortKey === "sortDate" ? sortDirection : null}
                            onClick={() => onSort("sortDate")}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                            Importo
                          </span>
                          <SortIndicator
                            active={sortKey === "sortAmount"}
                            direction={sortKey === "sortAmount" ? sortDirection : null}
                            onClick={() => onSort("sortAmount")}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-11px font-semibold uppercase tracking-0_1em text-[var(--text-secondary)]">
                            Stato
                          </span>
                          <SortIndicator
                            active={sortKey === "sortStatus"}
                            direction={sortKey === "sortStatus" ? sortDirection : null}
                            onClick={() => onSort("sortStatus")}
                          />
                        </div>
                      </div>
                    </div>
                    {sortedRows.map(({ doc, view }) => {
                      if (!view) return null;
                      const selected = multiSelect.selectedIds.has(doc.id);

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between gap-4 border-b border-[var(--border-subtle)] p-4 text-left last:border-b-0 2xl:px-5 2xl:py-5",
                            multiSelect.isEnabled
                              ? selected
                                ? "bg-[var(--selection-bg)]"
                                : "transition-colors hover:bg-[var(--bg-muted)]"
                              : "transition-colors hover:bg-[var(--bg-muted)]",
                          )}
                          key={doc.id}
                          onClick={() => {
                            if (multiSelect.isEnabled) multiSelect.toggle(doc.id);
                          }}
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            {multiSelect.isEnabled && (
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                                  selected
                                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                                    : "border-[var(--border-subtle)]",
                                )}
                              >
                                {selected ? <CheckCircle2 className="size-3.5" /> : null}
                              </span>
                            )}
                            <div>
                              <div className="text-14px font-semibold text-[var(--text-primary)]">
                                {doc.title}
                              </div>
                              <div className="mt-0.5 text-12px text-[var(--text-secondary)]">
                                {projectMap.get(doc.projectId) ?? "Sconosciuto"} · {doc.date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <div className="text-14px font-bold text-[var(--text-primary)]">
                                {formatMoney({ amount: view.total, currency: "EUR" })}
                              </div>
                              <StatusPill
                                tone={
                                  doc.status === "closed" || doc.status === "approved"
                                    ? "success"
                                    : doc.status === "in-review"
                                      ? "info"
                                      : "warning"
                                }
                              >
                                {doc.status === "closed" || doc.status === "approved"
                                  ? "Approvata"
                                  : doc.status === "in-review"
                                    ? "In revisione"
                                    : "Bozza"}
                              </StatusPill>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-8 text-center text-14px text-[var(--text-secondary)]">
                    Nessun SAL corrisponde ai filtri attivi.
                  </div>
                )}
              </div>

              <div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-22px bg-[var(--info-soft)]/35 p-5 text-center 2xl:min-h-[420px] 2xl:p-7">
                <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                  {multiSelect.count > 0 ? "Totale selezionato" : "Nessuna selezione"}
                </div>
                <div className="mt-5 text-38px font-bold leading-none tracking-tight text-[var(--text-primary)] 2xl:mt-7 2xl:text-50px">
                  {formatMoney({ amount: metrics.total, currency: "EUR" })}
                </div>
                {multiSelect.count > 0 ? (
                  <>
                    <div className="mt-9 h-px w-64 max-w-full bg-[var(--border-subtle)]" />
                    <div className="mt-7 flex size-16 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                      <FileBadge className="size-8" />
                    </div>
                    <p className="mt-7 max-w-[260px] text-14px font-medium leading-6 text-[var(--text-secondary)]">
                      {multiSelect.count} SAL pront{multiSelect.count === 1 ? "o" : "i"} per il report contabile.
                    </p>
                    <Button
                      className="mt-5 h-12 w-full justify-between"
                      icon={Download}
                      onClick={() =>
                        notify({
                          message:
                            "Il generatore report contabile sara disponibile in un prossimo aggiornamento.",
                          title: "In arrivo",
                          tone: "info",
                        })
                      }
                      variant="primary"
                    >
                      Genera report contabile
                      <ChevronRight className="ml-auto size-4" />
                    </Button>
                  </>
                ) : (
                  <p className="mt-6 max-w-[260px] text-14px font-medium leading-6 text-[var(--text-secondary)]">
                    Seleziona i SAL da includere nel report per generare il documento contabile.
                  </p>
                )}
                <div className="pointer-events-none absolute -bottom-20 left-0 right-0 h-48 rounded-[50%] border-t border-[var(--info-base)]/10" />
                <div className="pointer-events-none absolute -bottom-28 left-8 right-8 h-56 rounded-[50%] border-t border-[var(--info-base)]/10" />
              </div>
            </div>
          </Panel>
        </div>

        <aside className="grid gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4">
          <Panel>
            <div className="flex items-center gap-3">
              <Coins className="size-5 text-[var(--info-base)]" />
              <h3 className="text-16px font-bold text-[var(--text-primary)]">
                Riepilogo selezione
              </h3>
            </div>

            <div className="mt-4 space-y-3">
              <SummaryRow label="SAL selezionati" value={String(selection.length)} />
              <SummaryRow label="di cui chiusi" value={String(metrics.closedCount)} />
              <SummaryRow label="di cui bozze" value={String(metrics.draftCount)} />
              <SummaryRow
                label="Importo totale"
                value={formatMoney({ amount: metrics.total, currency: "EUR" })}
              />
              <SummaryRow
                label="% budget totale"
                value={
                  metrics.budget > 0
                    ? `${Math.round((metrics.total / metrics.budget) * 100)}%`
                    : "—"
                }
              />
            </div>

            <div className="mt-5 grid gap-2">
              <Button
                className="w-full"
                icon={Download}
                onClick={() =>
                  notify({
                    message:
                      "Il download del report in formato CSV sara disponibile in un prossimo aggiornamento.",
                    title: "In arrivo",
                    tone: "info",
                  })
                }
                variant="secondary"
              >
                Scarica report (.csv)
              </Button>
              <Button className="h-12 w-full justify-between" icon={FileBadge} variant="primary">
                Genera certificato pagamento
                <ChevronRight className="ml-auto size-4" />
              </Button>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-[var(--text-secondary)]" />
                <h3 className="text-16px font-bold text-[var(--text-primary)]">
                  Progetti coinvolti
                </h3>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-14px border-[0.5px] border-[var(--border-subtle)]">
              {contracts.filter((c) => selection.some(({ doc }) => doc.projectId === c.id)).length >
              0 ? (
                contracts
                  .filter((c) => selection.some(({ doc }) => doc.projectId === c.id))
                  .map((c) => {
                    const selForProject = selection.filter(({ doc }) => doc.projectId === c.id);
                    const totalForProject = selForProject.reduce(
                      (s, { view }) => s + (view?.total ?? 0),
                      0,
                    );
                    const pct =
                      c.budget.amount > 0
                        ? Math.round((totalForProject / c.budget.amount) * 100)
                        : 0;
                    return (
                      <div
                        className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                        key={c.id}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                            {c.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <SeverityBar
                              percentage={pct}
                              tone={severityToneForPercentage(pct)}
                              className="h-1.5 w-16"
                            />
                            <span className="text-11px font-medium text-[var(--text-secondary)]">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-12px font-semibold text-[var(--text-primary)]">
                            {formatMoney({ amount: totalForProject, currency: "EUR" })}
                          </div>
                          <div className="text-11px text-[var(--text-secondary)]">
                            {selForProject.length} SAL
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="px-4 py-6 text-center text-13px text-[var(--text-secondary)]">
                  Seleziona dei SAL per vedere i progetti coinvolti
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </section>
    </ScreenLayout>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-13px last:border-b-0 last:pb-0">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
