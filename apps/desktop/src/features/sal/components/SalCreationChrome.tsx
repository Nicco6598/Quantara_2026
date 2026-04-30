import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight, Building2, Check, FileText, Save } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SalWorkflowStage } from "../state/workflow";
import type { SalCreationStep } from "../types";

export function SalWorkflowTopbar({
  canGoBack,
  onBack,
  onDraft,
  onPrimary,
  primaryLabel,
  showPrimary = true,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onDraft: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  showPrimary?: boolean;
}) {
  return (
    <div className="flex min-h-16 items-center justify-end gap-3 border-b border-subtle bg-card px-7">
      <div className="flex items-center gap-3">
        {canGoBack ? (
          <button className="sal-outline-button" onClick={onBack} type="button">
            <ArrowLeft className="size-4" />
            Indietro
          </button>
        ) : null}
        <button className="sal-outline-button" onClick={onDraft} type="button">
          <Save className="size-4" />
          Salva bozza
        </button>
        {showPrimary ? (
          <button className="sal-primary-button" onClick={onPrimary} type="button">
            {primaryLabel}
            <ArrowRight className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SalHero({
  icon: Icon,
  step,
  subtitle,
  title,
}: {
  icon: LucideIcon;
  step: SalCreationStep;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="sal-panel flex items-center justify-between gap-5 p-6">
      <div className="flex items-center gap-5">
        <div className={cn("sal-hero-icon", step === 4 && "bg-success/10 text-success")}>
          <Icon className="size-8" />
        </div>
        <div>
          <h1 className="text-[52px] font-semibold leading-[1] text-foreground">{title}</h1>
          <p className="mt-1 text-[15px] text-secondary">{subtitle}</p>
        </div>
      </div>
      <div className="hidden min-w-[560px] grid-cols-[1fr_150px_150px] rounded-[18px] border border-subtle bg-card lg:grid">
        <div className="flex items-center gap-4 p-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#f3edff] text-[#7b3cff]">
            <Building2 className="size-6" />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">TEST</div>
            <div className="text-sm text-secondary">QNT-01</div>
          </div>
        </div>
        <div className="border-l border-subtle p-4">
          <div className="text-xs text-secondary">Anno tariffario</div>
          <div className="mt-1 text-xl font-semibold">2026</div>
        </div>
        <div className="border-l border-subtle p-4">
          <div className="text-xs text-secondary">Stato</div>
          <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            SAL da creare
          </span>
        </div>
      </div>
    </section>
  );
}

export function SalStepper({ stages }: { stages: SalWorkflowStage[] }) {
  return (
    <nav className="sal-panel grid gap-2 p-2 lg:grid-cols-4">
      {stages.map((stage, index) => {
        const isCompleted = stage.status === "completed";
        const isCurrent = stage.status === "current";
        const isBlocked = stage.status === "blocked";

        return (
          <div
            className={cn(
              "relative rounded-[12px] border px-4 py-3 transition-colors",
              isCurrent && "border-primary/45 bg-primary/8",
              isCompleted && "border-success/25 bg-success/8",
              isBlocked && "border-warning/35 bg-warning/10",
              !isCurrent && !isCompleted && !isBlocked && "border-subtle bg-card",
            )}
            key={stage.id}
          >
            <div className="mb-2 flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full text-sm font-bold",
                  isCurrent && "bg-primary text-white",
                  isCompleted && "bg-success/15 text-success",
                  isBlocked && "bg-warning/15 text-warning",
                  !isCurrent && !isCompleted && !isBlocked && "bg-muted text-secondary",
                )}
              >
                {isCompleted ? <Check className="size-4" /> : index + 1}
              </span>
              <div
                className={cn(
                  "text-[15px] font-semibold",
                  isCurrent && "text-primary",
                  isCompleted && "text-success",
                  isBlocked && "text-warning",
                  !isCurrent && !isCompleted && !isBlocked && "text-foreground",
                )}
              >
                {stage.label}
              </div>
            </div>
            <p className="mt-1 text-xs text-secondary">{stage.description}</p>
          </div>
        );
      })}
    </nav>
  );
}

export function SalCard({
  children,
  className,
  icon: Icon = FileText,
  title,
}: {
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
  title: string;
}) {
  return (
    <section className={cn("sal-panel p-5", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-[10px] bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}
