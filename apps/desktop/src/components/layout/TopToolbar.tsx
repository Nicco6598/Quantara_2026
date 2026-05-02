import {
  ArrowsClockwise,
  Bell,
  Briefcase,
  CaretDown,
  CaretLeft,
  CaretRight,
  FileText,
  MagnifyingGlass,
  Moon,
  Plus,
  SunDim,
  UploadSimple,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { BezelSurface } from "@/features/projects/components/workspace-ui";
import { cn } from "@/lib/utils";
import {
  type QuantaraRoute,
  useNavigationState,
  usePreferenceState,
  useThemeState,
} from "@/store/app-store";

type RouteMeta = {
  dateLabel: string;
  title: string;
};

type PageAction = {
  actionId: string;
  hasDropdown?: boolean;
  label: string;
  mark: string;
  menuItems?: PageActionMenuItem[];
  variant: "outline" | "primary";
};

type PageActionMenuItem = {
  actionId: string;
  description: string;
  label: string;
  mark: string;
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
  "sal-create": { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Nuova SAL" },
  settings: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Impostazioni" },
  tariffs: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Tariffario" },
  team: { dateLabel: "27 aprile 2025 · Aggiornato alle 17:40", title: "Team" },
};

const createMenuItems: PageActionMenuItem[] = [
  {
    actionId: "new-project",
    description: "Crea contratto, importo e tariffario principale",
    label: "Progetto",
    mark: "PR",
  },
  {
    actionId: "new-sal",
    description: "Apri la creazione guidata di uno stato avanzamento",
    label: "SAL",
    mark: "+",
  },
  {
    actionId: "import-tariff",
    description: "Importa o prepara un tariffario da PDF",
    label: "Tariffario",
    mark: "TF",
  },
];

const commonPageActions: PageAction[] = [
  {
    actionId: "new",
    hasDropdown: true,
    label: "Nuovo",
    mark: "+",
    menuItems: createMenuItems,
    variant: "primary",
  },
];

const routeActionOverrides: Partial<Record<QuantaraRoute, PageAction[]>> = {
  tariffs: [{ actionId: "import-tariff", label: "Importa", mark: "UP", variant: "primary" }],
};

const markIconMap: Record<string, React.ElementType> = {
  "+": Plus,
  PR: Briefcase,
  TF: FileText,
  UP: UploadSimple,
};

function ActionMarkIcon({ mark, size = 12 }: { mark: string; size?: number }) {
  const Icon = markIconMap[mark];

  if (!Icon) {
    return <span className="text-[10px] font-black">{mark}</span>;
  }

  return <Icon size={size} weight="bold" />;
}

type TopToolbarProps = {
  onOpenCommandPalette: (anchorRect: DOMRect) => void;
  onPageAction: (actionId: string) => void;
};

export function TopToolbar({ onOpenCommandPalette, onPageAction }: TopToolbarProps) {
  const { activeRoute } = useNavigationState();
  const meta = routeMetaMap[activeRoute];
  const pageActions = routeActionOverrides[activeRoute] ?? commonPageActions;

  return (
    <header className="relative z-30 shrink-0 px-4 py-3 md:px-6">
      <BezelSurface innerClassName="flex min-h-[64px] items-center justify-between gap-5 px-4 py-2.5 md:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="animate-entry-sm flex min-w-0 items-center gap-4">
            <HistoryNavigator />
            <Breadcrumbs />
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent-primary)]">
              Control surface
            </div>
            <h1 className="truncate text-[22px] font-semibold leading-6 text-[var(--text-primary)] md:text-[24px]">
              {meta.title}
            </h1>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="truncate text-[11px] font-semibold tracking-[0.02em] text-[var(--text-secondary)]">
                {meta.dateLabel}
              </span>
              <SaveIndicator status="saved" lastSavedAt={null} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch onOpen={onOpenCommandPalette} />
          {activeRoute === "sal-create" ? (
            <SalStepNav onAction={onPageAction} />
          ) : (
            <>
              <div className="mx-1.5 h-[34px] w-px bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--border-strong)_74%,transparent),transparent)]" />
              <PageActions actions={pageActions} onAction={onPageAction} />
            </>
          )}
          <div className="mx-1.5 h-[34px] w-px bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--border-strong)_74%,transparent),transparent)]" />
          <UtilityButtons onAction={onPageAction} />
        </div>
      </BezelSurface>
    </header>
  );
}

function SalStepNav({ onAction }: { onAction?: (actionId: string) => void }) {
  const { salCurrentStep } = usePreferenceState();

  const steps = [
    { label: "Impostazioni", icon: "01", actionId: "sal-goto-step-1" },
    { label: "Voci", icon: "02", actionId: "sal-goto-step-2" },
    { label: "Verifica", icon: "03", actionId: "sal-goto-step-3" },
    { label: "Conferma", icon: "04", actionId: "sal-goto-step-4" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrent = salCurrentStep === stepNumber;
        const isCompleted = salCurrentStep > stepNumber;
        const isClickable = isCompleted || stepNumber === salCurrentStep + 1;

        return (
          <div className="flex items-center" key={step.label}>
            {index > 0 && (
              <div
                className={cn(
                  "mx-1 h-px w-4",
                  isCompleted ? "bg-[var(--accent-primary)]" : "bg-[var(--border-subtle)]",
                )}
              />
            )}
            <button
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold whitespace-nowrap transition-all duration-200",
                isCurrent && "bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm",
                isCompleted && "bg-[var(--success-soft)] text-[var(--success-base)]",
                !isCurrent &&
                  !isCompleted &&
                  (isClickable
                    ? "bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]"
                    : "bg-[var(--bg-muted)]/50 text-[var(--text-secondary)]/50 ring-1 ring-[var(--border-subtle)]/50 cursor-not-allowed"),
              )}
              onClick={() => {
                if (isClickable && onAction) onAction(step.actionId);
              }}
              type="button"
            >
              <span className="text-[10px]">{step.icon}</span>
              <span>{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function HistoryNavigator() {
  const { canGoBack, canGoForward, navigateBack, navigateForward } = useNavigationState();

  return (
    <div className="animate-entry-sm top-toolbar-history flex items-center gap-1 rounded-full p-1">
      <HistoryButton disabled={!canGoBack} label="Torna indietro" onClick={navigateBack}>
        <CaretLeft size={16} weight="regular" />
      </HistoryButton>
      <div className="h-4 w-px bg-[var(--border-subtle)]" />
      <HistoryButton disabled={!canGoForward} label="Vai avanti" onClick={navigateForward}>
        <CaretRight size={16} weight="regular" />
      </HistoryButton>
    </div>
  );
}

function HistoryButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  const motionProps = disabled
    ? {}
    : {
        whileHover: { y: -1 },
        whileTap: { scale: 0.92 },
      };

  return (
    <motion.button
      className={cn(
        "top-toolbar-icon-button flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)]",
        disabled ? "cursor-not-allowed opacity-40" : "hover:text-[var(--text-primary)]",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
      {...motionProps}
    >
      {children}
    </motion.button>
  );
}

function GlobalSearch({ onOpen }: { onOpen: (anchorRect: DOMRect) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <motion.button
      className="top-toolbar-search relative hidden h-11 w-[340px] rounded-full pl-11 pr-16 text-left text-[13px] font-semibold text-[var(--text-secondary)] outline-none 2xl:block"
      data-command-palette-anchor
      onClick={() => {
        const anchorRect = buttonRef.current?.getBoundingClientRect();

        if (anchorRect) {
          onOpen(anchorRect);
        }
      }}
      ref={buttonRef}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
    >
      <MagnifyingGlass
        size={14}
        weight="regular"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-70"
      />
      <span>Cerca...</span>
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
        Ctrl+K
      </kbd>
    </motion.button>
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

        return (
          <motion.button
            className={cn(
              "top-toolbar-action group flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold",
              action.variant === "outline"
                ? "top-toolbar-action-outline text-[var(--text-primary)]"
                : "top-toolbar-action-primary text-[var(--text-inverse)]",
            )}
            key={`${action.actionId}-${action.variant}`}
            onClick={() => onAction(action.actionId)}
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="top-toolbar-action-mark">
              <ActionMarkIcon mark={action.mark} size={12} />
            </span>
            <span>{action.label}</span>
            {action.hasDropdown ? (
              <CaretDown
                size={10}
                weight="regular"
                className="opacity-60 transition-transform duration-[440ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
            ) : null}
          </motion.button>
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

  return (
    <div className="relative">
      <motion.button
        aria-expanded={isOpen}
        className={cn(
          "top-toolbar-action group flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold",
          isPrimary
            ? "top-toolbar-action-primary text-[var(--text-inverse)]"
            : "top-toolbar-action-outline text-[var(--text-primary)]",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="top-toolbar-action-mark">
          <ActionMarkIcon mark={action.mark} size={12} />
        </span>
        <span>{action.label}</span>
        <CaretDown
          size={10}
          weight="regular"
          className={cn(
            "opacity-60 transition-transform duration-[440ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            isOpen && "rotate-180",
          )}
        />
      </motion.button>
      <AnimatePresence>
        {isOpen ? (
          <>
            <button
              aria-label="Chiudi menu topbar"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setIsOpen(false)}
              type="button"
            />
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-[24px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] backdrop-blur-md"
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 26,
              }}
            >
              <div className="rounded-[18px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)]">
                {action.menuItems?.map((item, index) => {
                  return (
                    <motion.button
                      animate={{ opacity: 1, x: 0 }}
                      className="flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)]"
                      initial={{ opacity: 0, x: -12 }}
                      key={item.actionId}
                      onClick={() => {
                        onAction(item.actionId);
                        setIsOpen(false);
                      }}
                      transition={{
                        delay: index * 0.05,
                        duration: 0.32,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      type="button"
                    >
                      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[16px] bg-[var(--info-soft)] text-[var(--info-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_22%,transparent)]">
                        <ActionMarkIcon mark={item.mark} size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--text-primary)]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-secondary)]">
                          {item.description}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function UtilityButtons({ onAction }: { onAction: (actionId: string) => void }) {
  const { themeMode, toggleTheme } = useThemeState();

  return (
    <div className="flex items-center gap-1">
      <UtilityButton label="Notifiche" onClick={() => onAction("notifications")}>
        <Bell size={15} weight="regular" />
      </UtilityButton>
      <UtilityButton
        label={themeMode === "light" ? "Modo scuro" : "Modo chiaro"}
        onClick={toggleTheme}
      >
        {themeMode === "light" ? (
          <SunDim size={15} weight="regular" />
        ) : (
          <Moon size={15} weight="regular" />
        )}
      </UtilityButton>
      <UtilityButton label="Controlla aggiornamenti" onClick={() => onAction("check-updates")}>
        <ArrowsClockwise size={15} weight="regular" />
      </UtilityButton>
    </div>
  );
}

function UtilityButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      className="top-toolbar-icon-button relative flex size-10 items-center justify-center rounded-full text-[var(--text-secondary)]"
      onClick={onClick}
      title={label}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92 }}
    >
      {children}
    </motion.button>
  );
}
