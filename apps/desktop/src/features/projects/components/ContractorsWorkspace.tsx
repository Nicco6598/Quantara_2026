import { AnimatePresence, m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
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
import { type MouseEvent, memo, type ReactNode, useMemo, useRef, useState } from "react";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { Button } from "@/components/shared/Button";
import { DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { Panel } from "@/components/shared/Panel";
import { type StatusTone, statusToneStyles } from "@/components/shared/StatusBadge";
import type { ContractorFolder } from "@/features/projects/types";
import { useContextMenu } from "@/hooks/useContextMenu";
import { buildContractorContextMenuEntries } from "@/lib/context-menu-presets";
import { formatMoney } from "@/lib/formatters";
import { SAL_STATUS_LABELS, SAL_STATUS_TONE_KEYS } from "@/lib/sal-status";
import { cn } from "@/lib/utils";
import { MOTION_VARIANTS } from "@/motion";

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
    <div className="space-y-6">
      <section className="border-b border-[var(--border-subtle)] pb-5">
        <div className="min-w-0">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <p className="text-12px font-medium text-[var(--text-tertiary)]">Portafoglio</p>
              <h2 className="mt-1 text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
                Appaltatori
              </h2>
              <p className="mt-2 max-w-2xl text-14px leading-6 text-[var(--text-secondary)]">
                Cartelle, SAL e criticità in una vista compatta da lavoro.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button icon={Upload} onClick={onImport} size="sm" variant="secondary">
                Importa
              </Button>
              <Button icon={Plus} onClick={onOpenCreateContractor} size="sm">
                Nuovo
              </Button>
              {onSwitchToTreeView ? (
                <Button icon={ListTree} onClick={onSwitchToTreeView} size="sm" variant="outline">
                  Vista albero
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <ContractorHeaderStat
              icon={FolderKanban}
              label="Appaltatori"
              value={`${folders.length}`}
            />
            <ContractorHeaderStat
              icon={Layers3}
              label="Cantieri"
              value={`${activeProjectsCount}`}
            />
            <ContractorHeaderStat
              icon={ClipboardList}
              label="SAL recenti"
              value={`${recentSalsCount}`}
            />
            <ContractorHeaderStat icon={ShieldCheck} label="Presidio" value={`${watchedFolders}`} />
            <ContractorHeaderStat
              icon={Building2}
              label="Portfolio"
              value={formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
            />
          </div>
        </div>
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
          <PortfolioSnapshot
            activeProjectsCount={activeProjectsCount}
            foldersCount={folders.length}
            stableFolders={stableFolders}
            totalPortfolioValue={totalPortfolioValue}
            watchedFolders={watchedFolders}
          />

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

function ContractorHeaderStat({
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
        <span className="min-w-0 text-11px font-medium text-[var(--text-secondary)]">{label}</span>
        <Icon className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-1 truncate text-17px font-semibold leading-none tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

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
    <Panel className="self-start xl:translate-y-2" padding="lg">
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
        <PortfolioSnapshotTile icon={FolderKanban} label="Cartelle" value={foldersCount} />
        <PortfolioSnapshotTile icon={Layers3} label="Progetti" value={activeProjectsCount} />
        <PortfolioSnapshotTile
          icon={ShieldCheck}
          label="Presidio"
          tone={watchedFolders > 0 ? "warning" : "info"}
          value={watchedFolders}
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
    </Panel>
  );
}

function PortfolioSnapshotTile({
  icon: Icon,
  label,
  tone = "info",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "info" | "warning";
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-10px border border-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_86%,var(--bg-muted)_14%)] px-2.5 py-2.5">
      <div className="flex items-center justify-between gap-1.5">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-8px",
            tone === "warning"
              ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
              : "bg-[var(--info-soft)] text-[var(--info-base)]",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="shrink-0 text-18px font-semibold leading-none tabular-nums text-[var(--text-primary)]">
          {value}
        </span>
      </div>
      <div className="mt-2 text-[10px] font-semibold leading-tight text-[var(--text-secondary)]">
        {label}
      </div>
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
    <Panel padding="lg">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-18px",
            statusToneStyles[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-11px font-semibold uppercase tracking-0_18em text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      {children}
    </Panel>
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
          statusToneStyles[tone],
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
  const folderContextMenu = useContextMenu<ContractorFolder>();
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
    <Panel padding="none">
      <div className="flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-12px font-semibold text-[var(--text-primary)]">
              Cartelle operative
            </span>
            <span className="rounded-md bg-[var(--bg-muted-strong)] px-2 py-0.5 text-11px font-semibold text-[var(--text-secondary)]">
              {filteredFolders.length}/{folders.length}
            </span>
          </div>
          <div className="mt-0.5 text-12px font-medium text-[var(--text-secondary)]">
            Budget, SAL e priorità appaltatore.
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
        <EmptyState
          icon={Building2}
          title="Vuoi aggiungere un nuovo appaltatore?"
          description="Crea manualmente o importa da Excel per iniziare subito."
          action={{ label: "Crea appaltatore", onClick: onOpenCreateContractor }}
          className="px-4 py-8 xl:px-5"
        />
      ) : filteredFolders.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nessuna cartella trovata"
          description={`Nessun appaltatore corrisponde a "${query}".`}
        />
      ) : (
        <m.div layout className="space-y-2 p-3">
          <AnimatePresence initial={false}>
            {filteredFolders.map((folder) => (
              <ContractorCard
                key={folder.id}
                folder={folder}
                onContextMenu={(event) => folderContextMenu.open(event, folder)}
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

      {folderContextMenu.state ? (
        <AppContextMenu
          entries={buildContractorContextMenuEntries({
            onDelete: () => {
              const state = folderContextMenu.state;
              if (!state) return;
              onDeleteContractor(state.context);
            },
          })}
          header={{
            title: folderContextMenu.state.context.contractor,
            subtitle: `${folderContextMenu.state.context.projectCount} progetti`,
          }}
          onClose={folderContextMenu.close}
          position={{
            x: folderContextMenu.state.x,
            y: folderContextMenu.state.y,
          }}
        />
      ) : null}
    </Panel>
  );
}

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
  onContextMenu,
  onDeleteContractor,
  onOpenFolder,
}: {
  folder: ContractorFolder;
  onContextMenu: (event: MouseEvent) => void;
  onDeleteContractor: (folder: ContractorFolder) => void;
  onOpenFolder: (id: string) => void;
}) {
  const health = getFolderHealth(folder);
  const initials = getContractorInitials(folder.contractor);
  const exposureLabel = formatMoney({ amount: folder.salExposure, currency: "EUR" });
  const budgetLabel = formatMoney({ amount: folder.budget, currency: "EUR" });

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: contractor folder card exposes a context menu on right-click */}
      <div
        className="group relative rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] transition-[border-color,background-color] duration-fast hover:border-[color-mix(in_srgb,var(--accent-primary)_24%,var(--border-subtle))] hover:bg-[var(--bg-muted)]/35"
        onContextMenu={onContextMenu}
      >
        <m.article
          layout
          animate={MOTION_VARIANTS.card.whileInView}
          className="relative rounded-lg"
          exit={{ opacity: 0, scale: 0.994, y: 10 }}
          initial={MOTION_VARIANTS.card.initial}
          transition={MOTION_VARIANTS.card.transition}
        >
          <div className="absolute right-2 top-2 z-20">
            <ContractorMenu folder={folder} onDeleteContractor={onDeleteContractor} />
          </div>

          <button
            aria-label={`Apri ${folder.contractor}`}
            className="relative z-10 grid w-full gap-3 p-3 pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] md:grid-cols-[minmax(0,1.35fr)_88px_110px_112px_minmax(150px,0.9fr)] md:items-center"
            onClick={() => onOpenFolder(folder.id)}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-3">
              <ContractorAvatar initials={initials} tone={health.tone} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-14px font-semibold leading-tight text-[var(--text-primary)]">
                  {folder.contractor}
                </h3>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-11px font-medium text-[var(--text-secondary)]">
                  <span className="tabular-nums">{folder.projectCount} progetti</span>
                  <span className="tabular-nums">{folder.salCount} SAL</span>
                </div>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex w-fit items-center rounded-md px-2 py-1 text-11px font-semibold",
                statusToneStyles[health.tone],
              )}
            >
              {health.label}
            </span>

            <div>
              <div className="text-10px font-medium text-[var(--text-secondary)]">Budget</div>
              <div className="mt-0.5 truncate text-12px font-semibold tabular-nums text-[var(--text-primary)]">
                {budgetLabel}
              </div>
            </div>

            <div>
              <div className="text-10px font-medium text-[var(--text-secondary)]">SAL aperti</div>
              <div className="mt-0.5 truncate text-12px font-semibold tabular-nums text-[var(--accent-primary)]">
                {exposureLabel}
              </div>
            </div>

            <div>
              <div className="text-10px font-medium text-[var(--text-secondary)]">Criticità</div>
              <div
                className={cn(
                  "mt-0.5 text-12px font-semibold tabular-nums",
                  folder.criticalCount > 0
                    ? "text-[var(--warning-base)]"
                    : "text-[var(--text-primary)]",
                )}
              >
                {folder.criticalCount} · {folder.salWindowCount} finestre
              </div>
            </div>

            <div className="min-w-0">
              {folder.recentSal ? (
                <div>
                  <div className="flex min-w-0 items-center gap-1.5 text-11px leading-tight">
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {folder.recentSal.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        statusToneStyles[
                          SAL_STATUS_TONE_KEYS[folder.recentSal.status] ?? "neutral"
                        ] || "text-[var(--text-tertiary)]",
                      )}
                    >
                      {SAL_STATUS_LABELS[folder.recentSal.status] || folder.recentSal.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-10px font-medium text-[var(--text-tertiary)]">
                    <span className="truncate">{folder.recentSal.projectName}</span>
                    <span className="size-0.5 shrink-0 rounded-full bg-[var(--text-tertiary)]/40" />
                    <span className="shrink-0">{formatRecentDate(folder.recentSal.date)}</span>
                  </div>
                </div>
              ) : (
                <span className="text-11px font-medium text-[var(--text-tertiary)]">
                  Nessun SAL recente
                </span>
              )}
            </div>
          </button>
        </m.article>
      </div>
    </>
  );
}

function ContractorAvatar({ initials, tone }: { initials: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-[14px] text-16px font-semibold tracking-neg-0_03em shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]",
        statusToneStyles[tone],
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
