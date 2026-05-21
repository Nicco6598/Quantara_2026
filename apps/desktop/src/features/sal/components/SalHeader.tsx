import type { ReactNode } from "react";
import { m } from "framer-motion";
import { ArrowRight, Check, Circle, FileText, Save, WalletCards } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import { Currency } from "./SalCreationTables";
import type { SalVerificationCheck } from "../types";
import type { SalWorkflowPhase } from "../state/workflow";
import { getPhaseIndex } from "../state/workflow";

const STEPS: {
  id: Exclude<SalWorkflowPhase, "completed">;
  label: string;
  shortLabel: string;
}[] = [
  { id: "project", label: "Progetto e tariffari", shortLabel: "Progetto" },
  { id: "measure", label: "Misure e quantità", shortLabel: "Misure" },
  { id: "verify", label: "Controlli e materiali", shortLabel: "Verifica" },
  { id: "confirm", label: "Riepilogo finale", shortLabel: "Conferma" },
];

const PRIMARY_LABELS: Record<Exclude<SalWorkflowPhase, "completed">, string> = {
  project: "Apri misure",
  measure: "Verifica",
  verify: "Riepilogo",
  confirm: "Conferma SAL",
};

export function SalHeader({
  phase,
  salTitle,
  suggestedSalTitle,
  projectTitle,
  total,
  cockpit,
  canContinue,
  primaryDisabledReason,
  searchBar,
  onPrimary,
  onSaveDraft,
  onPhaseChange,
}: {
  phase: SalWorkflowPhase;
  salTitle: string;
  suggestedSalTitle: string;
  projectTitle: string | null;
  total: number;
  cockpit?: {
    budgetResidual: number;
    checks: SalVerificationCheck[];
    incompleteCount: number;
    voiceCount: number;
  };
  canContinue: boolean;
  primaryDisabledReason: string | null;
  searchBar?: ReactNode;
  onPrimary: () => void;
  onSaveDraft: () => void;
  onPhaseChange: (phase: Exclude<SalWorkflowPhase, "completed">) => void;
}) {
  const displayTitle = salTitle.trim() || suggestedSalTitle;
  const currentIndex = getPhaseIndex(phase);
  const visibleIndex = Math.min(Math.max(currentIndex, 0), STEPS.length - 1);
  const activeStep = STEPS[visibleIndex];
  const progress = phase === "completed" ? 100 : ((visibleIndex + 1) / STEPS.length) * 100;
  const canUsePrimary = phase !== "completed" && canContinue;
  const dangerChecks = cockpit?.checks.filter((check) => check.tone === "danger") ?? [];
  const warningChecks = cockpit?.checks.filter((check) => check.tone === "warning") ?? [];
  const cockpitTone =
    dangerChecks.length > 0 ? "danger" : warningChecks.length > 0 ? "warning" : "success";

  return (
    <header className="sticky top-0 z-[var(--z-topbar)] border-b border-[var(--border-subtle)]/55 bg-[var(--surface-base)]/94 shadow-[0_10px_28px_color-mix(in_srgb,var(--text-primary)_5%,transparent)] backdrop-blur-xl">
      <div className="px-4 py-2.5 lg:px-6">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-10px font-bold uppercase tracking-caption text-[var(--text-tertiary)]">
              <span className="rounded-md border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/35 px-2 py-1">
                SAL
              </span>
              <span className="min-w-0 truncate normal-case tracking-normal">
                {projectTitle ?? "Nuovo progetto"}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-16px font-black leading-tight text-[var(--text-primary)]">
                {displayTitle}
              </h1>
              {activeStep ? (
                <span className="hidden shrink-0 rounded-md bg-[var(--accent-primary)]/8 px-2 py-1 text-10px font-black text-[var(--accent-primary)] sm:inline-flex">
                  {activeStep.shortLabel}
                </span>
              ) : null}
            </div>
          </div>

          {phase !== "completed" ? (
            <nav aria-label="Progresso SAL" className="min-w-0">
              <div className="flex items-center gap-1.5">
                {STEPS.map((step, index) => {
                  const isDone = index < visibleIndex;
                  const isCurrent = index === visibleIndex;
                  return (
                    <button
                      aria-current={isCurrent ? "step" : undefined}
                      className={cn(
                        "group flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-10px font-black transition-colors",
                        isCurrent
                          ? "bg-[var(--accent-primary)]/9 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/18"
                          : "text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-secondary)]",
                      )}
                      key={step.id}
                      onClick={() => onPhaseChange(step.id)}
                      title={step.label}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full",
                          isDone && "bg-[var(--success-base)] text-[var(--text-inverse)]",
                          isCurrent && "bg-[var(--accent-primary)] text-[var(--text-inverse)]",
                          !isDone && !isCurrent && "text-[var(--text-tertiary)]",
                        )}
                      >
                        {isDone ? (
                          <Check className="size-2.5" />
                        ) : (
                          <Circle className="size-2.5 fill-current" />
                        )}
                      </span>
                      <span className="truncate">{step.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--border-subtle)]/24">
                <m.div
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-[var(--accent-primary)]"
                  initial={false}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </nav>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--accent-primary)]/18 bg-[var(--accent-primary)]/[0.045] px-3">
              <WalletCards className="size-4 text-[var(--accent-primary)]" />
              <div className="text-right">
                <div className="text-8px font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  Totale
                </div>
                <div className="text-12px font-black tabular-nums text-[var(--accent-primary)]">
                  <Currency value={total} />
                </div>
              </div>
            </div>
            {cockpit ? (
              <div className="hidden h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)]/55 bg-[var(--bg-muted)]/25 px-2.5 text-10px font-bold text-[var(--text-secondary)] md:flex">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    cockpitTone === "danger" && "bg-[var(--danger-base)]",
                    cockpitTone === "warning" && "bg-[var(--warning-base)]",
                    cockpitTone === "success" && "bg-[var(--success-base)]",
                  )}
                />
                <span>
                  {cockpit.incompleteCount > 0
                    ? `${cockpit.incompleteCount} da completare`
                    : cockpitTone === "warning"
                      ? `${warningChecks.length} warning`
                      : cockpitTone === "danger"
                        ? `${dangerChecks.length} blocchi`
                        : "Misure OK"}
                </span>
              </div>
            ) : null}

            <Button
              aria-label="Salva bozza"
              className="h-9 text-11px"
              icon={Save}
              onClick={onSaveDraft}
              size="toolbar"
              type="button"
              variant="outline"
            >
              <span className="hidden sm:inline">Bozza</span>
            </Button>

            <Button
              aria-disabled={!canUsePrimary}
              className="h-9 text-11px font-black"
              disabled={!canUsePrimary}
              onClick={onPrimary}
              title={primaryDisabledReason ?? undefined}
              type="button"
              variant="primary"
            >
              {phase === "completed" ? "Completato" : PRIMARY_LABELS[phase]}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {searchBar}

      {primaryDisabledReason ? (
        <div className="border-t border-[var(--warning-base)]/15 bg-[var(--warning-soft)]/55 px-4 py-2 text-11px font-semibold text-[var(--warning-base)] lg:px-6">
          <span className="mr-1 inline-flex align-middle">
            <FileText className="size-3.5" />
          </span>
          {primaryDisabledReason}
        </div>
      ) : null}
    </header>
  );
}
