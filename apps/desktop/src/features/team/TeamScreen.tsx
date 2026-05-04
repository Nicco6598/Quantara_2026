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
import { useMemo, useState } from "react";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface, ProjectControlButton } from "@/features/projects/components/workspace-ui";
import { cn } from "@/lib/utils";

type MemberStatus = "active" | "inactive" | "invited";

type TeamMember = {
  email: string;
  id: string;
  lastAccess: string;
  name: string;
  projects: number;
  role: TeamRole;
  status: MemberStatus;
};

type TeamRole = "Super Admin" | "Project Manager" | "Ingegnere" | "Contabile" | "Viewer";

const ALL_ROLES: TeamRole[] = [
  "Super Admin",
  "Project Manager",
  "Ingegnere",
  "Contabile",
  "Viewer",
];

const roleMeta: Record<
  TeamRole,
  {
    description: string;
    icon: LucideIcon;
    tone: "blue" | "green" | "orange" | "slate";
  }
> = {
  Contabile: {
    description: "Gestisce aspetti economici e contabili",
    icon: ShieldCheck,
    tone: "orange",
  },
  Ingegnere: {
    description: "Crea e modifica SAL e tariffari",
    icon: Users,
    tone: "blue",
  },
  "Project Manager": {
    description: "Gestisce progetti e team",
    icon: Users,
    tone: "green",
  },
  "Super Admin": {
    description: "Accesso completo a tutte le funzionalita",
    icon: Crown,
    tone: "blue",
  },
  Viewer: {
    description: "Visualizza dati e documenti",
    icon: ShieldCheck,
    tone: "slate",
  },
};

const initialMembers: TeamMember[] = [
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
    email: "martina.deluca@azienda.it",
    id: "8",
    lastAccess: "Invito inviato",
    name: "Martina De Luca",
    projects: 0,
    role: "Contabile",
    status: "invited",
  },
];

const statusMeta: Record<MemberStatus, { className: string; label: string }> = {
  active: { className: "bg-[var(--success-soft)] text-[var(--success-base)]", label: "Attivo" },
  inactive: { className: "bg-[var(--danger-soft)] text-[var(--danger-base)]", label: "Inattivo" },
  invited: { className: "bg-[var(--info-soft)] text-[var(--info-base)]", label: "Invitato" },
};

const PAGE_SIZE = 10;

export function TeamScreen() {
  const [members] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | TeamRole>("all");
  const [page, setPage] = useState(1);

  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "invited").length;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [members, query, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const rolesData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      counts[m.role] = (counts[m.role] ?? 0) + 1;
    }
    return ALL_ROLES.map((role) => ({ role, count: counts[role] ?? 0 }));
  }, [members]);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

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
              {activeCount} / {members.length}
            </div>
            <p className="mt-5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
              {pendingCount > 0
                ? `${pendingCount} invito${pendingCount === 1 ? "" : "i"} ${pendingCount === 1 ? "è" : "sono"} ancora in attesa di conferma.`
                : "Nessun invito in attesa."}
            </p>
          </div>
        }
      />

      <section className="mt-8 grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TeamMetricCard
          detail="Utenti nel workspace"
          icon={Users}
          label="Membri totali"
          tone="blue"
          value={String(members.length)}
        />
        <TeamMetricCard
          detail="Utenti attivi"
          icon={CheckCircle2}
          label="Membri attivi"
          tone="green"
          value={String(activeCount)}
        />
        <TeamMetricCard
          detail="Ruoli personalizzati"
          icon={ShieldCheck}
          label="Ruoli definiti"
          tone="orange"
          value={String(ALL_ROLES.length)}
        />
        <TeamMetricCard
          detail="Inviti in attesa"
          icon={Send}
          label="Inviti pendenti"
          tone="info"
          value={String(pendingCount)}
        />
      </section>

      <section className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TeamMembersPanel
          members={paginated}
          filteredCount={filtered.length}
          page={safePage}
          totalPages={totalPages}
          query={query}
          roleFilter={roleFilter}
          onQueryChange={handleSearch}
          onRoleFilterChange={(r) => {
            setRoleFilter(r);
            setPage(1);
          }}
          onPageChange={setPage}
        />

        <aside className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
          <InviteMemberCard />
          <RolesCard rolesData={rolesData} />
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
  tone: "blue" | "green" | "info" | "orange";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
    green: "bg-[var(--success-soft)] text-[var(--success-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
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

function TeamMembersPanel({
  members,
  filteredCount,
  page,
  totalPages,
  query,
  roleFilter,
  onQueryChange,
  onRoleFilterChange,
  onPageChange,
}: {
  members: TeamMember[];
  filteredCount: number;
  page: number;
  totalPages: number;
  query: string;
  roleFilter: "all" | TeamRole;
  onQueryChange: (v: string) => void;
  onRoleFilterChange: (r: "all" | TeamRole) => void;
  onPageChange: (p: number) => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);

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
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Cerca membro..."
              type="search"
              value={query}
            />
          </label>
          <div className="relative">
            <button
              className="inline-flex h-10 min-w-[168px] items-center justify-between rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 text-[13px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              onClick={() => setRoleOpen(!roleOpen)}
              type="button"
            >
              {roleFilter === "all" ? "Tutti i ruoli" : roleFilter}
              <ChevronDown
                className={cn(
                  "size-4 text-[var(--text-secondary)] transition-transform",
                  roleOpen && "rotate-180",
                )}
              />
            </button>
            {roleOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setRoleOpen(false)}
                  type="button"
                  aria-label="Chiudi"
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[180px] overflow-hidden rounded-[14px] bg-[var(--surface-base)] p-1 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.15)] ring-1 ring-[var(--border-subtle)]">
                  <button
                    className={cn(
                      "flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[13px] font-medium transition-colors",
                      roleFilter === "all"
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                    )}
                    onClick={() => {
                      onRoleFilterChange("all");
                      setRoleOpen(false);
                    }}
                    type="button"
                  >
                    Tutti i ruoli
                  </button>
                  {ALL_ROLES.map((role) => (
                    <button
                      className={cn(
                        "flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[13px] font-medium transition-colors",
                        roleFilter === role
                          ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                      )}
                      key={role}
                      onClick={() => {
                        onRoleFilterChange(role);
                        setRoleOpen(false);
                      }}
                      type="button"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
            {members.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Mobile card view --- */}
      <div className="divide-y divide-[var(--border-subtle)] md:hidden">
        {members.map((member) => (
          <MobileMemberCard key={member.id} member={member} />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-5 py-4 text-[12px] font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          Mostra {PAGE_SIZE} di {filteredCount} risult{filteredCount === 1 ? "ato" : "i"}
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Pagina precedente"
            className="flex size-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                p === page
                  ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                  : "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]",
              )}
              key={p}
              onClick={() => onPageChange(p)}
              type="button"
            >
              {p}
            </button>
          ))}
          <button
            aria-label="Pagina successiva"
            className="flex size-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
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

function RolesCard({ rolesData }: { rolesData: { role: TeamRole; count: number }[] }) {
  const { notify } = useToast();

  return (
    <BezelSurface innerClassName="p-5">
      <h2 className="text-[14px] font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
        Ruoli e permessi
      </h2>
      <p className="mt-1.5 text-[12px] font-medium leading-5 text-[var(--text-secondary)]">
        Gestisci ruoli e permessi del workspace.
      </p>
      <div className="mt-5 space-y-2">
        {rolesData.map(({ role, count }) => {
          const meta = roleMeta[role];
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
                {count}
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

function roleToneClass(tone: "blue" | "green" | "orange" | "slate") {
  return {
    blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
    green: "bg-[var(--success-soft)] text-[var(--success-base)]",
    orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    slate: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
  }[tone];
}
