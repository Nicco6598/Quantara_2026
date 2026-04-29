import { useEffect, useMemo, useState } from "react";
import {
  buildActivityRows,
  buildFocusRows,
  buildOverviewMetrics,
  Hero,
  MetricCard,
  Milestones,
  OperationalSites,
  PriorityActions,
  RightRail,
} from "@/features/dashboard/components/DashboardSections";
import {
  mapContractToProject,
  type PortfolioProject,
  portfolioProjects,
} from "@/features/projects/ProjectsScreen";
import { listDesktopContracts } from "@/lib/desktopData";

export function DashboardScreen() {
  const [projects, setProjects] = useState<PortfolioProject[]>(portfolioProjects);

  useEffect(() => {
    let active = true;

    listDesktopContracts([]).then((contracts) => {
      if (!active) {
        return;
      }

      const runtimeProjects = contracts.data.map(mapContractToProject);
      setProjects(runtimeProjects.length > 0 ? runtimeProjects : portfolioProjects);
    });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => buildOverviewMetrics(projects), [projects]);
  const rows = useMemo(() => projects.slice(0, 2), [projects]);
  const distribution = useMemo(() => buildFocusRows(projects), [projects]);
  const activities = useMemo(() => buildActivityRows(projects), [projects]);

  return (
    <div className="pt-4 md:pt-6 2xl:pt-7">
      <div className="grid min-w-0 gap-4 md:gap-5 2xl:grid-cols-[minmax(0,1fr)_280px] 2xl:gap-7">
        <div className="min-w-0 space-y-5">
          <Hero />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:gap-4">
            {metrics.map((metric) => (
              <MetricCard {...metric} key={metric.label} />
            ))}
          </div>

          <PriorityActions />

          <OperationalSites projects={rows} />

          <Milestones />
        </div>

        <RightRail activities={activities} distribution={distribution} />
      </div>
    </div>
  );
}
