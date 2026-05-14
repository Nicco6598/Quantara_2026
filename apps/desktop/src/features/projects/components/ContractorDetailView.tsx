import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FolderOpen,
  Layers3,
  TrendingUp,
} from "lucide-react";
import { FilterSearch } from "@/components/filters";
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
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { BezelSurface, CompactRail, FocusChip } from "./workspace-ui";

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
      <section className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-10px font-semibold uppercase tracking-uppercase-wide text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Cartella operativa
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <h2 className="mt-5 max-w-4xl text-38px font-semibold leading-tight text-[var(--text-primary)] md:text-56px">
            {contractor.contractor}
          </h2>
          <p className="mt-4 max-w-2xl text-15px leading-6 text-[var(--text-secondary)]">
            Cartella operativa dell'appaltatore. Monitoraggio del portfolio e dei contratti nel
            perimetro attivo.
          </p>

          <div className="mt-7 grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              caption="Totale dei progetti nel perimetro corrente"
              icon={Layers3}
              label="Valore contratti"
              tone="info"
              value={formatMoney({ amount: totalBudget, currency: "EUR" })}
            />
            <MetricCard
              caption="Elementi agganciati alla cartella"
              icon={FolderOpen}
              label="Progetti / contratti"
              tone="success"
              value={`${projects.length}`}
            />
            <MetricCard
              caption={`${salWindowCount} lotti tra emissioni, firme e dossier`}
              icon={ClipboardList}
              label="SAL in corso"
              tone={salWindowCount > 0 ? "warning" : "success"}
              value={formatMoney({ amount: salExposure, currency: "EUR" })}
            />
            <MetricCard
              caption="Cantieri con forecast e documentazione fuori soglia"
              icon={AlertTriangle}
              label="Escalation"
              tone={criticalCount > 0 ? "danger" : "success"}
              value={`${criticalCount}`}
            />
            <MetricCard
              caption="Media ponderata sul portfolio visibile"
              icon={TrendingUp}
              label="Avanzamento medio"
              value={formatPercent(averageProgress)}
            />
          </div>
        </div>

        <BezelSurface className="self-start md:translate-y-2" innerClassName="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                {contractor.contractor}
              </div>
              <div className="mt-2 text-24px font-semibold leading-none text-[var(--text-primary)]">
                {projects.length} progetti
              </div>
            </div>
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
              <FolderOpen className="size-6" />
            </span>
          </div>
          <p className="mt-5 text-12px font-medium leading-5 text-[var(--text-secondary)]">
            {formatMoney({ amount: totalBudget, currency: "EUR" })} di contratti attivi.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button className="text-12px" icon={ArrowLeft} onClick={onBack} variant="secondary">
              Appaltatori
            </Button>
          </div>
        </BezelSurface>
      </section>

      <section className="mt-3 grid gap-4 2xl:grid-cols-[3fr_1fr]">
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
