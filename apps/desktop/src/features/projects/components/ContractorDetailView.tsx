import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FolderOpen,
  Layers3,
  Search,
  TrendingUp,
} from "lucide-react";
import type {
  ActivityItem,
  ApprovalItem,
  ContractorFolder,
  PortfolioFocus,
  PortfolioProject,
  PriorityItem,
} from "@/features/projects/types";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { ControlRailPanel } from "./ControlRailPanel";
import { ProjectsWorkbench } from "./ProjectsWorkbench";
import { CompactRail, EmptyState, FocusChip, PortfolioMetric } from "./workspace-ui";

type FocusOption = {
  label: string;
  value: PortfolioFocus;
};

type ContractorDetailViewProps = {
  averageProgress: number;
  contractor: ContractorFolder;
  criticalCount: number;
  focus: PortfolioFocus;
  focusCounts: Record<PortfolioFocus, number>;
  focusOptions: FocusOption[];
  isPending: boolean;
  managerLoadCount: number;
  onBack: () => void;
  onCreateProject: () => void;
  onExport: () => void;
  onFocusChange: (focus: PortfolioFocus) => void;
  onImport: () => void;
  onOpenProject: (project: PortfolioProject) => void;
  onOpenProjectActions: (project: PortfolioProject) => void;
  projects: PortfolioProject[];
  query: string;
  salExposure: number;
  salWindowCount: number;
  selectedProjectId: string;
  setQuery: (query: string) => void;
  totalBudget: number;
  visibleActivities: ActivityItem[];
  visibleApprovals: ApprovalItem[];
  visibleQueue: PriorityItem[];
};

export function ContractorDetailView({
  averageProgress,
  contractor,
  criticalCount,
  focus,
  focusCounts,
  focusOptions,
  isPending,
  managerLoadCount,
  onBack,
  onCreateProject,
  onExport,
  onFocusChange,
  onImport,
  onOpenProject,
  onOpenProjectActions,
  projects,
  query,
  salExposure,
  salWindowCount,
  selectedProjectId,
  setQuery,
  totalBudget,
  visibleActivities,
  visibleApprovals,
  visibleQueue,
}: ContractorDetailViewProps) {
  const escalationCount = visibleApprovals.filter((item) => item.tone === "danger").length;

  return (
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
              {contractor.contractor}
            </h2>
            <p className="mt-3 max-w-4xl text-[14px] font-normal leading-6 text-[var(--text-secondary)] md:mt-4 md:text-[15px]">
              Cartella operativa dell'appaltatore. Monitoraggio del portfolio e dei contratti nel
              perimetro attivo.
            </p>
          </div>
          <button
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]"
            onClick={onBack}
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
          value={`${projects.length}`}
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
                  onClick={() => onFocusChange(option.value)}
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
            onCreateProject={onCreateProject}
            onExport={onExport}
            onImport={onImport}
            onOpenProject={onOpenProject}
            onOpenProjectActions={onOpenProjectActions}
            projects={projects}
            query={query}
            selectedProjectId={selectedProjectId}
          />
        </section>

        <div className="grid gap-3 lg:grid-cols-2 2xl:block 2xl:space-y-3">
          <CompactRail title="Azioni che non possono aspettare" value={visibleQueue.length}>
            <EmptyState
              description="I filtri correnti non lasciano task critici in evidenza."
              title="Coda stabile"
            />
          </CompactRail>
          <CompactRail title="Finestra 72 ore" value={`${escalationCount} escalation`}>
            <EmptyState
              description="Nessuna approvazione ricade nel perimetro selezionato."
              title="Finestra pulita"
            />
          </CompactRail>
          <CompactRail title="Copertura PM" value={String(managerLoadCount)}>
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-full border-4 border-[var(--success-base)] text-[11px] font-semibold text-[var(--success-base)]">
                100%
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                  Copertura completa
                </div>
                <div className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
                  {projects.length} progetto con PM assegnato su {projects.length} totale.
                </div>
              </div>
            </div>
          </CompactRail>
          <ControlRailPanel activities={visibleActivities} signals={[]} />
        </div>
      </section>
    </div>
  );
}
