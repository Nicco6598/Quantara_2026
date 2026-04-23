import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Box,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import type { QuantaraRoute } from "@/store/app-store";
import { cn } from "@/lib/utils";

interface ProjectInfo {
  id: string;
  name: string;
  lot: string;
  location: string;
  status: "active" | "pending" | "completed";
  progress: number;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  route: QuantaraRoute;
  badge?: number;
}

const activeProject: ProjectInfo = {
  id: "p1",
  name: "Linea AV/AC Milano-Verona",
  lot: "Lotto 3A",
  location: "Tratta Verona Est",
  status: "active",
  progress: 68,
};

const user = {
  name: "Marco Bianchi",
  initials: "MB",
  role: "Project Manager",
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", route: "dashboard" },
  { icon: FolderKanban, label: "Progetti", route: "projects", badge: 3 },
  { icon: ClipboardList, label: "SAL", route: "sal" },
  { icon: BookOpen, label: "Tariffari", route: "tariffs" },
  { icon: Box, label: "Materiali", route: "materials" },
  { icon: BarChart3, label: "Contabilita", route: "accounting" },
];

const bottomNavItems: NavItem[] = [
  { icon: Users, label: "Team", route: "team" as QuantaraRoute },
  { icon: Settings, label: "Impostazioni", route: "settings" as QuantaraRoute },
];

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-base)]">
      <SidebarHeader />
      <SidebarProjectCard project={activeProject} />
      <SidebarNav activeRoute={activeRoute} items={navItems} onRouteChange={onRouteChange} />
      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--border-subtle)] p-4">
        <SidebarUserCard />
        <SidebarBottomNav
          activeRoute={activeRoute}
          items={bottomNavItems}
          onRouteChange={onRouteChange}
        />
      </div>
    </aside>
  );
}

function SidebarHeader() {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-[var(--border-subtle)] px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)] shadow-md">
        <span className="text-lg font-bold text-white">Q</span>
      </div>
      <div className="flex flex-col">
        <span className="text-base font-semibold text-[var(--text-primary)]">Quantara</span>
        <span className="text-xs font-medium text-[var(--text-secondary)]">Rail Works</span>
      </div>
    </div>
  );
}

interface SidebarProjectCardProps {
  project: ProjectInfo;
}

function SidebarProjectCard({ project }: SidebarProjectCardProps) {
  const statusColor =
    project.status === "active"
      ? "text-[var(--success-base)] bg-[var(--success-soft)]"
      : project.status === "pending"
        ? "text-[var(--warning-base)] bg-[var(--warning-soft)]"
        : "text-[var(--text-secondary)] bg-[var(--bg-muted)]";

  return (
    <div className="m-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Progetto attivo
        </span>
        <ChevronRight className="h-3 w-3 text-[var(--text-secondary)]" />
      </div>
      <div className="mt-2 text-sm font-semibold leading-tight text-[var(--text-primary)]">
        {project.name}
      </div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">
        {project.lot} · {project.location}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--success-base)] transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          {project.progress}%
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
            statusColor,
          )}
        >
          <TrendingUp className="h-3 w-3" />
          {project.status === "active" ? "Attivo" : "In attesa"}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">Ultimo SAL: 15 Apr</span>
      </div>
    </div>
  );
}

interface SidebarNavProps {
  activeRoute: QuantaraRoute;
  items: NavItem[];
  onRouteChange: (route: QuantaraRoute) => void;
}

function SidebarNav({ activeRoute, items, onRouteChange }: SidebarNavProps) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
      <NavSectionLabel label="Navigazione" />
      {items.map((item) => (
        <NavItemComponent
          key={item.route}
          activeRoute={activeRoute}
          item={item}
          onRouteChange={onRouteChange}
        />
      ))}
    </nav>
  );
}

function NavSectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-2 mt-1 px-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
}

interface NavItemComponentProps {
  activeRoute: QuantaraRoute;
  item: NavItem;
  onRouteChange: (route: QuantaraRoute) => void;
}

function NavItemComponent({ activeRoute, item, onRouteChange }: NavItemComponentProps) {
  const isActive = activeRoute === item.route;
  const Icon = item.icon;

  return (
    <button
      className={cn(
        "group flex h-10 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
      )}
      onClick={() => onRouteChange(item.route)}
      type="button"
    >
      <span className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4",
            isActive
              ? "text-[var(--sidebar-active-text)]"
              : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]",
          )}
        />
        {item.label}
      </span>
      {item.badge != null && item.badge > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            isActive
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

function SidebarUserCard() {
  return (
    <div className="flex items-center justify-between rounded-md p-2 hover:bg-[var(--bg-muted)]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] text-sm font-bold text-white">
          {user.initials}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--text-primary)]">{user.name}</span>
          <span className="text-xs text-[var(--text-secondary)]">{user.role}</span>
        </div>
      </div>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
        title="Esci"
        type="button"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

interface SidebarBottomNavProps {
  activeRoute: QuantaraRoute;
  items: NavItem[];
  onRouteChange: (route: QuantaraRoute) => void;
}

function SidebarBottomNav({ activeRoute, items, onRouteChange }: SidebarBottomNavProps) {
  return (
    <div className="flex gap-1 border-t border-[var(--border-subtle)] pt-2">
      {items.map((item) => (
        <NavItemComponent
          key={item.route}
          activeRoute={activeRoute}
          item={item}
          onRouteChange={onRouteChange}
        />
      ))}
    </div>
  );
}
