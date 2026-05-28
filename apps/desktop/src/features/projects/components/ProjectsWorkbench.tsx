import { m } from "framer-motion";
import {
  Calendar,
  Eye,
  FileSpreadsheet,
  FolderKanban,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { type MouseEvent, memo, type ReactNode, useRef, useState } from "react";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { Button } from "@/components/shared/Button";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { Panel } from "@/components/shared/Panel";
import { statusToneStyles } from "@/components/shared/StatusBadge";
import type { PortfolioProject } from "@/features/projects/types";
import { formatDueWindow } from "@/features/projects/utils/projects-helpers";
import { useContextMenu } from "@/hooks/useContextMenu";
import { buildProjectRowContextMenuEntries } from "@/lib/context-menu-presets";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MOTION_VARIANTS } from "@/motion";

type ProjectsWorkbenchProps = {
  children?: ReactNode;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onEditProject: (project: PortfolioProject) => void;
  onExport: () => void;
  onImport: () => void;
  onOpenProject: (project: PortfolioProject) => void;
  projects: PortfolioProject[];
  query: string;
  selectedProjectId: string;
};

export const ProjectsWorkbench = memo(function ProjectsWorkbench({
  children,
  onCreateProject,
  onDeleteProject,
  onEditProject,
  onExport,
  onImport,
  onOpenProject,
  projects,
  query,
  selectedProjectId,
}: ProjectsWorkbenchProps) {
  const projectContextMenu = useContextMenu<PortfolioProject>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  return (
    <Panel padding="none">
      <div className="flex flex-col gap-4 border-b border-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">{children}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="text-13px text-[var(--text-inverse)]"
              icon={Plus}
              onClick={onCreateProject}
              variant="primary"
            >
              Nuovo progetto
            </Button>
            <div ref={actionsRef}>
              <Button
                aria-label="Azioni"
                icon={MoreVertical}
                onClick={() => setActionsOpen((v) => !v)}
                variant="icon"
              >
                <span className="sr-only">Azioni</span>
              </Button>
              <DropdownMenu
                isOpen={actionsOpen}
                onClose={() => setActionsOpen(false)}
                triggerRef={actionsRef}
              >
                <DropdownItem
                  icon={Upload}
                  label="Importa"
                  onClick={() => {
                    onImport();
                    setActionsOpen(false);
                  }}
                />
                <DropdownItem
                  icon={FileSpreadsheet}
                  label="Export"
                  onClick={() => {
                    onExport();
                    setActionsOpen(false);
                  }}
                />
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div>
          <p className="text-13px text-[var(--text-secondary)]">
            Progetti con SAL, budget, scadenze e avanzamento leggibili al primo sguardo.
          </p>
          {query.trim().length > 0 ? (
            <div className="mt-2 inline-flex rounded-18px bg-[var(--info-soft)] px-2.5 py-1 text-11px font-semibold text-[var(--info-base)]">
              Filtro: {query.trim()}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-4 mt-3 hidden h-9 grid-cols-[1.45fr_0.78fr_0.72fr_1fr_0.78fr_64px] items-center rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_56%,transparent)] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] px-3 text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)] xl:grid">
        <span>Progetto / contratto</span>
        <span>Stato</span>
        <span>PM</span>
        <span>SAL operativo</span>
        <span>Progresso</span>
        <span className="text-right">Azioni</span>
      </div>

      <div className="space-y-3 p-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <WorkbenchRow
              isSelected={project.id === selectedProjectId}
              key={project.id}
              onContextMenu={(event) => projectContextMenu.open(event, project)}
              onDeleteProject={onDeleteProject}
              onEditProject={onEditProject}
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

      {projectContextMenu.state ? (
        <AppContextMenu
          entries={buildProjectRowContextMenuEntries({
            onOpen: () => {
              const state = projectContextMenu.state;
              if (!state) return;
              onOpenProject(state.context);
            },
            onEdit: () => {
              const state = projectContextMenu.state;
              if (!state) return;
              onEditProject(state.context);
            },
            onDelete: () => {
              const state = projectContextMenu.state;
              if (!state) return;
              onDeleteProject(state.context.id);
            },
          })}
          header={{
            title: projectContextMenu.state.context.title,
            subtitle: projectContextMenu.state.context.contractor,
          }}
          onClose={projectContextMenu.close}
          position={{
            x: projectContextMenu.state.x,
            y: projectContextMenu.state.y,
          }}
        />
      ) : null}
    </Panel>
  );
});

function WorkbenchRow({
  isSelected,
  onContextMenu,
  onDeleteProject,
  onEditProject,
  onOpenProject,
  project,
}: {
  isSelected: boolean;
  onContextMenu: (event: MouseEvent) => void;
  onDeleteProject: (projectId: string) => void;
  onEditProject: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  project: PortfolioProject;
}) {
  const toneClass = statusToneStyles[project.tone];
  const progressColor = statusToneStyles[project.tone];
  const salProgress =
    project.budget.amount > 0
      ? Math.min(100, (project.salValue.amount / project.budget.amount) * 100)
      : 0;

  return (
    <div className="relative">
      <m.article
        animate={MOTION_VARIANTS.card.whileInView}
        className={cn(
          "cursor-pointer overflow-hidden rounded-26px p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--text-primary)_5%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_52%,transparent)]",
          isSelected
            ? "bg-[color-mix(in_srgb,var(--info-soft)_28%,var(--surface-base)_72%)]"
            : "bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)]",
        )}
        exit={{ opacity: 0, scale: 0.994, y: 10 }}
        initial={MOTION_VARIANTS.card.initial}
        layout
        onClick={() => onOpenProject(project)}
        onContextMenu={onContextMenu}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenProject(project);
          }
        }}
        role="button"
        tabIndex={0}
        transition={MOTION_VARIANTS.card.transition}
      >
        <div className="hidden grid-cols-[1.45fr_0.78fr_0.72fr_1fr_0.78fr_64px] items-center gap-3 xl:grid">
          <ProjectIdentity project={project} toneClass={toneClass} />
          <ProjectStatus project={project} toneClass={toneClass} />
          <ProjectManager project={project} />
          <SalCockpit project={project} salProgress={salProgress} />
          <ProjectProgress progress={project.progress} progressColor={progressColor} />
          <div />
        </div>

        <div className="flex flex-col gap-4 xl:hidden">
          <div className="flex min-w-0 items-start gap-3">
            <ProjectIcon toneClass={toneClass} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate text-15px font-semibold leading-tight text-[var(--text-primary)]">
                  {project.title}
                </h3>
                <ProjectStatusPill project={project} toneClass={toneClass} />
              </div>
              <ProjectMeta project={project} />
            </div>
          </div>

          <SalCockpit project={project} salProgress={salProgress} />

          <div className="grid grid-cols-2 gap-2">
            <InlineMetric
              detail={project.variance}
              label="Budget"
              value={formatMoney(project.budget)}
            />
            <InlineMetric
              detail={project.phase}
              label="Progresso"
              value={formatPercent(project.progress)}
            />
          </div>
        </div>
      </m.article>

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <ProjectActionsDropdown
          onDeleteProject={onDeleteProject}
          onEditProject={onEditProject}
          onOpenProject={onOpenProject}
          project={project}
        />
      </div>
    </div>
  );
}
function ProjectIdentity({ project, toneClass }: { project: PortfolioProject; toneClass: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProjectIcon toneClass={toneClass} />
      <div className="min-w-0">
        <div className="truncate text-15px font-semibold leading-tight text-[var(--text-primary)]">
          {project.title}
        </div>
        <ProjectMeta project={project} />
      </div>
    </div>
  );
}

function ProjectIcon({ toneClass }: { toneClass: string }) {
  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center rounded-22px shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_80%,transparent)]",
        toneClass,
      )}
    >
      <FolderKanban className="size-5" />
    </span>
  );
}

function ProjectMeta({ project }: { project: PortfolioProject }) {
  return (
    <div className="mt-1 flex min-w-0 items-center gap-2 text-12px font-medium text-[var(--text-secondary)]">
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">
        {project.lot} · {project.location}
      </span>
    </div>
  );
}

function ProjectStatus({ project, toneClass }: { project: PortfolioProject; toneClass: string }) {
  return (
    <div className="min-w-0">
      <ProjectStatusPill project={project} toneClass={toneClass} />
      <div className="mt-1 truncate text-11px font-medium text-[var(--text-secondary)]">
        {project.phase}
      </div>
    </div>
  );
}

function ProjectStatusPill({
  project,
  toneClass,
}: {
  project: PortfolioProject;
  toneClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-18px px-2 py-1 text-11px font-semibold",
        toneClass,
      )}
      title={project.healthLabel}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{project.healthLabel}</span>
    </span>
  );
}

function ProjectManager({ project }: { project: PortfolioProject }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
        {project.manager}
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1 text-11px font-medium text-[var(--text-secondary)]">
        <Calendar className="size-3.5 shrink-0" />
        <span className="truncate">{project.nextMilestone}</span>
      </div>
    </div>
  );
}

function SalCockpit({ project, salProgress }: { project: PortfolioProject; salProgress: number }) {
  return (
    <div className="min-w-0 rounded-22px bg-[color-mix(in_srgb,var(--bg-muted)_62%,transparent)] p-3 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_42%,transparent)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
            SAL
          </div>
          <div className="mt-1 truncate text-15px font-semibold leading-none text-[var(--text-primary)]">
            {formatMoney(project.salValue)}
          </div>
          <div className="mt-1 truncate text-11px font-medium text-[var(--text-secondary)]">
            {project.salState}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-12px font-semibold text-[var(--accent-primary)]">
            {Math.round(salProgress)}%
          </div>
          <div className="mt-1 text-10px font-medium text-[var(--text-secondary)]">
            {formatDueWindow(project.salDays)}
          </div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-18px bg-[color-mix(in_srgb,var(--border-subtle)_64%,transparent)]">
        <m.div
          className="h-full rounded-18px bg-[var(--accent-primary)]"
          initial={MOTION_VARIANTS.progress.initial}
          style={{ originX: 0 }}
          transition={MOTION_VARIANTS.progress.transition}
          viewport={MOTION_VARIANTS.progress.viewport}
          whileInView={{ scaleX: salProgress / 100 }}
        />
      </div>
    </div>
  );
}

function ProjectProgress({ progress, progressColor }: { progress: number; progressColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex size-12 items-center justify-center">
        <svg
          aria-label={`${progress}% completato`}
          className="absolute inset-0 size-12 -rotate-90"
          role="img"
          viewBox="0 0 48 48"
        >
          <circle
            className="text-[var(--bg-muted-strong)]"
            cx="24"
            cy="24"
            fill="none"
            r="19"
            stroke="currentColor"
            strokeWidth="4.5"
          />
          <circle
            className={progressColor}
            cx="24"
            cy="24"
            fill="none"
            r="19"
            stroke="currentColor"
            strokeDasharray={`${(progress / 100) * 119.4} 119.4`}
            strokeLinecap="round"
            strokeWidth="4.5"
          />
        </svg>
        <span className="text-11px font-bold text-[var(--text-primary)]">
          {formatPercent(progress)}
        </span>
      </div>
    </div>
  );
}

function ProjectActionsDropdown({
  onDeleteProject,
  onEditProject,
  onOpenProject,
  project,
}: {
  onDeleteProject: (projectId: string) => void;
  onEditProject: (project: PortfolioProject) => void;
  onOpenProject: (project: PortfolioProject) => void;
  project: PortfolioProject;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex justify-end" ref={menuRef}>
      <Button
        aria-label={`Azioni per ${project.title}`}
        style={{ borderRadius: "26px" }}
        icon={MoreVertical}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          setIsOpen((v) => !v);
        }}
        variant="icon"
      >
        <span className="sr-only">Azioni per {project.title}</span>
      </Button>
      <DropdownMenu isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={menuRef}>
        <DropdownItem
          icon={Eye}
          label="Apri dossier"
          onClick={() => {
            setIsOpen(false);
            onOpenProject(project);
          }}
        />
        <DropdownItem
          icon={Pencil}
          label="Modifica progetto"
          onClick={() => {
            setIsOpen(false);
            onEditProject(project);
          }}
        />
        <DropdownDivider />
        <DropdownItem
          icon={Trash2}
          label="Elimina progetto"
          onClick={() => {
            setIsOpen(false);
            onDeleteProject(project.id);
          }}
          tone="danger"
        />
      </DropdownMenu>
    </div>
  );
}

function InlineMetric({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-18px bg-[var(--bg-muted)] px-3 py-2">
      <div className="text-10px font-bold uppercase tracking-caption text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="text-13px font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-11px text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
}
