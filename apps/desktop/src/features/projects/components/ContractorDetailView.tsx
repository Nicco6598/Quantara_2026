import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FolderOpen,
  Layers3,
  TrendingUp,
} from "lucide-react";
import { FilterSearch } from "@/components/filters";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { CompactRail, FocusChip } from "./workspace-ui";

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
  onEditProject: (project: PortfolioProject) => void;
  onDeleteProject: (projectId: string) => void;
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

function ContractorDetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-11px font-medium text-[var(--text-secondary)]">{label}</span>
        <Icon className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-1 truncate text-15px font-semibold leading-none tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

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
  onEditProject,
  onDeleteProject,
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
    <div className="w-full">
      <section className="border-b border-[var(--border-subtle)] pb-5">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-12px font-medium text-[var(--text-tertiary)]">Cartella operativa</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-[var(--success-base)]/20 bg-[var(--success-soft)] px-2.5 py-1 text-11px font-semibold text-[var(--success-base)]">
                <span className="size-1.5 rounded-full bg-current" />
                Operativo
              </span>
              {isPending ? (
                <span className="rounded-md bg-[var(--warning-soft)] px-2.5 py-1 text-11px font-semibold text-[var(--warning-base)]">
                  Filtri in aggiornamento
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 max-w-4xl text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
              {contractor.contractor}
            </h2>
            <p className="mt-2 max-w-2xl text-14px leading-6 text-[var(--text-secondary)]">
              Portfolio, SAL e criticità nel perimetro attivo.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5 xl:min-w-[760px]">
            <ContractorDetailStat
              icon={Layers3}
              label="Contratti"
              value={formatMoney({ amount: totalBudget, currency: "EUR" })}
            />
            <ContractorDetailStat icon={FolderOpen} label="Progetti" value={`${projects.length}`} />
            <ContractorDetailStat
              icon={ClipboardList}
              label="SAL in corso"
              value={formatMoney({ amount: salExposure, currency: "EUR" })}
            />
            <ContractorDetailStat
              icon={AlertTriangle}
              label="Criticità"
              value={`${criticalCount} / ${salWindowCount}`}
            />
            <ContractorDetailStat
              icon={TrendingUp}
              label="Avanzamento"
              value={formatPercent(averageProgress)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button
            className="text-12px"
            icon={ArrowLeft}
            onClick={onBack}
            size="sm"
            variant="secondary"
          >
            Appaltatori
          </Button>
        </div>
      </section>

      <section className="mt-5 grid gap-4 2xl:grid-cols-[3fr_1fr]">
        <section className="min-w-0">
          <ProjectsWorkbench
            onCreateProject={onCreateProject}
            onDeleteProject={onDeleteProject}
            onEditProject={onEditProject}
            onExport={onExport}
            onImport={onImport}
            onOpenProject={onOpenProject}
            projects={projects}
            query={query}
            selectedProjectId={selectedProjectId}
          >
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
            <FilterSearch
              className="xl:w-[260px]"
              onChange={setQuery}
              placeholder="Cerca lotto, PM, milestone..."
              value={query}
            />
          </ProjectsWorkbench>
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
              <div className="flex size-14 items-center justify-center rounded-full border-4 border-[var(--success-base)] text-11px font-semibold text-[var(--success-base)]">
                100%
              </div>
              <div>
                <div className="text-12px font-semibold text-[var(--text-primary)]">
                  Copertura completa
                </div>
                <div className="mt-1 text-11px leading-4 text-[var(--text-secondary)]">
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
