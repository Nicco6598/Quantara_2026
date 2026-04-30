import type { LucideIcon } from "lucide-react";
import { ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { PortfolioProject } from "../types";

const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

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
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <button
        aria-label="Chiudi azioni progetto"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.section
        aria-label={mode === "delete" ? "Conferma eliminazione progetto" : "Azioni progetto"}
        className="relative w-full max-w-md rounded-[28px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.5, ease: SPRING_EASE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] p-0 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    {project.lot} · {project.location}
                  </span>
                  <StatusBadge label={project.healthLabel} tone={project.tone} />
                </div>
                <h3 className="mt-3 text-[20px] font-bold leading-tight text-[var(--text-primary)]">
                  {project.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                  {project.materialRisk}
                </p>
              </div>
              <button
                aria-label="Chiudi"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
                onClick={onClose}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            {mode === "delete" ? (
              <div className="mt-6 rounded-[18px] border border-[var(--danger-base)]/20 bg-[var(--danger-soft)]/50 p-4 ring-1 ring-[var(--danger-base)]/8">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger-base)]">
                    <Trash2 className="size-5" />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--danger-base)]">
                      Eliminare questo progetto?
                    </div>
                    <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)]">
                      L'azione rimuove il contratto locale dal registro. I progetti demo non vengono
                      eliminati dal dataset fallback.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--bg-muted)] px-5 text-[13px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
                    onClick={onClose}
                    type="button"
                  >
                    Annulla
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--danger-base)] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--danger-base)]/90"
                    onClick={onConfirmDelete}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                    Elimina
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
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
          </div>
        </div>
      </motion.section>
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
        "group flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted)]",
        danger && "hover:bg-[var(--danger-soft)]/50",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-all duration-500 group-hover:bg-[var(--info-soft)] group-hover:text-[var(--info-base)]",
          danger &&
            "group-hover:bg-[var(--danger-soft)] group-hover:text-[var(--danger-base)] group-hover:ring-[color-mix(in_srgb,var(--danger-base)_24%,transparent)]",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 py-0.5">
        <span
          className={cn(
            "block text-[13px] font-semibold text-[var(--text-primary)]",
            danger && "group-hover:text-[var(--danger-base)]",
          )}
        >
          {label}
        </span>
        <span className="mt-1 block text-[12px] leading-5 text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
    </button>
  );
}
