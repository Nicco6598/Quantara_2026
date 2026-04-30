import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderKanban,
  MapPin,
  MoreVertical,
  Plus,
  TrendingUp,
  Upload,
  User,
} from "lucide-react";
import { memo, type ReactNode } from "react";
import type { PortfolioProject } from "@/features/projects/types";
import { formatDueWindow } from "@/features/projects/utils/projects-helpers";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { BezelSurface, EmptyState, ProjectControlButton } from "./workspace-ui";

type ProjectsWorkbenchProps = {
  children?: ReactNode;
  onCreateProject: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  projects: PortfolioProject[];
  query: string;
  selectedProjectId: string;
};

export const ProjectsWorkbench = memo(function ProjectsWorkbench({
  children,
  onCreateProject,
  onExport,
  onImport,
  onOpenProjectActions,
  onOpenProject,
  projects,
  query,
  selectedProjectId,
}: ProjectsWorkbenchProps) {
  return (
    <BezelSurface innerClassName="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4">
        {children ? (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">{children}</div>
            <div className="flex flex-wrap items-center gap-2">
              <ProjectControlButton
                className="text-[13px]"
                icon={Plus}
                onClick={onCreateProject}
                variant="primary"
              >
                Nuovo progetto
              </ProjectControlButton>
              <ProjectControlButton icon={Upload} onClick={onImport} variant="neutral">
                Importa
              </ProjectControlButton>
              <ProjectControlButton icon={FileSpreadsheet} onClick={onExport} variant="neutral">
                Export
              </ProjectControlButton>
              <ProjectControlButton aria-label="Altre azioni" icon={MoreVertical} variant="icon">
                <span className="sr-only">Altre azioni</span>
              </ProjectControlButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectControlButton
                className="text-[13px]"
                icon={Plus}
                onClick={onCreateProject}
                variant="primary"
              >
                Nuovo progetto
              </ProjectControlButton>
              <ProjectControlButton icon={Upload} onClick={onImport} variant="neutral">
                Import template
              </ProjectControlButton>
              <ProjectControlButton icon={CheckCircle2} variant="neutral">
                Commit
              </ProjectControlButton>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ProjectControlButton icon={Download} onClick={onImport} variant="neutral">
                Template
              </ProjectControlButton>
              <ProjectControlButton icon={FileSpreadsheet} onClick={onExport} variant="neutral">
                Export
              </ProjectControlButton>
              <ProjectControlButton aria-label="Altre azioni" icon={MoreVertical} variant="icon">
                <span className="sr-only">Altre azioni</span>
              </ProjectControlButton>
            </div>
          </div>
        )}

        <div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Riga per riga: presidio, EAC, SAL, forecast e rischio materiale.
          </p>
          {query.trim().length > 0 ? (
            <div className="mt-2 inline-flex rounded-[8px] bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--info-base)]">
              Filtro: {query.trim()}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-3 mt-3 hidden h-10 grid-cols-[1.35fr_0.8fr_0.7fr_0.72fr_0.85fr_0.8fr_120px] items-center rounded-[16px] border border-[var(--border-subtle)]/60 bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] xl:grid">
        <span>Progetto / contratto</span>
        <span>Stato</span>
        <span>PM</span>
        <span>EAC</span>
        <span>SAL</span>
        <span>Progresso</span>
        <span className="text-right">Azioni</span>
      </div>

      <div className="space-y-3 p-3 pt-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <WorkbenchRow
              isSelected={project.id === selectedProjectId}
              key={project.id}
              onOpenProjectActions={onOpenProjectActions}
              onOpenProject={onOpenProject}
              project={project}
            />
          ))
        ) : (
          <div className="p-8">
            <EmptyState
              description="Prova a cambiare perimetro o a ripulire la ricerca."
              title="Nessun progetto trovato"
            />
          </div>
        )}
      </div>
    </BezelSurface>
  );
});

function WorkbenchRow({
  isSelected,
  onOpenProjectActions,
  onOpenProject,
  project,
}: {
  isSelected: boolean;
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  project: PortfolioProject;
}) {
  const toneClass =
    project.tone === "warning"
      ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
      : project.tone === "danger"
        ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
        : "bg-[var(--success-soft)] text-[var(--success-base)]";

  const progressBarClass =
    project.tone === "danger"
      ? "bg-[var(--danger-base)]"
      : project.tone === "warning"
        ? "bg-[var(--warning-base)]"
        : "bg-[var(--info-base)]";

  const borderAccentClass =
    project.tone === "danger"
      ? "border-l-[var(--danger-base)]"
      : project.tone === "warning"
        ? "border-l-[var(--warning-base)]"
        : "border-l-[var(--success-base)]";

  return (
    <motion.article
      className={cn(
        "group relative cursor-pointer rounded-[20px] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_60%,transparent)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] xl:p-5",
        isSelected
          ? "ring-1 ring-[var(--accent-primary)]/40 bg-[color-mix(in_srgb,var(--info-soft)_28%,var(--surface-base)_72%)]"
          : "bg-[var(--surface-base)] hover:shadow-[0_8px_28px_-12px_rgba(0,0,0,0.12)]",
      )}
      initial={false}
      layout
      onClick={() => onOpenProject(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenProject(project);
        }
      }}
      role="button"
      tabIndex={0}
      {...(!isSelected
        ? {
            style: {
              backgroundImage:
                'linear-gradient(135deg, color-mix(in_srgb, var(--info-base) 3%, transparent), transparent 55%)',
            },
          }
        : {})}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-3 h-[calc(100%-24px)] w-[3px] rounded-r-full transition-opacity duration-500",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
          borderAccentClass,
        )}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between 2xl:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 xl:gap-4">
          <motion.div
            className={cn(
              "relative flex size-11 shrink-0 items-center justify-center rounded-[14px] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]",
              toneClass,
            )}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.05 }}
          >
            <FolderKanban className="size-5" />
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] font-bold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)] xl:text-[16px]">
                {project.title}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  toneClass,
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {project.healthLabel}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {project.lot} · {project.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5" />
                {project.manager}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                {project.nextMilestone}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)] xl:hidden">
              <WorkbenchInlineBadge
                detail={project.variance}
                label="EAC"
                value={formatMoney(project.budget)}
              />
              <WorkbenchInlineBadge
                detail={formatDueWindow(project.salDays)}
                label="SAL"
                value={formatMoney(project.salValue)}
              />
              <div className="flex items-center gap-2 rounded-[10px] bg-[var(--bg-muted)] px-2.5 py-1.5">
                <TrendingUp className="size-3.5 text-[var(--text-secondary)]" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatPercent(project.progress)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-5 xl:flex">
          <WorkbenchMiniMetric
            detail={project.variance}
            label="EAC"
            value={formatMoney(project.budget)}
          />
          <WorkbenchMiniMetric
            detail={formatDueWindow(project.salDays)}
            label="SAL"
            value={formatMoney(project.salValue)}
          />

          <div className="flex w-[88px] flex-col items-center">
            <div className="relative flex size-[52px] items-center justify-center">
              <svg aria-label={`${project.progress}% completato`} className="absolute inset-0 size-[52px] -rotate-90" viewBox="0 0 52 52" role="img">
                <circle
                  className="text-[var(--bg-muted-strong)]"
                  cx="26"
                  cy="26"
                  fill="none"
                  r="21"
                  strokeWidth="5"
                  stroke="currentColor"
                />
                <circle
                  className={progressBarClass.replace("bg-", "text-")}
                  cx="26"
                  cy="26"
                  fill="none"
                  r="21"
                  strokeWidth="5"
                  stroke="currentColor"
                  strokeDasharray={`${(project.progress / 100) * 132} 132`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[11px] font-bold text-[var(--text-primary)]">
                {formatPercent(project.progress)}
              </span>
            </div>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Progresso
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-end xl:self-center">
          <ProjectControlButton
            className="h-9 px-4 text-[12px] font-semibold"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenProject(project);
            }}
            variant="neutral"
          >
            Apri dossier
          </ProjectControlButton>
          <ProjectControlButton
            aria-label={`Azioni per ${project.title}`}
            className="size-9"
            icon={MoreVertical}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenProjectActions(project);
            }}
            variant="icon"
          >
            <span className="sr-only">Azioni per {project.title}</span>
          </ProjectControlButton>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)]/60 pt-3 text-[11px] font-medium text-[var(--text-secondary)] xl:mt-3 xl:pt-2.5">
        <span>{project.phase}</span>
        <span className="text-[var(--border-subtle)]">·</span>
        <span>{project.materialRisk}</span>
        <span className="text-[var(--border-subtle)]">·</span>
        <span>{project.salState}</span>
        {project.forecastDeltaDays !== 0 ? (
          <>
            <span className="text-[var(--border-subtle)]">·</span>
            <span
              className={cn(
                "font-semibold",
                project.forecastDeltaDays > 0
                  ? "text-[var(--danger-base)]"
                  : "text-[var(--success-base)]",
              )}
            >
              {project.forecastDeltaDays > 0
                ? `+${project.forecastDeltaDays}gg`
                : `${project.forecastDeltaDays}gg`}
            </span>
          </>
        ) : null}
      </div>
    </motion.article>
  );
}

function WorkbenchMiniMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-bold leading-none text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}

function WorkbenchInlineBadge({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] bg-[var(--bg-muted)] px-2.5 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="text-[12px] font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}
