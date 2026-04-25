import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Filter,
  Moon,
  Plus,
  Search,
  Sun,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
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
  menuItems?: PageActionMenuItem[];
  variant: "outline" | "primary";
};

type PageActionMenuItem = {
  actionId: string;
  description: string;
  icon: LucideIcon;
  label: string;
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

const createMenuItems: PageActionMenuItem[] = [
  {
    actionId: "new-project",
    description: "Crea contratto, importo e tariffario principale",
    icon: BriefcaseBusiness,
    label: "Progetto",
  },
  {
    actionId: "new-sal",
    description: "Apri la creazione guidata di uno stato avanzamento",
    icon: Plus,
    label: "SAL",
  },
  {
    actionId: "import-tariff",
    description: "Importa o prepara un tariffario da PDF",
    icon: FileUp,
    label: "Tariffario",
  },
];

const commonPageActions: PageAction[] = [
  { actionId: "filter", hasDropdown: true, icon: Filter, label: "Filtri", variant: "outline" },
  {
    actionId: "new",
    hasDropdown: true,
    icon: Plus,
    label: "Nuovo",
    menuItems: createMenuItems,
    variant: "primary",
  },
];

const routeActionOverrides: Partial<Record<QuantaraRoute, PageAction[]>> = {
  tariffs: [
    { actionId: "filter", hasDropdown: true, icon: Filter, label: "Filtri", variant: "outline" },
    { actionId: "import-tariff", icon: UploadCloud, label: "Importa", variant: "primary" },
  ],
};

type TopToolbarProps = {
  activeRoute: QuantaraRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onPageAction: (actionId: string) => void;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

export function TopToolbar({
  activeRoute,
  canGoBack,
  canGoForward,
  onNavigateBack,
  onNavigateForward,
  onPageAction,
  onToggleTheme,
  themeMode,
}: TopToolbarProps) {
  const meta = routeMetaMap[activeRoute];
  const pageActions = routeActionOverrides[activeRoute] ?? commonPageActions;

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
          <PageActions actions={pageActions} onAction={onPageAction} />
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

function PageActions({
  actions,
  onAction,
}: {
  actions: PageAction[];
  onAction: (actionId: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {actions.map((action) =>
        action.menuItems ? (
          <PageActionMenu
            action={action}
            key={`${action.actionId}-${action.variant}`}
            onAction={onAction}
          />
        ) : (
          <Button
            className="gap-1.5 rounded-[18px]"
            key={`${action.actionId}-${action.variant}`}
            onClick={() => onAction(action.actionId)}
            size="sm"
            variant={action.variant === "primary" ? "default" : "outline"}
          >
            <action.icon className="size-4" />
            <span>{action.label}</span>
            {action.hasDropdown ? <ChevronDown className="size-3.5" /> : null}
          </Button>
        ),
      )}
    </div>
  );
}

function PageActionMenu({
  action,
  onAction,
}: {
  action: PageAction;
  onAction: (actionId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        aria-expanded={isOpen}
        className="gap-1.5 rounded-[18px]"
        onClick={() => setIsOpen((current) => !current)}
        size="sm"
        variant={action.variant === "primary" ? "default" : "outline"}
      >
        <action.icon className="size-4" />
        <span>{action.label}</span>
        <ChevronDown className="size-3.5" />
      </Button>
      {isOpen ? (
        <>
          <button
            aria-label="Chiudi menu topbar"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-[18px] border border-subtle bg-card py-2 shadow-panel">
            {action.menuItems?.map((item) => (
              <button
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                key={item.actionId}
                onClick={() => {
                  onAction(item.actionId);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-muted text-primary">
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-secondary">
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
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
