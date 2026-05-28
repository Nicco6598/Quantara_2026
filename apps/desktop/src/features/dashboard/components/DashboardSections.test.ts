import { describe, expect, it, vi } from "vitest";
import {
  calculateProjectPerformanceForecast,
  type ProjectFinancials,
  type SalProgressRow,
} from "@/features/project-detail/domain/project-detail-model";
import type { PortfolioProject } from "@/features/projects/types";
import { buildSalTimeline } from "./DashboardSections";

function project(): PortfolioProject {
  return {
    budget: { amount: 1_000_000, currency: "EUR" },
    contractor: "Impresa",
    forecastDeltaDays: 0,
    healthLabel: "In linea",
    id: "project_1",
    location: "Roma",
    lot: "LOT-1",
    manager: "PM",
    materialRisk: "Nessuno",
    nextMilestone: "SAL",
    phase: "Esecuzione",
    progress: 0,
    salDays: 14,
    salState: "SAL",
    salValue: { amount: 0, currency: "EUR" },
    title: "Progetto",
    tone: "success",
    variance: "0%",
  };
}

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

describe("buildSalTimeline", () => {
  it("uses the SAL period date for forecast so Gantt matches project detail", () => {
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));

    const rows: SalProgressRow[] = [
      { amount: 100_000, date: "2026-03-01", isClosed: true },
      { amount: 100_000, date: "2026-03-15", isClosed: true },
      { amount: 300_000, date: "2026-03-29" },
    ];
    const expected = calculateProjectPerformanceForecast(rows, financials(1_000_000, rows), 14);

    const timeline = buildSalTimeline(
      [project()],
      [
        {
          closedAt: "2026-05-21",
          date: "2026-03-01",
          projectId: "project_1",
          status: "closed",
          total: 100_000,
        },
        {
          closedAt: "2026-05-21",
          date: "2026-03-15",
          projectId: "project_1",
          status: "closed",
          total: 100_000,
        },
        {
          date: "2026-03-29",
          projectId: "project_1",
          status: "draft",
          total: 300_000,
        },
      ],
    );

    expect(timeline.get("project_1")?.lastSalDate.toISOString()).toBe(
      expected.estimatedEndDate?.toISOString(),
    );
  });
});
