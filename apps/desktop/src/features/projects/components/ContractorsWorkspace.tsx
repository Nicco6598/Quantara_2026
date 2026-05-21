import { AnimatePresence, m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  HardHat,
  Layers3,
  ListTree,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { MOTION_VARIANTS } from "@/motion";
import { MetricCard } from "@/components/shared/MetricCard";
import type { StatusTone } from "@/components/shared/StatusBadge";
import type { ContractorFolder } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { BezelSurface } from "./workspace-ui";

type ContractorsWorkspaceProps = {
  activeProjectsCount: number;
  folders: ContractorFolder[];
  onImport: () => void;
  onDeleteContractor: (folder: ContractorFolder) => void;
  onOpenCreateContractor: () => void;
  onOpenFolder: (folderId: string) => void;
  onOpenNotifications: () => void;
  onSwitchToTreeView?: () => void;
  recentSalsCount: number;
  totalPortfolioValue: number;
};

type FolderHealth = {
  label: string;
  score: number;
  tone: StatusTone;
};

export const ContractorsWorkspace = memo(function ContractorsWorkspace({
  activeProjectsCount,
  folders,
  onImport,
  onDeleteContractor,
  onOpenCreateContractor,
  onOpenFolder,
  onOpenNotifications,
  onSwitchToTreeView,
  recentSalsCount,
  totalPortfolioValue,
}: ContractorsWorkspaceProps) {
  const stableFolders = useMemo(
    () =>
      folders.filter((folder) => folder.criticalCount === 0 && folder.salWindowCount === 0).length,
    [folders],
  );
  const watchedFolders = folders.length - stableFolders;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_78%,transparent)] px-3 py-1 text-10px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)]">
              Appaltatori
            </span>
            {onSwitchToTreeView && (
              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_80%,var(--bg-muted)_20%)] px-4 py-1.5 text-11px font-semibold text-[var(--text-primary)] transition-all duration-[var(--duration-fast)] ease-standard"
                onClick={onSwitchToTreeView}
                type="button"
              >
                <ListTree className="size-3.5" />
                Vista albero
              </button>
            )}
          </div>
          <h2 className="mt-5 max-w-4xl text-38px font-semibold leading-tight tracking-neg-0_03em text-[var(--text-primary)] md:text-56px">
            Cockpit appaltatori
          </h2>
          <p className="mt-4 max-w-2xl text-15px leading-6 text-[var(--text-secondary)]">
            Cartelle operative con budget, SAL, alert e stato di presidio leggibili al primo
            sguardo.
          </p>

          <div className="mt-7 grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              caption="Cartelle operative"
              icon={HardHat}
              label="Appaltatori"
              tone="info"
              value={`${folders.length}`}
            />
            <MetricCard
              caption="Cantieri nel perimetro"
              icon={Layers3}
              label="Progetti"
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
              caption="Contratti attivi"
              icon={Building2}
              label="Portfolio"
              value={formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
            />
          </div>
        </div>

        <PortfolioSnapshot
          activeProjectsCount={activeProjectsCount}
          foldersCount={folders.length}
          stableFolders={stableFolders}
          totalPortfolioValue={totalPortfolioValue}
          watchedFolders={watchedFolders}
        />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <ContractorFoldersPanel
          folders={folders}
          onImport={onImport}
          onDeleteContractor={onDeleteContractor}
          onOpenCreateContractor={onOpenCreateContractor}
          onOpenFolder={onOpenFolder}
        />

        <aside className="grid gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4">
          <WorkspaceRailCard icon={Activity} title="Attivita recenti" tone="success">
            <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-22px bg-[var(--success-soft)] text-[var(--success-base)]">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="mt-5 text-14px font-semibold text-[var(--text-primary)]">
                Nessuna attivita recente
              </div>
              <p className="mt-2 max-w-[230px] text-12px leading-5 text-[var(--text-secondary)]">
                Progetti, SAL e controlli appariranno qui quando vengono aggiornati.
              </p>
              <Button className="mt-5 h-9" onClick={onOpenNotifications} variant="secondary">
                Vai alle notifiche
              </Button>
            </div>
          </WorkspaceRailCard>

          <WorkspaceRailCard icon={TrendingUp} title="Insight portfolio">
            <div className="space-y-4">
              <InsightRow
                detail="Finestra economica dei SAL in corso"
                icon={ClipboardList}
                label={
                  recentSalsCount > 0 ? `${recentSalsCount} SAL recenti` : "Nessun SAL recente"
                }
                tone="info"
              />
              <InsightRow
                detail={
                  watchedFolders > 0 ? "Richiede presidio operativo" : "Tutto sotto controllo"
                }
                icon={ShieldCheck}
                label={
                  watchedFolders > 0
                    ? `${watchedFolders} cartelle in presidio`
                    : "Nessun alert aperto"
                }
                tone={watchedFolders > 0 ? "warning" : "success"}
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

function PortfolioSnapshot({
  activeProjectsCount,
  foldersCount,
  stableFolders,
  totalPortfolioValue,
  watchedFolders,
}: {
  activeProjectsCount: number;
  foldersCount: number;
  stableFolders: number;
  totalPortfolioValue: number;
  watchedFolders: number;
}) {
  return (
    <BezelSurface className="self-start xl:translate-y-2" innerClassName="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
            Portfolio complessivo
          </div>
          <div className="mt-2 text-28px font-semibold leading-none text-[var(--text-primary)]">
            {formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
          </div>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-22px bg-[var(--info-soft)] text-[var(--info-base)]">
          <Building2 className="size-6" />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <SnapshotCell label="Cartelle" value={`${foldersCount}`} />
        <SnapshotCell label="Progetti" value={`${activeProjectsCount}`} />
        <SnapshotCell
          label="Presidio"
          value={`${watchedFolders}`}
          tone={watchedFolders > 0 ? "warning" : "success"}
        />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-22px bg-[color-mix(in_srgb,var(--bg-muted)_58%,transparent)] p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-18px bg-[var(--success-soft)] text-[var(--success-base)]">
          <CheckCircle2 className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-12px font-semibold text-[var(--text-primary)]">
            {stableFolders} cartelle stabili
          </div>
          <div className="mt-0.5 text-11px text-[var(--text-secondary)]">
            Nessun alert o finestra SAL aperta.
          </div>
        </div>
      </div>
    </BezelSurface>
  );
}

function SnapshotCell({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: StatusTone;
  value: string;
}) {
  return (
    <div className="rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] px-3 py-2">
      <div
        className={cn(
          "text-16px font-semibold leading-none tabular-nums",
          tone === "warning" && "text-[var(--warning-base)]",
          tone === "success" && "text-[var(--success-base)]",
          tone === "neutral" && "text-[var(--text-primary)]",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-10px font-medium text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

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
  return (
    <BezelSurface innerClassName="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn("flex size-8 items-center justify-center rounded-18px", toneSurface(tone))}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
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
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-18px",
          toneSurface(tone),
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-13px font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 text-12px leading-5 text-[var(--text-secondary)]">{detail}</div>
      </div>
    </div>
  );
}

function ContractorFoldersPanel({
  folders,
  onImport,
  onDeleteContractor,
  onOpenCreateContractor,
  onOpenFolder,
}: {
  folders: ContractorFolder[];
  onImport: () => void;
  onDeleteContractor: (folder: ContractorFolder) => void;
  onOpenCreateContractor: () => void;
  onOpenFolder: (folderId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredFolders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");

    if (!normalizedQuery) {
      return folders;
    }

    return folders.filter((folder) =>
      folder.contractor.toLocaleLowerCase("it-IT").includes(normalizedQuery),
    );
  }, [folders, query]);

  return (
    <BezelSurface innerClassName="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Cartelle operative
            </span>
            <span className="rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-11px font-semibold text-[var(--text-secondary)]">
              {filteredFolders.length}/{folders.length}
            </span>
          </div>
          <div className="mt-1 text-12px font-medium text-[var(--text-secondary)]">
            Vista cockpit per budget, SAL, alert e priorita appaltatore.
          </div>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto] xl:flex xl:flex-wrap xl:items-center">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="h-10 w-full rounded-18px border border-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_78%,transparent)] pl-10 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca appaltatore..."
              type="search"
              value={query}
            />
          </label>
          <Button
            className="h-10 px-3 text-12px"
            icon={Upload}
            onClick={onImport}
            variant="secondary"
          >
            Importa
          </Button>
          <Button size="sm" icon={Plus} onClick={onOpenCreateContractor} variant="primary">
            Nuovo
          </Button>
        </div>
      </div>

      {folders.length === 0 ? (
        <EmptyContractorsState onOpenCreateContractor={onOpenCreateContractor} />
      ) : filteredFolders.length === 0 ? (
        <NoResultsState query={query} />
      ) : (
        <m.div layout className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
          <AnimatePresence initial={false}>
            {filteredFolders.map((folder) => (
              <ContractorCard
                key={folder.id}
                folder={folder}
                onDeleteContractor={onDeleteContractor}
                onOpenFolder={onOpenFolder}
              />
            ))}
          </AnimatePresence>
        </m.div>
      )}

      {folders.length > 0 ? (
        <div className="border-t border-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] p-4 text-center">
          <span className="text-12px font-medium text-[var(--text-secondary)]">
            {folders.length} cartelle operative ·{" "}
            <button
              className="font-semibold text-[var(--accent-primary)]"
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

const SAL_STATUS_LABELS: Record<string, string> = {
  approved: "Approvato",
  closed: "Chiuso",
  draft: "Bozza",
  "in-review": "Revisione",
};

const SAL_STATUS_TONES: Record<string, string> = {
  approved: "text-[var(--success-base)]",
  closed: "text-[var(--success-base)]",
  draft: "text-[var(--text-tertiary)]",
  "in-review": "text-[var(--info-base)]",
};

function formatRecentDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sett. fa`;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function ContractorCard({
  folder,
  onDeleteContractor,
  onOpenFolder,
}: {
  folder: ContractorFolder;
  onDeleteContractor: (folder: ContractorFolder) => void;
  onOpenFolder: (id: string) => void;
}) {
  const health = getFolderHealth(folder);
  const initials = getContractorInitials(folder.contractor);
  const exposureLabel = formatMoney({ amount: folder.salExposure, currency: "EUR" });
  const budgetLabel = formatMoney({ amount: folder.budget, currency: "EUR" });

  return (
    <div className="group relative rounded-[30px] bg-[color-mix(in_srgb,var(--border-subtle)_52%,transparent)] p-[2px] shadow-[0_16px_42px_color-mix(in_srgb,var(--text-primary)_5%,transparent)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_24px_56px_color-mix(in_srgb,var(--text-primary)_12%,transparent)] motion-safe:active:scale-[0.99]">
      <m.article
        layout
        animate={MOTION_VARIANTS.card.whileInView}
        className="relative overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]"
        exit={{ opacity: 0, scale: 0.994, y: 10 }}
        initial={MOTION_VARIANTS.card.initial}
        transition={MOTION_VARIANTS.card.transition}
      >
        <div className="absolute right-3 top-3 z-20">
          <ContractorMenu folder={folder} onDeleteContractor={onDeleteContractor} />
        </div>

        <button
          aria-label={`Apri ${folder.contractor}`}
          className="relative z-10 flex w-full flex-col p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
          onClick={() => onOpenFolder(folder.id)}
          type="button"
        >
          <div className="flex min-w-0 items-start justify-between gap-3 pr-12">
            <div className="flex min-w-0 items-start gap-3.5">
              <ContractorAvatar initials={initials} tone={health.tone} />
              <div className="min-w-0 flex-1 pt-1">
                <h3 className="text-20px font-semibold leading-[1.1] tracking-[-0.015em] text-[var(--text-primary)] line-clamp-1">
                  {folder.contractor}
                </h3>
                <div className="mt-1.5 flex items-center gap-2 text-12px font-medium text-[var(--text-secondary)]">
                  <span className="tabular-nums">{folder.projectCount} progetti</span>
                  <span className="size-1 rounded-full bg-[var(--text-tertiary)]/30" />
                  <span className="tabular-nums">{folder.salCount} SAL</span>
                  <span className="size-1 rounded-full bg-[var(--text-tertiary)]/30" />
                  <span className="tabular-nums">{budgetLabel}</span>
                </div>
              </div>
            </div>
            <span
              className={cn(
                "mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-10px font-semibold tracking-[-0.01em]",
                toneSurface(health.tone),
              )}
            >
              {health.label}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <CockpitMetric icon={TrendingUp} label="Budget" value={budgetLabel} />
            <CockpitMetric icon={Layers3} label="Progetti" value={`${folder.projectCount}`} />
            <CockpitMetric
              icon={folder.criticalCount > 0 ? AlertTriangle : ShieldCheck}
              label="Criticità"
              tone={folder.criticalCount > 0 ? "warning" : "neutral"}
              value={`${folder.criticalCount}`}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_66%,var(--bg-muted)_34%)] p-3.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_44%,transparent)]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                  Esposizione SAL
                </dt>
                <span className="text-14px font-semibold tabular-nums text-[var(--accent-primary)]">
                  {exposureLabel}
                </span>
              </div>
            </div>
            <div className="min-w-0 rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_66%,var(--bg-muted)_34%)] p-3.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_44%,transparent)]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                  Finestre SAL
                </dt>
                <span className="text-14px font-semibold tabular-nums text-[var(--text-primary)]">
                  {folder.salWindowCount}
                </span>
              </div>
            </div>
          </div>

          {folder.recentSal && (
            <div className="mt-3 rounded-[20px] bg-[color-mix(in_srgb,var(--bg-muted)_50%,transparent)] px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/12">
                  <div className="size-1.5 rounded-full bg-[var(--accent-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-11px leading-tight">
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {folder.recentSal.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        SAL_STATUS_TONES[folder.recentSal.status] || "text-[var(--text-tertiary)]",
                      )}
                    >
                      {SAL_STATUS_LABELS[folder.recentSal.status] || folder.recentSal.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-10px font-medium text-[var(--text-tertiary)]">
                    <span className="truncate">{folder.recentSal.projectName}</span>
                    <span className="size-0.5 rounded-full bg-[var(--text-tertiary)]/40" />
                    <span className="shrink-0">{formatRecentDate(folder.recentSal.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </button>
      </m.article>
    </div>
  );
}

function ContractorAvatar({ initials, tone }: { initials: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-[14px] text-16px font-semibold tracking-neg-0_03em shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]",
        toneSurface(tone),
      )}
    >
      {initials}
    </span>
  );
}

function ContractorMenu({
  folder,
  onDeleteContractor,
}: {
  folder: ContractorFolder;
  onDeleteContractor: (folder: ContractorFolder) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={menuRef}>
      <Button
        aria-label={`Azioni ${folder.contractor}`}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((v) => !v);
        }}
        style={{ borderRadius: "26px" }}
        variant="icon"
      >
        <MoreVertical className="size-4" />
      </Button>
      <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={menuRef}>
        <DropdownItem
          icon={Trash2}
          label="Elimina appaltatore"
          onClick={() => {
            setIsOpen(false);
            onDeleteContractor(folder);
          }}
          tone="danger"
        />
      </DropdownMenu>
    </div>
  );
}

function CockpitMetric({
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  icon?: LucideIcon;
  label: string;
  tone?: StatusTone;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_66%,var(--bg-muted)_34%)] p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_44%,transparent)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:bg-[color-mix(in_srgb,var(--surface-base)_58%,var(--bg-muted)_42%)]">
      {Icon && (
        <Icon
          className={cn(
            "mb-1.5 size-3.5",
            tone === "warning" ? "text-[var(--warning-base)]" : "text-[var(--accent-primary)]",
          )}
          strokeWidth={1.8}
        />
      )}
      <dt className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-16px font-semibold tabular-nums tracking-[-0.01em]",
          tone === "warning" ? "text-[var(--warning-base)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyContractorsState({ onOpenCreateContractor }: { onOpenCreateContractor: () => void }) {
  return (
    <div className="px-4 py-8 xl:px-5">
      <button
        className="w-full rounded-26px border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_70%,transparent)] px-6 py-12 text-center"
        onClick={onOpenCreateContractor}
        type="button"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-22px bg-[var(--info-soft)] text-[var(--info-base)]">
          <Building2 className="size-6" />
        </span>
        <span className="mt-5 block text-15px font-semibold text-[var(--text-primary)]">
          Vuoi aggiungere un nuovo appaltatore?
        </span>
        <span className="mt-2 block text-13px text-[var(--text-secondary)]">
          Crea manualmente o importa da Excel per iniziare subito.
        </span>
      </button>
    </div>
  );
}

function NoResultsState({ query }: { query: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-22px bg-[var(--bg-muted)] text-[var(--text-secondary)]">
        <Search className="size-5" />
      </div>
      <div className="mt-4 text-14px font-semibold text-[var(--text-primary)]">
        Nessuna cartella trovata
      </div>
      <p className="mt-2 text-12px text-[var(--text-secondary)]">
        Nessun appaltatore corrisponde a “{query}”.
      </p>
    </div>
  );
}

function getFolderHealth(folder: ContractorFolder): FolderHealth {
  if (folder.criticalCount > 0 || folder.salWindowCount > 0) {
    return { label: "Presidio", score: 62, tone: "warning" };
  }

  if (folder.projectCount === 0) {
    return { label: "Da attivare", score: 48, tone: "neutral" };
  }

  return { label: "Stabile", score: 92, tone: "success" };
}

function getContractorInitials(contractor: string) {
  const words = contractor
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "AP";
  }

  const first = words[0] ?? "A";
  const second = words[1] ?? first.slice(1, 2) ?? "P";
  const initials = `${first.slice(0, 1)}${second.slice(0, 1)}`;
  return initials.toLocaleUpperCase("it-IT");
}

function toneSurface(tone: StatusTone) {
  return {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone];
}
