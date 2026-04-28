import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock3,
  FolderKanban,
  Layers3,
  MoreVertical,
  Radio,
  ShieldCheck,
  TrainFront,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
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

function Hero() {
  return (
    <section>
      <div className="text-[18px] font-medium leading-none text-[var(--accent-primary)]">
        Buonasera, Marco.
      </div>
      <h2 className="mt-2 text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)] 2xl:text-[34px]">
        Centro di controllo dei lavori ferroviari.
      </h2>
      <p className="mt-2 max-w-3xl text-[16px] font-normal leading-6 text-[var(--text-secondary)]">
        Monitora l'andamento del portafoglio, anticipa i rischi e guida l'esecuzione.
      </p>
    </section>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: "blue" | "green" | "orange" | "red";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
    green: "bg-[var(--success-soft)] text-[var(--success-base)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    red: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  }[tone];

  return (
    <section className="group min-h-[146px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-4 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)] 2xl:min-h-[154px] 2xl:p-5">
      <div className="flex items-start gap-3 2xl:gap-4">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-2 text-[20px] font-semibold leading-none tracking-[-0.02em] text-[var(--info-base)] md:text-[23px] 2xl:text-[26px]">
            {value}
          </div>
          <div className="mt-3 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
            {detail}
          </div>
        </div>
      </div>

      <button
        className="mt-5 flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]"
        type="button"
      >
        Vedi dettaglio
        <ChevronRight className="size-3.5" />
      </button>
    </section>
  );
}

function PriorityActions() {
  return (
    <section className="rounded-[12px] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent-primary)_10%,transparent),color-mix(in_srgb,var(--accent-primary)_3.5%,transparent))] px-4 py-4 2xl:px-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--accent-primary)]">
            Azioni prioritarie
          </span>
          <span className="rounded-[6px] bg-[color-mix(in_srgb,var(--surface-base)_70%,transparent)] px-2 py-1 text-[11px] font-medium text-[var(--accent-primary)]">
            2 azioni urgenti
          </span>
        </div>
        <button
          className="flex items-center gap-1 text-[12px] font-medium text-[var(--accent-primary)]"
          type="button"
        >
          Vedi tutte le azioni
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1px_1fr] xl:items-center xl:gap-8">
        <PriorityItem
          copy="Intervento richiesto per evitare impatti sulle lavorazioni."
          cta="Apri alert materiali"
          icon={AlertTriangle}
          title="2 materiali critici su opere civili"
          tone="danger"
        />
        <div className="hidden h-14 w-px bg-[var(--accent-primary)]/20 xl:block" />
        <PriorityItem
          copy="Verifica e conferma per mantenere il programma."
          cta="Vai alle forniture"
          icon={Clock3}
          title="1 fornitura in conferma consegna"
          tone="warning"
        />
      </div>
    </section>
  );
}

function PriorityItem({
  copy,
  cta,
  icon: Icon,
  title,
  tone,
}: {
  copy: string;
  cta: string;
  icon: LucideIcon;
  title: string;
  tone: "danger" | "warning";
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={
          tone === "danger"
            ? "flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--accent-primary)]"
            : "flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]"
        }
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-[14px] font-medium text-[var(--text-primary)]">{title}</div>
        <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">{copy}</div>
        <button
          className="mt-2 flex items-center gap-1 text-[12px] font-medium text-[var(--accent-primary)]"
          type="button"
        >
          {cta}
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function OperationalSites({ projects }: { projects: PortfolioProject[] }) {
  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-none">
      <div className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center xl:justify-between 2xl:px-5">
        <div className="flex items-start gap-3">
          <FolderKanban className="mt-1 size-4 text-[var(--info-base)]" />
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Cantieri operativi
            </div>
            <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
              Stato avanzamento dei lotti attivi nel portafoglio
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative h-10 w-[220px] rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-base)] 2xl:w-[270px]">
            <SearchIcon />
            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[var(--text-secondary)]">
              Cerca per progetto...
            </span>
          </div>
          <Button
            className="h-10 rounded-[9px] border-[var(--border-subtle)] bg-[var(--surface-base)] text-[13px] font-semibold text-[var(--text-primary)]"
            size="sm"
            variant="outline"
          >
            Visualizzazione board
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[13px] border border-[var(--border-subtle)] mx-3 2xl:mx-4">
        <div className="min-w-[700px] xl:min-w-0">
          <div className="grid h-10 grid-cols-[1.55fr_0.85fr_0.75fr_0.75fr_0.72fr_112px] items-center bg-[var(--bg-muted)] px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)] xl:px-4 2xl:text-[11px] 2xl:tracking-[0.14em]">
            <span>Progetto / Lotto</span>
            <span>Stato</span>
            <span>SAL approvata</span>
            <span>Avanzamento</span>
            <span>Budget</span>
            <span className="text-right">Azioni</span>
          </div>

          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      </div>

      <div className="flex h-12 items-center justify-between px-5 text-[12px] font-medium text-[var(--text-secondary)]">
        <span>
          Vista 1–{projects.length} di {projects.length} cantieri
        </span>
        <span>
          Mostra <strong className="text-[var(--text-primary)]">10</strong> per pagina
        </span>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-label="Cerca"
      className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ProjectRow({ project }: { project: PortfolioProject }) {
  return (
    <div className="grid min-h-[70px] grid-cols-[1.55fr_0.85fr_0.75fr_0.75fr_0.72fr_112px] items-center border-t border-[var(--border-subtle)] px-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
            project.tone === "warning"
              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
              : "bg-[var(--info-soft)] text-[var(--info-base)]",
          )}
        >
          <TrainFront className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-[var(--text-primary)]">
            {project.title}
          </div>
          <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
            {project.lot} · {project.location}
          </div>
        </div>
      </div>

      <div>
        <StatusBadge label={project.healthLabel} tone={project.tone} />
        <div className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
          SAL aggiornata {project.salDays}gg fa
        </div>
      </div>

      <div>
        <div className="text-[13px] font-medium text-[var(--text-primary)]">
          {formatMoney(project.salValue)}
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-[var(--text-secondary)]">0,0%</div>
      </div>

      <div>
        <div
          className={cn(
            "text-[13px] font-medium",
            project.tone === "warning" ? "text-[var(--warning-base)]" : "text-[var(--info-base)]",
          )}
        >
          {project.progress}%
        </div>
        <div className="mt-2 h-1.5 w-[80px] overflow-hidden rounded-full bg-[var(--bg-muted-strong)] md:w-[96px] 2xl:w-[120px]">
          <div
            className={cn(
              "h-full rounded-full",
              project.tone === "danger"
                ? "bg-[var(--danger-base)]"
                : project.tone === "warning"
                  ? "bg-[var(--warning-base)]"
                  : "bg-[var(--info-base)]",
            )}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div>
        <div className="text-[13px] font-medium text-[var(--text-primary)]">
          {formatMoney(project.budget)}
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
          Impegnato 18.000 €
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          className="h-9 rounded-[9px] border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[12px] font-medium text-[var(--text-primary)]"
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
        <MoreVertical className="size-4 text-[var(--text-secondary)]" />
      </div>
    </div>
  );
}

function Milestones() {
  const items = [
    { date: "30 Apr", title: "Configurare SAL e tariffari", place: "Milano-Verona · Lotto 3A" },
    {
      date: "05 Mag",
      title: "Fine prevista in linea con piano",
      place: "Milano-Verona · Lotto 3A",
    },
    { date: "12 Mag", title: "Chiusura contabilità stimata", place: "Nodo di Firenze · Lotto 2B" },
  ];

  return (
    <section className="grid gap-3 rounded-[13px] bg-[var(--info-soft)]/62 px-4 py-4 xl:grid-cols-[180px_1fr_1fr_1fr_130px] xl:items-center 2xl:h-[78px] 2xl:grid-cols-[210px_1fr_1fr_1fr_150px] 2xl:px-5 2xl:py-0">
      <div className="flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--info-base)]">
        <CalendarDays className="size-4" />
        Prossime milestone
      </div>
      {items.map((item) => (
        <div className="border-l border-[var(--border-subtle)] px-4" key={item.date}>
          <div className="text-[11px] font-medium uppercase text-[var(--info-base)]">
            {item.date}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[var(--text-primary)] 2xl:text-[13px]">
            {item.title}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
            {item.place}
          </div>
        </div>
      ))}
      <button
        className="flex items-center justify-end gap-1 text-[12px] font-medium text-[var(--info-base)]"
        type="button"
      >
        Vedi calendario
        <ChevronRight className="size-3.5" />
      </button>
    </section>
  );
}

function RightRail({
  activities,
  distribution,
}: {
  activities: string[];
  distribution: Array<{ label: string; tone: StatusTone; value: string }>;
}) {
  return (
    <aside className="grid gap-4 lg:grid-cols-2 2xl:block 2xl:space-y-4">
      <RailCard icon={ShieldCheck} title="Salute sistema">
        <div className="space-y-3">
          {["Database", "Servizi", "Integrazioni"].map((item) => (
            <div
              className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
              key={item}
            >
              <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
                <span className="size-2 rounded-full bg-[var(--success-base)]" />
                {item}
              </div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--success-base)]">
                <span className="size-2 rounded-full bg-[var(--success-base)]" />
                Operativo
              </div>
            </div>
          ))}
        </div>
        <RailLink label="Vedi stato servizi" />
      </RailCard>

      <RailCard icon={Radio} title="Feed operativo">
        <div className="space-y-3">
          {activities.slice(0, 3).map((activity, index) => (
            <div className="grid grid-cols-[40px_1fr] gap-3" key={activity}>
              <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                {["17:32", "16:41", "15:28"][index]}
              </div>
              <div>
                <div className="text-[12px] font-medium leading-4 text-[var(--text-primary)]">
                  {activity.split(" · ")[0]}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                  {activity.split(" · ").slice(1).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
        <RailLink label="Vai al feed completo" />
      </RailCard>

      <RailCard icon={Layers3} title="Distribuzione stato">
        <div className="flex items-center gap-5">
          <div className="size-[96px] rounded-full bg-[conic-gradient(var(--success-base)_0_62%,var(--warning-base)_62%_84%,var(--danger-base)_84%_100%)] p-[16px]">
            <div className="size-full rounded-full bg-[var(--surface-base)]" />
          </div>
          <div className="flex-1 space-y-2">
            {distribution.slice(0, 3).map((row) => (
              <div className="flex items-center justify-between text-[12px]" key={row.label}>
                <span className="flex items-center gap-2 font-semibold text-[var(--text-secondary)]">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      row.tone === "success" && "bg-[var(--success-base)]",
                      row.tone === "warning" && "bg-[var(--warning-base)]",
                      row.tone === "danger" && "bg-[var(--danger-base)]",
                      row.tone === "info" && "bg-[var(--info-base)]",
                    )}
                  />
                  {row.label}
                </span>
                <span className="font-semibold text-[var(--text-primary)]">{row.value}</span>
              </div>
            ))}
            <div className="border-t border-[var(--border-subtle)] pt-2 text-[12px] font-medium text-[var(--text-secondary)]">
              Totale <span className="float-right text-[var(--text-primary)]">3</span>
            </div>
          </div>
        </div>
        <RailLink label="Vedi distribuzione" />
      </RailCard>

      <RailCard icon={Users} title="Team operativo">
        <div className="flex items-center gap-2">
          {[
            ["DA", "bg-[var(--warning-soft)] text-[var(--warning-base)]"],
            ["DL", "bg-[var(--danger-soft)] text-[var(--danger-base)]"],
            ["CC", "bg-[var(--danger-soft)] text-[var(--danger-base)]"],
            ["PR", "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]"],
            ["+2", "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]"],
          ].map(([label, className]) => (
            <span
              className={`flex size-9 items-center justify-center rounded-full text-[12px] font-medium ${className}`}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        <RailLink label="Vai al team" />
      </RailCard>
    </aside>
  );
}

function RailCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-base)] p-5 shadow-none">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="size-4 text-[var(--info-base)]" />
        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function RailLink({ label }: { label: string }) {
  return (
    <button
      className="mt-4 flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      type="button"
    >
      {label}
      <ChevronRight className="size-3.5" />
    </button>
  );
}

function buildOverviewMetrics(projects: PortfolioProject[]) {
  const totalBudget = projects.reduce((total, project) => total + project.budget.amount, 0);
  const escalationCount = projects.filter((project) => project.tone === "danger").length;
  const salCount = projects.filter((project) => project.salDays <= 7).length || 1;

  return [
    {
      detail: "Budget complessivo dei lotti attivi",
      icon: TrendingUp,
      label: "Budget portafoglio",
      tone: "blue" as const,
      value: formatMoney({ amount: totalBudget, currency: "EUR" }),
    },
    {
      detail: "Cantieri con SAL attivi",
      icon: Layers3,
      label: "Lotti attivi",
      tone: "green" as const,
      value: String(projects.length),
    },
    {
      detail: "SAL da configurare o in corso",
      icon: Clock3,
      label: "SAL in corso",
      tone: "orange" as const,
      value: String(salCount),
    },
    {
      detail: "Elementi critici da risolvere",
      icon: AlertTriangle,
      label: "Criticità / Escalation",
      tone: "red" as const,
      value: String(escalationCount || 2),
    },
  ];
}

function buildFocusRows(projects: PortfolioProject[]) {
  const success = projects.filter((project) => project.tone === "success").length || 2;
  const warning = projects.filter((project) => project.tone === "warning").length || 1;
  const danger = projects.filter((project) => project.tone === "danger").length;

  return [
    { label: "In linea", tone: "success", value: String(success) },
    { label: "In esaurimento", tone: "warning", value: String(warning) },
    { label: "Critico", tone: "danger", value: String(danger) },
  ] satisfies Array<{ label: string; tone: StatusTone; value: string }>;
}

function buildActivityRows(projects: PortfolioProject[]) {
  const runtimeRows = projects
    .slice()
    .sort((left, right) => left.salDays - right.salDays)
    .slice(0, 3)
    .map((project) => `${project.salState} · ${project.title} · ${project.lot}`);

  return runtimeRows.length > 0
    ? runtimeRows
    : [
        "SAL da creare su TEST · Milano-Verona · Lotto 3A",
        "Nuovo alert materiali · BIN-60E1 · Armamento",
        "SAL approvata · Milano-Verona · Lotto 3A",
      ];
}
