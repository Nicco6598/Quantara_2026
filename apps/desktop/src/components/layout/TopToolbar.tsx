import {
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  FloppyDisk,
  Trash,
} from "@phosphor-icons/react";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { MOTION_DURATION, SPRING_EASE } from "@/motion";
import { cn } from "@/lib/utils";
import {
  useActiveRouteState,
  useHistoryNavigationState,
  useTariffImportToolbarState,
} from "@/store/app-store";
import {
  commonPageActions,
  markIconMap,
  type PageAction,
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
          {isTariffPreview ? (
            <TariffImportControls onAction={onPageAction} />
          ) : activeRoute === "sal-create" || activeRoute === "project-create" ? null : (
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

function TariffImportControls({ onAction }: { onAction: (actionId: string) => void }) {
  const tariffImportToolbar = useTariffImportToolbarState();
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileCount = tariffImportToolbar.fileLabels.length;
  const activeLabel = tariffImportToolbar.fileLabels[tariffImportToolbar.activeIndex];
  const canGoPrevious = tariffImportToolbar.activeIndex > 0;
  const canGoNext = tariffImportToolbar.activeIndex < fileCount - 1;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <div className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] p-1 ring-1 ring-[var(--border-subtle)]/50">
        <div className="relative hidden min-w-0 items-center gap-1 xl:flex">
          <button
            className={cn(
              "top-toolbar-icon-button flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)]",
              !canGoPrevious && "cursor-not-allowed opacity-40",
            )}
            disabled={!canGoPrevious}
            onClick={() => onAction(`tariff-import-select-${tariffImportToolbar.activeIndex - 1}`)}
            title="File precedente"
            type="button"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <button
            aria-expanded={isFileMenuOpen}
            className="flex h-8 min-w-[164px] max-w-[220px] items-center justify-between gap-2 rounded-full bg-[var(--bg-muted)] px-2.5 text-left text-10px font-bold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
            onClick={() => setIsFileMenuOpen((current) => !current)}
            title={activeLabel}
            type="button"
          >
            <span className="min-w-0 truncate">{activeLabel ?? "Preview importazione"}</span>
            <span className="shrink-0 text-[var(--text-secondary)]">
              {fileCount > 0 ? `${tariffImportToolbar.activeIndex + 1}/${fileCount}` : "0/0"}
            </span>
            <CaretDown
              size={10}
              weight="bold"
              className={cn("shrink-0 transition-transform", isFileMenuOpen && "rotate-180")}
            />
          </button>
          <button
            className={cn(
              "top-toolbar-icon-button flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)]",
              !canGoNext && "cursor-not-allowed opacity-40",
            )}
            disabled={!canGoNext}
            onClick={() => onAction(`tariff-import-select-${tariffImportToolbar.activeIndex + 1}`)}
            title="File successivo"
            type="button"
          >
            <CaretRight size={14} weight="bold" />
          </button>
          <AnimatePresence>
            {isFileMenuOpen ? (
              <>
                <button
                  aria-label="Chiudi selezione file"
                  className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
                  onClick={() => setIsFileMenuOpen(false)}
                  type="button"
                />
                <m.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-full z-[var(--z-dropdown-menu)] mt-3 w-[360px] overflow-hidden rounded-22px bg-[color-mix(in_srgb,var(--bg-muted-strong)_72%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] backdrop-blur-md"
                  exit={{ opacity: 0, scale: 0.96, y: -8 }}
                  initial={{ opacity: 0, scale: 0.96, y: -8 }}
                  transition={{ duration: MOTION_DURATION.base, ease: SPRING_EASE }}
                >
                  <div className="max-h-[360px] overflow-y-auto rounded-17px bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)] p-1">
                    {tariffImportToolbar.fileLabels.map((label, index) => {
                      const isActive = index === tariffImportToolbar.activeIndex;
                      return (
                        <button
                          className={cn(
                            "flex w-full items-center gap-3 rounded-14px px-3 py-2.5 text-left transition-colors",
                            isActive
                              ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
                          )}
                          key={label}
                          onClick={() => {
                            onAction(`tariff-import-select-${index}`);
                            setIsFileMenuOpen(false);
                          }}
                          type="button"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-10px font-black">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-12px font-semibold">
                            {label}
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
        <m.button
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            fileCount > 0
              ? "text-[var(--danger-base)] hover:bg-[var(--danger-soft)]"
              : "text-[var(--text-secondary)]/40 cursor-not-allowed",
          )}
          disabled={fileCount === 0}
          onClick={() => onAction("tariff-import-delete-file")}
          title="Cancella file dalla revisione"
          type="button"
        >
          <Trash size={14} weight="bold" />
        </m.button>
      </div>

      <div className="inline-flex items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--surface-base)_78%,var(--bg-muted)_22%)] px-3 py-1 text-10px font-bold ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_78%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_36%,transparent)]">
        <div className="flex flex-col justify-center gap-0.5 leading-none">
          <span
            className={cn(
              "text-11px",
              tariffImportToolbar.reviewedCount === fileCount && fileCount > 0
                ? "text-[var(--success-base)]"
                : tariffImportToolbar.reviewedCount > 0
                  ? "text-[var(--warning-base)]"
                  : "text-[var(--text-secondary)]",
            )}
          >
            <span className="text-10px font-semibold text-[var(--text-secondary)]">Rev.</span>{" "}
            {tariffImportToolbar.reviewedCount}/{fileCount}
          </span>
          <span
            className={cn(
              "text-11px",
              tariffImportToolbar.draftedCount > 0
                ? "text-[var(--warning-base)]"
                : "text-[var(--text-secondary)]",
            )}
          >
            <span className="text-10px font-semibold text-[var(--text-secondary)]">Bozza</span>{" "}
            {tariffImportToolbar.draftedCount}/{fileCount}
          </span>
        </div>
        <span className="h-8 w-px bg-[var(--border-subtle)]/60" />
        <div className="flex flex-col items-center">
          <span className="text-15px font-black tabular-nums leading-none text-[var(--text-primary)]">
            {fileCount}
          </span>
          <span className="text-9px font-semibold text-[var(--text-secondary)]">totali</span>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--surface-base)_30%)] p-1 ring-1 ring-[var(--border-subtle)]/50">
        <m.button
          className={cn(
            "group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold transition-colors",
            tariffImportToolbar.activeReviewed
              ? "bg-[var(--success-base)] text-[var(--text-inverse)] shadow-sm"
              : "border border-[var(--success-base)]/25 bg-[color-mix(in_srgb,var(--success-base)_8%,var(--surface-base)_92%)] text-[color-mix(in_srgb,var(--success-base)_82%,var(--text-primary))] hover:bg-[color-mix(in_srgb,var(--success-base)_18%,var(--surface-base)_82%)]",
          )}
          onClick={() => onAction("tariff-import-toggle-reviewed")}
          type="button"
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              tariffImportToolbar.activeReviewed
                ? "bg-[var(--accent-primary)]/20 text-[var(--text-inverse)]"
                : "text-[var(--success-base)]",
            )}
          >
            <CheckCircle size={11} weight="bold" />
          </span>
          <span>{tariffImportToolbar.activeReviewed ? "Revisionato" : "Revisiona"}</span>
        </m.button>
        <m.button
          className={cn(
            "group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold transition-colors",
            tariffImportToolbar.activeDrafted
              ? "bg-[var(--warning-base)] text-[var(--text-inverse)] shadow-sm"
              : "border border-[var(--warning-base)]/30 bg-[color-mix(in_srgb,var(--warning-base)_10%,var(--surface-base)_90%)] text-[color-mix(in_srgb,var(--warning-base)_80%,var(--text-primary))] hover:bg-[color-mix(in_srgb,var(--warning-base)_20%,var(--surface-base)_80%)]",
          )}
          onClick={() => onAction("tariff-import-save-draft")}
          title="Salva questo file come bozza"
          type="button"
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              tariffImportToolbar.activeDrafted
                ? "bg-[var(--accent-primary)]/20 text-[var(--text-inverse)]"
                : "text-[var(--warning-base)]",
            )}
          >
            <FloppyDisk size={11} weight="bold" />
          </span>
          <span>{tariffImportToolbar.activeDrafted ? "Salvato in bozza" : "Salva bozza"}</span>
        </m.button>
      </div>

      <m.button
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 text-12px font-bold text-[var(--text-inverse)] shadow-sm transition-colors hover:bg-[var(--accent-primary)]/90",
          !tariffImportToolbar.canConfirm && "cursor-not-allowed opacity-45 grayscale",
        )}
        disabled={!tariffImportToolbar.canConfirm}
        onClick={() => onAction("tariff-import-confirm")}
        type="button"
      >
        <CheckCircle size={14} weight="bold" />
        <span>Approva import</span>
      </m.button>
    </div>
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
              onClick={() => setIsOpen(false)}
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
                  return (
                    <m.button
                      animate={{ opacity: 1, x: 0 }}
                      className="flex w-full items-start gap-3 rounded-18px p-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)]"
                      initial={{ opacity: 0, x: -12 }}
                      key={item.actionId}
                      onClick={() => {
                        onAction(item.actionId);
                        setIsOpen(false);
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
