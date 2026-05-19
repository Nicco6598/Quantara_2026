import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalWorkflowPhase } from "../state/workflow";
import { getPhaseIndex } from "../state/workflow";

const STEPS: {
  id: Exclude<SalWorkflowPhase, "completed">;
  label: string;
  description: string;
}[] = [
  { id: "project", label: "Progetto", description: "Tariffario e dati SAL" },
  { id: "measure", label: "Misura", description: "Voci e quantità" },
  { id: "verify", label: "Verifica", description: "Controlli e materiali" },
  { id: "confirm", label: "Conferma", description: "Riepilogo e emissione" },
];

export function SalStepper({
  phase,
  onPhaseChange,
}: {
  phase: SalWorkflowPhase;
  onPhaseChange: (phase: Exclude<SalWorkflowPhase, "completed">) => void;
}) {
  const currentIndex = getPhaseIndex(phase);

  return (
    <nav
      aria-label="Progresso SAL"
      className="border-b border-[var(--border-subtle)]/50 bg-[var(--surface-base)]/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <button
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  isCurrent ? "bg-[var(--accent-primary)]/[0.06]" : "hover:bg-[var(--bg-muted)]/40",
                )}
                onClick={() => onPhaseChange(step.id)}
                type="button"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-10px font-bold transition-all",
                    isCurrent
                      ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm ring-2 ring-[var(--accent-primary)]/20"
                      : isDone
                        ? "bg-[var(--success-base)] text-[var(--text-inverse)]"
                        : "bg-[var(--surface-base)] text-[var(--text-tertiary)] ring-1 ring-[var(--border-subtle)]",
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : index + 1}
                </span>
                <div className="hidden min-w-0 sm:block">
                  <div
                    className={cn(
                      "text-12px font-semibold leading-tight",
                      isCurrent ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-10px leading-tight text-[var(--text-tertiary)]">
                    {step.description}
                  </div>
                </div>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 transition-colors",
                    isDone ? "bg-[var(--success-base)]/40" : "bg-[var(--border-subtle)]/40",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
