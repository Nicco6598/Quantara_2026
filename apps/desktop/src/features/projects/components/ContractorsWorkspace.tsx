import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HardHat,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
} from "lucide-react";
import { memo, type ReactNode, useMemo } from "react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import type { ContractorFolder } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { BezelSurface, MetricCard, ProjectControlButton } from "./workspace-ui";

type ContractorsWorkspaceProps = {
  activeProjectsCount: number;
  folders: ContractorFolder[];
  onImport: () => void;
  onOpenCreateContractor: () => void;
  onOpenFolder: (folderId: string) => void;
  onOpenNotifications: () => void;
  recentSalsCount: number;
  totalPortfolioValue: number;
};

export const ContractorsWorkspace = memo(function ContractorsWorkspace({
  activeProjectsCount,
  folders,
  onImport,
  onOpenCreateContractor,
  onOpenFolder,
  onOpenNotifications,
  recentSalsCount,
  totalPortfolioValue,
}: ContractorsWorkspaceProps) {
  const stableFolders = useMemo(
    () =>
      folders.filter((folder) => folder.criticalCount === 0 && folder.salWindowCount === 0).length,
    [folders],
  );

  return (
    <div>
      <section className="animate-entry grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Appaltatori
          </span>
          <h2 className="mt-5 max-w-4xl text-[38px] font-semibold leading-[0.98] text-[var(--text-primary)] md:text-[56px]">
            Workspace appaltatori
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--text-secondary)]">
            Seleziona un appaltatore per accedere ai progetti, ai contratti, ai SAL e ai controlli.
          </p>

          <div className="mt-7 grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              caption="Cartelle operative disponibili"
              icon={HardHat}
              label="Appaltatori attivi"
              tone="info"
              value={`${folders.length}`}
            />
            <MetricCard
              caption="Ultima attivita: 27 apr"
              icon={Layers3}
              label="Progetti nel perimetro"
              tone="success"
              value={`${activeProjectsCount}`}
            />
            <MetricCard
              caption="Ultime attivita SAL"
              icon={ClipboardList}
              label="SAL recenti"
              tone={recentSalsCount > 0 ? "warning" : "success"}
              value={`${recentSalsCount}`}
            />
            <MetricCard
              caption="Valore totale contratti"
              icon={Building2}
              label="Valore portfolio"
              value={formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
            />
          </div>
        </div>

        <BezelSurface className="self-start md:translate-y-2" innerClassName="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="w-full">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Portfolio complessivo
              </div>
              <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--text-primary)]">
                {formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
              </div>
            </div>
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
              <Building2 className="size-6" />
            </span>
          </div>
          <p className="mt-5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
            {folders.length} appaltatori attivi su {activeProjectsCount} progetti nel perimetro.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-base)]">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">
              {stableFolders} cartelle stabili
            </div>
          </div>
        </BezelSurface>
      </section>

      <div className="mt-8 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <ContractorFoldersPanel
            folders={folders}
            onImport={onImport}
            onOpenCreateContractor={onOpenCreateContractor}
            onOpenFolder={onOpenFolder}
          />
        </div>

        <aside className="grid gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4">
          <WorkspaceRailCard icon={Activity} title="Attivita recenti" tone="success">
            <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-base)]">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="mt-5 text-[14px] font-semibold text-[var(--text-primary)]">
                Nessuna attivita recente
              </div>
              <p className="mt-2 max-w-[230px] text-[12px] leading-5 text-[var(--text-secondary)]">
                Le ultime attivita di progetti, SAL e controlli appariranno qui.
              </p>
              <ProjectControlButton
                className="mt-5 h-9"
                onClick={onOpenNotifications}
                variant="neutral"
              >
                Vai alle notifiche
              </ProjectControlButton>
            </div>
          </WorkspaceRailCard>

          <WorkspaceRailCard icon={TrendingUp} title="Insight portfolio">
            <div className="space-y-4">
              <InsightRow
                detail="L'ultimo SAL registrato e del -"
                icon={ClipboardList}
                label={
                  recentSalsCount > 0 ? `${recentSalsCount} SAL recenti` : "Nessun SAL recente"
                }
                tone="info"
              />
              <InsightRow
                detail={
                  folders.length - stableFolders > 0 ? "Da verificare" : "Tutto sotto controllo"
                }
                icon={ShieldCheck}
                label={folders.length - stableFolders > 0 ? "Alert aperti" : "Nessun alert aperto"}
                tone={folders.length - stableFolders > 0 ? "warning" : "success"}
              />
              <InsightRow
                detail="Valore contratti attivi"
                icon={Building2}
                label={formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
                tone="success"
              />
            </div>
          </WorkspaceRailCard>
        </aside>
      </div>
    </div>
  );
});

function WorkspaceRailCard({
  children,
  icon: Icon,
  title,
  tone = "info",
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
  tone?: StatusTone;
}) {
  const toneClass = {
    danger: "text-[var(--danger-base)]",
    info: "text-[var(--info-base)]",
    neutral: "text-[var(--text-secondary)]",
    success: "text-[var(--success-base)]",
    warning: "text-[var(--warning-base)]",
  }[tone];

  return (
    <BezelSurface innerClassName="p-5">
      <div className="mb-4 flex items-center gap-3">
        <Icon className={cn("size-4", toneClass)} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      {children}
    </BezelSurface>
  );
}

function InsightRow({
  detail,
  icon: Icon,
  label,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: StatusTone;
}) {
  const toneClass = {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone];

  return (
    <div className="flex items-start gap-3">
      <span
        className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", toneClass)}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{detail}</div>
      </div>
    </div>
  );
}

function ContractorFoldersPanel({
  folders,
  onImport,
  onOpenCreateContractor,
  onOpenFolder,
}: {
  folders: ContractorFolder[];
  onImport: () => void;
  onOpenCreateContractor: () => void;
  onOpenFolder: (folderId: string) => void;
}) {
  return (
    <BezelSurface innerClassName="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Cartelle operative
          </span>
          <span className="rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
            {folders.length}
          </span>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto] xl:flex xl:flex-wrap xl:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              placeholder="Cerca appaltatore..."
              type="search"
            />
          </div>
          <ProjectControlButton
            className="h-10 px-3 text-[12px]"
            icon={Upload}
            onClick={onImport}
            variant="neutral"
          >
            Importa
          </ProjectControlButton>
          <ProjectControlButton
            className="h-10 px-3 text-[12px]"
            icon={Plus}
            onClick={onOpenCreateContractor}
            variant="primary"
          >
            Nuovo
          </ProjectControlButton>
        </div>
      </div>

      {folders.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {folders.map((folder) => {
            const hasCriticalItems = folder.criticalCount > 0 || folder.salWindowCount > 0;
            return (
              <ContractorCard
                key={folder.id}
                folder={folder}
                hasCriticalItems={hasCriticalItems}
                onOpenFolder={onOpenFolder}
              />
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 xl:px-5">
          <button
            type="button"
            className="w-full rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-12 text-center transition-colors hover:bg-[var(--bg-muted)]"
            onClick={onOpenCreateContractor}
          >
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
              <Building2 className="size-5" />
            </span>
            <span className="mt-5 block text-[15px] font-semibold text-[var(--text-primary)]">
              Vuoi aggiungere un nuovo appaltatore?
            </span>
            <span className="mt-2 block text-[13px] text-[var(--text-secondary)]">
              Crea manualmente o importa da Excel per iniziare subito.
            </span>
          </button>
        </div>
      )}

      {folders.length > 0 ? (
        <div className="border-t border-[var(--border-subtle)] px-4 py-4 text-center xl:px-5 xl:py-5">
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            {folders.length} cartelle &middot;{" "}
            <button
              className="font-semibold text-[var(--accent-primary)] hover:underline"
              onClick={onOpenCreateContractor}
              type="button"
            >
              Aggiungi appaltatore
            </button>
          </span>
        </div>
      ) : null}
    </BezelSurface>
  );
}

function ContractorCard({
  folder,
  hasCriticalItems,
  onOpenFolder,
}: {
  folder: ContractorFolder;
  hasCriticalItems: boolean;
  onOpenFolder: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="group w-full cursor-pointer rounded-2xl border-[0.5px] border-[var(--border-subtle)] bg-[var(--surface-base)] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      onClick={() => onOpenFolder(folder.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--accent-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]">
            <HardHat className="size-5" />
          </span>
          <span className="truncate text-[15px] font-bold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
            {folder.contractor}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold",
            hasCriticalItems
              ? "bg-[var(--warning-soft)] text-[var(--warning-base)] ring-1 ring-[var(--warning-base)]/20"
              : "bg-[var(--success-soft)] text-[var(--success-base)] ring-1 ring-[var(--success-base)]/20",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {hasCriticalItems ? "Presidio" : "Stabile"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--border-subtle)]/60 overflow-hidden rounded-xl border-[0.5px] border-[var(--border-subtle)]/50">
        <CardMetric
          label="Valore"
          value={formatMoney({ amount: folder.budget, currency: "EUR" })}
        />
        <CardMetric label="Progetti" value={`${folder.projectCount}`} />
        <CardMetric
          label="Alert"
          value={`${folder.criticalCount}`}
          highlight={folder.criticalCount > 0}
        />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-primary)] opacity-0 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100">
          Apri workspace <ChevronRight className="size-3.5" />
        </span>
      </div>
    </button>
  );
}

function CardMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-2 py-2.5 text-center">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-[14px] font-bold",
          highlight ? "text-[var(--warning-base)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
