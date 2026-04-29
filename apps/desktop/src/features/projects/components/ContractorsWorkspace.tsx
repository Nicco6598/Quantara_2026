import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  HardHat,
  Layers3,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import type { StatusTone } from "@/components/shared/StatusBadge";
import type { ContractorFolder } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PortfolioMetric } from "./workspace-ui";

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

export function ContractorsWorkspace({
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
    <div className="pt-2">
      <section>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
          Portfolio / Progetti
        </div>
        <h2 className="mt-9 text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]">
          Workspace appaltatori
        </h2>
        <p className="mt-3 max-w-3xl text-[16px] font-normal leading-6 text-[var(--text-secondary)]">
          Seleziona un appaltatore per accedere ai progetti, ai contratti, ai SAL e ai controlli.
        </p>
      </section>

      <div className="mt-10 grid grid-cols-2 gap-4 2xl:grid-cols-4">
        <PortfolioMetric
          detail="Cartelle operative disponibili"
          icon={HardHat}
          label="Appaltatori attivi"
          tone="info"
          value={`${folders.length}`}
        />
        <PortfolioMetric
          detail="Ultima attivita: 27 apr"
          icon={Layers3}
          label="Progetti nel perimetro"
          tone="success"
          value={`${activeProjectsCount}`}
        />
        <PortfolioMetric
          detail="Ultime attivita SAL"
          icon={ClipboardList}
          label="SAL recenti"
          tone={recentSalsCount > 0 ? "warning" : "success"}
          value={`${recentSalsCount}`}
        />
        <PortfolioMetric
          detail="Valore totale contratti"
          icon={Building2}
          label="Valore portfolio"
          tone="info"
          value={formatMoney({ amount: totalPortfolioValue, currency: "EUR" })}
        />
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <WorkspaceFilterBar onImport={onImport} onOpenCreateContractor={onOpenCreateContractor} />
          <ContractorFoldersPanel
            folders={folders}
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
              <button
                className="mt-5 h-9 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
                onClick={onOpenNotifications}
                type="button"
              >
                Vai alle notifiche
              </button>
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
}

function WorkspaceFilterBar({
  onImport,
  onOpenCreateContractor,
}: {
  onImport: () => void;
  onOpenCreateContractor: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 shadow-none">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid min-w-[720px] grid-cols-[minmax(190px,1fr)_auto_auto_auto_auto] items-center gap-2">
          <label className="relative h-9 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="h-full w-full rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] pl-9 pr-3 text-[12px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              placeholder="Cerca appaltatore..."
              type="search"
            />
          </label>
          <WorkspaceSelect label="Stato: Tutti" />
          <WorkspaceSelect label="Con progetti" />
          <button
            className="h-9 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
            type="button"
          >
            Alert
          </button>
          <WorkspaceSelect label="Ordina: Attivita recente" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          className="flex h-9 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
          onClick={onImport}
          type="button"
        >
          <Upload className="size-4" />
          Importa da Excel
        </button>
        <button
          className="flex h-9 items-center gap-2 rounded-[9px] bg-[var(--accent-primary)] px-3 text-[12px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary-hover)]"
          onClick={onOpenCreateContractor}
          type="button"
        >
          <Plus className="size-4" />
          Nuovo appaltatore
        </button>
      </div>
    </div>
  );
}

function WorkspaceSelect({ className, label }: { className?: string; label: string }) {
  return (
    <button
      className={cn(
        "flex h-9 items-center gap-2 whitespace-nowrap rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]",
        className,
      )}
      type="button"
    >
      {label}
      <ChevronRight className="size-3.5 rotate-90 text-[var(--text-secondary)]" />
    </button>
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
  const toneClass = {
    danger: "text-[var(--danger-base)]",
    info: "text-[var(--info-base)]",
    neutral: "text-[var(--text-secondary)]",
    success: "text-[var(--success-base)]",
    warning: "text-[var(--warning-base)]",
  }[tone];

  return (
    <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5 shadow-none">
      <div className="mb-4 flex items-center gap-3">
        <Icon className={cn("size-4", toneClass)} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      {children}
    </section>
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
  onOpenCreateContractor,
  onOpenFolder,
}: {
  folders: ContractorFolder[];
  onOpenCreateContractor: () => void;
  onOpenFolder: (folderId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        {folders.length > 0 ? (
          folders.map((folder) => {
            const hasCriticalItems = folder.criticalCount > 0 || folder.salWindowCount > 0;

            return (
              <section
                className="rounded-[16px] border border-[var(--info-base)]/25 bg-[var(--surface-base)] p-5 shadow-none ring-1 ring-[var(--info-base)]/15"
                key={folder.id}
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex min-w-0 items-start gap-5">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--accent-primary)]">
                      <FolderOpen className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="truncate text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                          {folder.contractor}
                        </h4>
                        <span
                          className={cn(
                            "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold",
                            hasCriticalItems
                              ? "border-[var(--warning-base)]/20 bg-[var(--warning-soft)] text-[var(--warning-base)]"
                              : "border-[var(--success-base)]/20 bg-[var(--success-soft)] text-[var(--success-base)]",
                          )}
                        >
                          <span className="size-2 rounded-full bg-current" />
                          {hasCriticalItems ? "Presidio" : "Stabile"}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] font-medium text-[var(--text-secondary)]">
                        Gestione completa di contratti, progetti, SAL e controlli.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-[12px] font-medium text-[var(--text-secondary)]">
                    <span>Ultima attivita: 27 apr 2025</span>
                    <MoreVertical className="size-4" />
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 md:grid-cols-5">
                  <FolderMetric
                    label="Valore contratti"
                    value={formatMoney({ amount: folder.budget, currency: "EUR" })}
                  />
                  <FolderMetric label="Contratti" value={`${folder.projectCount}`} />
                  <FolderMetric label="Progetti" value={`${folder.projectCount}`} />
                  <FolderMetric label="SAL" value={`${folder.salCount}`} />
                  <FolderMetric label="Alert" value={`${folder.criticalCount}`} />
                </dl>

                <button
                  className="mt-4 flex h-11 items-center gap-2 rounded-[9px] bg-[var(--accent-primary)] px-5 text-[14px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary-hover)]"
                  onClick={() => onOpenFolder(folder.id)}
                  type="button"
                >
                  Apri workspace
                  <ChevronRight className="size-4" />
                </button>
              </section>
            );
          })
        ) : (
          <button
            className="rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-12 text-center transition-colors hover:bg-[var(--bg-muted)]"
            onClick={onOpenCreateContractor}
            type="button"
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
        )}
      </div>

      {folders.length > 0 ? (
        <div className="rounded-[16px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
            <Building2 className="size-5" />
          </span>
          <div className="mt-5 text-[15px] font-semibold text-[var(--text-primary)]">
            Vuoi aggiungere un nuovo appaltatore?
          </div>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            Crea manualmente o importa da Excel per iniziare subito.
          </p>
          <button
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-[9px] border border-[var(--accent-primary)]/30 px-4 text-[13px] font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[var(--danger-soft)]"
            onClick={onOpenCreateContractor}
            type="button"
          >
            <Plus className="size-4" />
            Nuovo appaltatore
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FolderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-2.5 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
