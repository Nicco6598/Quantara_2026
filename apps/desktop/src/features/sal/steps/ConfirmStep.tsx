import type { ReactNode } from "react";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { SalReceipt } from "../components/SalReceipt";
import { FeedbackBanner, StepMetric } from "../components/SalCreationSummary";
import type { SalEconomicRules, SalEconomicSummary, SalLineView } from "../types";

export function ConfirmStep({
  economicRules,
  lineViews,
  summary,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  summary: SalEconomicSummary;
}) {
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-4 border-b border-[var(--border-subtle)]/45 bg-[var(--surface-base)]/94 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:-mx-6 lg:px-6">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-md bg-[var(--success-soft)] px-2 text-9px font-black uppercase tracking-[0.14em] text-[var(--success-base)]">
                Pronta per conferma
              </span>
              <span className="text-11px font-semibold text-[var(--text-tertiary)]">
                Documenti finali sempre disponibili durante la revisione.
              </span>
            </div>
            <div className="mt-1 text-18px font-black tracking-tight text-[var(--text-primary)]">
              Totale SAL <Currency value={summary.total} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
            <ExportButton
              disabled
              icon={<FileText className="size-4" />}
              label="PDF SAL"
              tone="danger"
            />
            <ExportButton
              disabled
              icon={<FileText className="size-4" />}
              label="PDF libretto"
              tone="info"
            />
            <ExportButton
              disabled
              icon={<FileSpreadsheet className="size-4" />}
              label="Excel dettaglio"
              tone="success"
            />
          </div>
        </div>
      </div>

      <FeedbackBanner
        message="Controlla il riepilogo, poi conferma il SAL quando gli importi sono corretti."
        title="Revisione finale"
        tone="success"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StepMetric accent label="Totale SAL" value={<Currency value={summary.total} />} />
        <StepMetric
          accent={summary.budgetResidual >= 0}
          danger={summary.budgetResidual < 0}
          label="Budget residuo"
          value={<Currency value={summary.budgetResidual} />}
        />
        <StepMetric label="Voci inserite" value={String(summary.voiceCount)} />
      </div>

      <SalReceipt
        economicRules={economicRules}
        lineViews={lineViews}
        summary={summary}
        title="Documento finale SAL"
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <ExportCard
          disabled
          icon={<FileText className="size-4 text-[var(--danger-base)]" />}
          label="PDF SAL"
        />
        <ExportCard
          disabled
          icon={<FileText className="size-4 text-[var(--info-base)]" />}
          label="PDF libretto"
        />
        <ExportCard
          disabled
          icon={<Printer className="size-4 text-[var(--text-tertiary)]" />}
          label="Stampa contabilità"
        />
      </div>
    </div>
  );
}

function ExportButton({
  disabled,
  icon,
  label,
  tone,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  tone: "danger" | "info" | "success";
}) {
  return (
    <button
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-11px font-black transition-all",
        tone === "danger" &&
          "border-[var(--danger-base)]/20 bg-[var(--danger-base)]/[0.055] text-[var(--danger-base)]",
        tone === "info" &&
          "border-[var(--info-base)]/20 bg-[var(--info-base)]/[0.055] text-[var(--info-base)]",
        tone === "success" &&
          "border-[var(--success-base)]/20 bg-[var(--success-base)]/[0.055] text-[var(--success-base)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
      disabled={disabled}
      title={disabled ? "Export non ancora collegato" : undefined}
      type="button"
    >
      {icon}
      <span>{label}</span>
      <Download className="size-3.5 opacity-70" />
    </button>
  );
}

function ExportCard({
  disabled,
  icon,
  label,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-3.5",
        disabled && "opacity-45",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      </div>
      <span className="hidden text-xs font-medium text-[var(--text-tertiary)] md:inline">
        {disabled ? "Da collegare" : "Pronto"}
      </span>
    </div>
  );
}

function Currency({ value }: { value: number }) {
  return (
    <span className="tabular-nums">
      {value.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      })}
    </span>
  );
}
