import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderKanban,
  MoreVertical,
  Plus,
  Upload,
} from "lucide-react";
import { SectionPanel } from "@/components/shared/Screen";
import type { PortfolioProject } from "@/features/projects/types";
import { formatDueWindow } from "@/features/projects/utils/projects-helpers";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { EmptyState } from "./workspace-ui";

type ProjectsWorkbenchProps = {
  onCreateProject: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenProjectActions: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  projects: PortfolioProject[];
  query: string;
  selectedProjectId: string;
};

export function ProjectsWorkbench({
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
    <SectionPanel className="p-0">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex h-10 items-center gap-2 rounded-[9px] bg-[var(--info-base)] px-4 text-[13px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary-hover)]"
              onClick={onCreateProject}
              type="button"
            >
              <Plus className="size-4" />
              Nuovo progetto
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
              onClick={onImport}
              type="button"
            >
              <Upload className="size-4" />
              Import template
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
              type="button"
            >
              <CheckCircle2 className="size-4" />
              Commit
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex h-10 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
              onClick={onImport}
              type="button"
            >
              <Download className="size-4" />
              Template
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
              onClick={onExport}
              type="button"
            >
              <FileSpreadsheet className="size-4" />
              Export
            </button>
            <button
              aria-label="Altre azioni"
              className="flex size-10 items-center justify-center rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              type="button"
            >
              <MoreVertical className="size-4" />
            </button>
          </div>
        </div>

        <div>
          <h3 className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">
            Workbench dei progetti attivi
          </h3>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Riga per riga: presidio, EAC, SAL, forecast e rischio materiale.
          </p>
          {query.trim().length > 0 ? (
            <div className="mt-2 inline-flex rounded-[8px] bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--info-base)]">
              Filtro: {query.trim()}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-3 mt-3 hidden h-10 grid-cols-[1.35fr_0.8fr_0.7fr_0.72fr_0.85fr_0.8fr_120px] items-center rounded-t-[12px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] xl:grid">
        <span>Progetto / contratto</span>
        <span>Stato</span>
        <span>PM</span>
        <span>EAC</span>
        <span>SAL</span>
        <span>Progresso</span>
        <span className="text-right">Azioni</span>
      </div>

      <div className="space-y-0 p-3 pt-0">
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
    </SectionPanel>
  );
}

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

  return (
    <article
      className={cn(
        "group relative border bg-[var(--surface-base)] p-4 shadow-none transition hover:bg-[var(--surface-inset)] xl:grid xl:min-h-[70px] xl:grid-cols-[1.35fr_0.8fr_0.7fr_0.72fr_0.85fr_0.8fr_120px] xl:items-center xl:gap-3",
        isSelected
          ? "rounded-[12px] border-[var(--accent-primary)]/40 xl:border-[var(--danger-base)]/60"
          : "border-[var(--border-subtle)]/80 first:rounded-t-[12px] last:rounded-b-[12px]",
      )}
    >
      <button className="min-w-0 text-left" onClick={() => onOpenProject(project)} type="button">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
              toneClass,
            )}
          >
            <FolderKanban className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
              {project.title}
            </div>
            <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
              {project.lot} · {project.location}
            </div>
            <div className="mt-1 truncate text-[11px] font-medium text-[var(--text-secondary)] xl:hidden">
              {project.materialRisk}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2 xl:mt-0 xl:block">
        <span
          className={cn("rounded-[8px] px-2 py-1 text-[11px] font-semibold", {
            "bg-[var(--danger-soft)] text-[var(--danger-base)]": project.tone === "danger",
            "bg-[var(--success-soft)] text-[var(--success-base)]": project.tone === "success",
            "bg-[var(--warning-soft)] text-[var(--warning-base)]": project.tone === "warning",
          })}
        >
          {project.healthLabel}
        </span>
        <div className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
          {project.salState}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 xl:mt-0">
        <span className="flex size-8 items-center justify-center rounded-full bg-[var(--info-soft)] text-[11px] font-semibold text-[var(--info-base)]">
          {project.manager
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </span>
        <span className="text-[11px] text-[var(--text-secondary)]">{project.manager}</span>
      </div>

      <WorkbenchMetric detail={project.variance} label="EAC" value={formatMoney(project.budget)} />
      <WorkbenchMetric
        detail={formatDueWindow(project.salDays)}
        label="SAL"
        value={formatMoney(project.salValue)}
      />

      <div className="mt-3 xl:mt-0">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">
          {formatPercent(project.progress)}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
          <div
            className={cn(
              "h-full rounded-full",
              project.tone === "danger"
                ? "bg-[var(--danger-base)]"
                : project.tone === "warning"
                  ? "bg-[var(--warning-base)]"
                  : "bg-[var(--info-base)]",
            )}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 xl:mt-0 xl:justify-end">
        <button
          className="flex h-9 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 text-[12px] font-medium text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]"
          onClick={() => onOpenProject(project)}
          type="button"
        >
          Apri dossier
        </button>
        <button
          aria-label={`Azioni per ${project.title}`}
          className="flex size-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          onClick={() => onOpenProjectActions(project)}
          type="button"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </article>
  );
}

function WorkbenchMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[12px] border border-[var(--border-subtle)]/80 bg-[var(--bg-muted)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}
