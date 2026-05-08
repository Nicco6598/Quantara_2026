import { motion } from "framer-motion";
import { SOFT_EASE } from "@/components/shared/easings";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight, Check, FileText, Save } from "lucide-react";
import type { ReactNode } from "react";
import { BezelSurface } from "@/features/projects/components/workspace-ui";

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
    <div className="sticky top-0 z-30 px-4 pt-3 md:px-7">
      <BezelSurface innerClassName="flex min-h-14 items-center justify-end gap-3 px-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canGoBack ? (
            <motion.button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
              onClick={onBack}
              type="button"
              transition={{ duration: 0.42, ease: SOFT_EASE }}
            >
              <ArrowLeft className="size-4" />
              Indietro
            </motion.button>
          ) : null}
          <motion.button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
            onClick={onDraft}
            type="button"
            transition={{ duration: 0.42, ease: SOFT_EASE }}
          >
            <Save className="size-4" />
            Salva bozza
          </motion.button>
          {showPrimary ? (
            <motion.button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-[12px] font-semibold text-[var(--text-inverse)] transition-colors hover:bg-[var(--accent-primary)]/90"
              onClick={onPrimary}
              type="button"
              transition={{ duration: 0.42, ease: SOFT_EASE }}
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </motion.button>
          ) : null}
        </div>
      </BezelSurface>
    </div>
  );
}

export function SalHero({
  icon: Icon,
  step,
  subtitle,
  title,
  projectTitle,
  statusLabel = "SAL da creare",
  tariffYear,
}: {
  icon: LucideIcon;
  projectTitle?: string | undefined;
  step: SalCreationStep;
  statusLabel?: string | undefined;
  subtitle: string;
  tariffYear?: number | string | undefined;
  title: string;
}) {
  return (
    <section className="animate-entry grid gap-3 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
            <Icon className="size-4" />
          </span>
          <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
            Passo {step} di 5
          </span>
        </div>
        <h2 className="mt-3 text-[24px] font-semibold leading-[1.05] text-[var(--text-primary)] md:text-[32px]">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-[13px] leading-5 text-[var(--text-secondary)]">
          {subtitle}
        </p>
      </div>
      <BezelSurface className="self-start md:translate-y-1" innerClassName="p-0">
        <div className="grid min-w-0 grid-cols-3 divide-x divide-[var(--border-subtle)]/60">
          <div className="flex flex-col items-center gap-0.5 px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Progetto
            </span>
            <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
              {projectTitle ?? "-"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Anno
            </span>
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {tariffYear ?? "-"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3 py-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Stato
            </span>
            <span className="inline-flex rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--info-base)]">
              {statusLabel}
            </span>
          </div>
        </div>
      </BezelSurface>
    </section>
  );
}

export function SalStepper({
  stages,
  currentIndex,
  direction,
}: {
  stages: SalWorkflowStage[];
  currentIndex: number;
  direction: "forward" | "backward";
}) {
  return (
    <BezelSurface innerClassName="p-3 md:p-4">
      <div className="flex items-start justify-between gap-2 md:gap-3">
        {stages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isCurrent = stage.status === "current";
          const isBlocked = stage.status === "blocked";

          const dotDelay =
            direction === "forward"
              ? Math.abs(index - currentIndex) * 0.18
              : Math.abs(index - currentIndex) * 0.12;

          const lineDelay =
            direction === "forward"
              ? Math.abs(index - currentIndex) * 0.18 + 0.1
              : Math.abs(index - currentIndex - 1) * 0.12 + 0.08;

          return (
            <div className="flex flex-1 flex-col items-center" key={stage.id}>
              <div className="relative flex w-full items-center">
                {index > 0 ? (
                  <motion.div
                    className={cn(
                      "absolute right-1/2 h-px w-full origin-right",
                      isCompleted || (isCurrent && stages[index - 1]?.status === "completed")
                        ? "bg-[var(--accent-primary)]"
                        : "bg-[var(--border-subtle)]",
                    )}
                    initial={false}
                    animate={{
                      scaleX:
                        isCompleted || (isCurrent && stages[index - 1]?.status === "completed")
                          ? 1
                          : 0,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: lineDelay,
                      ease: SOFT_EASE,
                    }}
                  />
                ) : null}
                <motion.div
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                    isCompleted &&
                      "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]",
                    isCurrent &&
                      "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] text-[var(--accent-primary)]",
                    isBlocked &&
                      "border-[var(--warning-base)]/40 bg-[var(--warning-soft)] text-[var(--warning-base)]",
                    !isCompleted &&
                      !isCurrent &&
                      !isBlocked &&
                      "border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
                  )}
                  initial={false}
                  animate={{
                    scale: isCurrent ? [1, 1.15, 1] : isCompleted ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: dotDelay,
                    ease: SOFT_EASE,
                  }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={false}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 0.5, delay: dotDelay, ease: SOFT_EASE }}
                    >
                      <Check className="size-5" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <span className="text-[13px] font-bold">{index + 1}</span>
                  )}
                </motion.div>
              </div>
              <div className="mt-3 flex flex-col items-center gap-0.5 text-center">
                <motion.span
                  className={cn(
                    "text-[12px] font-semibold",
                    isCompleted && "text-[var(--accent-primary)]",
                    isCurrent && "text-[var(--text-primary)]",
                    isBlocked && "text-[var(--warning-base)]",
                    !isCompleted && !isCurrent && !isBlocked && "text-[var(--text-secondary)]",
                  )}
                  initial={false}
                  animate={{ opacity: isCompleted || isCurrent ? 1 : 0.5 }}
                  transition={{ duration: 0.4, delay: dotDelay + 0.1, ease: SOFT_EASE }}
                >
                  {stage.label}
                </motion.span>
                <span className="hidden max-w-[120px] text-[10px] font-medium text-[var(--text-secondary)] md:block">
                  {stage.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </BezelSurface>
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
    <BezelSurface innerClassName={cn("p-3 md:p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--info-soft)] text-[var(--info-base)]">
          <Icon className="size-4" />
        </div>
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </BezelSurface>
  );
}
