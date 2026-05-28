import type { LucideIcon } from "lucide-react";
import { Search, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchField } from "@/components/shared/form/SearchField";
import { SelectField } from "@/components/shared/form/SelectField";
import { Panel } from "@/components/shared/Panel";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { StatusChip } from "@/components/shared/StatusChip";
import { type Column, DataTable } from "@/components/shared/table/DataTable";
import { useContextMenu } from "@/hooks/useContextMenu";
import { buildTeamMemberContextMenuEntries, copyTextToClipboard } from "@/lib/context-menu-presets";
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

function TeamHeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-11px font-medium text-[var(--text-secondary)]">{label}</span>
        <Icon className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-1 text-17px font-semibold leading-none tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

export function TeamScreen() {
  const { members, updateMember, removeMember } = useTeamState();
  const memberContextMenu = useContextMenu<WorkspaceMember>();
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
      <section className="border-b border-[var(--border-subtle)] pb-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div className="min-w-0">
            <p className="text-12px font-medium text-[var(--text-tertiary)]">Workspace</p>
            <h2 className="mt-1 text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
              Team e permessi
            </h2>
            <p className="mt-2 max-w-2xl text-14px leading-6 text-[var(--text-secondary)]">
              Membri, inviti e ruoli operativi con controlli rapidi sugli accessi.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <TeamHeaderStat icon={Users} label="Totali" value={members.length} />
            <TeamHeaderStat icon={Users} label="Attivi" value={activeCount} />
            <TeamHeaderStat icon={UserPlus} label="Inviti" value={invitedCount} />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <Panel className="mb-4" padding="none">
          <div className="p-4">
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
          onRowContextMenu={(member, event) => memberContextMenu.open(event, member)}
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

        {memberContextMenu.state ? (
          <AppContextMenu
            entries={buildTeamMemberContextMenuEntries({
              onRemove: () => {
                const state = memberContextMenu.state;
                if (!state) return;
                removeMember(state.context.id);
              },
              onCopyEmail: () => {
                const state = memberContextMenu.state;
                if (!state) return;
                void copyTextToClipboard(state.context.email);
              },
            })}
            header={{
              title: memberContextMenu.state.context.name,
              subtitle: memberContextMenu.state.context.email,
            }}
            onClose={memberContextMenu.close}
            position={{
              x: memberContextMenu.state.x,
              y: memberContextMenu.state.y,
            }}
          />
        ) : null}
      </section>
    </ScreenLayout>
  );
}
