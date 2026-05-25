import { m } from "framer-motion";
import { Building2, ChevronDown, FileText, FolderKanban, Grid3x3 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { MOTION_VARIANTS, motionDuration, motionEase } from "@/motion";
import { StatusChip } from "@/components/shared/StatusChip";
import type { StatusTone } from "@/components/shared/StatusBadge";
import type { PortfolioProject } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { SAL_STATUS_LABELS, SAL_STATUS_TONE_KEYS } from "@/lib/sal-status";

type SalNode = {
  amount: number;
  date: string;
  id: string;
  status: string;
  title: string;
};

type ProjectNode = {
  budget: number;
  id: string;
  progress: number;
  sals: SalNode[];
  title: string;
  tone: StatusTone;
};

type ContractorNode = {
  budget: number;
  committed: number;
  id: string;
  name: string;
  projectCount: number;
  projects: ProjectNode[];
};

type ContractorTreeViewProps = {
  contractors: ContractorNode[];
  onOpenProject?: (projectId: string) => void;
  onSwitchView?: () => void;
};

export function buildContractorTree(
  projects: PortfolioProject[],
  sals: Array<{ projectId: string; title: string; total: number; date: string; status: string }>,
): ContractorNode[] {
  const salsByProject = new Map<string, SalNode[]>();
  for (const sal of sals) {
    const existing = salsByProject.get(sal.projectId) || [];
    existing.push({
      amount: sal.total,
      date: sal.date,
      id: `${sal.projectId}-${sal.title}`,
      status: sal.status,
      title: sal.title,
    });
    salsByProject.set(sal.projectId, existing);
  }

  const byContractor = new Map<
    string,
    { budget: number; committed: number; projects: ProjectNode[] }
  >();

  for (const p of projects) {
    const contractorId = p.contractor || "Senza appaltatore";
    const existing = byContractor.get(contractorId) || { budget: 0, committed: 0, projects: [] };
    existing.budget += p.budget.amount;

    const projectSals = salsByProject.get(p.id) || [];
    existing.committed += projectSals.reduce((s, sal) => s + sal.amount, 0);
    existing.projects.push({
      budget: p.budget.amount,
      id: p.id,
      progress: p.progress,
      sals: projectSals,
      title: p.title,
      tone: p.tone,
    });
    byContractor.set(contractorId, existing);
  }

  return [...byContractor.entries()]
    .map(([name, data]) => ({
      budget: data.budget,
      committed: data.committed,
      id: name,
      name,
      projectCount: data.projects.length,
      projects: data.projects,
    }))
    .sort((a, b) => b.budget - a.budget);
}

export function ContractorTreeView({
  contractors,
  onOpenProject,
  onSwitchView,
}: ContractorTreeViewProps) {
  const projectCount = contractors.reduce((sum, c) => sum + c.projectCount, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] px-5 py-4">
        <div>
          <h2 className="text-15px font-semibold text-[var(--text-primary)]">Albero appaltatori</h2>
          <p className="mt-0.5 text-12px text-[var(--text-secondary)]">
            {contractors.length} appaltatori · {projectCount} progetti
          </p>
        </div>
        {onSwitchView && (
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_80%,var(--bg-muted)_20%)] px-4 py-2 text-12px font-semibold text-[var(--text-primary)] transition-all duration-[var(--duration-fast)] ease-standard"
            onClick={onSwitchView}
            type="button"
          >
            <Grid3x3 className="size-3.5" />
            Vista griglia
          </button>
        )}
      </div>

      {contractors.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="text-center">
            <Building2 className="mx-auto size-8 text-[var(--text-tertiary)]" />
            <p className="mt-3 text-13px font-medium text-[var(--text-secondary)]">
              Nessun appaltatore con progetti.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {contractors.map((contractor, ci) => (
            <ContractorGraphNode
              contractor={contractor}
              index={ci}
              key={contractor.id}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Connector elements ─── */

function VLine({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-px bg-[color-mix(in_srgb,var(--border-subtle)_44%,transparent)]", className)}
    />
  );
}

function ConnectorDot({ tone }: { tone?: StatusTone }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full ring-2 ring-[var(--surface-base)]",
        tone === "danger"
          ? "bg-[var(--danger-base)]"
          : tone === "warning"
            ? "bg-[var(--warning-base)]"
            : tone === "success"
              ? "bg-[var(--success-base)]"
              : "bg-[color-mix(in_srgb,var(--border-subtle)_52%,transparent)]",
      )}
    />
  );
}

function HLine({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-px bg-[color-mix(in_srgb,var(--border-subtle)_44%,transparent)]", className)}
    />
  );
}

/* ─── Contractor ─── */

function ContractorGraphNode({
  contractor,
  index,
  onOpenProject,
}: {
  contractor: ContractorNode;
  index: number;
  onOpenProject: ((projectId: string) => void) | undefined;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const handleOpen = onOpenProject ?? (() => {});
  const hasChildren = contractor.projects.length > 0;
  const commitRatio =
    contractor.budget > 0 ? Math.min(100, (contractor.committed / contractor.budget) * 100) : 0;

  return (
    <m.div
      animate={MOTION_VARIANTS.row.whileInView}
      initial={MOTION_VARIANTS.row.initial}
      transition={{
        ...MOTION_VARIANTS.row.transition,
        delay: index * 0.05,
      }}
      className="relative"
    >
      {hasChildren && !collapsed && (
        <VLine className="absolute left-[31px] top-[64px] bottom-0 z-0" />
      )}

      <div className="group relative rounded-[26px] bg-[color-mix(in_srgb,var(--border-subtle)_48%,transparent)] p-[2px] shadow-[0_8px_24px_color-mix(in_srgb,var(--text-primary)_5%,transparent)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--text-primary)_10%,transparent)] motion-safe:active:scale-[0.995]">
        <button
          className="relative z-10 flex w-full items-center gap-4 rounded-[24px] bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)] px-5 py-3.5 text-left shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)] outline-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-base)_88%,var(--bg-muted)_12%)]"
          onClick={() => setCollapsed((c) => !c)}
          type="button"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-b from-[var(--info-soft)] to-[color-mix(in_srgb,var(--info-soft)_80%,var(--bg-muted)_20%)] text-[var(--info-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:scale-105">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="truncate text-15px font-semibold text-[var(--text-primary)]">
                {contractor.name}
              </span>
              <span className="shrink-0 rounded-full bg-[var(--bg-muted-strong)] px-2.5 py-0.5 text-10px font-semibold text-[var(--text-secondary)] tracking-[-0.01em]">
                {contractor.projectCount}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-3 text-12px font-medium text-[var(--text-secondary)] tabular-nums">
                <span>
                  {contractor.budget.toLocaleString("it-IT", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                  })}
                </span>
                <span className="size-1 rounded-full bg-[var(--text-tertiary)]/30" />
                <span>
                  Impegnato{" "}
                  {contractor.committed.toLocaleString("it-IT", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
              {contractor.budget > 0 && (
                <span className="text-11px font-semibold text-[var(--accent-primary)] tabular-nums">
                  {commitRatio.toFixed(0)}%
                </span>
              )}
            </div>
            {contractor.budget > 0 && (
              <div className="mt-2 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border-subtle)_44%,transparent)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)]"
                  style={{ width: `${commitRatio}%` }}
                />
              </div>
            )}
          </div>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--bg-muted)_50%,transparent)] text-[var(--text-tertiary)] transition-transform duration-[var(--duration-base)] ease-standard shrink-0",
              !collapsed && "rotate-180",
            )}
          >
            <ChevronDown className="size-4" />
          </span>
        </button>
      </div>

      <GraphChildren collapsed={collapsed}>
        <div className="ml-[31px] mt-4 space-y-3">
          {contractor.projects.map((project, pi) => (
            <ProjectGraphNode
              index={pi}
              isLast={pi === contractor.projects.length - 1}
              key={project.id}
              onOpenProject={handleOpen}
              project={project}
            />
          ))}
        </div>
      </GraphChildren>
    </m.div>
  );
}

/* ─── Project ─── */

function ProjectGraphNode({
  isLast,
  project,
  index,
  onOpenProject,
}: {
  isLast: boolean;
  project: ProjectNode;
  index: number;
  onOpenProject: ((projectId: string) => void) | undefined;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasSals = project.sals.length > 0;

  return (
    <m.div
      animate={MOTION_VARIANTS.row.whileInView}
      className="relative"
      initial={MOTION_VARIANTS.row.initial}
      transition={{
        ...MOTION_VARIANTS.row.transition,
        delay: index * 0.03,
      }}
    >
      {hasSals && !collapsed && <VLine className="absolute left-[13px] top-[40px] bottom-0 z-0" />}

      <div className="relative flex items-start gap-3">
        <div className="relative mt-5 flex shrink-0 items-center">
          {!isLast ? (
            <VLine className="absolute -top-5 bottom-0 left-px" />
          ) : (
            <VLine className="absolute -top-5 h-[26px] left-px" />
          )}
          <div className="flex items-center">
            <HLine className="w-3" />
            <ConnectorDot
              tone={
                project.tone === "danger"
                  ? "danger"
                  : project.tone === "warning"
                    ? "warning"
                    : "success"
              }
            />
          </div>
        </div>

        <div className="relative z-10 flex min-w-0 flex-1 items-stretch gap-2">
          <button
            className={cn(
              "flex-1 rounded-18px px-4 py-3 text-left ring-1 outline-none transition-all duration-[var(--duration-base)] ease-standard focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
              project.tone === "danger"
                ? "bg-[color-mix(in_srgb,var(--danger-soft)_60%,var(--surface-base)_40%)] ring-[color-mix(in_srgb,var(--danger-base)_20%,transparent)]"
                : project.tone === "warning"
                  ? "bg-[color-mix(in_srgb,var(--warning-soft)_60%,var(--surface-base)_40%)] ring-[color-mix(in_srgb,var(--warning-base)_18%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] ring-[color-mix(in_srgb,var(--border-subtle)_44%,transparent)]",
            )}
            onClick={() => onOpenProject?.(project.id)}
            type="button"
          >
            <div className="flex items-center gap-2">
              <FolderKanban
                className={cn(
                  "size-4 shrink-0",
                  project.tone === "danger"
                    ? "text-[var(--danger-base)]"
                    : project.tone === "warning"
                      ? "text-[var(--warning-base)]"
                      : "text-[var(--text-tertiary)]",
                )}
              />
              <span className="truncate text-13px font-semibold text-[var(--text-primary)]">
                {project.title}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-11px font-medium text-[var(--text-secondary)] tabular-nums">
              {formatMoney({ amount: project.budget, currency: "EUR" })}
              <span
                className={cn(
                  "ml-auto font-semibold",
                  project.tone === "danger"
                    ? "text-[var(--danger-base)]"
                    : project.tone === "warning"
                      ? "text-[var(--warning-base)]"
                      : "text-[var(--info-base)]",
                )}
              >
                {project.progress.toFixed(0)}%
              </span>
            </div>
          </button>

          {hasSals && (
            <button
              className="flex shrink-0 items-center justify-center rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_44%,transparent)] px-3 text-[var(--text-tertiary)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_36%,transparent)] outline-none transition-all duration-[var(--duration-base)] ease-standard hover:bg-[color-mix(in_srgb,var(--bg-muted)_60%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Mostra SAL" : "Nascondi SAL"}
              type="button"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-[var(--duration-base)] ease-standard",
                  !collapsed && "rotate-180",
                )}
              />
            </button>
          )}
        </div>
      </div>

      <GraphChildren collapsed={collapsed}>
        <div className="ml-[61px] mt-2 space-y-1.5">
          {project.sals.map((sal, si) => (
            <SalGraphLeaf isLast={si === project.sals.length - 1} key={sal.id} sal={sal} />
          ))}
        </div>
      </GraphChildren>
    </m.div>
  );
}

/* ─── SAL ─── */

function SalGraphLeaf({ isLast, sal }: { isLast: boolean; sal: SalNode }) {
  return (
    <m.div
      animate={MOTION_VARIANTS.row.whileInView}
      className="relative flex items-center gap-2"
      initial={MOTION_VARIANTS.row.initial}
      transition={{
        ...MOTION_VARIANTS.row.transition,
        delay: 0.02,
      }}
    >
      <div className="relative flex shrink-0 items-center">
        {!isLast ? (
          <VLine className="absolute -top-3 bottom-0 left-px" />
        ) : (
          <VLine className="absolute -top-3 h-[14px] left-px" />
        )}
        <div className="flex items-center">
          <HLine className="w-2.5" />
          <span className="size-1.5 rounded-full bg-[color-mix(in_srgb,var(--border-subtle)_38%,transparent)] ring-2 ring-[var(--surface-base)]" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-14px bg-[color-mix(in_srgb,var(--bg-muted)_44%,transparent)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className="truncate text-12px font-medium text-[var(--text-primary)]">
            {sal.title}
          </span>
          <SalStatusPill status={sal.status} />
        </div>
        <span className="shrink-0 text-12px font-semibold tabular-nums text-[var(--accent-primary)]">
          {formatMoney({ amount: sal.amount, currency: "EUR" })}
        </span>
      </div>
    </m.div>
  );
}

/* ─── Status pill ─── */

function SalStatusPill({ status }: { status: string }) {
  const tone = SAL_STATUS_TONE_KEYS[status] ?? "warning";

  return (
    <StatusChip size="sm" tone={tone}>
      {SAL_STATUS_LABELS[status] || status}
    </StatusChip>
  );
}

/* ─── Collapsible container ─── */

function GraphChildren({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (innerRef.current && h === null) {
      setH(innerRef.current.scrollHeight);
    }
  }, [h]);

  return (
    <m.div
      animate={{ height: collapsed ? 0 : (h ?? 0) + 2 }}
      className="overflow-hidden"
      initial={h === null ? { height: "auto" } : false}
      transition={{ duration: motionDuration.base, ease: motionEase.standard }}
    >
      <div ref={innerRef}>{children}</div>
    </m.div>
  );
}
