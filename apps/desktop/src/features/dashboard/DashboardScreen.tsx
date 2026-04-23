import { Calculator, CheckCircle2, FolderKanban, TrendingUp, Users } from "lucide-react";
import { AlertListCard } from "@/components/cards/AlertListCard";
import { KpiStatCard } from "@/components/cards/KpiStatCard";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { dashboardAlerts } from "@/features/dashboard/demo-data";

const globalStats = {
  totalProjects: 12,
  totalBudget: 91450000,
  activeProjects: 8,
  completedProjects: 2,
  atRiskProjects: 2,
  criticalProjects: 0,
  totalSal: 33,
  approvedSal: 28,
};

const projectList = [
  {
    id: "p1",
    name: "Linea AV/AC Milano-Verona",
    lot: "Lotto 3A",
    progress: 68,
    health: "success" as const,
    status: "In linea",
  },
  {
    id: "p2",
    name: "Nodo di Firenze AV",
    lot: "Lotto 2B",
    progress: 72,
    health: "warning" as const,
    status: "Attenzione",
  },
  {
    id: "p3",
    name: "Linea AV Napoli-Bari",
    lot: "Lotto 1C",
    progress: 45,
    health: "danger" as const,
    status: "Critico",
  },
  {
    id: "p4",
    name: "Linea AV Genova-Ventimiglia",
    lot: "Lotto Unico",
    progress: 25,
    health: "success" as const,
    status: "In linea",
  },
  {
    id: "p5",
    name: "Manutenzione Rete Nord",
    lot: "Programma 2024",
    progress: 15,
    health: "info" as const,
    status: "Monitoraggio",
  },
];

export function DashboardScreen() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Panoramica consolidata di tutti i progetti
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <KpiStatCard
            detail="Progetti totali"
            icon={<FolderKanban className="h-5 w-5" />}
            label="Progetti"
            value={globalStats.totalProjects.toString()}
          />
          <KpiStatCard
            detail="Budget totale"
            icon={<Calculator className="h-5 w-5" />}
            label="Budget"
            value="€ 91,45M"
          />
          <KpiStatCard
            detail="In corso"
            icon={<TrendingUp className="h-5 w-5" />}
            label="Attivi"
            value={globalStats.activeProjects.toString()}
          />
          <KpiStatCard
            detail="Completati"
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Completati"
            value={globalStats.completedProjects.toString()}
          />
          <KpiStatCard detail="Team" icon={<Users className="h-5 w-5" />} label="Team" value="5" />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1fr] gap-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]">Stato progetti</h2>
            </div>
            <div className="mt-4 flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-[var(--success-base)]">
                  {globalStats.activeProjects}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">In linea</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[var(--warning-base)]">
                  {globalStats.atRiskProjects}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">A rischio</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[var(--danger-base)]">
                  {globalStats.criticalProjects}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Critici</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[var(--info-base)]">
                  {globalStats.completedProjects}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Completati</div>
              </div>
            </div>
          </div>

          <AlertListCard alerts={dashboardAlerts} />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Tutti i progetti</h2>
            <Button variant="outline" size="sm">
              Vedi tutti
            </Button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left text-xs text-[var(--text-secondary)]">
                <th className="pb-3 font-medium">Progetto</th>
                <th className="pb-3 font-medium">Lotto</th>
                <th className="pb-3 font-medium">Avanzamento</th>
                <th className="pb-3 font-medium">Stato</th>
                <th className="pb-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {projectList.map((project) => (
                <tr key={project.id} className="border-b border-[var(--border-subtle)]">
                  <td className="py-3 font-medium text-[var(--text-primary)]">{project.name}</td>
                  <td className="py-3 text-[var(--text-secondary)]">{project.lot}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-[var(--bg-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--success-base)]"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <StatusBadge label={project.status} tone={project.health} />
                  </td>
                  <td className="py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("navigate", { detail: "project-detail" }),
                        )
                      }
                    >
                      Apri
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
