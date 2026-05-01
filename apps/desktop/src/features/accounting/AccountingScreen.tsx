import {
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Download,
  FileBadge,
  ReceiptText,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface, ProjectControlButton } from "@/features/projects/components/workspace-ui";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import { buildSalDocumentView } from "@/features/sal/domain/sal-workflow";
import { listDesktopContracts } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

const STATUS_OPTIONS = ["Tutti", "Bozza", "Chiuso"] as const;

export function AccountingScreen() {
  const { notify } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [contracts, setContracts] = useState<
    { id: string; budget: { amount: number }; title: string; contractor: string }[]
  >([]);
  const salDocuments = useSalWorkflowStore((state) => state.salDocuments);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const projects = useSalWorkflowStore((state) => state.projects);

  const [filterProject, setFilterProject] = useState("all");
  const [filterContractor, setFilterContractor] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string>("Tutti");
  const [filterQuery, setFilterQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSalIds, setSelectedSalIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const handleChange = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadContracts, 150);
    };
    window.addEventListener("quantara:data-changed", handleChange);
    return () => {
      window.removeEventListener("quantara:data-changed", handleChange);
      clearTimeout(debounceRef.current);
    };
  }, [loadContracts]);

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

  const contractorOptions = useMemo(() => {
    const set = new Set(contracts.map((c) => c.contractor));
    return ["Tutti", ...set];
  }, [contracts]);

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
          const c = contracts.find((cc) => cc.id === doc.projectId);
          if (c?.contractor !== filterContractor) return false;
        }
        if (
          filterStatus !== "Tutti" &&
          doc.status !== (filterStatus === "Bozza" ? "draft" : "closed")
        )
          return false;
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
    contracts,
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

  const selection = useMemo(() => {
    if (selectedSalIds.size === 0) return filteredData;
    return filteredData.filter(({ doc }) => selectedSalIds.has(doc.id));
  }, [filteredData, selectedSalIds]);

  const metrics = useMemo(() => {
    const total = selection.reduce((s, { view }) => s + (view?.total ?? 0), 0);
    const budget = contracts.reduce((s, c) => s + c.budget.amount, 0);
    const draftCount = selection.filter(({ doc }) => doc.status === "draft").length;
    const closedCount = selection.filter(({ doc }) => doc.status === "closed").length;
    return { total, budget, draftCount, closedCount, count: selection.length };
  }, [selection, contracts]);

  const toggleSal = useCallback((id: string) => {
    setSelectedSalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedSalIds.size === filteredData.length) {
      setSelectedSalIds(new Set());
    } else {
      setSelectedSalIds(new Set(filteredData.map(({ doc }) => doc.id)));
    }
  }, [filteredData, selectedSalIds]);

  const clearFilters = useCallback(() => {
    setFilterProject("all");
    setFilterContractor("all");
    setFilterStatus("Tutti");
    setFilterQuery("");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters =
    filterProject !== "all" ||
    filterContractor !== "Tutti" ||
    filterStatus !== "Tutti" ||
    filterQuery ||
    dateFrom ||
    dateTo;

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_16%_8%,color-mix(in_srgb,var(--accent-primary)_14%,transparent),transparent_34%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--info-base)_13%,transparent),transparent_32%)]" />

      <section className="animate-entry">
        <ScreenHero
          badge="Contabilità"
          title="Report contabile"
          description="Seleziona i SAL da includere nel report, applica i filtri per periodo / appaltatore / progetto e genera il documento contabile."
          sidePanel={
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    {selectedSalIds.size > 0
                      ? `${selectedSalIds.size} selezionati`
                      : `${selection.length} nel filtro`}
                  </div>
                  <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--text-primary)]">
                    {formatMoney({ amount: metrics.total, currency: "EUR" })}
                  </div>
                </div>
                <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                  <Calculator className="size-6" />
                </span>
              </div>
              <p className="mt-5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
                {metrics.closedCount} chiusi · {metrics.draftCount} bozze · su {contracts.length}{" "}
                contratti
              </p>
            </div>
          }
        />

        <div className="mt-5 flex flex-wrap items-center gap-2">
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
          <label className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted-strong)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            <span>Da</span>
            <input
              className="w-28 bg-transparent text-[12px] text-[var(--text-primary)] outline-none"
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted-strong)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            <span>A</span>
            <input
              className="w-28 bg-transparent text-[12px] text-[var(--text-primary)] outline-none"
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            <Search className="size-3.5" />
            <input
              className="w-32 bg-transparent text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Cerca SAL..."
              type="text"
              value={filterQuery}
            />
          </label>
          {hasActiveFilters ? (
            <button
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[var(--info-soft)]"
              onClick={clearFilters}
              type="button"
            >
              <X className="size-3.5" />
              Cancella filtri
            </button>
          ) : null}
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
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)] 2xl:text-[18px]">
                      SAL da includere
                    </h3>
                  </div>
                  <button
                    className="text-[12px] font-semibold text-[var(--accent-primary)] hover:underline"
                    onClick={toggleAll}
                    type="button"
                  >
                    {selectedSalIds.size === filteredData.length
                      ? "Deseleziona tutti"
                      : "Seleziona tutti"}
                  </button>
                </div>

                {filteredData.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-[14px] border-[0.5px] border-[var(--border-subtle)]">
                    {filteredData.map(({ doc, view }) => {
                      if (!view) return null;
                      const selected = selectedSalIds.has(doc.id);

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4 text-left last:border-b-0 2xl:px-5 2xl:py-5",
                            selected
                              ? "bg-[var(--info-soft)]/35"
                              : "transition-colors hover:bg-[var(--bg-muted)]",
                          )}
                          key={doc.id}
                          onClick={() => toggleSal(doc.id)}
                          type="button"
                        >
                          <div className="flex items-center gap-3">
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
                            <div>
                              <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                                {doc.title}
                              </div>
                              <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                                {projectMap.get(doc.projectId) ?? "Sconosciuto"} · {doc.date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <div className="text-[14px] font-bold text-[var(--text-primary)]">
                                {formatMoney({ amount: view.total, currency: "EUR" })}
                              </div>
                              <StatusPill tone={doc.status === "closed" ? "success" : "warning"}>
                                {doc.status === "closed" ? "Chiuso" : "Bozza"}
                              </StatusPill>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-8 text-center text-[14px] text-[var(--text-secondary)]">
                    Nessun SAL corrisponde ai filtri attivi.
                  </div>
                )}
              </div>

              <div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-[22px] bg-[var(--info-soft)]/35 p-5 text-center 2xl:min-h-[420px] 2xl:p-7">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {selectedSalIds.size > 0 ? "Totale selezionato" : "Nessuna selezione"}
                </div>
                <div className="mt-5 text-[38px] font-bold leading-none tracking-[-0.04em] text-[var(--text-primary)] 2xl:mt-7 2xl:text-[50px]">
                  {formatMoney({ amount: metrics.total, currency: "EUR" })}
                </div>
                {selectedSalIds.size > 0 ? (
                  <>
                    <div className="mt-9 h-px w-64 max-w-full bg-[var(--border-subtle)]" />
                    <div className="mt-7 flex size-16 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
                      <FileBadge className="size-8" />
                    </div>
                    <p className="mt-7 max-w-[260px] text-[14px] font-medium leading-6 text-[var(--text-secondary)]">
                      {selectedSalIds.size} SAL pronti per il report contabile.
                    </p>
                    <ProjectControlButton
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
                    </ProjectControlButton>
                  </>
                ) : (
                  <p className="mt-6 max-w-[260px] text-[14px] font-medium leading-6 text-[var(--text-secondary)]">
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
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
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
              <ProjectControlButton
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
                variant="neutral"
              >
                Scarica report (.csv)
              </ProjectControlButton>
              <ProjectControlButton
                className="h-12 w-full justify-between"
                icon={FileBadge}
                variant="primary"
              >
                Genera certificato pagamento
                <ChevronRight className="ml-auto size-4" />
              </ProjectControlButton>
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-[var(--text-secondary)]" />
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Progetti coinvolti
                </h3>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border-[0.5px] border-[var(--border-subtle)]">
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
                          <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                            {c.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  pct > 90
                                    ? "bg-[var(--danger-base)]"
                                    : pct > 70
                                      ? "bg-[var(--warning-base)]"
                                      : "bg-[var(--success-base)]",
                                )}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                            {formatMoney({ amount: totalForProject, currency: "EUR" })}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            {selForProject.length} SAL
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="px-4 py-6 text-center text-[13px] text-[var(--text-secondary)]">
                  Seleziona dei SAL per vedere i progetti coinvolti
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  displayMap,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  displayMap?: Map<string, string>;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
      <span>{label}:</span>
      <select
        className="max-w-[140px] bg-transparent text-[12px] font-semibold text-[var(--text-primary)] outline-none"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {displayMap?.get(opt) ?? opt}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3 opacity-60" />
    </label>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-[13px] last:border-b-0 last:pb-0">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function StatusPill({ children, tone }: { children: string; tone: "success" | "warning" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
      )}
    >
      {children}
    </span>
  );
}
