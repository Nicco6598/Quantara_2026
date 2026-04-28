import type { LucideIcon } from "lucide-react";
import { ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { PortfolioProject } from "../types";

export function ProjectActionDialog({
  mode,
  onClose,
  onConfirmDelete,
  onDelete,
  onEdit,
  onOpen,
  project,
}: {
  mode: "actions" | "delete";
  onClose: () => void;
  onConfirmDelete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpen: () => void;
  project: PortfolioProject;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi azioni progetto"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={mode === "delete" ? "Conferma eliminazione progetto" : "Azioni progetto"}
        className="relative w-full max-w-lg rounded-[24px] border border-subtle bg-card p-5 shadow-panel"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {project.lot} · {project.location}
              </span>
              <StatusBadge label={project.healthLabel} tone={project.tone} />
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{project.title}</h3>
            <p className="mt-1 text-sm leading-6 text-secondary">{project.materialRisk}</p>
          </div>
          <button
            aria-label="Chiudi"
            className="flex size-9 shrink-0 items-center justify-center rounded-[14px] text-secondary hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {mode === "delete" ? (
          <div className="mt-5 rounded-[18px] border border-danger/25 bg-danger/10 p-4">
            <div className="text-sm font-semibold text-danger">Eliminare questo progetto?</div>
            <p className="mt-1 text-sm leading-6 text-secondary">
              L'azione rimuove il contratto locale dal registro. I progetti demo non vengono
              eliminati dal dataset fallback.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={onClose} size="sm" type="button" variant="outline">
                Annulla
              </Button>
              <Button
                className="border-danger/25 bg-danger text-white hover:bg-danger/90"
                onClick={onConfirmDelete}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 className="size-4" />
                Elimina
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            <ProjectActionButton
              description="Apri la scheda completa con contesto operativo e indicatori."
              icon={ChevronRight}
              label="Apri dossier"
              onClick={onOpen}
            />
            <ProjectActionButton
              description="Modifica titolo, accordo quadro, contratto applicativo, importo e tariffario."
              icon={Pencil}
              label="Modifica progetto"
              onClick={onEdit}
            />
            <ProjectActionButton
              danger
              description="Passa alla conferma prima di rimuovere il progetto locale."
              icon={Trash2}
              label="Elimina progetto"
              onClick={onDelete}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectActionButton({
  danger,
  description,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-[18px] border border-subtle bg-muted/35 p-3 text-left transition-colors hover:bg-muted",
        danger && "border-danger/25 bg-danger/10 hover:bg-danger/15",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[16px] bg-card text-primary",
          danger && "text-danger",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span
          className={cn("block text-sm font-semibold text-foreground", danger && "text-danger")}
        >
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-secondary">{description}</span>
      </span>
    </button>
  );
}
