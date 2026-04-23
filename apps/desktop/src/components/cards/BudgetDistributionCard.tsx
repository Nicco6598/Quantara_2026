import type { BudgetCategory } from "@/features/dashboard/demo-data";
import { formatMoney } from "@/lib/formatters";

type BudgetDistributionCardProps = {
  categories: readonly BudgetCategory[];
};

export function BudgetDistributionCard({ categories }: BudgetDistributionCardProps) {
  const gradient = categories
    .reduce<{ cursor: number; stops: string[] }>(
      (state, category) => {
        const start = state.cursor;
        const end = state.cursor + category.percent;
        return {
          cursor: end,
          stops: [...state.stops, `${category.token} ${start}% ${end}%`],
        };
      },
      { cursor: 0, stops: [] },
    )
    .stops.join(", ");

  return (
    <section className="rounded-md border border-subtle bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">Distribuzione budget</h2>
        <span className="text-xs text-secondary">Per categoria</span>
      </div>
      <div className="mt-4 grid grid-cols-[160px_1fr] items-center gap-5">
        <div
          aria-label="Distribuzione budget per categoria"
          className="grid size-36 place-items-center rounded-full"
          role="img"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="grid size-24 place-items-center rounded-full bg-card text-center shadow-soft">
            <span className="text-xs text-secondary">Budget</span>
            <strong className="text-base text-foreground">100%</strong>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {categories.map((category) => (
            <div className="flex items-center justify-between gap-4 text-sm" key={category.label}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: category.token }} />
                <span className="truncate text-secondary">{category.label}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">{category.percent.toFixed(1)}%</div>
                <div className="text-xs text-secondary">
                  {formatMoney({ amount: category.amount, currency: "EUR" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
