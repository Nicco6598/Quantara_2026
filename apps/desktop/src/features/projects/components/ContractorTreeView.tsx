import { m } from "framer-motion";
import { Building2, ChevronRight, FileText, FolderKanban } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { MOTION_VARIANTS } from "@/motion";
import type { StatusTone } from "@/components/shared/StatusBadge";
import { BezelSurface } from "@/components/shared/ui-primitives";
import type { PortfolioProject } from "@/features/projects/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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

export function ContractorTreeView({ contractors, onOpenProject }: ContractorTreeViewProps) {
  if (contractors.length === 0) {
    return (
      <BezelSurface innerClassName="p-8 text-center">
        <Building2 className="mx-auto size-8 text-[var(--text-secondary)]" />
        <p className="mt-3 text-13px font-medium text-[var(--text-secondary)]">
          Nessun appaltatore con progetti.
        </p>
      </BezelSurface>
    );
  }

  return (
    <div className="space-y-4">
      {contractors.map((contractor, ci) => (
        <ContractorNodeItem
          contractor={contractor}
          index={ci}
          key={contractor.id}
          onOpenProject={onOpenProject}
        />
      ))}
    </div>
  );
}

function ContractorNodeItem({
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

  return (
    <m.div
      animate={MOTION_VARIANTS.row.whileInView}
      initial={MOTION_VARIANTS.row.initial}
      transition={{
        ...MOTION_VARIANTS.row.transition,
        delay: index * 0.035,
      }}
    >
      <button
        className="flex w-full items-center gap-3 rounded-18px bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] px-4 py-3 text-left ring-1 ring-[var(--border-subtle)]/50 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-muted)_84%,var(--surface-base)_16%)]"
        onClick={() => setCollapsed((c) => !c)}
        type="button"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--info-base)]">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-14px font-semibold text-[var(--text-primary)]">
              {contractor.name}
            </span>
            <span className="shrink-0 rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {contractor.projectCount} progetti
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-12px font-medium text-[var(--text-secondary)]">
            <span>
              Budget:{" "}
              {contractor.budget.toLocaleString("it-IT", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
              })}
            </span>
            <span>
              Impegnato:{" "}
              {contractor.committed.toLocaleString("it-IT", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]",
            !collapsed && "rotate-90",
          )}
        />
      </button>
      <TreeContent collapsed={collapsed}>
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-[var(--border-subtle)]/30 pl-4">
          {contractor.projects.map((project, pi) => (
            <ProjectNodeItem
              index={pi}
              key={project.id}
              onOpenProject={handleOpen}
              project={project}
            />
          ))}
        </div>
      </TreeContent>
    </m.div>
  );
}

function ProjectNodeItem({
  project,
  index,
  onOpenProject,
}: {
  project: ProjectNode;
  index: number;
  onOpenProject: ((projectId: string) => void) | undefined;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const toneBorder =
    project.tone === "danger"
      ? "border-l-[var(--danger-base)]"
      : project.tone === "warning"
        ? "border-l-[var(--warning-base)]"
        : "border-l-[var(--success-base)]";

  return (
    <m.div
      animate={MOTION_VARIANTS.row.whileInView}
      initial={MOTION_VARIANTS.row.initial}
      transition={{
        ...MOTION_VARIANTS.row.transition,
        delay: index * 0.025,
      }}
      className={cn(
        "cursor-pointer rounded-14px border-l-[3px] bg-[color-mix(in_srgb,var(--surface-base)_90%,var(--bg-muted)_10%)] px-3 py-2.5 ring-1 ring-[var(--border-subtle)]/40 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)]",
        toneBorder,
      )}
      onClick={() => onOpenProject?.(project.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderKanban className="size-4 shrink-0 text-[var(--text-secondary)]" />
          <span className="truncate text-13px font-semibold text-[var(--text-primary)]">
            {project.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-11px font-semibold text-[var(--accent-primary)]">
            {project.progress.toFixed(0)}%
          </span>
          <button
            className="flex size-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-secondary)]"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
            type="button"
          >
            <ChevronRight
              className={cn(
                "size-3 transition-transform duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]",
                !collapsed && "rotate-90",
              )}
            />
          </button>
        </div>
      </div>
      <TreeContent collapsed={collapsed}>
        <div className="mt-2 space-y-1.5 pl-5">
          {project.sals.length === 0 ? (
            <div className="py-1 text-11px text-[var(--text-tertiary)]">Nessuna SAL registrata</div>
          ) : (
            project.sals.map((sal) => (
              <div
                className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-muted)]/40 px-2.5 py-1.5"
                key={sal.id}
              >
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
            ))
          )}
        </div>
      </TreeContent>
    </m.div>
  );
}

const SAL_STATUS_TONES: Record<string, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success-base)]",
  info: "bg-[var(--info-soft)] text-[var(--info-base)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
};

const SAL_STATUS_LABELS: Record<string, string> = {
  closed: "Approvata",
  approved: "Approvata",
  "in-review": "Revisione",
  draft: "Bozza",
};

function SalStatusPill({ status }: { status: string }) {
  const tone =
    status === "closed" || status === "approved"
      ? "success"
      : status === "in-review"
        ? "info"
        : "warning";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-9px font-semibold",
        SAL_STATUS_TONES[tone] || SAL_STATUS_TONES.warning,
      )}
    >
      {SAL_STATUS_LABELS[status] || status}
    </span>
  );
}

function TreeContent({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
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
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div ref={innerRef}>{children}</div>
    </m.div>
  );
}
