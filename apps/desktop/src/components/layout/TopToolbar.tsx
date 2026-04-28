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
  RefreshCw,
  Search,
  Sun,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { QuantaraRoute, ThemeMode } from "@/store/app-store";

type RouteMeta = {
  dateLabel: string;
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
  accounting: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Contabilità" },
  dashboard: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Panoramica operativa" },
  materials: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Materiali" },
  "project-detail": {
    dateLabel: "27 aprile 2025 · Aggiornato alle 17:40",
    title: "Dettaglio progetto",
  },
  projects: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Progetti" },
  settings: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Impostazioni" },
  tariffs: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Tariffario" },
  team: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Team" },
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
  team: [
    { actionId: "filter", hasDropdown: true, icon: Filter, label: "Filtri", variant: "outline" },
    { actionId: "add-member", icon: Plus, label: "Aggiungi membro", variant: "primary" },
  ],
  tariffs: [
    { actionId: "filter", hasDropdown: true, icon: Filter, label: "Filtri", variant: "outline" },
    { actionId: "import-tariff", icon: UploadCloud, label: "Importa", variant: "primary" },
  ],
};

type TopToolbarProps = {
  activeRoute: QuantaraRoute;
  canGoBack: boolean;
  canGoForward: boolean;
  onOpenCommandPalette: (anchorRect: DOMRect) => void;
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
  onOpenCommandPalette,
  onNavigateBack,
  onNavigateForward,
  onPageAction,
  onToggleTheme,
  themeMode,
}: TopToolbarProps) {
  const meta = routeMetaMap[activeRoute];
  const pageActions = routeActionOverrides[activeRoute] ?? commonPageActions;

  return (
    <header className="z-30 flex h-[88px] shrink-0 items-center justify-between gap-6 border-b border-[var(--border-subtle)] px-8">
      <div className="flex min-w-0 items-center gap-4">
        {activeRoute !== "dashboard" ? (
          <HistoryNavigator
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onNavigateBack={onNavigateBack}
            onNavigateForward={onNavigateForward}
          />
        ) : null}

        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold leading-6 tracking-[-0.02em] text-[var(--text-primary)]">
            {meta.title}
          </h1>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              {meta.dateLabel}
            </span>
            <span className="size-1.5 rounded-full bg-[var(--success-base)]" />
            <span className="text-[11px] font-semibold text-[var(--success-base)]">
              Sincronizzato
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <GlobalSearch onOpen={onOpenCommandPalette} />
        <div className="mx-2 h-8 w-px bg-[var(--border-subtle)]" />
        <PageActions actions={pageActions} onAction={onPageAction} />
        <div className="mx-2 h-8 w-px bg-[var(--border-subtle)]" />
        <UtilityButtons onToggleTheme={onToggleTheme} themeMode={themeMode} />
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
    <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-muted)] p-1">
      <HistoryButton
        disabled={!canGoBack}
        icon={ChevronLeft}
        label="Torna indietro"
        onClick={onNavigateBack}
      />
      <div className="h-4 w-px bg-[var(--border-subtle)]" />
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
        "flex size-8 items-center justify-center rounded-lg transition-all",
        disabled
          ? "cursor-not-allowed text-[var(--text-secondary)] opacity-40"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)] hover:shadow-sm",
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

function GlobalSearch({ onOpen }: { onOpen: (anchorRect: DOMRect) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      className="relative hidden h-10 w-[320px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] pl-10 pr-14 text-left text-[13px] font-medium text-[var(--text-secondary)] outline-none transition-all hover:border-[var(--accent-primary)]/30 hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] 2xl:block"
      data-command-palette-anchor
      onClick={() => {
        const anchorRect = buttonRef.current?.getBoundingClientRect();

        if (anchorRect) {
          onOpen(anchorRect);
        }
      }}
      ref={buttonRef}
      type="button"
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
      <span>Cerca...</span>
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
        ⌘K
      </kbd>
    </button>
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
    <div className="flex items-center gap-1.5">
      {actions.map((action) => {
        if (action.menuItems) {
          return (
            <PageActionMenu
              action={action}
              key={`${action.actionId}-${action.variant}`}
              onAction={onAction}
            />
          );
        }

        const ActionIcon = action.icon;

        return (
          <button
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all",
              action.variant === "outline"
                ? "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]"
                : "bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)] active:scale-[0.98]",
            )}
            key={`${action.actionId}-${action.variant}`}
            onClick={() => onAction(action.actionId)}
            type="button"
          >
            <ActionIcon className="size-4" />
            <span>{action.label}</span>
            {action.hasDropdown ? <ChevronDown className="size-3.5 opacity-60" /> : null}
          </button>
        );
      })}
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
  const isPrimary = action.variant === "primary";
  const ActionIcon = action.icon;

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all",
          isPrimary
            ? "bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-hover)] active:scale-[0.98]"
            : "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-muted)]",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <ActionIcon className="size-4" />
        <span>{action.label}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen ? (
        <>
          <button
            aria-label="Chiudi menu topbar"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-1.5 shadow-xl">
            {action.menuItems?.map((item) => {
              const ItemIcon = item.icon;

              return (
                <button
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-muted)]"
                  key={item.actionId}
                  onClick={() => {
                    onAction(item.actionId);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-muted-strong)] text-[var(--accent-primary)]">
                    <ItemIcon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--text-primary)]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-secondary)]">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
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
    <div className="flex items-center gap-1">
      <UtilityButton badge={3} icon={Bell} label="Notifiche" />
      <UtilityButton
        icon={ThemeIcon}
        label={themeMode === "light" ? "Modo scuro" : "Modo chiaro"}
        onClick={onToggleTheme}
      />
      <UtilityButton icon={RefreshCw} label="Aggiorna" />
    </div>
  );
}

function UtilityButton({
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
      className="relative flex size-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="size-[18px]" />
      {badge != null && badge > 0 ? (
        <span className="absolute right-1 top-1 flex size-[16px] items-center justify-center rounded-full bg-[var(--accent-primary)] text-[9px] font-bold text-[var(--text-inverse)] ring-2 ring-[var(--surface-base)]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
