import type { PortfolioProject } from "@/features/projects/types";
import { formatDueWindow, formatForecastDelta } from "@/features/projects/utils/projects-helpers";
import { formatEuro } from "@/lib/formatters";

export type ProjectFinancials = {
  approvedAmount: number;
  committed: number;
  contractual: number;
  currentSalAmount: number;
  draftAmount: number;
  progress: number;
  residual: number;
};

export type SalProgressRow = {
  amount: number;
  date: string;
  isApproved?: boolean;
  isClosed?: boolean;
};

const DAY_MS = 86_400_000;

function formatIndex(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "N/D";
  return value.toLocaleString("it-IT", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function parseSalDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function describeCostPerformance(cpi: number | null): string {
  if (cpi == null) return "Dati insufficienti";
  if (cpi > 1.05) return "Costi sotto controllo";
  if (cpi >= 0.95) return "Costi in linea";
  return "Costi sopra avanzamento";
}

function describeSchedulePerformance(spi: number | null): string {
  if (spi == null) return "Dati insufficienti";
  if (spi > 1.05) return "In anticipo";
  if (spi >= 0.95) return "In linea coi tempi";
  return "In ritardo";
}

function formatEndDateEstimate(remainingDays: number | null): string {
  if (remainingDays == null || !Number.isFinite(remainingDays)) return "Dati insufficienti";
  const monthsRemaining = Math.round(remainingDays / 30);

  if (monthsRemaining <= 0) return "In chiusura";
  if (monthsRemaining <= 1) return "Tra ~1 mese";
  return `Tra ~${monthsRemaining} mesi`;
}

export type ProjectPerformanceForecast = {
  cpi: number | null;
  estimatedEndDate: Date | null;
  estimatedRemainingDays: number | null;
  estimatedAtCompletion: number | null;
  forecastValue: number;
  plannedValue: number;
  spi: number | null;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const totals = values.reduce(
    (acc, item) => ({
      value: acc.value + item.value * item.weight,
      weight: acc.weight + item.weight,
    }),
    { value: 0, weight: 0 },
  );
  return totals.weight > 0 ? totals.value / totals.weight : 0;
}

function calculateProductionRate(rows: Array<SalProgressRow & { parsedDate: Date }>): number {
  if (rows.length === 0) return 0;

  const sortedRows = [...rows].sort(
    (left, right) => left.parsedDate.getTime() - right.parsedDate.getTime(),
  );
  const firstDate = sortedRows[0]?.parsedDate ?? new Date();
  const elapsedDays = Math.max(1, (Date.now() - firstDate.getTime()) / DAY_MS);
  const committed = sortedRows.reduce((sum, row) => sum + row.amount, 0);
  const historicalRate = committed / elapsedDays;

  const intervalRates: Array<{ value: number; weight: number }> = [];
  for (let index = 1; index < sortedRows.length; index += 1) {
    const previous = sortedRows[index - 1];
    const current = sortedRows[index];
    if (!previous || !current) continue;
    const intervalDays = Math.max(
      1,
      (current.parsedDate.getTime() - previous.parsedDate.getTime()) / DAY_MS,
    );
    intervalRates.push({
      value: current.amount / intervalDays,
      weight: index,
    });
  }

  const recentRate = weightedAverage(intervalRates.slice(-3));
  if (recentRate <= 0) return historicalRate;
  return historicalRate * 0.45 + recentRate * 0.55;
}

function calculateTypicalAmount(rows: Array<Pick<SalProgressRow, "amount">>): number {
  const positiveAmounts = rows.map((row) => row.amount).filter((amount) => amount > 0);
  if (positiveAmounts.length === 0) return 0;
  const average = positiveAmounts.reduce((sum, amount) => sum + amount, 0) / positiveAmounts.length;
  return median(positiveAmounts) * 0.55 + average * 0.45;
}

export function calculateProjectPerformanceForecast(
  salRows: SalProgressRow[],
  financials: ProjectFinancials,
  salCadenceDays: number,
): ProjectPerformanceForecast {
  const forecastValue = financials.committed;
  const datedRows = salRows
    .map((row) => ({ ...row, parsedDate: parseSalDate(row.date) }))
    .filter((row): row is SalProgressRow & { parsedDate: Date } => row.parsedDate != null);

  const sortedRows = [...datedRows].sort(
    (left, right) => left.parsedDate.getTime() - right.parsedDate.getTime(),
  );
  const firstDate = sortedRows[0]?.parsedDate ?? null;
  const elapsedDays = firstDate ? Math.max(1, (Date.now() - firstDate.getTime()) / DAY_MS) : 0;
  const baselineRows =
    sortedRows.filter((row) => row.isApproved || row.isClosed).length > 0
      ? sortedRows.filter((row) => row.isApproved || row.isClosed)
      : sortedRows.slice(0, -1).length > 0
        ? sortedRows.slice(0, -1)
        : sortedRows;
  const recentRows = sortedRows.slice(-3);
  const typicalSalAmount = calculateTypicalAmount(baselineRows);
  const recentTypicalSalAmount = calculateTypicalAmount(
    recentRows.length > 0 ? recentRows : baselineRows,
  );
  const latestSalAmount = sortedRows[sortedRows.length - 1]?.amount ?? recentTypicalSalAmount;
  const activeSalAmount =
    latestSalAmount > 0 && recentTypicalSalAmount > 0
      ? latestSalAmount * 0.7 + recentTypicalSalAmount * 0.3
      : latestSalAmount || recentTypicalSalAmount;
  const plannedTotalDays =
    financials.contractual > 0 && typicalSalAmount > 0
      ? Math.max(
          salCadenceDays,
          Math.ceil(financials.contractual / typicalSalAmount) * Math.max(1, salCadenceDays),
        )
      : 0;
  const plannedProgress = plannedTotalDays > 0 ? Math.min(1, elapsedDays / plannedTotalDays) : 0;
  const actualProgress = financials.contractual > 0 ? forecastValue / financials.contractual : 0;
  const plannedValue =
    financials.contractual > 0 && plannedProgress > 0
      ? financials.contractual * plannedProgress
      : 0;
  const spi = plannedProgress > 0 && actualProgress > 0 ? actualProgress / plannedProgress : null;
  const remainingValue = Math.max(0, financials.contractual - forecastValue);
  const productionRate = calculateProductionRate(sortedRows);
  const estimatedRemainingDays =
    remainingValue > 0 && productionRate > 0
      ? remainingValue / productionRate
      : remainingValue <= 0
        ? 0
        : null;
  const estimatedEndDate =
    estimatedRemainingDays != null ? new Date(Date.now() + estimatedRemainingDays * DAY_MS) : null;
  const estimatedAtCompletion =
    forecastValue > financials.contractual
      ? forecastValue
      : forecastValue > 0 && typicalSalAmount > 0 && activeSalAmount > 0
        ? forecastValue + remainingValue * Math.max(0.2, activeSalAmount / typicalSalAmount)
        : forecastValue > 0
          ? financials.contractual
          : null;
  const cpi =
    financials.contractual > 0 && estimatedAtCompletion != null && estimatedAtCompletion > 0
      ? financials.contractual / estimatedAtCompletion
      : null;

  return {
    cpi,
    estimatedEndDate,
    estimatedRemainingDays,
    estimatedAtCompletion,
    forecastValue,
    plannedValue,
    spi,
  };
}

export function buildProjectDetail(
  project: PortfolioProject,
  financials: ProjectFinancials,
  currentSalLabel: string,
  salRows: SalProgressRow[] = [],
) {
  const { committed, contractual } = financials;
  const performance = calculateProjectPerformanceForecast(salRows, financials, project.salDays);
  const cpiNote = describeCostPerformance(performance.cpi);
  const spiNote = describeSchedulePerformance(performance.spi);

  const budgetDiff = committed - contractual;
  const forecastImpact =
    budgetDiff === 0
      ? "In linea col budget"
      : budgetDiff > 0
        ? `${formatEuro(budgetDiff)} sopra budget`
        : `${formatEuro(Math.abs(budgetDiff))} sotto budget`;

  const endDate = formatEndDateEstimate(performance.estimatedRemainingDays);

  return {
    budget: {
      approvedAmount: financials.approvedAmount,
      committed: financials.committed,
      contractual: financials.contractual,
      draftAmount: financials.draftAmount,
    },
    cpi: formatIndex(performance.cpi),
    cpiNote,
    cpiValue: performance.cpi,
    endDate,
    endDateValue: performance.estimatedEndDate,
    forecastImpact,
    health: project.healthLabel,
    healthTone: project.tone,
    lastUpdate: "Aggiornato da registro progetti",
    location: project.location,
    lot: project.lot,
    manager: project.manager,
    materialRisk: project.materialRisk,
    name: project.title,
    nextMilestone: project.nextMilestone,
    progress: Number(financials.progress.toFixed(1)),
    sal: {
      amount: financials.currentSalAmount,
      current: currentSalLabel,
    },
    spi: formatIndex(performance.spi),
    spiNote,
    spiValue: performance.spi,
    startDate: "Dossier operativo",
  };
}

export function buildMilestoneRows(project: PortfolioProject, salCount: number) {
  const completed = Math.max(1, Math.min(3, Math.floor(project.progress / 30)));
  const labels = ["Avvio lotto", project.phase, project.nextMilestone, "Chiusura contabilita"];

  return labels.map((label, index) => ({
    date:
      index === 0
        ? "Completata"
        : index === completed && salCount > 0
          ? formatDueWindow(project.salDays)
          : formatForecastDelta(project.forecastDeltaDays),
    label,
    status: index < completed ? "complete" : index === completed ? "active" : "planned",
  }));
}

export function buildProjectTeam(project: PortfolioProject) {
  return [
    { initials: getInitials(project.manager), name: project.manager, role: "Project Manager" },
    { initials: "DL", name: "Direzione Lavori", role: "Validazione SAL" },
    { initials: "CC", name: "Controllo Costi", role: "Forecast e budget" },
    { initials: "PR", name: "Procurement", role: project.materialRisk },
  ];
}

export function buildRecentActivities(
  project: PortfolioProject,
  salRows: Array<{ date: string; sal: string; status: string }>,
) {
  const latestSal = salRows[0];
  return [
    {
      date: latestSal?.date ?? "N/A",
      text: `${latestSal?.sal ?? "Nessuna SAL"} su ${project.title}`,
    },
    { date: formatDueWindow(project.salDays), text: project.nextMilestone },
    { date: "Ultimo aggiornamento", text: project.materialRisk },
    { date: "Registro", text: `Avanzamento fisico al ${project.progress}%` },
  ];
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
