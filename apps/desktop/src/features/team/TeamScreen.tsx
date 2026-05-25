import { Search, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchField } from "@/components/shared/form/SearchField";
import { SelectField } from "@/components/shared/form/SelectField";
import { MetricCard } from "@/components/shared/MetricCard";
import { Panel } from "@/components/shared/Panel";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { StatusChip } from "@/components/shared/StatusChip";
import { useToast } from "@/components/shared/ToastProvider";
import { type Column, DataTable } from "@/components/shared/table/DataTable";
import type { WorkspaceMember } from "@/store/app-store";
import { useTeamState } from "@/store/app-store";

const ROLE_OPTIONS = [
  { value: "owner", label: "Proprietario" },
  { value: "admin", label: "Amministratore" },
  { value: "project_manager", label: "Project Manager" },
  { value: "engineer", label: "Ingegnere" },
  { value: "accountant", label: "Contabile" },
  { value: "viewer", label: "Viewer" },
] as const;

function formatLastAccess(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Ora";
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} h fa`;
  if (diffDays < 7) return `${diffDays} g fa`;
  return date.toLocaleDateString("it-IT");
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-11px font-bold text-[var(--text-inverse)]">
      {initials}
    </div>
  );
}

export function TeamScreen() {
  const { members, updateMember, removeMember } = useTeamState();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const activeCount = members.filter((m) => m.status === "active").length;
  const invitedCount = members.filter((m) => m.status === "invited").length;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [members, query, roleFilter]);

  const columns: Column<WorkspaceMember>[] = [
    {
      key: "member",
      header: "Membro",
      render: (member) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.name} />
          <div className="min-w-0">
            <div className="truncate text-13px font-bold text-[var(--text-primary)]">
              {member.name}
            </div>
            <div className="truncate text-12px font-medium text-[var(--text-secondary)]">
              {member.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Ruolo",
      width: "200px",
      render: (member) => (
        <SelectField
          value={member.role}
          onChange={(value) => updateMember(member.id, { role: value as WorkspaceMember["role"] })}
          options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      key: "status",
      header: "Stato",
      width: "120px",
      render: (member) => {
        const statusMeta: Record<
          string,
          { label: string; tone: "success" | "warning" | "danger" }
        > = {
          active: { label: "Attivo", tone: "success" },
          invited: { label: "Invitato", tone: "warning" },
          disabled: { label: "Disabilitato", tone: "danger" },
        };
        const meta = statusMeta[member.status] ?? {
          label: member.status,
          tone: "neutral" as const,
        };
        return (
          <StatusChip dot tone={meta.tone}>
            {meta.label}
          </StatusChip>
        );
      },
    },
    {
      key: "lastAccess",
      header: "Ultimo accesso",
      width: "140px",
      render: (member) => (
        <span className="text-13px text-[var(--text-secondary)]">
          {formatLastAccess(member.lastAccessAt)}
        </span>
      ),
    },
  ];

  return (
    <ScreenLayout gradient="accent-success">
      <ScreenHero
        badge="Workspace"
        title="Team e permessi"
        description="Membri, inviti e ruoli operativi del workspace con visibilit\u00e0 immediata su accessi e assegnazioni."
        sidePanel={
          <div>
            <div className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
              Membri attivi
            </div>
            <div className="mt-2 text-28px font-semibold leading-none text-[var(--text-primary)]">
              {activeCount} / {members.length}
            </div>
            <p className="mt-5 text-12px font-medium leading-5 text-[var(--text-secondary)]">
              {invitedCount > 0
                ? `${invitedCount} invito${invitedCount === 1 ? "" : "i"} in attesa di conferma.`
                : "Nessun invito in attesa."}
            </p>
            <Button
              className="mt-5 w-full"
              icon={UserPlus}
              onClick={() =>
                notify({
                  message:
                    "L'invito dei membri sar\u00e0 disponibile in un prossimo aggiornamento.",
                  title: "In arrivo",
                  tone: "info",
                })
              }
              variant="secondary"
            >
              Invita membro
            </Button>
          </div>
        }
      />

      <section className="operational-card-grid mt-8 sm:grid-cols-3">
        <MetricCard
          caption="Utenti nel workspace"
          icon={Users}
          label="Membri totali"
          value={members.length}
        />
        <MetricCard
          caption="Utenti attivi"
          icon={Users}
          label="Membri attivi"
          tone="success"
          value={activeCount}
        />
        <MetricCard
          caption="Inviti in attesa"
          icon={Users}
          label="Inviti pendenti"
          tone="warning"
          value={invitedCount}
        />
      </section>

      <section className="mt-8">
        <Panel className="mb-4" padding="none">
          <div className="p-3 lg:p-4">
            <div className="operational-toolbar">
              <div className="operational-toolbar-group">
                <h2 className="mr-2 text-13px font-semibold text-[var(--text-primary)]">
                  Membri del team
                </h2>
                <SearchField
                  value={query}
                  onChange={(value) => setQuery(value)}
                  placeholder="Cerca membro..."
                  className="w-full sm:w-[260px]"
                />
              </div>
              <div className="operational-toolbar-actions">
                <SelectField
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: "all", label: "Tutti i ruoli" },
                    ...ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                  ]}
                />
              </div>
            </div>
          </div>
        </Panel>
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(m) => m.id}
          emptyState={
            <EmptyState
              description="Nessun membro corrisponde ai criteri di ricerca."
              icon={Search}
              title="Nessun risultato"
            />
          }
          rowActions={(member) => (
            <Button
              className="size-8 px-0 text-[var(--text-secondary)] hover:text-[var(--danger-base)]"
              onClick={() => removeMember(member.id)}
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        />
      </section>
    </ScreenLayout>
  );
}
