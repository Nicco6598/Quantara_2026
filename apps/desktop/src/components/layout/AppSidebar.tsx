import {
  Bell,
  BookOpen,
  CaretDoubleLeft,
  CaretDoubleRight,
  ChartBar,
  Folders,
  Gear,
  Package,
  SquaresFour,
  Users,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoSidebar from "@/assets/branding/logo-sidebar.png";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import { isPlaceholderContractorName } from "@/features/projects/utils/projects-helpers";
import { APP_VERSION } from "@/generated/appVersion";
import { listDesktopContracts } from "@/lib/desktopData";
import { DATA_CHANGED_EVENT } from "@/lib/sync-events";
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
  icon: React.ElementType;
  label: string;
  route: QuantaraRoute;
};

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  onRouteChange: (route: QuantaraRoute) => void;
};

const SIDEBAR_WIDTH_EXPANDED = 212;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export function AppSidebar({ activeRoute, onRouteChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<{ id: string; contractor: string }[]>([]);
  const [contractorCount, setContractorCount] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);
  const toggleCollapsed = useCallback(() => setCollapsed((prev) => !prev), []);

  const loadProjects = useCallback(() => {
    let active = true;

    const registry: Record<string, string> =
      typeof window === "undefined"
        ? {}
        : (() => {
            try {
              return JSON.parse(
                window.localStorage.getItem("quantara.projectContractors.v1") ?? "{}",
              );
            } catch {
              return {};
            }
          })();
    const contractorRegistry: string[] =
      typeof window === "undefined"
        ? []
        : (() => {
            try {
              const parsed = JSON.parse(
                window.localStorage.getItem("quantara.contractorRegistry.v1") ?? "[]",
              );
              return Array.isArray(parsed)
                ? parsed.filter((item): item is string => typeof item === "string")
                : [];
            } catch {
              return [];
            }
          })();

    listDesktopContracts([]).then((contracts) => {
      if (!active) return;
      const projectRows = contracts.data.map((c) => {
        const p = mapContractToProject(c);
        const contractor = registry[c.id];
        return contractor ? { ...p, contractor } : p;
      });

      setProjects(projectRows);
      setContractorCount(
        new Set(
          [...projectRows.map((project) => project.contractor), ...contractorRegistry].filter(
            (contractor) => !isPlaceholderContractorName(contractor),
          ),
        ).size,
      );
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadProjects();
    return cleanup;
  }, [loadProjects]);

  useEffect(() => {
    const handleChange = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadProjects, 150);
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleChange);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleChange);
      clearTimeout(debounceRef.current);
    };
  }, [loadProjects]);

  const projectCount = projects.length;
  const criticalMaterialsCount = 0;
  const warningMaterialsCount = 0;

  const primaryNavItems: NavItem[] = useMemo(
    () => [
      { icon: SquaresFour, label: "Dashboard", route: "dashboard" },
      {
        badges: [
          { label: "Appaltatori", tone: "info", value: String(contractorCount) },
          { label: "Progetti", tone: "success", value: String(projectCount) },
        ],
        detail: "Appaltatori / progetti",
        icon: Folders,
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
        icon: Package,
        label: "Materiali",
        route: "materials",
      },
      { icon: ChartBar, label: "Contabilità", route: "accounting" },
      { icon: Users, label: "Team", route: "team" },
    ],
    [contractorCount, projectCount],
  );

  const utilityNavItems: NavItem[] = useMemo(
    () => [{ icon: Gear, label: "Impostazioni", route: "settings" }],
    [],
  );

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      className="relative z-40 flex h-full shrink-0 overflow-visible rounded-r-[28px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%),color-mix(in_srgb,var(--surface-base)_96%,var(--bg-app)_4%))] shadow-[inset_-1px_0_0_color-mix(in_srgb,var(--border-subtle)_42%,transparent),18px_0_44px_color-mix(in_srgb,var(--text-primary)_4%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--surface-base)_42%,transparent)),linear-gradient(180deg,color-mix(in_srgb,var(--border-subtle)_14%,transparent),transparent_22%)] [font-family:var(--font-sans)] text-[var(--text-primary)]"
      transition={{ type: "spring", stiffness: 280, damping: 34, mass: 0.35 }}
    >
      <div className="relative flex min-h-0 w-full flex-col overflow-visible">
        <div className="shrink-0 px-3 pb-4 pt-4">
          <SidebarHeader collapsed={collapsed} />
        </div>

        <div className="min-h-0 flex-1 overflow-visible px-2.5">
          <div className="mb-6">
            <SidebarNav
              activeRoute={activeRoute}
              collapsed={collapsed}
              items={primaryNavItems}
              onNavigate={onRouteChange}
            />
          </div>

          <div className="mb-5 pt-1">
            <SidebarNav
              activeRoute={activeRoute}
              collapsed={collapsed}
              items={utilityNavItems}
              onNavigate={onRouteChange}
            />
          </div>
        </div>

        <div className="shrink-0 px-2.5 pb-3 pt-3">
          <SidebarFooter collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      </div>
    </motion.aside>
  );
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[18px]",
        collapsed ? "justify-center px-0" : "justify-between px-1.5",
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
        <div className="shrink-0">
          <img
            alt="Quantara"
            className="h-9 w-9 object-contain"
            height={36}
            src={logoSidebar}
            width={36}
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 text-left">
            <div className="text-[14px] font-bold text-[var(--text-primary)]">Quantara</div>
            <div className="text-[10px] font-medium tracking-[0.08em] text-[var(--text-secondary)]">
              Construction Suite
            </div>
          </div>
        )}
      </div>
      {!collapsed && (
        <span className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)]">
          <Bell size={16} weight="regular" />
        </span>
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
    <nav className={cn("space-y-1", className)}>
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
  const NavIcon = item.icon;

  return (
    <button
      aria-label={item.label}
      className={cn(
        "group relative flex w-full items-center rounded-[16px] text-left outline-none transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed ? "h-[44px] justify-center px-0" : "min-h-[42px] gap-2.5 px-2.5 py-2",
        active
          ? "text-[var(--accent-primary-hover)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)]",
      )}
      onClick={onClick}
      type="button"
    >
      {active ? (
        <span className="absolute inset-0 rounded-[16px] bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base))]" />
      ) : (
        <span className="absolute inset-0 rounded-[16px] bg-[var(--bg-muted)] opacity-0 transition-opacity duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100" />
      )}

      {active ? (
        <span
          className={cn(
            "absolute rounded-full bg-[var(--accent-primary)]",
            collapsed ? "bottom-1.5 h-1 w-5" : "left-0 top-1/2 h-5 w-1 -translate-y-1/2",
          )}
        />
      ) : null}

      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-[12px] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          active
            ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent-primary)_24%,transparent)]"
            : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] group-hover:bg-[color-mix(in_srgb,var(--accent-primary)_9%,var(--bg-muted-strong))] group-hover:text-[var(--accent-primary)]",
        )}
      >
        <NavIcon size={16} weight={active ? "fill" : "regular"} />
        {collapsed && item.badges ? (
          <span className="absolute -right-0.5 -top-0.5 flex gap-0.5">
            {item.badges.map((badge) => (
              <span
                className={cn(
                  "size-2 rounded-full ring-1 ring-[var(--surface-base)]",
                  badgeDotClass(badge.tone),
                )}
                key={badge.label}
              />
            ))}
          </span>
        ) : null}
      </span>

      {!collapsed && item.label ? (
        <span className="relative z-10 min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] font-semibold leading-4">{item.label}</span>
        </span>
      ) : null}

      {!collapsed && item.badges ? (
        <span className="relative z-10 flex shrink-0 items-center gap-1">
          {item.badges.map((badge) => (
            <NavBadgePill badge={badge} key={badge.label} />
          ))}
        </span>
      ) : null}

      {collapsed || item.detail ? (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-[6px] w-max min-w-[140px] max-w-[240px] -translate-y-1/2 rounded-[16px] bg-[var(--surface-base)] px-4 py-3 text-left opacity-0 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.2),inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_72%,transparent)] backdrop-blur-xl transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
          role="tooltip"
        >
          <span className="absolute -left-[4px] top-1/2 size-[8px] -translate-y-1/2 rotate-45 bg-[var(--surface-base)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_52%,transparent)]" />
          <div className="text-[13px] font-bold leading-snug text-[var(--text-primary)]">
            {item.label}
          </div>
          {item.detail ? (
            <div className="mt-1.5 text-[11px] font-medium leading-relaxed text-[var(--text-secondary)]">
              {item.detail}
            </div>
          ) : null}
          {item.badges ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.badges.map((badge) => (
                <span
                  className={cn(
                    "rounded-[8px] px-2 py-0.5 text-[10px] font-bold",
                    badgePillClass(badge.tone),
                  )}
                  key={badge.label}
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
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
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
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
      <div
        className={cn(
          "group flex items-center gap-2.5 rounded-[18px] py-2.5 text-left transition-colors duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted)]",
          collapsed ? "justify-center px-0" : "px-2.5",
        )}
      >
        <div className="shrink-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-[12px] font-bold text-[var(--text-inverse)] shadow-[0_14px_34px_color-mix(in_srgb,var(--accent-primary)_23%,transparent)]">
            MB
          </div>
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

      <div
        className={cn(
          "mt-2 flex items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)]",
          collapsed ? "justify-center" : "justify-between px-1",
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span>Quantara v{APP_VERSION}</span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--success-base)]" />
              Online
            </span>
          </div>
        )}
        <button
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)]",
            !collapsed && "ml-auto",
          )}
          onClick={onToggle}
          title={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          type="button"
        >
          {collapsed ? (
            <CaretDoubleRight size={16} weight="regular" />
          ) : (
            <CaretDoubleLeft size={16} weight="regular" />
          )}
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
