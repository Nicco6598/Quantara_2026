import { cn } from "@/lib/utils";

type ForecastCardProps = {
  cpi: string;
  endDate: string;
  impact: string;
};

export function ForecastCard({ cpi, endDate, impact }: ForecastCardProps) {
  const cpiValue = parseFloat(cpi.replace(",", "."));
  const cpiStatus = cpiValue >= 1 ? "success" : cpiValue >= 0.9 ? "warning" : "danger";

  const history = [
    { month: "Gen", value: 1.02 },
    { month: "Feb", value: 0.98 },
    { month: "Mar", value: 1.05 },
    { month: "Apr", value: 0.94 },
    { month: "Mag", value: cpiValue },
  ];

  const maxV = Math.max(...history.map((h) => h.value));
  const minV = Math.min(...history.map((h) => h.value));
  const range = maxV - minV || 1;

  const getY = (val: number) => ((maxV - val) / range) * 60 + 20;

  const pathData = history
    .map((h, i) => `${i === 0 ? "M" : "L"} ${i * 70 + 20},${getY(h.value)}`)
    .join(" ");

  const areaData = `${pathData} L 300,80 L 20,80 Z`;

  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Forecast di Progetto</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Andamento CPI e proiezione finale
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[var(--bg-muted)] px-3 py-1.5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Fine stimata:</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{endDate}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-28">
          <svg
            aria-label="Grafico dell'andamento CPI degli ultimi mesi"
            className="h-full w-full"
            role="img"
            viewBox="0 0 320 90"
          >
            <title>Grafico dell'andamento CPI degli ultimi mesi</title>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-info-500)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-info-500)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0.9, 1, 1.1].map((tick) => (
              <g key={tick}>
                <line
                  x1="15"
                  y1={getY(tick)}
                  x2="305"
                  y2={getY(tick)}
                  stroke="var(--color-neutral-100)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x="8"
                  y={getY(tick) + 3}
                  fontSize="8"
                  fill="var(--color-neutral-500)"
                  textAnchor="end"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}

            <path d={areaData} fill="url(#areaGrad)" />
            <path
              d={pathData}
              fill="none"
              stroke="var(--color-info-500)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {history.map((h, index) => (
              <g key={h.month}>
                <circle
                  cx={index * 70 + 20}
                  cy={getY(h.value)}
                  r="5"
                  fill="var(--color-neutral-0)"
                  stroke="var(--color-info-500)"
                  strokeWidth="2"
                />
                <text
                  x={index * 70 + 20}
                  y="85"
                  fontSize="8"
                  fill="var(--color-neutral-500)"
                  textAnchor="middle"
                >
                  {h.month}
                </text>
              </g>
            ))}
          </svg>

          <div className="absolute right-0 top-0 flex flex-col items-end">
            <span className="text-3xl font-bold text-[var(--text-primary)]">{cpi}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              CPI
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MetricPill label="CPI" value={cpi} status={cpiStatus} />
        <MetricPill label="Fine prevista" value={endDate} />
        <MetricPill
          label="Variazione"
          value={impact}
          status={parseFloat(impact.replace("M", "").replace(",", ".")) < 0 ? "danger" : "success"}
        />
      </div>
    </section>
  );
}

function MetricPill({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "success" | "warning" | "danger";
}) {
  const statusStyles = {
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  };

  return (
    <div
      className={cn(
        "rounded-md px-3 py-2.5",
        status ? statusStyles[status] : "bg-[var(--bg-muted)] text-[var(--text-primary)]",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      <p className="mt-1 text-base font-bold">{value}</p>
    </div>
  );
}
