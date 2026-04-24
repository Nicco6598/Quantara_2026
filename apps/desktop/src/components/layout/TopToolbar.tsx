import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UploadCloud,
  Users,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import type { QuantaraRoute, ThemeMode } from "@/store/app-store";

type RouteMeta = {
  section: string;
  title: string;
};

type PageAction = {
  actionId: string;
  hasDropdown?: boolean;
  icon: LucideIcon;
  label: string;
  variant: "outline" | "primary";
};

const routeMetaMap: Record<QuantaraRoute, RouteMeta> = {
  accounting: { section: "Contabilita", title: "Stato Avanzamento" },
  dashboard: { section: "Panoramica", title: "Dashboard" },
  materials: { section: "Magazzino", title: "Materiali" },
  "project-detail": { section: "Dettaglio", title: "Progetto" },
  projects: { section: "Portfolio", title: "Progetti" },
  sal: { section: "Monitoraggio", title: "SAL" },
  settings: { section: "Sistema", title: "Impostazioni" },
  tariffs: { section: "Reference", title: "Tariffario" },
  team: { section: "Risorse", title: "Team" },
};

const pageActionsMap: Record<QuantaraRoute, PageAction[]> = {
  accounting: [
    { actionId: "filter", hasDropdown: true, icon: Filter, label: "Filtri", variant: "outline" },
    { actionId: "export", icon: Download, label: "Esporta", variant: "outline" },
  ],
  dashboard: [{ actionId: "settings", icon: Settings, label: "Configura", variant: "outline" }],
  materials: [
    { actionId: "import", icon: UploadCloud, label: "Importa", variant: "outline" },
    { actionId: "new", icon: Plus, label: "Nuovo", variant: "primary" },
  ],
  "project-detail": [
    { actionId: "export", icon: Download, label: "Esporta", variant: "outline" },
    { actionId: "new-sal", icon: Plus, label: "SAL", variant: "primary" },
  ],
  projects: [
    { actionId: "filter", hasDropdown: true, icon: Filter, label: "Filtri", variant: "outline" },
    { actionId: "new-project", icon: Plus, label: "Nuovo", variant: "primary" },
  ],
  sal: [{ actionId: "new-sal", icon: Plus, label: "Nuova SAL", variant: "primary" }],
  settings: [{ actionId: "preferences", icon: Settings, label: "Preferenze", variant: "outline" }],
  tariffs: [
    { actionId: "export", icon: Download, label: "Scarica", variant: "outline" },
    { actionId: "import", icon: UploadCloud, label: "Importa", variant: "primary" },
  ],
  team: [{ actionId: "roles", icon: Users, label: "Ruoli", variant: "outline" }],
};

type TopToolbarProps = {
  activeRoute: QuantaraRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

export function TopToolbar({
  activeRoute,
  canGoBack,
  canGoForward,
  onNavigateBack,
  onNavigateForward,
  onToggleTheme,
  themeMode,
}: TopToolbarProps) {
  const meta = routeMetaMap[activeRoute];
  const pageActions = pageActionsMap[activeRoute] ?? [];

  return (
    <header className="shell-topbar sticky top-0 z-40 border-b border-subtle/80 px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <HistoryNavigator
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onNavigateBack={onNavigateBack}
            onNavigateForward={onNavigateForward}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              <span>{meta.section}</span>
              <span className="text-border">/</span>
              <span>
                {new Date().toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                {meta.title}
              </h1>
              {activeRoute === "projects" ? <Badge variant="info">3 alert</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch />
          <PageActions actions={pageActions} />
          <UtilityButtons onToggleTheme={onToggleTheme} themeMode={themeMode} />
        </div>
      </div>
    </header>
  );
}

function HistoryNavigator({
  canGoBack,
  canGoForward,
  onNavigateBack,
  onNavigateForward,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[18px] border border-subtle bg-card/92 p-1 shadow-soft">
      <HistoryButton
        disabled={!canGoBack}
        icon={ChevronLeft}
        label="Torna indietro"
        onClick={onNavigateBack}
      />
      <HistoryButton
        disabled={!canGoForward}
        icon={ChevronRight}
        label="Vai avanti"
        onClick={onNavigateForward}
      />
    </div>
  );
}

function HistoryButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[14px] transition-all",
        disabled ? "cursor-not-allowed text-secondary/40" : "text-foreground hover:bg-muted",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="size-4" />
    </button>
  );
}

function GlobalSearch() {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
      <input
        className="h-10 w-[220px] rounded-[18px] border border-subtle bg-card/92 pl-10 pr-3 text-sm text-foreground outline-none transition-all duration-base placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-ring"
        placeholder="Cerca..."
        type="search"
      />
    </label>
  );
}

function PageActions({ actions }: { actions: PageAction[] }) {
  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <Button
          className="gap-1.5 rounded-[18px]"
          key={`${action.actionId}-${action.variant}`}
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("topbar-action", {
                detail: action.actionId,
              }),
            );
          }}
          size="sm"
          variant={action.variant === "primary" ? "default" : "outline"}
        >
          <action.icon className="size-4" />
          <span>{action.label}</span>
          {action.hasDropdown ? <ChevronDown className="size-3.5" /> : null}
        </Button>
      ))}
    </div>
  );
}

function UtilityButtons({
  onToggleTheme,
  themeMode,
}: {
  onToggleTheme: () => void;
  themeMode: ThemeMode;
}) {
  const ThemeIcon = themeMode === "light" ? Moon : Sun;

  return (
    <div className="flex items-center gap-1 rounded-[18px] border border-subtle bg-card/92 p-1 shadow-soft">
      <IconButton badge={3} icon={Bell} label="Notifiche" />
      <IconButton
        icon={ThemeIcon}
        label={themeMode === "light" ? "Modo scuro" : "Modo chiaro"}
        onClick={onToggleTheme}
      />
    </div>
  );
}

function IconButton({
  badge,
  icon: Icon,
  label,
  onClick,
}: {
  badge?: number;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="relative flex h-9 w-9 items-center justify-center rounded-[14px] text-secondary transition-all hover:bg-muted hover:text-foreground"
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="size-4" />
      {badge != null && badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
