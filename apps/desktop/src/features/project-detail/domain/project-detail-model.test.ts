import { describe, expect, it, vi } from "vitest";
import {
  calculateProjectPerformanceForecast,
  type ProjectFinancials,
  type SalProgressRow,
} from "./project-detail-model";

function financials(contractual: number, rows: SalProgressRow[]): ProjectFinancials {
  const committed = rows.reduce((sum, row) => sum + row.amount, 0);
  const approvedAmount = rows.reduce(
    (sum, row) => (row.isApproved || row.isClosed ? sum + row.amount : sum),
    0,
  );

  return {
    approvedAmount,
    committed,
    contractual,
    currentSalAmount: rows.at(-1)?.amount ?? 0,
    draftAmount: committed - approvedAmount,
    progress: contractual > 0 ? Math.min(100, (committed / contractual) * 100) : 0,
    residual: contractual - committed,
  };
}

describe("calculateProjectPerformanceForecast", () => {
  it("keeps CPI near neutral when recent SAL amounts match the baseline", () => {
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    const rows: SalProgressRow[] = [
      { amount: 100_000, date: "2026-03-01", isClosed: true },
      { amount: 100_000, date: "2026-03-15", isClosed: true },
      { amount: 100_000, date: "2026-03-29" },
    ];

    const forecast = calculateProjectPerformanceForecast(rows, financials(1_000_000, rows), 14);

    expect(forecast.cpi).toBeGreaterThan(0.98);
    expect(forecast.cpi).toBeLessThan(1.02);
    expect(forecast.estimatedAtCompletion).toBeCloseTo(1_000_000, -2);
  });

  it("drops CPI below 1 when the latest draft is materially larger than the baseline", () => {
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    const rows: SalProgressRow[] = [
      { amount: 100_000, date: "2026-03-01", isClosed: true },
      { amount: 100_000, date: "2026-03-15", isClosed: true },
      { amount: 300_000, date: "2026-03-29" },
    ];

    const forecast = calculateProjectPerformanceForecast(rows, financials(1_000_000, rows), 14);

    expect(forecast.cpi).toBeLessThan(0.8);
    expect(forecast.estimatedAtCompletion).toBeGreaterThan(1_250_000);
  });

  it("raises CPI above 1 when recent SAL amounts are lighter than the baseline", () => {
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    const rows: SalProgressRow[] = [
      { amount: 200_000, date: "2026-03-01", isClosed: true },
      { amount: 200_000, date: "2026-03-15", isClosed: true },
      { amount: 50_000, date: "2026-03-29" },
    ];

    const forecast = calculateProjectPerformanceForecast(rows, financials(1_000_000, rows), 14);

    expect(forecast.cpi).toBeGreaterThan(1.25);
    expect(forecast.estimatedAtCompletion).toBeLessThan(800_000);
  });
});
