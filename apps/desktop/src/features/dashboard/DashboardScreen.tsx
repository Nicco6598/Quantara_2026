import { BookOpen, Calculator, CheckCircle2, TrendingUp } from "lucide-react";
import { summarizeSal } from "@quantara/domain-utils";
import { AlertListCard } from "@/components/cards/AlertListCard";
import { BudgetDistributionCard } from "@/components/cards/BudgetDistributionCard";
import { ForecastCard } from "@/components/cards/ForecastCard";
import { KpiStatCard } from "@/components/cards/KpiStatCard";
import { MapCard } from "@/components/cards/MapCard";
import { OperationsMetricStrip } from "@/components/cards/OperationsMetricStrip";
import { TimelineCard } from "@/components/cards/TimelineCard";
import { WorkflowStepper } from "@/components/filters/WorkflowStepper";
import { SplitDetailPanel } from "@/components/panels/SplitDetailPanel";
import { DenseDataTable } from "@/components/tables/DenseDataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/formatters";
import {
  activeContract,
  budgetCategories,
  currentSal,
  dashboardAlerts,
  operationsMetrics,
  projectRows,
  siteWaypoints,
  timelineLanes,
} from "./demo-data";

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

        <div className="mt-4 grid grid-cols-[1fr_1.35fr] gap-4">
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

          <ForecastCard cpi="0,94" endDate="12 Set 2025" impact="-1,3M" />
        </div>

        <div className="mt-4 grid grid-cols-[1.1fr_1fr] gap-4">
          <AlertListCard alerts={dashboardAlerts} />
          <BudgetDistributionCard categories={budgetCategories} />
        </div>

        <div className="mt-4">
          <MapCard waypoints={siteWaypoints} />
        </div>

        <div className="mt-4">
          <OperationsMetricStrip metrics={operationsMetrics} />
        </div>

        <div className="mt-4">
          <WorkflowStepper />
        </div>
        <div className="mt-4">
          <TimelineCard lanes={timelineLanes} />
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
