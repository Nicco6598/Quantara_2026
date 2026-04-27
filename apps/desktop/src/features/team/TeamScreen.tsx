import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  ChevronRight,
  Clock,
  FolderKanban,
  MoreVertical,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/Button";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  projects: string[];
  status: "active" | "overloaded" | "available";
  load: number;
};

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Davide Ascani",
    role: "Direttore Lavori",
    projects: ["Milano-Verona · Lotto 3A", "Nodo di Firenze · Lotto 2B"],
    status: "overloaded",
    load: 92,
  },
  {
    id: "2",
    name: "Davide Lucherini",
    role: "Responsabile Tecnico",
    projects: ["Milano-Verona · Lotto 3A"],
    status: "active",
    load: 78,
  },
  {
    id: "3",
    name: "Carlo Capretta",
    role: "Geometra",
    projects: ["Nodo di Firenze · Lotto 2B", "Nodo di Firenze · Lotto 1A"],
    status: "active",
    load: 65,
  },
  {
    id: "4",
    name: "Paolo Rosi",
    role: "Ingegnere Stradale",
    projects: ["Milano-Verona · Lotto 3A"],
    status: "available",
    load: 40,
  },
  {
    id: "5",
    name: "Luca Bianchi",
    role: "Quadro Cantiere",
    projects: ["Nodo di Firenze · Lotto 2B"],
    status: "active",
    load: 71,
  },
  {
    id: "6",
    name: "Marco Neri",
    role: "Perito Contabile",
    projects: [],
    status: "available",
    load: 22,
  },
];

const statusLabel: Record<TeamMember["status"], string> = {
  active: "Attivo",
  overloaded: "Sovraccarico",
  available: "Disponibile",
};

export function TeamScreen() {
  const totalMembers = teamMembers.length;
  const rolesActive = new Set(teamMembers.map((m) => m.role)).size;
  const projectsCovered = new Set(teamMembers.flatMap((m) => m.projects)).size;
  const avgLoad = Math.round(teamMembers.reduce((sum, m) => sum + m.load, 0) / totalMembers);

  const metrics = [
    {
      detail: "Membri attivi in squadra",
      icon: Users,
      label: "Team members",
      tone: "blue" as const,
      value: String(totalMembers),
    },
    {
      detail: "Profili unici nel team",
      icon: ShieldCheck,
      label: "Roles attivi",
      tone: "green" as const,
      value: String(rolesActive),
    },
    {
      detail: "Progetti coperti",
      icon: FolderKanban,
      label: "Progetti coperti",
      tone: "orange" as const,
      value: String(projectsCovered),
    },
    {
      detail: "Carico medio sul team",
      icon: Clock,
      label: "Avg load",
      tone: "red" as const,
      value: `${avgLoad}%`,
    },
  ];

  return (
    <div className="pt-2">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-[9px] bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--info-base)]">
            Team
          </span>
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            Gestione squadra e assegnazioni
          </span>
        </div>
        <div className="mt-3">
          <div className="text-[18px] font-medium leading-none text-[var(--accent-primary)]">
            Quantara
          </div>
          <h2 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--text-primary)]">
            Team operativo
          </h2>
          <p className="mt-2 max-w-3xl text-[16px] font-normal leading-6 text-[var(--text-secondary)]">
            Panoramica dei componenti del team, dei ruoli attivi e delle assegnazioni progetto.
          </p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <TeamMetricCard {...metric} key={metric.label} />
        ))}
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="size-4 text-[var(--info-base)]" />
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Membri del team
                </div>
                <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
                  {totalMembers} membri · {rolesActive} ruoli attivi
                </div>
              </div>
            </div>
            <Button
              className="h-10 rounded-[9px] border-[var(--border-subtle)] bg-[var(--surface-base)] text-[13px] font-semibold text-[var(--text-primary)]"
              size="sm"
              variant="outline"
            >
              Aggiungi membro
            </Button>
          </div>

          <div className="space-y-3">
            {teamMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <QuickActionsCard />
          <TeamDistributionCard members={teamMembers} />
        </aside>
      </section>
    </div>
  );
}

function TeamMetricCard({
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
    <section className="group min-h-[130px] rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]">
      <div className="flex items-start gap-4">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] text-[var(--info-base)]">
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

function TeamMemberCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("");
  const badgeClasses: Record<TeamMember["status"], string> = {
    active: "bg-[var(--info-soft)] text-[var(--info-base)]",
    overloaded: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    available: "bg-[var(--success-soft)] text-[var(--success-base)]",
  };

  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none transition hover:-translate-y-0.5 hover:bg-[var(--surface-inset)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted-strong)] text-[14px] font-semibold text-[var(--text-secondary)]">
            {initials}
          </div>
          <div>
            <div className="text-[14px] font-medium text-[var(--text-primary)]">{member.name}</div>
            <div className="mt-1 text-[12px] font-medium text-[var(--text-secondary)]">
              {member.role}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-[9px] px-2.5 py-1 text-[11px] font-semibold ${badgeClasses[member.status]}`}
          >
            {statusLabel[member.status]}
          </span>
          <MoreVertical className="size-4 text-[var(--text-secondary)]" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[12px] font-medium text-[var(--text-secondary)]">
          <span>Carico</span>
          <span className="text-[var(--text-primary)]">{member.load}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
          <div
            className={cn(
              "h-full rounded-full",
              member.load >= 85
                ? "bg-[var(--warning-base)]"
                : member.load >= 60
                  ? "bg-[var(--info-base)]"
                  : "bg-[var(--success-base)]",
            )}
            style={{ width: `${member.load}%` }}
          />
        </div>
      </div>

      {member.projects.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Progetti assegnati
          </div>
          <div className="mt-2 space-y-1.5">
            {member.projects.map((project) => (
              <div
                className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)]"
                key={project}
              >
                <Briefcase className="size-3.5 text-[var(--info-base)]" />
                {project}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function QuickActionsCard() {
  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck className="size-4 text-[var(--info-base)]" />
        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Azioni rapide
        </h3>
      </div>
      <div className="space-y-3">
        {[
          { label: "Aggiungi nuovo membro", icon: UserPlus },
          { label: "Gestisci ruoli team", icon: ShieldCheck },
          { label: "Report carichi lavoro", icon: Clock },
        ].map((action) => (
          <button
            className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-inset)]"
            key={action.label}
            type="button"
          >
            <action.icon className="size-4 text-[var(--info-base)]" />
            {action.label}
            <ChevronRight className="ml-auto size-3.5 text-[var(--text-secondary)]" />
          </button>
        ))}
      </div>
    </section>
  );
}

function TeamDistributionCard({ members }: { members: TeamMember[] }) {
  const overloaded = members.filter((m) => m.status === "overloaded").length;
  const active = members.filter((m) => m.status === "active").length;
  const available = members.filter((m) => m.status === "available").length;
  const total = members.length;

  return (
    <section className="rounded-[16px] border border-[var(--border-subtle)]/80 bg-[var(--surface-base)] p-5 shadow-none">
      <div className="mb-4 flex items-center gap-3">
        <FolderKanban className="size-4 text-[var(--info-base)]" />
        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Distribuzione stato
        </h3>
      </div>
      <div className="flex items-center gap-5">
        <div className="size-[96px] rounded-full bg-[conic-gradient(var(--warning-base)_0_17%,var(--info-base)_17%_67%,var(--success-base)_67%_100%)] p-[16px]">
          <div className="size-full rounded-full bg-[var(--surface-base)]" />
        </div>
        <div className="flex-1 space-y-2">
          {[
            { label: "Sovraccarico", tone: "warning" as const, value: String(overloaded) },
            { label: "Attivo", tone: "info" as const, value: String(active) },
            { label: "Disponibile", tone: "success" as const, value: String(available) },
          ].map((row) => (
            <div className="flex items-center justify-between text-[12px]" key={row.label}>
              <span className="flex items-center gap-2 font-semibold text-[var(--text-secondary)]">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    row.tone === "warning" && "bg-[var(--warning-base)]",
                    row.tone === "info" && "bg-[var(--info-base)]",
                    row.tone === "success" && "bg-[var(--success-base)]",
                  )}
                />
                {row.label}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">{row.value}</span>
            </div>
          ))}
          <div className="border-t border-[var(--border-subtle)] pt-2 text-[12px] font-medium text-[var(--text-secondary)]">
            Totale <span className="float-right text-[var(--text-primary)]">{total}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
