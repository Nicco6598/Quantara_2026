import { m } from "framer-motion";
import {
  ArrowRight,
  Check,
  Circle,
  Download,
  FileDown,
  FileText,
  Save,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Currency } from "@/components/shared/Currency";
import { StatusChip } from "@/components/shared/StatusChip";
import { cn } from "@/lib/utils";
import { SalInspector } from "./components/SalInspector";
import type { SalWorkflowPhase } from "./state/workflow";
import { getPhaseIndex } from "./state/workflow";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineView,
  SalVerificationCheck,
} from "./types";

const PHASES: { id: Exclude<SalWorkflowPhase, "completed">; label: string }[] = [
  { id: "project", label: "Progetto" },
  { id: "measure", label: "Misura" },
  { id: "verify", label: "Verifica" },
  { id: "confirm", label: "Conferma" },
];

const PRIMARY_LABELS: Record<Exclude<SalWorkflowPhase, "completed">, string> = {
  project: "Apri misure",
  measure: "Verifica",
  verify: "Riepilogo",
  confirm: "Conferma SAL",
};

type SalWorkspaceProps = {
  phase: SalWorkflowPhase;
  onPhaseChange: (phase: Exclude<SalWorkflowPhase, "completed">) => void;
  salTitle: string;
  suggestedSalTitle: string;
  projectTitle: string | null;
  contractor: string | null;
  total: number;
  summary: SalEconomicSummary;
  canContinue: boolean;
  primaryDisabledReason: string | null;
  onPrimary: () => void;
  onSaveDraft: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  selectedLineId: string | null;
  onSelectLine: (lineId: string | null) => void;
  lineViews: SalLineView[];
  economicRules: SalEconomicRules;
  checks: SalVerificationCheck[];
  children: ReactNode;
};

export function SalWorkspace({
  phase,
  onPhaseChange,
  salTitle,
  suggestedSalTitle,
  projectTitle,
  contractor,
  total,
  summary,
  canContinue,
  primaryDisabledReason,
  onPrimary,
  onSaveDraft,
  onExportPdf,
  onExportExcel,
  selectedLineId,
  onSelectLine,
  lineViews,
  economicRules,
  checks,
  children,
}: SalWorkspaceProps) {
  const displayTitle = salTitle.trim() || suggestedSalTitle;
  const currentIndex = getPhaseIndex(phase);
  const visibleIndex = Math.min(Math.max(currentIndex, 0), PHASES.length - 1);
  const progress = phase === "completed" ? 100 : ((visibleIndex + 1) / PHASES.length) * 100;
  const canUsePrimary = phase !== "completed" && canContinue;
  const primaryLabel =
    phase === "completed"
      ? "Completato"
      : PRIMARY_LABELS[phase as Exclude<SalWorkflowPhase, "completed">];

  const selectedLine = selectedLineId
    ? (lineViews.find((l) => l.id === selectedLineId) ?? null)
    : null;

  const grossTotal = summary.grossAmount;
  const discountTotal = summary.discountAmount;
  const safetyTotal = summary.safetyAmount;
  const netTotal = summary.total;

  return (
    <div className="flex h-[calc(100dvh-48px)] flex-col">
      {/* ─── Document header with horizontal phase stepper ─── */}
      <header className="sticky top-0 z-[var(--z-topbar)] border-b border-[var(--border-subtle)]/55 bg-[var(--surface-base)]/94 shadow-[0_10px_28px_color-mix(in_srgb,var(--text-primary)_5%,transparent)] backdrop-blur-xl">
        {/* Top row: title + actions */}
        <div className="px-4 py-2.5 lg:px-6">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 text-10px font-bold uppercase tracking-caption text-[var(--text-tertiary)]">
                <span className="rounded-md border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/35 px-2 py-1">
                  SAL
                </span>
                <span className="min-w-0 truncate normal-case tracking-normal">
                  {projectTitle ?? "Nuovo progetto"}
                </span>
                {contractor && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden min-w-0 truncate normal-case tracking-normal sm:inline">
                      {contractor}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <h1 className="min-w-0 truncate text-16px font-black leading-tight text-[var(--text-primary)]">
                  {displayTitle}
                </h1>
                <StatusChip dot size="sm" tone="info">
                  Bozza
                </StatusChip>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--warning-base)]/18 bg-[var(--warning-soft)]/20 p-1">
                <span className="hidden px-2 text-9px font-black uppercase tracking-0_14em text-[var(--warning-base)] lg:inline">
                  Lavoro
                </span>
                <Button
                  aria-label="Salva bozza locale"
                  className="h-8 rounded-lg px-2.5 text-11px text-[var(--warning-base)]"
                  icon={Save}
                  onClick={onSaveDraft}
                  size="toolbar"
                  title="Salva lo stato modificabile della SAL nel registro del progetto."
                  type="button"
                  variant="outline"
                >
                  <span className="hidden sm:inline">Salva bozza</span>
                </Button>
              </div>
              {onExportPdf || onExportExcel ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--bg-muted)]/28 p-1">
                  <span className="hidden px-2 text-9px font-black uppercase tracking-0_14em text-[var(--text-tertiary)] lg:inline">
                    File
                  </span>
                  {onExportPdf ? (
                    <Button
                      aria-label="Scarica PDF SAL"
                      className="h-8 rounded-lg px-2.5 text-11px"
                      icon={FileText}
                      onClick={onExportPdf}
                      size="toolbar"
                      title="Genera un file PDF scaricabile della SAL."
                      type="button"
                      variant="outline"
                    >
                      <span className="hidden sm:inline">PDF</span>
                      <Download className="size-3 opacity-65" />
                    </Button>
                  ) : null}
                  {onExportExcel ? (
                    <Button
                      aria-label="Scarica Excel dettaglio SAL"
                      className="h-8 rounded-lg px-2.5 text-11px"
                      icon={FileDown}
                      onClick={onExportExcel}
                      size="toolbar"
                      title="Genera un file Excel scaricabile con il dettaglio SAL."
                      type="button"
                      variant="outline"
                    >
                      <span className="hidden sm:inline">Excel</span>
                      <Download className="size-3 opacity-65" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Button
                aria-disabled={!canUsePrimary}
                className="h-9 text-11px font-black"
                disabled={!canUsePrimary}
                onClick={onPrimary}
                title={primaryDisabledReason ?? undefined}
                type="button"
                variant="primary"
              >
                {primaryLabel}
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Horizontal phase stepper */}
        <nav
          aria-label="Fasi SAL"
          className="border-t border-[var(--border-subtle)]/25 px-4 lg:px-6"
        >
          <div className="flex items-center gap-0 py-1.5">
            {PHASES.map((step, index) => {
              const isDone = index < visibleIndex;
              const isCurrent = index === visibleIndex;
              return (
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-11px font-semibold transition-colors rounded-md",
                    isCurrent
                      ? "text-[var(--accent-primary)]"
                      : isDone
                        ? "text-[var(--success-base)] hover:text-[var(--success-base)]/80"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                  )}
                  disabled={phase === "completed"}
                  key={step.id}
                  onClick={() => onPhaseChange(step.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-9px font-bold",
                      isCurrent && "bg-[var(--accent-primary)] text-[var(--text-inverse)]",
                      isDone && !isCurrent && "bg-[var(--success-base)] text-[var(--text-inverse)]",
                      !isDone &&
                        !isCurrent &&
                        "bg-[var(--surface-base)] text-[var(--text-tertiary)] ring-1 ring-[var(--border-subtle)]",
                    )}
                  >
                    {isDone ? (
                      <Check className="size-2.5" />
                    ) : (
                      <Circle className="size-2 fill-current" />
                    )}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}

            {/* Spacer + progress bar */}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-10px font-medium text-[var(--text-tertiary)]">
                {visibleIndex + 1}/{PHASES.length}
              </span>
              <div className="h-1 w-20 overflow-hidden rounded-full bg-[var(--border-subtle)]/24">
                <m.div
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-[var(--accent-primary)]"
                  initial={false}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </div>
          </div>
        </nav>

        {primaryDisabledReason && (
          <div className="border-t border-[var(--warning-base)]/15 bg-[var(--warning-soft)]/55 px-4 py-2 text-11px font-semibold text-[var(--warning-base)] lg:px-6">
            <span className="mr-1 inline-flex align-middle">
              <FileText className="size-3.5" />
            </span>
            {primaryDisabledReason}
          </div>
        )}
      </header>

      {/* ─── Body: content + right inspector ─── */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phase content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
        </div>

        {/* ─── Right inspector (conditional, 320px) ─── */}
        {selectedLine !== null && (
          <aside className="hidden w-[320px] shrink-0 border-l border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/30 p-3 xl:block">
            <SalInspector
              checks={checks}
              economicRules={economicRules}
              line={selectedLine}
              onClose={() => onSelectLine(null)}
            />
          </aside>
        )}
      </div>

      {/* ─── Bottom bar (sticky) ─── */}
      <footer className="sticky bottom-0 z-20 border-t-2 border-[var(--border-subtle)]/40 bg-[var(--surface-base)] shadow-[0_-2px_0_var(--surface-base)]">
        <div className="flex items-center justify-between gap-4 overflow-x-auto px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-4 text-12px">
            <span className="whitespace-nowrap text-[var(--text-tertiary)]">
              Lordo{" "}
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                <Currency value={grossTotal} />
              </span>
            </span>
            {discountTotal > 0 && (
              <>
                <span className="hidden text-[var(--border-subtle)] sm:inline">·</span>
                <span className="hidden whitespace-nowrap text-[var(--text-tertiary)] sm:inline">
                  Ribasso{" "}
                  <span className="font-semibold tabular-nums text-[var(--danger-base)]">
                    -<Currency value={discountTotal} />
                  </span>
                </span>
              </>
            )}
            {safetyTotal > 0 && (
              <>
                <span className="hidden text-[var(--border-subtle)] md:inline">·</span>
                <span className="hidden whitespace-nowrap text-[var(--text-tertiary)] md:inline">
                  OS{" "}
                  <span className="font-semibold tabular-nums text-[var(--danger-base)]">
                    <Currency value={safetyTotal} />
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-11px font-medium text-[var(--text-tertiary)]">
              {lineViews.length} voci
            </span>
            <div className="border-l border-[var(--border-subtle)]/40 pl-3">
              <div className="text-10px font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                Totale documento
              </div>
              <div className="text-16px font-black tabular-nums leading-none text-[var(--accent-primary)]">
                <Currency value={netTotal} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
