import type { PortfolioProject } from "@/features/projects/types";
import type { SalDocument } from "@/features/sal/domain/sal-workflow";

export type TimelineEvent = {
  date: string;
  description: string;
  id: string;
  status: "completed" | "current" | "pending" | "overdue";
  title: string;
  type: "sal" | "milestone";
  value?: number;
};

export function buildProjectTimeline(
  project: PortfolioProject,
  salDocuments: SalDocument[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Project start
  events.push({
    date: "Avvio",
    description: `Inizio progetto ${project.title}`,
    id: `start-${project.id}`,
    status: "completed",
    title: "Avvio progetto",
    type: "milestone",
  });

  // Add SAL events sorted by date
  const projectSals = [...salDocuments]
    .filter((s) => s.projectId === project.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const sal of projectSals) {
    const now = new Date();
    const salDate = new Date(sal.date);
    let status: TimelineEvent["status"] = "pending";
    if (sal.status === "closed") status = "completed";
    else if (salDate <= now) status = "overdue";
    else status = "current";

    events.push({
      date: sal.date,
      description: `${sal.title} — ${sal.status === "closed" ? "Approvata" : "Bozza"}`,
      id: sal.id,
      status,
      title: sal.title,
      type: "sal",
      value: sal.total ?? 0,
    });
  }

  // Project end milestone
  events.push({
    date:
      project.forecastDeltaDays > 0
        ? `+${project.forecastDeltaDays}gg`
        : project.forecastDeltaDays < 0
          ? `${project.forecastDeltaDays}gg`
          : "In linea",
    description: `Fine prevista per ${project.title}`,
    id: `end-${project.id}`,
    status: "pending",
    title: "Chiusura progetto",
    type: "milestone",
  });

  return events;
}
