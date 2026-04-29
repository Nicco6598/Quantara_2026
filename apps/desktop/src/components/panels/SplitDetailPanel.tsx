import type { SalEconomicSummary } from "@quantara/shared-types";
import { formatMoney } from "@/lib/formatters";

type SplitDetailPanelProps = {
  summary: SalEconomicSummary;
};

export function SplitDetailPanel({ summary }: SplitDetailPanelProps) {
  return (
    <aside className="w-[330px] shrink-0 border-l border-subtle bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-secondary">SAL approvata</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">SAL n. 8</h2>
        </div>
        <span className="rounded-sm bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
          Approvata
        </span>
      </div>

      <div className="mt-6 rounded-md border border-subtle bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">Totale SAL</h3>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <SummaryLine label="Lordo ribassabile" value={formatMoney(summary.grossDiscountable)} />
          <SummaryLine
            label="Dopo ribasso gara"
            value={formatMoney(summary.afterTenderAdjustment)}
          />
          <SummaryLine
            label="Dopo ribasso subappalto"
            value={formatMoney(summary.afterSubcontractAdjustment)}
          />
          <SummaryLine label="OS fuori ribasso" value={formatMoney(summary.safetyCosts)} />
        </dl>
        <div className="mt-4 border-t border-subtle pt-4">
          <SummaryLine label="Totale finale" strong value={formatMoney(summary.finalTotal)} />
        </div>
      </div>

      <div className="mt-4 rounded-md border border-subtle bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">Documenti collegati</h3>
        <div className="mt-3 flex flex-col gap-2 text-sm text-secondary">
          <span>Verbale approvazione SAL 8.pdf</span>
          <span>Certificato pagamento SAL 8.pdf</span>
          <span>Riepilogo voci SAL 8.xlsx</span>
        </div>
      </div>
    </aside>
  );
}

type SummaryLineProps = {
  label: string;
  strong?: boolean;
  value: string;
};

function SummaryLine({ label, strong, value }: SummaryLineProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-secondary">{label}</dt>
      <dd className={strong ? "font-semibold text-foreground" : "font-medium text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
