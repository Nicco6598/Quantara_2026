import {
  BookOpen,
  CaretRight,
  ChartBar,
  Folders,
  Gear,
  Package,
  SquaresFour,
  Users,
} from "@phosphor-icons/react";
import { m } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import logoSidebar from "@/assets/branding/logo-sidebar.png";
import { useAppStore } from "@/store/app-store";
import { mapContractToProject } from "@/features/projects/utils/project-mappers";
import {
  createContractorId,
  isPlaceholderContractorName,
} from "@/features/projects/utils/projects-helpers";
import { APP_VERSION } from "@/generated/appVersion";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import type { DesktopContract, DesktopMaterial } from "@/lib/desktopData";
import { listDesktopContracts, listDesktopMaterials } from "@/lib/desktopData";
import { cn } from "@/lib/utils";
import { readJsonFromStorage } from "@/persistence/json-storage";
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from "@/persistence/storage-keys";
import type { QuantaraRoute } from "@/store/app-store";
import { useActiveContext } from "@/store/app-store";

type NavItem = {
  badges?: {
    label: string;
    tone: "danger" | "info" | "neutral" | "success" | "warning";
    value: string;
  }[];
  detail?: string;
  icon: React.ElementType;
  label: string;
  route: QuantaraRoute;
};

type SidebarContextInfo = {
  primary: string;
  primaryId: string | null;
  secondary: string | null;
  secondaryId: string | null;
};

type AppSidebarProps = {
  activeRoute: QuantaraRoute;
  collapsed: boolean;
  onRouteChange: (route: QuantaraRoute, context?: string) => void;
};

const SIDEBAR_WIDTH_EXPANDED = 220;
const SIDEBAR_WIDTH_COLLAPSED = 0;

export function AppSidebar({ activeRoute, collapsed, onRouteChange }: AppSidebarProps) {
  const activeContext = useActiveContext();
  const [contracts, setContracts] = useState<DesktopContract[]>([]);
  const [projects, setProjects] = useState<{ id: string; contractor: string }[]>([]);
  const [contractorCount, setContractorCount] = useState(0);
  const [criticalMaterialsCount, setCriticalMaterialsCount] = useState(0);
  const [warningMaterialsCount, setWarningMaterialsCount] = useState(0);

  const loadProjects = useCallback(() => {
    let active = true;

    const registry: Record<string, string> =
      typeof window === "undefined"
        ? {}
        : (() => {
            try {
              return readJsonFromStorage<Record<string, string>>(
                window.localStorage,
                STORAGE_KEYS.projectContractors,
                {},
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
              const parsed = readJsonFromStorage<unknown[]>(
                window.localStorage,
                STORAGE_KEYS.contractorRegistry,
                [],
                Array.isArray,
              );
              return Array.isArray(parsed)
                ? parsed.filter((item): item is string => typeof item === "string")
                : [];
            } catch {
              return [];
            }
          })();

    listDesktopContracts([]).then((result) => {
      if (!active) return;
      setContracts(result.data);
      const projectRows = result.data.map((c) => {
        const p = mapContractToProject(c);
        const contractor = c.contractorName ?? registry[c.id];
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

    const matFbPromise: Promise<DesktopMaterial[]> = import.meta.env.DEV
      ? import("@/features/materials/materials-data").then((m) => m.fallbackMaterials)
      : Promise.resolve([]);
    matFbPromise.then((fb) => {
      listDesktopMaterials(fb).then((result) => {
        if (!active) return;
        const data = result.data.map((m) => ({
          ...m,
          minQuantity: m.minQuantity ?? 10,
          quantity: m.quantity ?? 0,
        }));
        setCriticalMaterialsCount(data.filter((m) => m.quantity < m.minQuantity).length);
        setWarningMaterialsCount(data.filter((m) => m.quantity === 0).length);
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadProjects();
    return cleanup;
  }, [loadProjects]);

  useDataChangedListener(loadProjects);

  const projectCount = projects.length;

  const contextLabel = useMemo(() => {
    const selectedProjectId = (() => {
      try {
        const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedProjectDetail);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { id?: unknown };
        return typeof parsed.id === "string" ? parsed.id : null;
      } catch {
        return null;
      }
    })();

    if (activeRoute === "projects" && activeContext) {
      return {
        primary: activeContext,
        primaryId: activeContext,
        secondary: null,
        secondaryId: null,
      };
    }

    if ((activeRoute === "project-detail" || activeRoute === "sal-create") && selectedProjectId) {
      const contract = contracts.find((c) => c.id === selectedProjectId);
      const project = projects.find((p) => p.id === selectedProjectId);
      if (contract) {
        const contractorName = project?.contractor ?? "";
        const contractorId = contractorName ? createContractorId(contractorName) : null;
        return {
          primary: contractorName || "Progetto",
          primaryId: contractorId,
          secondary: contract.title,
          secondaryId: contract.id,
        };
      }
    }

    return null;
  }, [activeRoute, activeContext, contracts, projects]);

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
    [contractorCount, projectCount, criticalMaterialsCount, warningMaterialsCount],
  );

  const utilityNavItems: NavItem[] = useMemo(
    () => [{ icon: Gear, label: "Impostazioni", route: "settings" }],
    [],
  );

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <m.aside
      animate={{ width: sidebarWidth }}
      className="relative z-40 flex h-full shrink-0 select-none overflow-hidden bg-transparent [font-family:var(--font-sans)] text-[var(--text-primary)]"
      transition={{ type: "tween", duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <m.div
        animate={{ opacity: collapsed ? 0 : 1 }}
        className="sidebar-rail relative flex min-h-0 w-full flex-col overflow-hidden p-3"
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <div className="shrink-0">
          <SidebarHeader collapsed={collapsed} />
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-hidden">
          <SidebarGroup label="Workspace">
            <SidebarNav
              activeRoute={activeRoute}
              contextLabel={contextLabel}
              items={primaryNavItems}
              onNavigate={onRouteChange}
            />
          </SidebarGroup>

          <SidebarGroup className="mt-5" label="Sistema">
            <SidebarNav
              activeRoute={activeRoute}
              contextLabel={null}
              items={utilityNavItems}
              onNavigate={onRouteChange}
            />
          </SidebarGroup>
        </div>

        <div className="shrink-0 pt-3">
          <SidebarFooter />
        </div>
      </m.div>
    </m.aside>
  );
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  const themeMode = useAppStore((s) => s.themeMode);
  const isDark = themeMode.startsWith("dark");
  return (
    <div
      className={cn(
        "flex min-h-12 items-center rounded-18px",
        collapsed
          ? "justify-between px-2.5"
          : "justify-between bg-[color-mix(in_srgb,var(--surface-base)_56%,transparent)] px-2.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_46%,transparent)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          alt="Quantara"
          className="shrink-0 object-contain h-8 w-8"
          draggable={false}
          height={40}
          src={logoSidebar}
          style={isDark ? { filter: "brightness(0) invert(1)" } : undefined}
          width={40}
        />
        <div className="min-w-0">
          <div className="truncate text-13px font-650 leading-4 text-[var(--text-primary)]">
            Quantara
          </div>
          <div className="truncate text-10px font-medium leading-3 text-[var(--text-secondary)]">
            Construction Suite
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarGroup({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-2 px-2 text-9px font-700 uppercase tracking-0_14em text-[color-mix(in_srgb,var(--text-secondary)_64%,transparent)]">
        {label}
      </div>
      {children}
    </section>
  );
}

function SidebarNav({
  activeRoute,
  className,
  contextLabel,
  items,
  onNavigate,
}: {
  activeRoute: QuantaraRoute;
  className?: string;
  contextLabel: { primary: string; secondary: string | null } | null;
  items: NavItem[];
  onNavigate: (route: QuantaraRoute) => void;
}) {
  return (
    <nav className={cn("space-y-1.5", className)}>
      {items.map((item) => {
        const isActive = isRouteActive(item.route, activeRoute);
        return (
          <div key={item.route}>
            <SidebarNavItem active={isActive} item={item} onClick={() => onNavigate(item.route)} />
            {isActive && contextLabel && (
              <SidebarContextBreadcrumb
                label={contextLabel as SidebarContextInfo}
                onNavigate={onNavigate}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarContextBreadcrumb({
  label,
  onNavigate,
}: {
  label: SidebarContextInfo;
  onNavigate: (route: QuantaraRoute, context?: string) => void;
}) {
  return (
    <div className="ml-10 mt-1.5 flex min-w-0 flex-col gap-0.5 px-2">
      {label.primaryId ? (
        <button
          className="w-full truncate rounded-md px-1 py-0.5 text-left text-11px font-medium leading-4 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          onClick={() => {
            if (label.primaryId) onNavigate("projects", label.primaryId);
          }}
          title={`Vedi progetti di ${label.primary}`}
          type="button"
        >
          {label.primary}
        </button>
      ) : (
        <span className="truncate text-11px font-medium leading-4 text-[var(--text-tertiary)]">
          {label.primary}
        </span>
      )}
      {label.secondary && label.secondaryId ? (
        <div className="flex items-start gap-1">
          <CaretRight
            size={10}
            weight="bold"
            className="mt-0.5 shrink-0 text-[var(--text-tertiary)] opacity-50"
          />
          <button
            className="min-w-0 rounded-md px-1 py-0.5 text-left text-11px font-semibold leading-4 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--accent-primary)]"
            onClick={() => {
              try {
                window.sessionStorage.setItem(
                  SESSION_STORAGE_KEYS.selectedProjectDetail,
                  JSON.stringify({ id: label.secondaryId }),
                );
              } catch {
                /* no-op */
              }
              onNavigate("project-detail");
            }}
            title={`Vedi dettaglio ${label.secondary}`}
            type="button"
          >
            {label.secondary}
          </button>
        </div>
      ) : null}
    </div>
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
  const NavIcon = item.icon;

  return (
    <button
      aria-label={item.label}
      className={cn(
        "group relative flex w-full select-none items-center overflow-hidden rounded-14px text-left outline-none transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "min-h-[50px] gap-2.5 px-2.5 py-2.5",
        active
          ? "text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring-focus)]",
      )}
      onClick={onClick}
      type="button"
    >
      {active ? (
        <span className="absolute inset-0 rounded-14px bg-[color-mix(in_srgb,var(--surface-base)_88%,var(--accent-primary)_12%)] shadow-[0_8px_22px_color-mix(in_srgb,var(--text-primary)_5%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--surface-highlight)_70%,transparent)]" />
      ) : (
        <span className="absolute inset-0 rounded-14px bg-[color-mix(in_srgb,var(--surface-base)_58%,transparent)] opacity-0 transition-opacity duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100" />
      )}

      {active ? (
        <span
          className={cn(
            "absolute rounded-full bg-[var(--accent-primary)]",
            "left-1.5 top-1/2 h-4 w-1 -translate-y-1/2",
          )}
        />
      ) : null}

      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-10px transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          active
            ? "bg-[color-mix(in_srgb,var(--accent-primary)_13%,var(--surface-base))] text-[var(--accent-primary)] shadow-none"
            : "bg-[color-mix(in_srgb,var(--bg-muted-strong)_76%,transparent)] text-[var(--text-secondary)] group-hover:bg-[var(--surface-base)] group-hover:text-[var(--accent-primary)]",
        )}
      >
        <NavIcon size={16} weight={active ? "fill" : "regular"} />
      </span>

      <span className="relative z-10 min-w-0 flex-1 text-left">
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="block min-w-0 truncate text-13px font-650 leading-4">{item.label}</span>
          {item.badges ? <BadgeCluster badges={item.badges} /> : null}
        </span>
        {item.badges ? (
          <span className="mt-1 block truncate text-10px font-medium leading-3 text-[var(--text-tertiary)]">
            {item.detail}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function BadgeCluster({ badges }: { badges: NonNullable<NavItem["badges"]> }) {
  const visibleBadges = badges.filter((badge) => badge.value !== "0");

  if (visibleBadges.length === 0) {
    return null;
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {visibleBadges.map((badge) => (
        <NavBadgePill badge={badge} key={badge.label} />
      ))}
    </span>
  );
}

function NavBadgePill({
  badge,
}: {
  badge: {
    label: string;
    tone: "danger" | "info" | "neutral" | "success" | "warning";
    value: string;
  };
}) {
  return (
    <span
      className={cn(
        "flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[5px] text-[12px] font-bold leading-none tabular-nums",
        badgePillClass(badge.tone),
      )}
      title={`${badge.label}: ${badge.value}`}
    >
      {badge.value}
    </span>
  );
}

function SidebarFooter() {
  return (
    <footer className="select-none">
      <div
        className={cn(
          "group flex items-center gap-2.5 rounded-18px text-left transition-colors duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "bg-[color-mix(in_srgb,var(--surface-base)_58%,transparent)] p-2 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border-subtle)_46%,transparent)] hover:bg-[color-mix(in_srgb,var(--surface-base)_76%,transparent)]",
        )}
      >
        <div className="shrink-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-10px bg-[var(--accent-primary)] text-10px font-800 text-[var(--text-inverse)] shadow-[0_8px_18px_color-mix(in_srgb,var(--accent-primary)_16%,transparent)]">
            MB
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-12px font-650 leading-4 text-[var(--text-primary)]">
            Marco Bianchi
          </div>
          <div className="truncate text-10px font-medium leading-3 text-[var(--text-secondary)]">
            Project Manager
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-2 flex items-center gap-2 px-1 text-[12px] font-medium leading-none text-[var(--text-secondary)]",
          "justify-between px-1",
        )}
      >
        <span className="tracking-normal">v{APP_VERSION}</span>
        <span className="flex items-center gap-1">
          <span className="size-1 rounded-full bg-[var(--success-base)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--success-base)_10%,transparent)]" />
          Online
        </span>
      </div>
    </footer>
  );
}

function badgePillClass(tone: "danger" | "info" | "neutral" | "success" | "warning") {
  return {
    danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
    info: "bg-[var(--info-soft)] text-[var(--info-base)]",
    neutral: "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)]",
    success: "bg-[var(--success-soft)] text-[var(--success-base)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  }[tone];
}

function isRouteActive(itemRoute: QuantaraRoute, activeRoute: QuantaraRoute) {
  if (itemRoute === "projects" && activeRoute === "project-detail") {
    return true;
  }

  return itemRoute === activeRoute;
}
