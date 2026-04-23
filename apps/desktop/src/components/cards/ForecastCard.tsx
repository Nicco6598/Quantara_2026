import { CalendarClock, Gauge, TrendingDown } from "lucide-react";
import { DeltaBadge } from "@/components/shared/DeltaBadge";

type ForecastCardProps = {
  cpi: string;
  endDate: string;
  impact: string;
};

export function ForecastCard({ cpi, endDate, impact }: ForecastCardProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-secondary">Forecast di progetto</p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">{endDate}</h2>
        </div>
        <DeltaBadge trend="down" value="-5,3%" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <ForecastMetric icon={CalendarClock} label="Fine prevista" value={endDate} />
        <ForecastMetric icon={Gauge} label="CPI" value={cpi} />
        <ForecastMetric icon={TrendingDown} label="Scostamento" value={impact} />
      </div>
    </section>
  );
}

type ForecastMetricProps = {
  icon: typeof CalendarClock;
  label: string;
  value: string;
};

function ForecastMetric({ icon: Icon, label, value }: ForecastMetricProps) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="flex items-center gap-2 text-xs text-secondary">
        <Icon />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
