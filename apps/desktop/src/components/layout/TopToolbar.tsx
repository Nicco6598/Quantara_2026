import {
  Bell,
  Briefcase,
  CaretDown,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { AnimatePresence, m } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useContractorRegistryOptions } from "@/hooks/useContractorRegistryOptions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { beginProjectCreate } from "@/lib/workflow-navigation";
import { MOTION_DURATION, SPRING_EASE } from "@/motion";
import { useActiveRouteState, useHistoryNavigationState } from "@/store/app-store";
import {
  commonPageActions,
  markIconMap,
  type PageAction,
  type PageActionMenuItem,
  routeActionOverrides,
  routeMetaMap,
} from "./top-toolbar-config";

function ActionMarkIcon({ mark, size = 12 }: { mark: string; size?: number }) {
  const Icon = markIconMap[mark];

  if (!Icon) {
    return <span className="text-10px font-black">{mark}</span>;
  }

  return <Icon size={size} weight="bold" />;
}

type TopToolbarProps = {
  onPageAction: (actionId: string) => void;
};

export function TopToolbar({ onPageAction }: TopToolbarProps) {
  const { activeRoute, tariffImportPhase } = useActiveRouteState();
  const meta = routeMetaMap[activeRoute];
  const pageActions = routeActionOverrides[activeRoute] ?? commonPageActions;
  const isTariffPreview = activeRoute === "tariffs" && tariffImportPhase === "preview";
  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac OS X|Macintosh/.test(navigator.userAgent),
    [],
  );

  return (
    <header
      className="top-toolbar-shell relative z-[var(--z-topbar)] shrink-0 px-3 py-2 md:px-4"
      data-tauri-drag-region
    >
      <div
        className={cn(
          "flex min-h-[52px] items-center justify-between gap-3 py-2 pr-3 md:pr-4",
          isMac ? "pl-[70px]" : "pl-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-10">
          <HistoryNavigator />
          <div className="min-w-0">
            <h1 className="truncate text-18px font-semibold leading-5 text-[var(--text-primary)] md:text-20px">
              {meta.title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isTariffPreview ? null : activeRoute === "sal-create" ||
            activeRoute === "project-create" ? null : (
            <>
              <div className="top-toolbar-divider" />
              <PageActions actions={pageActions} onAction={onPageAction} />
            </>
          )}
          {!isTariffPreview ? <UtilityButtons onAction={onPageAction} /> : null}
        </div>
      </div>
    </header>
  );
}

function HistoryNavigator() {
  const {
    canGoBack,
    canGoForward,
    navigateBack,
    navigateForward,
    navigateToHistoryIndex,
    routeHistory,
    routeHistoryIndex,
  } = useHistoryNavigationState();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleHistory = routeHistory
    .map((entry, index) => ({ ...entry, index }))
    .slice(Math.max(0, routeHistory.length - 8))
    .reverse();

  function startLongPress() {
    longPressRef.current = setTimeout(() => {
      setIsHistoryOpen(true);
      longPressRef.current = null;
    }, 500);
  }

  function clearLongPress() {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  useEffect(
    () => () => {
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    },
    [],
  );

  return (
    <div className="animate-entry-sm top-toolbar-history-wrap">
      <HistoryButton
        disabled={!canGoBack}
        label="Torna indietro (tenere premuto per cronologia)"
        onClick={navigateBack}
        onPointerDown={canGoBack ? startLongPress : () => {}}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
      >
        <CaretLeft size={16} weight="bold" />
      </HistoryButton>
      <HistoryButton
        disabled={!canGoForward}
        label="Vai avanti (tenere premuto per cronologia)"
        onClick={navigateForward}
        onPointerDown={canGoForward ? startLongPress : () => {}}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
      >
        <CaretRight size={16} weight="bold" />
      </HistoryButton>

      <AnimatePresence>
        {isHistoryOpen ? (
          <>
            <button
              aria-label="Chiudi cronologia pagine"
              className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
              onClick={() => setIsHistoryOpen(false)}
              type="button"
            />
            <m.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="top-toolbar-history-menu absolute left-0 top-full z-[var(--z-dropdown-menu)] mt-2 w-[260px] overflow-hidden rounded-18px p-1.5"
              exit={{ opacity: 0, scale: 0.97, y: -6 }}
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              transition={{ duration: MOTION_DURATION.fast, ease: SPRING_EASE }}
            >
              <div className="flex items-center gap-1 border-b border-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)] p-1 pb-1.5">
                <span className="px-2 text-10px font-semibold text-[var(--text-secondary)]">
                  {routeHistoryIndex + 1}/{routeHistory.length}
                </span>
              </div>

              <div className="mt-1 max-h-[280px] overflow-y-auto">
                {visibleHistory.map((entry) => {
                  const isActive = entry.index === routeHistoryIndex;
                  return (
                    <button
                      className={cn(
                        "top-toolbar-history-item flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left",
                        isActive && "top-toolbar-history-item-active",
                      )}
                      disabled={isActive}
                      key={`${entry.route}-${entry.context ?? "root"}-${entry.index}`}
                      onClick={() => {
                        navigateToHistoryIndex(entry.index);
                        setIsHistoryOpen(false);
                      }}
                      type="button"
                    >
                      <span className="top-toolbar-history-item-index">
                        {String(entry.index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-12px font-semibold text-[var(--text-primary)]">
                          {routeMetaMap[entry.route].title}
                        </span>
                        {entry.context ? (
                          <span className="mt-0.5 block truncate text-10px font-medium text-[var(--text-secondary)]">
                            {entry.context}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </m.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HistoryButton({
  children,
  disabled,
  label,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <m.button
      className={cn(
        "top-toolbar-history-button flex size-9 items-center justify-center rounded-lg",
        disabled
          ? "cursor-not-allowed opacity-40 text-[var(--text-secondary)]"
          : "text-[var(--text-secondary)]",
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      title={label}
      type="button"
    >
      {children}
    </m.button>
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
    <div className="flex items-center gap-1">
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
          <m.button
            className={cn(
              "top-toolbar-action group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold",
              action.variant === "outline"
                ? "top-toolbar-action-outline text-[var(--text-primary)]"
                : "quantara-button top-toolbar-action-primary text-[var(--text-inverse)]",
            )}
            key={`${action.actionId}-${action.variant}`}
            onClick={() => onAction(action.actionId)}
            type="button"
          >
            <span className="top-toolbar-action-mark">
              <ActionMarkIcon mark={action.mark} size={12} />
            </span>
            <span>{action.label}</span>
            {action.hasDropdown ? (
              <CaretDown
                size={10}
                weight="regular"
                className="opacity-60 transition-transform duration-slow ease-standard"
              />
            ) : null}
          </m.button>
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
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <div className="relative">
      <m.button
        aria-expanded={isOpen}
        className={cn(
          "top-toolbar-action group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold",
          isPrimary
            ? "quantara-button top-toolbar-action-primary text-[var(--text-inverse)]"
            : "top-toolbar-action-outline text-[var(--text-primary)]",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="top-toolbar-action-mark">
          <ActionMarkIcon mark={action.mark} size={12} />
        </span>
        <span>{action.label}</span>
        <CaretDown
          size={10}
          weight="regular"
          className={cn(
            "opacity-60 transition-transform duration-slow ease-standard",
            isOpen && "rotate-180",
          )}
        />
      </m.button>
      <AnimatePresence>
        {isOpen ? (
          <>
            <button
              aria-label="Chiudi menu topbar"
              className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
              onClick={closeMenu}
              type="button"
            />
            <m.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-0 top-full z-[var(--z-dropdown-menu)] mt-3 w-80 overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] backdrop-blur-md"
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: MOTION_DURATION.slow, ease: SPRING_EASE }}
            >
              <div className="rounded-18px bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)]">
                {action.menuItems?.map((item, index) => {
                  if (item.actionId === "new-project") {
                    return (
                      <NewProjectContractorPicker
                        index={index}
                        item={item}
                        key={item.actionId}
                        onAction={onAction}
                        onClose={closeMenu}
                      />
                    );
                  }

                  return (
                    <m.button
                      animate={{ opacity: 1, x: 0 }}
                      className="flex w-full items-start gap-3 rounded-18px p-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)]"
                      initial={{ opacity: 0, x: -12 }}
                      key={item.actionId}
                      onClick={() => {
                        onAction(item.actionId);
                        closeMenu();
                      }}
                      transition={{
                        delay: index * 0.05,
                        duration: MOTION_DURATION.base,
                        ease: SPRING_EASE,
                      }}
                      type="button"
                    >
                      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--info-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_22%,transparent)]">
                        <ActionMarkIcon mark={item.mark} size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-13px font-semibold text-[var(--text-primary)]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-11px leading-4 text-[var(--text-secondary)]">
                          {item.description}
                        </span>
                      </span>
                    </m.button>
                  );
                })}
              </div>
            </m.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NewProjectContractorPicker({
  index,
  item,
  onAction,
  onClose,
}: {
  index: number;
  item: PageActionMenuItem;
  onAction: (actionId: string) => void;
  onClose: () => void;
}) {
  const contractors = useContractorRegistryOptions();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 100);
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return contractors;
    return contractors.filter((name) => name.toLowerCase().includes(q));
  }, [contractors, debouncedQuery]);

  function openCreate(contractorName?: string) {
    if (contractorName) {
      beginProjectCreate({ contractorName, lockContractor: false });
    } else {
      beginProjectCreate({ lockContractor: false });
    }
    onAction("open-project-create");
    onClose();
  }

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      className="rounded-18px p-2"
      initial={{ opacity: 0, x: -12 }}
      transition={{
        delay: index * 0.05,
        duration: MOTION_DURATION.base,
        ease: SPRING_EASE,
      }}
    >
      <div className="flex items-start gap-3 rounded-14px bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--surface-base)_94%)] p-3 ring-1 ring-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)]">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]">
          <Briefcase size={18} weight="bold" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-13px font-semibold text-[var(--text-primary)]">
            {item.label}
          </span>
          <span className="mt-0.5 block text-11px leading-4 text-[var(--text-secondary)]">
            {item.description}
          </span>
        </span>
      </div>

      <div className="mt-2 rounded-14px bg-[color-mix(in_srgb,var(--bg-muted)_55%,var(--surface-base)_45%)] p-2 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)]">
        <div className="relative">
          <MagnifyingGlass
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]"
            weight="bold"
          />
          <input
            className="h-9 w-full rounded-10px border border-[color-mix(in_srgb,var(--border-subtle)_65%,transparent)] bg-[var(--surface-base)] pl-8 pr-3 text-12px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca appaltatore..."
            value={query}
          />
        </div>

        <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-11px text-[var(--text-tertiary)]">
              Nessun appaltatore trovato
            </p>
          ) : (
            filtered.map((name) => (
              <button
                className="flex w-full items-center gap-2 rounded-10px px-2.5 py-2 text-left text-12px font-semibold text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)]"
                key={name}
                onClick={() => openCreate(name)}
                type="button"
              >
                <Briefcase className="size-3.5 shrink-0 text-[var(--accent-primary)]" />
                <span className="truncate">{name}</span>
              </button>
            ))
          )}
        </div>

        <button
          className="mt-2 flex w-full items-center justify-center rounded-10px border border-dashed border-[color-mix(in_srgb,var(--border-subtle)_80%,transparent)] px-3 py-2 text-11px font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/35 hover:text-[var(--accent-primary)]"
          onClick={() => openCreate()}
          type="button"
        >
          Scegli in anagrafica progetto
        </button>
      </div>
    </m.div>
  );
}

function UtilityButtons({ onAction }: { onAction: (actionId: string) => void }) {
  void onAction;

  return (
    <div className="flex items-center gap-1">
      <UtilityButton disabled label="Notifiche non disponibili">
        <Bell size={15} weight="regular" />
      </UtilityButton>
    </div>
  );
}

function UtilityButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <m.button
      className={cn(
        "top-toolbar-icon-button relative flex size-9 items-center justify-center rounded-full text-[var(--text-secondary)]",
        disabled && "cursor-not-allowed opacity-45",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </m.button>
  );
}
