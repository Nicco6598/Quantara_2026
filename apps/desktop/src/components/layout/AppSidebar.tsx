import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Box,
  ChevronsUpDown,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import logoSidebar from "@/assets/branding/logo-sidebar.png";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { APP_VERSION } from "@/generated/appVersion";
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
  tone: "info" as const,
};

const projectFocusOptions = [
  {
    context: "Lotto 3A · Verona Est",
    name: "Milano-Verona",
    progress: 68,
    tone: "info" as const,
  },
  {
    context: "Lotto 1C · Tratta Orsara",
    name: "Napoli-Bari",
    progress: 45,
    tone: "warning" as const,
  },
  {
    context: "Lotto 2B · Galleria Belvedere",
    name: "Nodo Firenze AV",
    progress: 72,
    tone: "success" as const,
  },
] as const;

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  return (
    <aside className="shell-sidebar flex h-screen w-[272px] shrink-0 flex-col border-r border-subtle/80 px-4 py-5">
      <div className="min-h-0 flex-1">
        <SidebarHeader />
        <SidebarNav activeRoute={activeRoute} items={primaryNavItems} onNavigate={onRouteChange} />
        <SidebarNav activeRoute={activeRoute} items={utilityNavItems} onNavigate={onRouteChange} />
      </div>

      <div className="space-y-4">
        <ActiveProjectStrip onOpen={() => onRouteChange("project-detail")} />
        <SidebarFooter />
      </div>
    </aside>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-3 px-1 pb-5">
      <div className="flex size-14 items-center justify-center rounded-[20px] border border-subtle bg-card p-1.5 shadow-soft">
        <img alt="Quantara" className="size-full object-contain" src={logoSidebar} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold uppercase tracking-[0.28em] text-foreground">
          QUANTARA
        </div>
      </div>
    </div>
  );
}

function ActiveProjectStrip({ onOpen }: { onOpen: () => void }) {
  const [selectedFocus, setSelectedFocus] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const activeFocus = projectFocusOptions[selectedFocus] ?? activeProject;

  return (
    <section className="rounded-[22px] border border-subtle bg-card/82 p-3 shadow-soft">
      <button
        aria-expanded={isExpanded}
        className="sidebar-focus-trigger flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
            Focus progetto
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">
            {activeFocus.name}
          </div>
          <div className="truncate text-xs text-secondary">{activeFocus.context}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={activeFocus.tone}>{activeFocus.progress}%</Badge>
          <ChevronsUpDown
            className={cn(
              "size-4 text-secondary transition-transform duration-300 ease-out",
              isExpanded && "rotate-180",
            )}
          />
        </div>
      </button>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${activeFocus.progress}%` }}
        />
      </div>

      <div
        className={cn(
          "sidebar-focus-options grid",
          isExpanded ? "sidebar-focus-options-open" : "sidebar-focus-options-closed",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3 space-y-1.5 border-t border-subtle pt-3">
            {projectFocusOptions.map((project, index) => (
              <button
                className={cn(
                  "sidebar-focus-option flex w-full items-center justify-between gap-3 rounded-[14px] px-2.5 py-2 text-left text-xs",
                  index === selectedFocus
                    ? "bg-primary/10 text-foreground"
                    : "text-secondary hover:bg-muted hover:text-foreground",
                )}
                key={project.name}
                onClick={() => {
                  setSelectedFocus(index);
                  setIsExpanded(false);
                }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{project.name}</span>
                  <span className="block truncate">{project.context}</span>
                </span>
                <Badge variant={project.tone}>{project.progress}%</Badge>
              </button>
            ))}
          </div>
        </div>
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
        "sidebar-nav-item flex h-12 w-full items-center gap-3 rounded-[18px] border px-3 text-left",
        active
          ? "border-primary/20 bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))] text-foreground shadow-soft"
          : "border-subtle bg-card/76 text-secondary hover:border-border hover:bg-card hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "sidebar-nav-icon flex size-8 shrink-0 items-center justify-center rounded-2xl",
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
    <footer className="space-y-3 border-t border-subtle pt-4">
      <div className="rounded-[22px] border border-subtle bg-card/90 p-3.5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-xs font-bold text-white shadow-soft">
            MB
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-semibold text-foreground">Marco Bianchi</div>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <ShieldCheck className="size-3.5" />
              </span>
            </div>
            <div className="mt-0.5 text-xs text-secondary">Account demo collegato</div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[14px] border border-subtle bg-muted/35 px-2.5 py-2">
              <span className="text-[11px] font-medium text-secondary">Ruolo</span>
              <span className="text-xs font-semibold text-foreground">Project Manager</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-light text-secondary">Quantara v{APP_VERSION}</div>
    </footer>
  );
}

function isRouteActive(itemRoute: QuantaraRoute, activeRoute: QuantaraRoute) {
  if (itemRoute === "projects" && activeRoute === "project-detail") {
    return true;
  }

  return itemRoute === activeRoute;
}
