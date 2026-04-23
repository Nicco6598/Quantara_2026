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
  Users,
} from "lucide-react";
import logoSidebar from "@/assets/branding/logo-sidebar.png";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import type { QuantaraRoute } from "@/store/app-store";

type NavItem = {
  badge?: string;
  icon: LucideIcon;
  label: string;
  route: QuantaraRoute;
};

const primaryNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", route: "dashboard" },
  { badge: "3", icon: FolderKanban, label: "Progetti", route: "projects" },
  { icon: ClipboardList, label: "SAL", route: "sal" },
  { icon: BookOpen, label: "Tariffari", route: "tariffs" },
  { icon: Box, label: "Materiali", route: "materials" },
  { icon: BarChart3, label: "Contabilita", route: "accounting" },
];

const utilityNavItems: NavItem[] = [
  { icon: Users, label: "Team", route: "team" },
  { icon: Settings, label: "Impostazioni", route: "settings" },
];

const activeProject = {
  context: "Lotto 3A · Verona Est",
  name: "Milano-Verona",
  progress: 68,
};

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  return (
    <aside className="shell-sidebar flex h-screen w-[272px] shrink-0 flex-col border-r border-subtle/80 px-4 py-4">
      <div>
        <SidebarHeader />
        <ActiveProjectStrip onOpen={() => onRouteChange("project-detail")} />
        <SidebarNav activeRoute={activeRoute} items={primaryNavItems} onNavigate={onRouteChange} />
      </div>

      <div className="mt-4">
        <SidebarNav activeRoute={activeRoute} items={utilityNavItems} onNavigate={onRouteChange} />
        <SidebarFooter />
      </div>
    </aside>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-3 px-1 pb-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-subtle bg-card p-2 shadow-soft">
        <img alt="Quantara" className="h-full w-full object-contain" src={logoSidebar} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-base font-semibold tracking-tight text-foreground">
          Quantara
        </div>
        <div className="text-xs text-secondary">Rail operations</div>
      </div>
    </div>
  );
}

function ActiveProjectStrip({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="rounded-[22px] border border-subtle bg-card/92 px-4 py-3 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            Lotto attivo
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{activeProject.name}</div>
          <div className="text-xs text-secondary">{activeProject.context}</div>
        </div>
        <Badge variant="info">{activeProject.progress}%</Badge>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${activeProject.progress}%` }}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={onOpen} size="sm" variant="ghost">
          Apri
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function SidebarNav({
  activeRoute,
  items,
  onNavigate,
}: {
  activeRoute: QuantaraRoute;
  items: NavItem[];
  onNavigate: (route: QuantaraRoute) => void;
}) {
  return (
    <nav className="mt-4 space-y-2">
      {items.map((item) => (
        <SidebarNavItem
          active={isRouteActive(item.route, activeRoute)}
          item={item}
          key={item.route}
          onClick={() => onNavigate(item.route)}
        />
      ))}
    </nav>
  );
}

function SidebarNavItem({
  active,
  item,
  onClick,
}: {
  active: boolean;
  item: NavItem;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-[18px] border px-3 text-left transition-all duration-base",
        active
          ? "border-primary/20 bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] text-foreground shadow-soft"
          : "border-subtle bg-card/76 text-secondary hover:border-border hover:bg-card hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-2xl",
          active ? "bg-primary text-white" : "bg-muted text-secondary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1 text-sm font-medium">{item.label}</span>
      {item.badge ? <Badge variant={active ? "info" : "neutral"}>{item.badge}</Badge> : null}
    </button>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-4 flex items-center justify-between rounded-[20px] border border-subtle bg-card/88 px-3 py-3 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-xs font-bold text-white">
          MB
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">Marco Bianchi</div>
          <div className="text-xs text-secondary">Project Manager</div>
        </div>
      </div>

      <button
        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-subtle bg-muted text-secondary transition-colors hover:border-border hover:bg-card hover:text-foreground"
        title="Esci"
        type="button"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function isRouteActive(itemRoute: QuantaraRoute, activeRoute: QuantaraRoute) {
  if (itemRoute === "projects" && activeRoute === "project-detail") {
    return true;
  }

  return itemRoute === activeRoute;
}
