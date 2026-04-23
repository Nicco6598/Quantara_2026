import {
  Bell,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  HelpCircle,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  UploadCloud,
} from "lucide-react";
import type { QuantaraRoute, ThemeMode } from "@/store/app-store";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

interface RouteMeta {
  subtitle: string;
  title: string;
  description?: string;
}

const routeMetaMap: Record<QuantaraRoute, RouteMeta> = {
  accounting: {
    subtitle: "Contabilita",
    title: "Stato Avanzamento",
    description: "Gestione ribassi, ordini di servizio ed export",
  },
  dashboard: {
    subtitle: "Panoramica",
    title: "Dashboard",
    description: "Visione consolidata di tutti i progetti",
  },
  materials: {
    subtitle: "Magazzino",
    title: "Materiali",
    description: "Catalogo e gestione inventario",
  },
  projects: {
    subtitle: "Portfolio",
    title: "Progetti",
    description: "Centro di controllo portfolio lavori",
  },
  "project-detail": {
    subtitle: "Dettaglio",
    title: "Progetto",
    description: "Linea AV/AC Milano-Verona",
  },
  sal: {
    subtitle: "Monitoraggio",
    title: "SAL",
    description: "Stati di avanzamento lavori",
  },
  tariffs: {
    subtitle: "Reference",
    title: "Tariffario",
    description: "Tariffario Regionale Lombardia 2025",
  },
};

interface PageAction {
  icon: typeof Plus;
  label: string;
  variant: "primary" | "secondary" | "ghost";
  hasDropdown?: boolean;
}

const pageActionsMap: Record<QuantaraRoute, PageAction[]> = {
  accounting: [
    { icon: Filter, label: "Filtri", variant: "secondary", hasDropdown: true },
    { icon: Download, label: "Esporta", variant: "secondary" },
  ],
  dashboard: [
    { icon: RefreshCw, label: "Aggiorna", variant: "secondary" },
    { icon: Settings, label: "Configura", variant: "ghost" },
  ],
  materials: [
    { icon: UploadCloud, label: "Importa", variant: "secondary" },
    { icon: Plus, label: "Nuovo Materiale", variant: "primary" },
  ],
  projects: [
    { icon: Filter, label: "Filtri", variant: "secondary", hasDropdown: true },
    { icon: Plus, label: "Nuovo Progetto", variant: "primary" },
  ],
  "project-detail": [
    { icon: Download, label: "Esporta", variant: "secondary" },
  ],
  sal: [
    { icon: Filter, label: "Filtri", variant: "secondary", hasDropdown: true },
    { icon: Plus, label: "Nuova SAL", variant: "primary" },
  ],
  tariffs: [
    { icon: Download, label: "Scarica", variant: "secondary" },
    { icon: UploadCloud, label: "Importa PDF", variant: "primary" },
  ],
};

type TopToolbarProps = {
  activeRoute: QuantaraRoute;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
};

export function TopToolbar({ activeRoute, onToggleTheme, themeMode }: TopToolbarProps) {
  const meta = routeMetaMap[activeRoute];
  const pageActions = pageActionsMap[activeRoute] ?? [];

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-base)] px-6">
      <div className="flex min-w-0 flex-1 items-center gap-8">
        <PageTitle meta={meta} />
        <PageActions actions={pageActions} />
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <GlobalSearch />
        <UtilityDivider />
        <UtilityButtons onToggleTheme={onToggleTheme} themeMode={themeMode} />
      </div>
    </header>
  );
}

function PageTitle({ meta }: { meta: RouteMeta }) {
  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {meta.subtitle}
        </span>
        <span className="text-xs text-[var(--border-subtle)]">/</span>
        <span className="text-xs text-[var(--text-secondary)]">
          {new Date().toLocaleDateString("it-IT", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
      <h1 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">
        {meta.title}
      </h1>
      {meta.description && (
        <p className="text-xs text-[var(--text-secondary)]">{meta.description}</p>
      )}
    </div>
  );
}

interface PageActionsProps {
  actions: PageAction[];
}

function PageActions({ actions }: PageActionsProps) {
  if (actions.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 border-l border-[var(--border-subtle)] pl-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant === "primary" ? "default" : "outline"}
          className={cn(
            "flex items-center gap-1.5",
            action.variant === "ghost" && "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          <action.icon className="h-4 w-4" />
          <span className="text-sm">{action.label}</span>
          {action.hasDropdown && <ChevronDown className="h-3 w-3" />}
        </Button>
      ))}
    </nav>
  );
}

function GlobalSearch() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      <input
        className="h-9 w-56 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] pl-9 pr-8 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
        placeholder="Cerca..."
        type="search"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--border-subtle)] bg-[var(--surface-base)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
        ⌘K
      </kbd>
    </div>
  );
}

function UtilityDivider() {
  return <div className="h-8 w-px bg-[var(--border-subtle)]" />;
}

interface UtilityButtonsProps {
  onToggleTheme: () => void;
  themeMode: ThemeMode;
}

function UtilityButtons({ onToggleTheme, themeMode }: UtilityButtonsProps) {
  const ThemeIcon = themeMode === "light" ? Moon : Sun;

  return (
    <div className="flex items-center gap-1">
      <IconButton icon={CalendarDays} label="Calendario" />
      <IconButton icon={HelpCircle} label="Aiuto e documentazione" />
      <IconButton icon={Bell} label="Notifiche" badge={3} />
      <IconButton
        icon={ThemeIcon}
        label={themeMode === "light" ? "Modo scuro" : "Modo chiaro"}
        onClick={onToggleTheme}
      />
      <UserAvatar />
    </div>
  );
}

interface IconButtonProps {
  icon: typeof Bell;
  label: string;
  badge?: number;
  onClick?: () => void;
}

function IconButton({ icon: Icon, label, badge, onClick }: IconButtonProps) {
  return (
    <button
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-[var(--text-secondary)] transition-all hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
        badge != null && "border border-[var(--border-subtle)]"
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger-base)] px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function UserAvatar() {
  return (
    <button
      className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-transparent bg-[var(--bg-muted)] transition-all hover:border-[var(--accent-primary)]"
      title="Profilo utente"
      type="button"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-white">
        MB
      </div>
    </button>
  );
}