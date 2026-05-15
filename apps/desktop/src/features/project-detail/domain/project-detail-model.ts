import type { PortfolioProject } from "@/features/projects/types";
import { formatDueWindow, formatForecastDelta } from "@/features/projects/utils/projects-helpers";
import { formatEuro } from "@/lib/formatters";

type ProjectFinancials = {
  approvedAmount: number;
  committed: number;
  contractual: number;
  currentSalAmount: number;
  draftAmount: number;
  progress: number;
  residual: number;
};

function estimateEndDate(
  salRows: Array<{ date: string }>,
  committed: number,
  contractual: number,
): string {
  if (salRows.length < 2 || contractual <= 0) return "Dati insufficienti";

  const dates = salRows.map((r) => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = dates[0] as Date;
  const lastDate = dates[dates.length - 1] as Date;
  const elapsedMs = lastDate.getTime() - firstDate.getTime();
  const elapsedDays = elapsedMs / 86400000;

  if (elapsedDays <= 0 || committed <= 0) return "Dati insufficienti";

  const progress = committed / contractual;
  const totalDays = Math.round(elapsedDays / Math.min(Math.max(progress, 0.05), 0.95));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const now = Date.now();
  const endMs = now + remainingDays * 86400000;
  const endDate = new Date(endMs);

  const monthsRemaining = Math.round(remainingDays / 30);

  if (endDate < new Date(now)) return "In linea con piano";
  if (monthsRemaining <= 0) return "In chiusura";
  if (monthsRemaining <= 1) return "Tra ~1 mese";
  return `Tra ~${monthsRemaining} mesi`;
}

export function buildProjectDetail(
  project: PortfolioProject,
  financials: ProjectFinancials,
  currentSalLabel: string,
  salRows?: Array<{ date: string; amount: number }>,
) {
  const { committed, contractual } = financials;
  const cpiValue = committed > 0 ? contractual / committed : 1;
  const cpiFormatted = cpiValue.toLocaleString("it-IT", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  let cpiNote: string;
  if (cpiValue > 1.05) cpiNote = "Sotto budget";
  else if (cpiValue >= 0.95) cpiNote = "In linea col budget";
  else cpiNote = "Sopra budget";

  const budgetDiff = committed - contractual;
  const forecastImpact =
    budgetDiff === 0
      ? "In linea col budget"
      : budgetDiff > 0
        ? `${formatEuro(budgetDiff)} sopra budget`
        : `${formatEuro(Math.abs(budgetDiff))} sotto budget`;

  const endDate = salRows ? estimateEndDate(salRows, committed, contractual) : "Dati insufficienti";

  return {
    budget: {
      approvedAmount: financials.approvedAmount,
      committed: financials.committed,
      contractual: financials.contractual,
      draftAmount: financials.draftAmount,
    },
    cpi: cpiFormatted,
    cpiNote,
    endDate,
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
