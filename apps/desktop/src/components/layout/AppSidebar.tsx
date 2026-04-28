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
import { useCallback, useState } from "react";
import logoSidebar from "@/assets/branding/logo-sidebar.png";
import { materialRows } from "@/features/materials/MaterialsScreen";
import { portfolioProjects } from "@/features/projects/ProjectsScreen";
import { APP_VERSION } from "@/generated/appVersion";
import { cn } from "@/lib/utils";
import type { QuantaraRoute } from "@/store/app-store";

type NavBadge = {
  label: string;
  tone: "danger" | "info" | "neutral" | "success" | "warning";
  value: string;
};

type NavItem = {
  badges?: NavBadge[];
  detail?: string;
  icon: LucideIcon;
  label: string;
  route: QuantaraRoute;
};

const contractorCount = new Set(portfolioProjects.map((project) => project.contractor)).size;
const projectCount = portfolioProjects.length;
const criticalMaterialsCount = materialRows.filter((material) => material.tone === "danger").length;
const warningMaterialsCount = materialRows.filter((material) => material.tone === "warning").length;

const primaryNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", route: "dashboard" },
  {
    badges: [
      { label: "Appaltatori", tone: "info", value: String(contractorCount) },
      { label: "Progetti", tone: "success", value: String(projectCount) },
    ],
    detail: "Appaltatori / progetti",
    icon: FolderKanban,
    label: "Appaltatori",
    route: "projects",
  },
  { icon: BookOpen, label: "Tariffario", route: "tariffs" },
  {
    badges: [
      { label: "Critici", tone: "danger", value: String(criticalMaterialsCount) },
      { label: "In esaurimento", tone: "warning", value: String(warningMaterialsCount) },
    ],
    detail:
      criticalMaterialsCount > 0
        ? `${criticalMaterialsCount} critici`
        : `${warningMaterialsCount} in esaurimento`,
    icon: Box,
    label: "Materiali",
    route: "materials",
  },
  { icon: BarChart3, label: "Contabilità", route: "accounting" },
  { icon: Users, label: "Team", route: "team" },
];

const utilityNavItems: NavItem[] = [{ icon: Settings, label: "Impostazioni", route: "settings" }];

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

const SIDEBAR_WIDTH_EXPANDED = 212;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = useCallback(() => setCollapsed((prev) => !prev), []);

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <aside
      className="flex h-full shrink-0 overflow-visible bg-transparent transition-all duration-300 [font-family:var(--font-sans)] text-[var(--text-primary)]"
      style={{ width: sidebarWidth }}
    >
      <div className="flex min-h-0 w-full flex-col">
        {/* Header */}
        <div className="shrink-0 px-3 pb-3 pt-4">
          <SidebarHeader collapsed={collapsed} />
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-visible px-2.5">
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
        <div className="shrink-0 px-2.5 pb-3 pt-2">
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
        collapsed ? "justify-center px-0" : "justify-between px-1.5",
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <div className="relative shrink-0">
          <img alt="Quantara" className="h-9 w-9 object-contain" src={logoSidebar} />
          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--sidebar-bg)] bg-[var(--success-base)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0 text-left">
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
        "group relative flex w-full items-center rounded-xl text-left transition-all duration-200",
        collapsed ? "h-[44px] justify-center px-0" : "min-h-[42px] gap-2.5 px-2.5 py-2",
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
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-semibold leading-4">{item.label}</span>
          </span>

          {item.badges ? (
            <span className="flex shrink-0 items-center gap-1">
              {item.badges.map((badge) => (
                <NavBadgePill badge={badge} key={badge.label} />
              ))}
            </span>
          ) : null}
        </>
      )}

      {collapsed && item.badges ? (
        <span className="absolute right-1.5 top-1.5 flex gap-0.5">
          {item.badges.map((badge) => (
            <span
              className={cn(
                "size-2 rounded-full ring-1 ring-[var(--sidebar-bg)]",
                badgeDotClass(badge.tone),
              )}
              key={badge.label}
            />
          ))}
        </span>
      ) : null}

      {item.detail ? (
        <span
          className={cn(
            "pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 w-max max-w-[220px] -translate-y-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-left text-[11px] font-semibold leading-4 text-[var(--text-primary)] opacity-0 shadow-xl shadow-slate-950/10 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100",
            collapsed ? "translate-x-1" : "translate-x-0",
          )}
          role="tooltip"
        >
          <span className="block">{item.detail}</span>
          {item.badges ? (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {item.badges.map((badge) => (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    badgePillClass(badge.tone),
                  )}
                  key={badge.label}
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}

function NavBadgePill({ badge }: { badge: NavBadge }) {
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold tabular-nums",
        badgePillClass(badge.tone),
      )}
      title={`${badge.label}: ${badge.value}`}
    >
      {badge.value}
    </span>
  );
}

function SidebarFooter({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <footer>
      {/* User info */}
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl py-2.5 text-left transition-all hover:bg-[var(--bg-muted)]",
          collapsed ? "justify-center px-0" : "px-2.5",
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
      {/* Version */}
      <div
        className={cn(
          "mt-2 flex items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)]",
          collapsed ? "justify-center" : "justify-between px-1",
        )}
      >
        {!collapsed ? (
          <>
            <span>Quantara v{APP_VERSION}</span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--success-base)]" />
              Online
            </span>
          </>
        ) : null}
        <button
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
            !collapsed && "ml-auto",
          )}
          onClick={onToggle}
          title={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          type="button"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>
    </footer>
  );
}

function badgePillClass(tone: NavBadge["tone"]) {
  return {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone];
}

function badgeDotClass(tone: NavBadge["tone"]) {
  return {
    danger: "bg-[var(--danger-base)]",
    info: "bg-[var(--info-base)]",
    neutral: "bg-[var(--text-secondary)]",
    success: "bg-[var(--success-base)]",
    warning: "bg-[var(--warning-base)]",
  }[tone];
}

function isRouteActive(itemRoute: QuantaraRoute, activeRoute: QuantaraRoute) {
  if (itemRoute === "projects" && activeRoute === "project-detail") {
    return true;
  }

  return itemRoute === activeRoute;
}
