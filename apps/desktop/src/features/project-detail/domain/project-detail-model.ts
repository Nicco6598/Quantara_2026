import type { PortfolioProject } from "@/features/projects/types";
import { formatDueWindow, formatForecastDelta } from "@/features/projects/utils/projects-helpers";

type ProjectFinancials = {
  approvedAmount: number;
  committed: number;
  contractual: number;
  currentSalAmount: number;
  draftAmount: number;
  progress: number;
  residual: number;
};

export function buildProjectDetail(
  project: PortfolioProject,
  financials: ProjectFinancials,
  currentSalLabel: string,
) {
  const costPerformance =
    financials.committed > 0 ? financials.approvedAmount / financials.committed : 1;

  return {
    budget: {
      approvedAmount: financials.approvedAmount,
      committed: financials.committed,
      contractual: financials.contractual,
      draftAmount: financials.draftAmount,
    },
    cpi: costPerformance.toLocaleString("it-IT", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }),
    endDate:
      project.forecastDeltaDays === 0
        ? "In linea con piano"
        : `${formatForecastDelta(project.forecastDeltaDays)} forecast`,
    forecastImpact: project.variance,
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
