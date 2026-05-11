import {
  Bell,
  Briefcase,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  FileText,
  FloppyDisk,
  Plus,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { cn } from "@/lib/utils";
import { type QuantaraRoute, useNavigationState, usePreferenceState } from "@/store/app-store";

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

function todayLabel(): string {
  const now = new Date();
  const day = now.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${day} · Aggiornato alle ${time}`;
}

function formatToolbarMoney(value: number): string {
  return value.toLocaleString("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  });
}

const routeMetaMap: Record<QuantaraRoute, RouteMeta> = {
  accounting: { dateLabel: "", title: "Contabilità" },
  dashboard: { dateLabel: "", title: "Panoramica operativa" },
  materials: { dateLabel: "", title: "Materiali" },
  "project-detail": { dateLabel: "", title: "Dettaglio progetto" },
  projects: { dateLabel: "", title: "Progetti" },
  "sal-create": { dateLabel: "", title: "Nuova SAL" },
  settings: { dateLabel: "", title: "Impostazioni" },
  tariffs: { dateLabel: "", title: "Tariffario" },
  team: { dateLabel: "", title: "Team" },
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
    return <span className="text-10px font-black">{mark}</span>;
  }

  return <Icon size={size} weight="bold" />;
}

type TopToolbarProps = {
  onPageAction: (actionId: string) => void;
};

export function TopToolbar({ onPageAction }: TopToolbarProps) {
  const { activeRoute, tariffImportToolbar } = useNavigationState();
  const meta = routeMetaMap[activeRoute];
  const pageActions = routeActionOverrides[activeRoute] ?? commonPageActions;
  const isTariffPreview = activeRoute === "tariffs" && tariffImportToolbar.phase === "preview";

  return (
    <header className="top-toolbar-shell relative z-30 shrink-0 px-3 py-2 md:px-4">
      <div className="flex min-h-[52px] items-center justify-between gap-3 py-2 pl-[58px] pr-3 md:pr-4">
        <HistoryNavigator />

        <div className="flex min-w-0 items-center gap-3">
          <div className="animate-entry-sm flex min-w-0 shrink-0 items-center">
            <Breadcrumbs />
          </div>

          <div className="min-w-0 border-l border-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)] pl-3">
            <h1 className="truncate text-18px font-semibold leading-5 text-[var(--text-primary)] md:text-20px">
              {meta.title}
            </h1>
            <div className="mt-0.5 hidden items-center gap-2 lg:flex">
              <span className="truncate text-10px font-semibold text-[var(--text-secondary)]">
                {todayLabel()}
              </span>
              <SaveIndicator status="saved" lastSavedAt={null} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isTariffPreview ? (
            <TariffImportControls onAction={onPageAction} />
          ) : activeRoute === "sal-create" ? (
            <SalToolbarControls onAction={onPageAction} />
          ) : (
            <>
              <div className="top-toolbar-divider" />
              <PageActions actions={pageActions} onAction={onPageAction} />
            </>
          )}
          <div className="top-toolbar-divider" />
          <UtilityButtons onAction={onPageAction} />
        </div>
      </div>
    </header>
  );
}

function TariffImportControls({ onAction }: { onAction: (actionId: string) => void }) {
  const { tariffImportToolbar } = useNavigationState();
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileCount = tariffImportToolbar.fileLabels.length;
  const activeLabel = tariffImportToolbar.fileLabels[tariffImportToolbar.activeIndex];
  const canGoPrevious = tariffImportToolbar.activeIndex > 0;
  const canGoNext = tariffImportToolbar.activeIndex < fileCount - 1;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="top-toolbar-divider" />
      <motion.button
        className="top-toolbar-icon-button flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)]"
        onClick={() => onAction("tariff-import-cancel")}
        title="Torna al catalogo"
        type="button"
      >
        <X size={16} weight="bold" />
      </motion.button>
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
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsFileMenuOpen(false)}
                type="button"
              />
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-full z-50 mt-3 w-[360px] overflow-hidden rounded-22px bg-[color-mix(in_srgb,var(--bg-muted-strong)_72%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] backdrop-blur-md"
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="hidden min-h-9 items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--surface-base)_78%,var(--bg-muted)_22%)] px-3 py-1 text-10px font-bold ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_78%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_36%,transparent)] 2xl:flex">
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
        <div className="h-8 w-px bg-[var(--border-subtle)]/60" />
        <div className="flex flex-col items-center">
          <span className="text-15px font-black tabular-nums leading-none text-[var(--text-primary)]">
            {fileCount}
          </span>
          <span className="text-9px font-semibold text-[var(--text-secondary)]">totali</span>
        </div>
      </div>
      <motion.button
        className={cn(
          "top-toolbar-action group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold transition-colors",
          tariffImportToolbar.activeReviewed
            ? "bg-[color-mix(in_srgb,var(--success-base)_14%,var(--surface-base))] text-[color-mix(in_srgb,var(--success-base)_74%,var(--text-primary))] ring-1 ring-[color-mix(in_srgb,var(--success-base)_42%,var(--border-subtle))] shadow-[inset_0_1px_0_color-mix(in_srgb,white_58%,transparent)]"
            : "top-toolbar-action-outline text-[var(--text-primary)]",
        )}
        onClick={() => onAction("tariff-import-toggle-reviewed")}
        type="button"
      >
        <span
          className={cn(
            "top-toolbar-action-mark",
            tariffImportToolbar.activeReviewed &&
              "shadow-[0_0_0_1px_color-mix(in_srgb,var(--success-base)_70%,transparent)]",
          )}
          style={
            tariffImportToolbar.activeReviewed
              ? { background: "var(--success-base)", color: "var(--text-inverse)" }
              : undefined
          }
        >
          <CheckCircle size={13} weight="bold" />
        </span>
        <span>{tariffImportToolbar.activeReviewed ? "Revisionato" : "Revisiona"}</span>
      </motion.button>
      <motion.button
        className={cn(
          "top-toolbar-action group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold transition-colors",
          tariffImportToolbar.activeDrafted
            ? "bg-[color-mix(in_srgb,var(--warning-base)_14%,var(--surface-base))] text-[color-mix(in_srgb,var(--warning-base)_76%,var(--text-primary))] ring-1 ring-[color-mix(in_srgb,var(--warning-base)_42%,var(--border-subtle))]"
            : "top-toolbar-action-outline text-[var(--text-primary)]",
        )}
        onClick={() => onAction("tariff-import-save-draft")}
        title="Salva questo file come bozza"
        type="button"
      >
        <span className="top-toolbar-action-mark">
          <FloppyDisk size={13} weight="bold" />
        </span>
        <span>{tariffImportToolbar.activeDrafted ? "Salvato in bozza" : "Salva bozza"}</span>
      </motion.button>
      <motion.button
        className="top-toolbar-icon-button flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)]"
        disabled={fileCount === 0}
        onClick={() => onAction("tariff-import-delete-file")}
        title="Cancella file dalla revisione"
        type="button"
      >
        <Trash size={15} weight="bold" />
      </motion.button>
      <motion.button
        className={cn(
          "top-toolbar-action top-toolbar-action-primary group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold text-[var(--text-inverse)]",
          !tariffImportToolbar.canConfirm && "cursor-not-allowed opacity-45",
        )}
        disabled={!tariffImportToolbar.canConfirm}
        onClick={() => onAction("tariff-import-confirm")}
        type="button"
        {...(tariffImportToolbar.canConfirm ? {} : {})}
      >
        <span className="top-toolbar-action-mark">
          <CheckCircle size={13} weight="bold" />
        </span>
        <span>Approva import</span>
      </motion.button>
    </div>
  );
}

function SalToolbarControls({ onAction }: { onAction: (actionId: string) => void }) {
  const { salToolbar } = useNavigationState();

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <SalStepNav onAction={onAction} />
      <div className="top-toolbar-divider hidden xl:block" />
      <div className="hidden min-h-9 items-center gap-3 rounded-full bg-[color-mix(in_srgb,var(--surface-base)_78%,var(--bg-muted)_22%)] px-3 py-1 text-10px font-bold ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_78%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_36%,transparent)] xl:flex">
        <ToolbarMetric label="Totale" tone="accent" value={formatToolbarMoney(salToolbar.total)} />
        <div className="h-8 w-px bg-[var(--border-subtle)]/60" />
        <ToolbarMetric label="Voci" value={`${salToolbar.lineCount}/${salToolbar.voicesCount}`} />
        <div className="h-8 w-px bg-[var(--border-subtle)]/60" />
        <ToolbarMetric
          label="Residuo"
          tone={salToolbar.budgetResidual < 0 ? "danger" : "success"}
          value={formatToolbarMoney(salToolbar.budgetResidual)}
        />
        {salToolbar.discountAmount > 0 ? (
          <>
            <div className="h-8 w-px bg-[var(--border-subtle)]/60" />
            <ToolbarMetric
              label="Ribasso"
              tone="danger"
              value={`-${formatToolbarMoney(salToolbar.discountAmount)}`}
            />
          </>
        ) : null}
      </div>
      <motion.button
        className="top-toolbar-action top-toolbar-action-outline group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold text-[var(--text-primary)]"
        onClick={() => onAction("sal-save-draft")}
        title="Salva bozza SAL"
        type="button"
      >
        <span className="top-toolbar-action-mark">
          <FloppyDisk size={13} weight="bold" />
        </span>
        <span>Salva bozza</span>
      </motion.button>
    </div>
  );
}

function ToolbarMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "accent" | "danger" | "success";
  value: string;
}) {
  return (
    <div className="flex flex-col justify-center gap-0.5 leading-none">
      <span className="text-9px font-semibold text-[var(--text-secondary)]">{label}</span>
      <span
        className={cn(
          "max-w-[112px] truncate text-11px font-black tabular-nums text-[var(--text-primary)]",
          tone === "accent" && "text-[var(--accent-primary)]",
          tone === "danger" && "text-[var(--danger-base)]",
          tone === "success" && "text-[var(--success-base)]",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
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
    <div className="flex items-center gap-1">
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
                  "mx-0.5 h-px w-3",
                  isCompleted ? "bg-[var(--accent-primary)]" : "bg-[var(--border-subtle)]",
                )}
              />
            )}
            <button
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-10px font-bold whitespace-nowrap transition-all duration-200",
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
              <span className="text-10px">{step.icon}</span>
              <span>{step.label}</span>
            </button>
          </div>
        );
      })}
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
  } = useNavigationState();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const visibleHistory = routeHistory
    .map((entry, index) => ({ ...entry, index }))
    .slice(Math.max(0, routeHistory.length - 8))
    .reverse();

  return (
    <div className="animate-entry-sm top-toolbar-history-wrap">
      <button
        aria-expanded={isHistoryOpen}
        aria-label="Apri cronologia pagine"
        className="top-toolbar-history-trigger"
        onClick={() => setIsHistoryOpen((current) => !current)}
        title="Cronologia pagine"
        type="button"
      >
        <ClockCounterClockwise size={15} weight="regular" />
        <CaretDown
          size={9}
          weight="bold"
          className={cn("transition-transform", isHistoryOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isHistoryOpen ? (
          <>
            <button
              aria-label="Chiudi cronologia pagine"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setIsHistoryOpen(false)}
              type="button"
            />
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="top-toolbar-history-menu absolute left-0 top-full z-50 mt-2 w-[260px] overflow-hidden rounded-18px p-1.5"
              exit={{ opacity: 0, scale: 0.97, y: -6 }}
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-1 border-b border-[color-mix(in_srgb,var(--border-subtle)_70%,transparent)] p-1 pb-1.5">
                <HistoryButton disabled={!canGoBack} label="Torna indietro" onClick={navigateBack}>
                  <CaretLeft size={14} weight="bold" />
                </HistoryButton>
                <HistoryButton
                  disabled={!canGoForward}
                  label="Vai avanti"
                  onClick={navigateForward}
                >
                  <CaretRight size={14} weight="bold" />
                </HistoryButton>
                <span className="ml-auto px-2 text-10px font-semibold text-[var(--text-secondary)]">
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
            </motion.div>
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
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  const motionProps = disabled ? {} : {};

  return (
    <motion.button
      className={cn(
        "top-toolbar-history-button flex size-7 items-center justify-center rounded-full text-[var(--text-secondary)]",
        disabled ? "cursor-not-allowed opacity-40" : "hover:text-[var(--text-primary)]",
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      type="button"
      {...motionProps}
    >
      {children}
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
          <motion.button
            className={cn(
              "top-toolbar-action group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold",
              action.variant === "outline"
                ? "top-toolbar-action-outline text-[var(--text-primary)]"
                : "top-toolbar-action-primary text-[var(--text-inverse)]",
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
          "top-toolbar-action group flex h-9 items-center gap-1.5 rounded-full px-3 text-12px font-bold",
          isPrimary
            ? "top-toolbar-action-primary text-[var(--text-inverse)]"
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
              className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)] backdrop-blur-md"
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 26,
              }}
            >
              <div className="rounded-18px bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)]">
                {action.menuItems?.map((item, index) => {
                  return (
                    <motion.button
                      animate={{ opacity: 1, x: 0 }}
                      className="flex w-full items-start gap-3 rounded-18px px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)]"
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
  return (
    <div className="flex items-center gap-1">
      <UtilityButton label="Notifiche" onClick={() => onAction("notifications")}>
        <Bell size={15} weight="regular" />
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
      className="top-toolbar-icon-button relative flex size-9 items-center justify-center rounded-full text-[var(--text-secondary)]"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </motion.button>
  );
}
