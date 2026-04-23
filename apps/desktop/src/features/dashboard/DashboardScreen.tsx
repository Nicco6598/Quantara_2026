import { BookOpen, Calculator, CheckCircle2, TrendingUp } from "lucide-react";
import { summarizeSal } from "@quantara/domain-utils";
import { KpiStatCard } from "@/components/cards/KpiStatCard";
import { WorkflowStepper } from "@/components/filters/WorkflowStepper";
import { SplitDetailPanel } from "@/components/panels/SplitDetailPanel";
import { DenseDataTable } from "@/components/tables/DenseDataTable";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/formatters";
import { activeContract, currentSal, projectRows } from "./demo-data";

export function DashboardScreen() {
  const salSummary = summarizeSal(currentSal);

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <main className="min-w-0 flex-1 p-6">
        <div className="grid grid-cols-4 gap-4">
          <KpiStatCard
            detail="Totale approvato"
            icon={<Calculator />}
            label="Budget di progetto"
            value={formatMoney(activeContract.contractualAmount)}
          />
          <KpiStatCard
            detail="65,4% del budget"
            icon={<BookOpen />}
            label="Impegnato"
            value={formatMoney({ amount: 16245300, currency: "EUR" })}
          />
          <KpiStatCard
            detail="43,6% del budget"
            icon={<TrendingUp />}
            label="Eseguito SAL"
            value={formatMoney(salSummary.finalTotal)}
          />
          <KpiStatCard
            detail="SAL emesse"
            icon={<CheckCircle2 />}
            label="SAL approvate"
            value="7 / 12"
          />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-4">
          <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-secondary">Project Health</p>
                <h2 className="mt-3 text-3xl font-semibold text-success">BUONO</h2>
              </div>
              <div className="flex size-28 items-center justify-center rounded-full border-[12px] border-success text-success">
                43%
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <StatusLine label="Budget" value="In linea" />
              <StatusLine label="Tempi" value="+5 giorni" warning />
              <StatusLine label="Esecuzione" value="In linea" />
              <StatusLine label="Materiali" value="Criticita" danger />
            </div>
          </section>

          <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-secondary">Forecast di progetto</p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">12 Set 2025</h2>
              </div>
              <DeltaBadge trend="down" value="-5,3%" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Fine prevista" value="12 Set 2025" />
              <Metric label="CPI" value="0,94" />
              <Metric label="Scostamento" value="-1,3M" />
            </div>
          </section>
        </div>

        <div className="mt-4">
          <WorkflowStepper />
        </div>
        <div className="mt-4">
          <DenseDataTable rows={projectRows} />
        </div>
      </main>
      <SplitDetailPanel summary={salSummary} />
    </div>
  );
}

type StatusLineProps = {
  danger?: boolean;
  label: string;
  value: string;
  warning?: boolean;
};

function StatusLine({ danger, label, value, warning }: StatusLineProps) {
  const tone = danger ? "danger" : warning ? "warning" : "success";
  return (
    <div className="flex items-center justify-between rounded-sm bg-muted px-3 py-2">
      <span className="text-secondary">{label}</span>
      <StatusBadge label={value} tone={tone} />
    </div>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
