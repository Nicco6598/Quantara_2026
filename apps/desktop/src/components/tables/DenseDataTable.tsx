import type { Money } from "@quantara/shared-types";
import { formatMoney } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/StatusBadge";

type DenseDataTableRow = {
  budget: Money;
  forecastEnd: string;
  health: string;
  progress: number;
  sal: string;
  title: string;
};

type DenseDataTableProps = {
  rows: readonly DenseDataTableRow[];
};

export function DenseDataTable({ rows }: DenseDataTableProps) {
  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">Tutti i progetti</h2>
        <span className="text-xs text-secondary">Vista lista</span>
      </div>
      <div className="overflow-hidden rounded-md border border-subtle">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted text-xs font-semibold text-secondary">
            <tr>
              <th className="px-4 py-3">Progetto</th>
              <th className="px-4 py-3">Avanzamento</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Forecast fine</th>
              <th className="px-4 py-3">SAL corrente</th>
              <th className="px-4 py-3">Health</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-t border-subtle transition-colors duration-fast ease-standard hover:bg-table-row-hover"
                key={row.title}
              >
                <td className="px-4 py-3 font-semibold text-foreground">{row.title}</td>
                <td className="px-4 py-3 text-secondary">{row.progress}%</td>
                <td className="px-4 py-3 text-foreground">{formatMoney(row.budget)}</td>
                <td className="px-4 py-3 text-secondary">{row.forecastEnd}</td>
                <td className="px-4 py-3 text-foreground">{row.sal}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={row.health} tone={healthTone(row.health)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function healthTone(health: string): "success" | "warning" | "danger" {
  if (health === "Critico") {
    return "danger";
  }
  if (health === "Attenzione") {
    return "warning";
  }
  return "success";
}
