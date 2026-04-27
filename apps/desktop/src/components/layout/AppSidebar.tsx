import { useCallback, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Box,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import logoSidebar from "@/assets/branding/logo-sidebar.png";
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
  { icon: BookOpen, label: "Tariffario", route: "tariffs" },
  { icon: Box, label: "Materiali", route: "materials" },
  { icon: BarChart3, label: "Contabilità", route: "accounting" },
  { icon: Users, label: "Team", route: "team" },
];

const utilityNavItems: NavItem[] = [{ icon: Settings, label: "Impostazioni", route: "settings" }];

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

const SIDEBAR_WIDTH_EXPANDED = 272;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = useCallback(() => setCollapsed((prev) => !prev), []);

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <aside
      className="flex h-full shrink-0 overflow-hidden bg-transparent transition-all duration-300 [font-family:var(--font-sans)] text-[var(--text-primary)]"
      style={{ width: sidebarWidth }}
    >
      <div className="flex min-h-0 w-full flex-col">
        {/* Header */}
        <div className="shrink-0 px-3 pb-4 pt-5">
          <SidebarHeader collapsed={collapsed} />
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Primary Navigation */}
          <div className="mb-5">
            <SidebarNav
              activeRoute={activeRoute}
              collapsed={collapsed}
              items={primaryNavItems}
              onNavigate={onRouteChange}
            />
          </div>

          {/* Utility Navigation */}
          <div className="mb-5">
            <SidebarNav
              activeRoute={activeRoute}
              collapsed={collapsed}
              items={utilityNavItems}
              onNavigate={onRouteChange}
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="shrink-0 px-3 pb-4 pt-2">
          <SidebarFooter collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      </div>
    </aside>
  );
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        collapsed ? "justify-center px-0" : "justify-between px-2",
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <div className="relative shrink-0">
          <img alt="Quantara" className="h-9 w-9 object-contain" src={logoSidebar} />
          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--sidebar-bg)] bg-[var(--success-base)]" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-[14px] font-bold tracking-[-0.01em] text-[var(--text-primary)]">
              Quantara
            </div>
            <div className="text-[10px] font-medium text-[var(--text-secondary)]">
              Construction Suite
            </div>
          </div>
        )}
      </div>
      {!collapsed && (
        <button
          className="flex size-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          type="button"
        >
          <Bell className="size-4" />
        </button>
      )}
    </div>
  );
}

function SidebarNav({
  activeRoute,
  collapsed,
  className,
  items,
  onNavigate,
}: {
  activeRoute: QuantaraRoute;
  collapsed: boolean;
  className?: string;
  items: NavItem[];
  onNavigate: (route: QuantaraRoute) => void;
}) {
  return (
    <nav className={cn("space-y-0.5", className)}>
      {items.map((item) => (
        <SidebarNavItem
          active={isRouteActive(item.route, activeRoute)}
          collapsed={collapsed}
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
  collapsed,
  item,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  item: NavItem;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className={cn(
        "group relative flex h-[44px] w-full items-center rounded-xl transition-all duration-200",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-[color-mix(in_srgb,var(--accent-primary)_13%,var(--surface-base))] text-[var(--accent-primary-hover)] shadow-none"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
      )}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      type="button"
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-all",
          active
            ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
            : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)]/10 group-hover:text-[var(--accent-primary)]",
        )}
      >
        <Icon className="size-4" strokeWidth={2} />
      </div>

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>

          {item.badge ? (
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold",
                active
                  ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                  : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
              )}
            >
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

function SidebarFooter({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <footer>
      {/* User info */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl py-2.5 transition-all hover:bg-[var(--bg-muted)]",
          collapsed ? "justify-center px-0" : "px-3",
        )}
      >
        <div className="relative shrink-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-[12px] font-bold text-[var(--text-inverse)]">
            MB
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--sidebar-bg)] bg-[var(--success-base)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
              Marco Bianchi
            </div>
            <div className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
              Project Manager
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        className={cn(
          "mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-lg text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
          collapsed && "px-0",
        )}
        onClick={onToggle}
        title={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
        type="button"
      >
        {collapsed ? (
          <ChevronsRight className="size-4" />
        ) : (
          <>
            <ChevronsLeft className="size-4" />
            <span className="text-[11px] font-medium">Comprimi</span>
          </>
        )}
      </button>

      {/* Version */}
      {!collapsed && (
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Quantara v{APP_VERSION}</span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[var(--success-base)]" />
            Online
          </span>
        </div>
      )}
    </footer>
  );
}

function isRouteActive(itemRoute: QuantaraRoute, activeRoute: QuantaraRoute) {
  if (itemRoute === "projects" && activeRoute === "project-detail") {
    return true;
  }

  return itemRoute === activeRoute;
}
