import { AlertTriangle, FolderKanban, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { CommandPanel, MetricTile, ScreenShell, SectionPanel } from "@/components/shared/Screen";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { listDesktopContracts } from "@/lib/desktopData";
import { formatMoney } from "@/lib/formatters";
import {
  mapContractToProject,
  portfolioProjects,
  type PortfolioProject,
} from "@/features/projects/ProjectsScreen";

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

  const overviewMetrics = useMemo(() => buildOverviewMetrics(projects), [projects]);
  const daySignals = useMemo(() => buildDaySignals(projects), [projects]);
  const focusRows = useMemo(() => buildFocusRows(projects), [projects]);
  const activityRows = useMemo(() => buildActivityRows(projects), [projects]);

  return (
    <ScreenShell>
      <CommandPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Sala controllo portfolio</Badge>
              <span className="text-xs text-secondary">Aggiornato alle 17:40</span>
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-foreground">
              Visione unica su cantieri, SAL e presidio operativo.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
              Questa vista condensa volumi, criticita e code approvative del portafoglio senza
              aprire singoli dossier. L'obiettivo e capire in pochi secondi dove serve l'azione.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overviewMetrics.map((metric) => (
                <MetricTile {...metric} key={metric.label} />
              ))}
            </div>
          </div>

          <section className="rounded-[24px] border border-subtle bg-muted/40 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Segnali giornata</h3>
            </div>
            <div className="mt-4 space-y-3">
              {daySignals.map((signal) => (
                <SignalCard
                  detail={signal.detail}
                  key={signal.label}
                  label={signal.label}
                  tone={signal.tone}
                />
              ))}
            </div>
          </section>
        </div>
      </CommandPanel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <SectionPanel className="p-0">
          <div className="flex flex-col gap-3 border-b border-subtle px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                Registro portfolio
              </div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">
                Lotti attivi e relativo presidio
              </h3>
            </div>
            <Button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("navigate", { detail: "projects" }))
              }
              size="sm"
              variant="outline"
            >
              Apri board progetti
            </Button>
          </div>

          <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
            <div className="hidden grid-cols-[1.6fr_0.8fr_0.8fr_0.7fr_auto] gap-4 xl:grid">
              <span>Progetto</span>
              <span>Milestone</span>
              <span>SAL</span>
              <span>Avanzamento</span>
              <span>Azioni</span>
            </div>
          </div>

          <div>
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </SectionPanel>

        <div className="space-y-6">
          <SectionPanel>
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-info" />
              <h3 className="text-base font-semibold text-foreground">Distribuzione stato</h3>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {focusRows.map((row) => (
                <MetricTile
                  detail="Stato attuale del perimetro portfolio"
                  key={row.label}
                  label={row.label}
                  tone={row.tone}
                  value={row.value}
                />
              ))}
            </div>
          </SectionPanel>

          <SectionPanel>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <h3 className="text-base font-semibold text-foreground">Feed operativo</h3>
            </div>
            <div className="mt-4 space-y-3">
              {activityRows.map((row) => (
                <div
                  className="rounded-[20px] border border-subtle bg-muted/40 px-4 py-3"
                  key={row}
                >
                  <div className="text-sm font-medium text-foreground">{row}</div>
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>
      </section>
    </ScreenShell>
  );
}

function SignalCard({ detail, label, tone }: { detail: string; label: string; tone: StatusTone }) {
  const badgeLabel =
    tone === "danger"
      ? "Critico"
      : tone === "warning"
        ? "Presidio"
        : tone === "success"
          ? "Stabile"
          : "Info";

  return (
    <div className="rounded-[20px] border border-subtle bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <StatusBadge label={badgeLabel} tone={tone} />
      </div>
      <p className="mt-2 text-xs leading-5 text-secondary">{detail}</p>
    </div>
  );
}

function ProjectRow({ project }: { project: PortfolioProject }) {
  return (
    <div className="grid gap-4 border-t border-subtle px-5 py-4 xl:grid-cols-[1.6fr_0.8fr_0.8fr_0.7fr_auto] xl:items-center">
      <div>
        <div className="text-sm font-semibold text-foreground">{project.title}</div>
        <div className="mt-1 text-xs text-secondary">
          {project.lot} · {project.location}
        </div>
      </div>
      <div className="text-sm text-foreground">{project.nextMilestone}</div>
      <div>
        <div className="text-sm font-semibold text-foreground">{formatMoney(project.salValue)}</div>
        <div className="mt-1">
          <StatusBadge label={project.healthLabel} tone={project.tone} />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{project.progress}%</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${
              project.tone === "danger"
                ? "bg-danger"
                : project.tone === "warning"
                  ? "bg-warning"
                  : "bg-success"
            }`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
      <div className="flex justify-start xl:justify-end">
        <Button
          onClick={() => {
            try {
              window.sessionStorage.setItem(
                "quantara.selectedProjectDetail.v1",
                JSON.stringify(project),
              );
            } catch {
              // Detail opens with first available project if session storage is unavailable.
            }
            window.dispatchEvent(new CustomEvent("navigate", { detail: "project-detail" }));
          }}
          size="sm"
          variant="outline"
        >
          Apri
        </Button>
      </div>
    </div>
  );
}

function buildOverviewMetrics(projects: PortfolioProject[]) {
  const totalBudget = projects.reduce((total, project) => total + project.budget.amount, 0);
  const escalationCount = projects.filter((project) => project.tone === "danger").length;
  const managers = new Set(projects.map((project) => project.manager)).size;

  return [
    {
      detail: "Budget complessivo dei lotti attivi nel perimetro corrente",
      label: "EAC portafoglio",
      tone: "info",
      value: formatMoney({ amount: totalBudget, currency: "EUR" }),
    },
    {
      detail: "Cantieri con SAL, forecast e materiali sotto controllo operativo",
      label: "Lotti attivi",
      tone: "success",
      value: String(projects.length),
    },
    {
      detail: "Progetti in stato critico o con SAL bloccata",
      label: "Escalation",
      tone: escalationCount > 0 ? "warning" : "success",
      value: String(escalationCount),
    },
    {
      detail: "Responsabili di commessa in carico sul portafoglio",
      label: "PM operativi",
      tone: "neutral",
      value: String(managers),
    },
  ] as const;
}

function buildDaySignals(projects: PortfolioProject[]) {
  const blocked = projects.filter((project) => project.tone === "danger");
  const nearSal = projects.filter((project) => project.salDays <= 2);
  const stable = projects.filter((project) => project.tone === "success");

  return [
    {
      detail:
        blocked.length > 0
          ? blocked.map((project) => project.title).join(", ")
          : "Nessun dossier bloccato nel perimetro corrente.",
      label: `${blocked.length} dossier critici`,
      tone: blocked.length > 0 ? "danger" : "success",
    },
    {
      detail:
        nearSal.length > 0
          ? nearSal.map((project) => project.salState).join(", ")
          : "Nessuna scadenza SAL nelle prossime 48 ore.",
      label: `${nearSal.length} snodi ravvicinati`,
      tone: nearSal.length > 0 ? "warning" : "success",
    },
    {
      detail: `${stable.length} lotti tengono curva lavori e materiali sopra soglia di sicurezza.`,
      label: "Presidio stabile",
      tone: "success",
    },
  ] satisfies Array<{ detail: string; label: string; tone: StatusTone }>;
}

function buildFocusRows(projects: PortfolioProject[]) {
  const success = projects.filter((project) => project.tone === "success").length;
  const warning = projects.filter((project) => project.tone === "warning").length;
  const danger = projects.filter((project) => project.tone === "danger").length;
  const completed = projects.filter((project) => project.progress >= 90).length;

  return [
    { label: "In linea", tone: "success", value: String(success) },
    { label: "Sotto presidio", tone: "warning", value: String(warning) },
    { label: "Escalation", tone: "danger", value: String(danger) },
    { label: "Completati", tone: "info", value: String(completed) },
  ] satisfies Array<{ label: string; tone: StatusTone; value: string }>;
}

function buildActivityRows(projects: PortfolioProject[]) {
  return projects
    .slice()
    .sort((left, right) => left.salDays - right.salDays)
    .slice(0, 4)
    .map((project) => `${project.salState} · ${project.title} · ${project.nextMilestone}`);
}
