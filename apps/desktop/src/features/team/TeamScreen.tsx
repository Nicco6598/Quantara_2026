import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Ellipsis,
  Mail,
  Search,
  Send,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface, ProjectControlButton } from "@/features/projects/components/workspace-ui";
import { cn } from "@/lib/utils";

type MemberStatus = "active" | "inactive" | "invited";

type TeamMember = {
  avatar?: string;
  email: string;
  id: string;
  lastAccess: string;
  name: string;
  projects: number;
  role: TeamRole;
  status: MemberStatus;
};

type TeamRole = "Super Admin" | "Project Manager" | "Ingegnere" | "Contabile" | "Viewer";

const roleMeta: Record<
  TeamRole,
  {
    count: number;
    description: string;
    icon: LucideIcon;
    tone: "blue" | "green" | "orange" | "slate";
  }
> = {
  Contabile: {
    count: 3,
    description: "Gestisce aspetti economici e contabili",
    icon: ShieldCheck,
    tone: "orange",
  },
  Ingegnere: {
    count: 6,
    description: "Crea e modifica SAL e tariffari",
    icon: Users,
    tone: "blue",
  },
  "Project Manager": {
    count: 4,
    description: "Gestisce progetti e team",
    icon: Users,
    tone: "green",
  },
  "Super Admin": {
    count: 3,
    description: "Accesso completo a tutte le funzionalita",
    icon: Crown,
    tone: "blue",
  },
  Viewer: {
    count: 2,
    description: "Visualizza dati e documenti",
    icon: ShieldCheck,
    tone: "slate",
  },
};

const teamMembers: TeamMember[] = [
  {
    email: "marco.bianchi@azienda.it",
    id: "1",
    lastAccess: "Oggi, 09:15",
    name: "Marco Bianchi",
    projects: 12,
    role: "Super Admin",
    status: "active",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
    email: "laura.rossi@azienda.it",
    id: "2",
    lastAccess: "Oggi, 08:45",
    name: "Laura Rossi",
    projects: 8,
    role: "Project Manager",
    status: "active",
  },
  {
    email: "alessandro.ferrari@azienda.it",
    id: "3",
    lastAccess: "Ieri, 17:30",
    name: "Alessandro Ferrari",
    projects: 6,
    role: "Ingegnere",
    status: "active",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=96&q=80",
    email: "giulia.colombo@azienda.it",
    id: "4",
    lastAccess: "Ieri, 14:20",
    name: "Giulia Colombo",
    projects: 4,
    role: "Contabile",
    status: "active",
  },
  {
    email: "riccardo.parisi@azienda.it",
    id: "5",
    lastAccess: "2 giorni fa",
    name: "Riccardo Parisi",
    projects: 2,
    role: "Viewer",
    status: "active",
  },
  {
    email: "sara.moretti@azienda.it",
    id: "6",
    lastAccess: "1 settimana fa",
    name: "Sara Moretti",
    projects: 3,
    role: "Ingegnere",
    status: "inactive",
  },
  {
    email: "luca.conti@azienda.it",
    id: "7",
    lastAccess: "Invito inviato",
    name: "Luca Conti",
    projects: 1,
    role: "Viewer",
    status: "invited",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&q=80",
    email: "martina.deluca@azienda.it",
    id: "8",
    lastAccess: "Invito inviato",
    name: "Martina De Luca",
    projects: 0,
    role: "Contabile",
    status: "invited",
  },
];

const metricCards = [
  {
    detail: "Utenti nel workspace",
    icon: Users,
    label: "Membri totali",
    tone: "blue" as const,
    value: "18",
  },
  {
    detail: "Utenti attivi",
    icon: CheckCircle2,
    label: "Membri attivi",
    tone: "green" as const,
    value: "16",
  },
  {
    detail: "Ruoli personalizzati",
    icon: ShieldCheck,
    label: "Ruoli definiti",
    tone: "orange" as const,
    value: "5",
  },
  {
    detail: "Inviti in attesa",
    icon: Send,
    label: "Inviti pendenti",
    tone: "violet" as const,
    value: "2",
  },
];

const statusMeta: Record<MemberStatus, { className: string; label: string }> = {
  active: {
    className: "bg-[var(--success-soft)] text-[var(--success-base)]",
    label: "Attivo",
  },
  inactive: {
    className: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    label: "Inattivo",
  },
  invited: {
    className: "bg-violet-100 text-violet-700",
    label: "Invitato",
  },
};

export function TeamScreen() {
  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_15%_10%,color-mix(in_srgb,var(--accent-primary)_13%,transparent),transparent_34%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--success-base)_12%,transparent),transparent_32%)]" />

      <ScreenHero
        badge="Workspace"
        title="Team e permessi"
        description="Membri, inviti e ruoli operativi del workspace con visibilita immediata su accessi e assegnazioni."
        sidePanel={
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Membri attivi
            </div>
            <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--text-primary)]">
              16 / 18
            </div>
            <p className="mt-5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              Due inviti sono ancora in attesa di conferma.
            </p>
          </div>
        }
      />

      <section className="mt-8 grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <TeamMetricCard {...metric} key={metric.label} />
        ))}
      </section>

      <section className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TeamMembersPanel />

        <aside className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
          <InviteMemberCard />
          <RolesCard />
        </aside>
      </section>

      <p className="flex items-start gap-2 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--info-base)] text-[10px] font-bold text-[var(--info-base)]">
          i
        </span>
        I permessi sono applicati a livello di progetto. Un membro puo avere ruoli diversi su
        progetti diversi.
      </p>
    </main>
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
  tone: "blue" | "green" | "orange" | "violet";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
    green: "bg-[var(--success-soft)] text-[var(--success-base)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    violet: "bg-violet-100 text-violet-700",
  }[tone];

  return (
    <BezelSurface innerClassName="group min-h-[116px] p-5">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            toneClass,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {label}
          </div>
          <div className={cn("mt-2 text-[26px] font-bold leading-none", toneClass.split(" ")[1])}>
            {value}
          </div>
          <div className="mt-2 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
            {detail}
          </div>
        </div>
      </div>
    </BezelSurface>
  );
}

function TeamMembersPanel() {
  return (
    <BezelSurface innerClassName="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[14px] font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
          Membri del team
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-[290px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <span className="sr-only">Cerca membro</span>
            <input
              className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] pl-10 pr-3 text-[13px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              placeholder="Cerca membro..."
              type="search"
            />
          </label>
          <ProjectControlButton className="min-w-[168px] justify-between" variant="neutral">
            Tutti i ruoli
            <ChevronDown className="size-4 text-[var(--text-secondary)]" />
          </ProjectControlButton>
        </div>
      </div>

      {/* --- Desktop table view --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[var(--bg-muted)] text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              <th className="px-5 py-3.5">Membro</th>
              <th className="px-4 py-3.5">Ruolo</th>
              <th className="px-4 py-3.5 text-center">Progetti assegnati</th>
              <th className="px-4 py-3.5">Stato</th>
              <th className="px-4 py-3.5">Ultimo accesso</th>
              <th className="px-5 py-3.5 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {teamMembers.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Mobile card view --- */}
      <div className="divide-y divide-[var(--border-subtle)] md:hidden">
        {teamMembers.map((member) => (
          <MobileMemberCard key={member.id} member={member} />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-5 py-4 text-[12px] font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          Mostra
          <ProjectControlButton className="h-8 px-2.5" variant="neutral">
            10
            <ChevronDown className="size-3.5" />
          </ProjectControlButton>
          di 18 risultati
        </div>
        <div className="flex items-center gap-2">
          <PaginationButton icon={ChevronLeft} label="Pagina precedente" />
          <ProjectControlButton className="size-8 px-0 text-[12px]" variant="soft">
            1
          </ProjectControlButton>
          <ProjectControlButton className="size-8 px-0 text-[12px]" variant="neutral">
            2
          </ProjectControlButton>
          <PaginationButton icon={ChevronRight} label="Pagina successiva" />
        </div>
      </div>
    </BezelSurface>
  );
}

function MobileMemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar member={member} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-bold text-[var(--text-primary)]">
              {member.name}
            </span>
            <StatusPill status={member.status} />
          </div>
          <div className="mt-0.5 truncate text-[12px] font-medium text-[var(--text-secondary)]">
            {member.email}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--text-secondary)]">
            <RolePill role={member.role} />
            <span>{member.projects} progetti</span>
            <span>{member.lastAccess}</span>
          </div>
        </div>
      </div>
      <ProjectControlButton
        aria-label={`Azioni per ${member.name}`}
        className="size-8 shrink-0 px-0"
        variant="icon"
      >
        <Ellipsis className="size-4" />
      </ProjectControlButton>
    </div>
  );
}

function TeamMemberRow({ member }: { member: TeamMember }) {
  return (
    <tr className="text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]/60">
      <td className="px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar member={member} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
              {member.name}
            </div>
            <div className="mt-0.5 truncate text-[12px] font-medium text-[var(--text-secondary)]">
              {member.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <RolePill role={member.role} />
      </td>
      <td className="px-4 py-3 text-center font-bold">{member.projects}</td>
      <td className="px-4 py-3">
        <StatusPill status={member.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--text-secondary)]">
        {member.lastAccess}
      </td>
      <td className="px-5 py-3 text-right">
        <ProjectControlButton
          aria-label={`Azioni per ${member.name}`}
          className="size-8 px-0"
          variant="icon"
        >
          <Ellipsis className="size-4" />
        </ProjectControlButton>
      </td>
    </tr>
  );
}

function InviteMemberCard() {
  const { notify } = useToast();
  return (
    <BezelSurface innerClassName="p-5">
      <h2 className="text-[14px] font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
        Aggiungi membro
      </h2>
      <p className="mt-1.5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
        Invita un nuovo membro al workspace.
      </p>
      <div className="mt-5 space-y-3">
        <label className="relative block">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)] sm:hidden" />
          <span className="sr-only">Email aziendale</span>
          <input
            className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3.5 text-[13px] font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] sm:pl-3.5"
            placeholder="Inserisci email aziendale"
            type="email"
          />
        </label>
        <ProjectControlButton className="w-full justify-between" variant="neutral">
          Seleziona ruolo
          <ChevronDown className="size-4 text-[var(--text-secondary)]" />
        </ProjectControlButton>
        <ProjectControlButton
          className="w-full"
          icon={Send}
          onClick={() =>
            notify({
              message:
                "L'invito dei membri del team sara disponibile in un prossimo aggiornamento.",
              title: "In arrivo",
              tone: "info",
            })
          }
          variant="soft"
        >
          Invia invito
        </ProjectControlButton>
      </div>
    </BezelSurface>
  );
}

function RolesCard() {
  const { notify } = useToast();
  const roles = Object.entries(roleMeta) as [TeamRole, (typeof roleMeta)[TeamRole]][];

  return (
    <BezelSurface innerClassName="p-5">
      <h2 className="text-[14px] font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
        Ruoli e permessi
      </h2>
      <p className="mt-1.5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
        Gestisci ruoli e permessi del workspace.
      </p>
      <div className="mt-5 space-y-2">
        {roles.map(([role, meta]) => {
          const Icon = meta.icon;

          return (
            <div
              className="flex items-center gap-3 rounded-[18px] bg-[var(--bg-muted)]/70 p-3"
              key={role}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  roleToneClass(meta.tone),
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                  {role}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-secondary)]">
                  {meta.description}
                </div>
              </div>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[12px] font-bold text-[var(--text-secondary)]">
                {meta.count}
              </span>
            </div>
          );
        })}
      </div>
      <ProjectControlButton
        className="mt-5 w-full"
        icon={UserCog}
        onClick={() =>
          notify({
            message:
              "La gestione dei ruoli e permessi sara disponibile in un prossimo aggiornamento.",
            title: "In arrivo",
            tone: "info",
          })
        }
        variant="soft"
      >
        Gestisci ruoli
      </ProjectControlButton>
    </BezelSurface>
  );
}

function Avatar({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  if (member.avatar) {
    return (
      <img
        alt=""
        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--border-subtle)]"
        src={member.avatar}
      />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[12px] font-bold text-[var(--text-inverse)]">
      {initials}
    </div>
  );
}

function RolePill({ role }: { role: TeamRole }) {
  const meta = roleMeta[role];

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-[11px] font-bold leading-none",
        roleToneClass(meta.tone),
      )}
    >
      <span className="truncate">{role}</span>
    </span>
  );
}

function StatusPill({ status }: { status: MemberStatus }) {
  const meta = statusMeta[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none",
        meta.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

function PaginationButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <ProjectControlButton aria-label={label} className="size-8 px-0" variant="icon">
      <Icon className="size-4" />
    </ProjectControlButton>
  );
}

function roleToneClass(tone: "blue" | "green" | "orange" | "slate") {
  return {
    blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
    green: "bg-[var(--success-soft)] text-[var(--success-base)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    slate: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
  }[tone];
}
