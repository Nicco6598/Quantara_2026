import { m } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  MoreVertical,
  Search,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { buildSalCardContextMenuEntries } from "@/lib/context-menu-presets";
import type { DesktopTariffBook } from "@/lib/desktopData";
import { cn } from "@/lib/utils";

export function MilestoneItem({
  isLast,
  row,
}: {
  isLast: boolean;
  row: { date: string; label: string; status: string };
}) {
  const isComplete = row.status === "complete";
  const isActive = row.status === "active";

  return (
    <div className="relative flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border",
          isComplete && "border-[var(--info-base)] bg-[var(--info-soft)] text-[var(--info-base)]",
          isActive && "border-[var(--info-base)] bg-[var(--info-soft)] text-[var(--info-base)]",
          !isComplete &&
            !isActive &&
            "border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <span className="size-3 rounded-full bg-current" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
          {row.label}
        </div>
        <div className="mt-1 truncate text-12px font-medium text-[var(--text-secondary)]">
          {row.date}
        </div>
      </div>
      {!isLast ? (
        <div className="pointer-events-none absolute left-10 right-0 top-5 hidden border-t border-dashed border-[var(--border-subtle)] lg:block" />
      ) : null}
    </div>
  );
}

export function InfoBlock({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="mt-4">
      <div className="text-12px font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-15px font-semibold text-[var(--text-primary)]">{value}</div>
      {note ? (
        <div className="mt-1 text-11px font-semibold text-[var(--danger-base)]">{note}</div>
      ) : null}
    </div>
  );
}

export function PerformanceIndexBar({
  label,
  note,
  value,
}: {
  label: string;
  note?: string;
  value: number | null;
}) {
  const formatted =
    value == null || !Number.isFinite(value)
      ? "N/D"
      : value.toLocaleString("it-IT", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        });
  const numericValue = value != null && Number.isFinite(value) ? Math.max(0, value) : null;
  const maxScale = Math.max(2, Math.ceil(Math.max(numericValue ?? 1, 1) * 2) / 2);
  const markerPosition =
    numericValue == null
      ? 50
      : numericValue <= 1
        ? Math.max(0, numericValue * 50)
        : Math.min(100, 50 + ((numericValue - 1) / (maxScale - 1)) * 50);
  const leftWidth = numericValue == null || numericValue >= 1 ? 0 : 50 - markerPosition;
  const rightWidth = numericValue == null || numericValue <= 1 ? 0 : markerPosition - 50;
  const isLow = value != null && value < 0.95;
  const isHigh = value != null && value > 1.05;
  const stateLabel = isLow ? "Sotto soglia" : isHigh ? "Extra margine" : "Bilanciato";
  const accentClass = isLow
    ? "text-[var(--danger-base)]"
    : isHigh
      ? "text-[var(--success-base)]"
      : "text-[var(--text-primary)]";
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-tertiary)]">
            {label}
          </div>
          <div className={cn("mt-0.5 text-11px font-semibold", accentClass)}>{stateLabel}</div>
        </div>
        <div className="shrink-0 rounded-lg bg-[var(--surface-base)] px-2.5 py-1 text-right ring-1 ring-[var(--border-subtle)]/60">
          <div className={cn("text-16px font-semibold tabular-nums leading-none", accentClass)}>
            {formatted}
          </div>
        </div>
      </div>

      <div className="relative mt-3">
        <div className="grid h-7 grid-cols-[1fr_1px_1fr] items-center overflow-hidden rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--danger-base)_34%,var(--bg-muted)_66%)_0%,color-mix(in_srgb,var(--warning-base)_22%,var(--bg-muted)_78%)_38%,color-mix(in_srgb,var(--surface-base)_72%,var(--bg-muted)_28%)_50%,color-mix(in_srgb,var(--success-base)_18%,var(--bg-muted)_82%)_62%,color-mix(in_srgb,var(--success-base)_36%,var(--bg-muted)_64%)_100%)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_58%,transparent)]">
          <div className="relative h-full overflow-hidden rounded-l-full">
            <div
              className="absolute bottom-0 top-0 rounded-l-full bg-[linear-gradient(90deg,var(--danger-base),color-mix(in_srgb,var(--warning-base)_70%,var(--danger-base)_30%))] shadow-[0_0_16px_color-mix(in_srgb,var(--danger-base)_34%,transparent)] transition-[width] duration-[var(--duration-reveal)]"
              style={{ right: 0, width: `${leftWidth * 2}%` }}
            />
          </div>
          <div className="h-full w-px bg-[var(--text-primary)]/45" />
          <div className="relative h-full overflow-hidden rounded-r-full">
            <div
              className="absolute bottom-0 top-0 rounded-r-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--success-base)_78%,var(--accent-primary)_22%),var(--success-base))] shadow-[0_0_16px_color-mix(in_srgb,var(--success-base)_34%,transparent)] transition-[width] duration-[var(--duration-reveal)]"
              style={{ left: 0, width: `${rightWidth * 2}%` }}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-1 top-1/2 grid -translate-y-1/2 grid-cols-8">
          {Array.from({ length: 8 }, (_, i) => i).map((i) => (
            <span
              className="h-4 border-l border-[var(--surface-base)]/40 first:border-l-0"
              key={i}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 text-9px font-semibold tabular-nums text-[var(--text-tertiary)]">
        <span>0</span>
        <span className="text-center text-[var(--text-secondary)]">1,00</span>
        <span className="text-right">+{maxScale.toLocaleString("it-IT")}</span>
      </div>

      {note ? (
        <div className={cn("mt-2 text-11px font-semibold leading-4", accentClass)}>{note}</div>
      ) : null}
    </div>
  );
}

export function SalCard({
  cardStatus,
  date,
  incidence,
  lineCount,
  onClose,
  onContinue,
  onDelete,
  period,
  progressiveLabel,
  sal,
  status,
  tone,
  value,
  isSelected,
  onSelect,
}: {
  cardStatus: string;
  date: string;
  incidence: number;
  lineCount: number;
  onClose: () => void;
  onContinue?: (() => void) | undefined;
  onDelete: () => void;
  period: string;
  progressiveLabel: string;
  sal: string;
  status: string;
  tone: "danger" | "info" | "success" | "warning";
  value: string;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const isDraft = cardStatus === "draft";
  const isReview = cardStatus === "in-review";
  const isApproved = cardStatus === "approved";
  const isClosed = cardStatus === "closed";
  const isFinal = isClosed || isApproved;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLDivElement>(null);
  const contextMenu = useContextMenu<void>();

  const isSelectable = onSelect !== undefined;
  const springEase = [0.22, 1, 0.36, 1] as const;
  void tone;

  return (
    <m.article
      className={cn(
        "group relative grid gap-3.5 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_62%,var(--surface-base)_38%)] px-4 py-4 ring-1 hover:bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)] sm:px-5 md:grid-cols-[minmax(220px,1fr)_176px_120px_260px] md:items-center md:gap-4",
        isSelected
          ? "bg-[var(--selection-bg)] ring-[var(--accent-primary)]/50"
          : "ring-[var(--border-subtle)]/60 hover:ring-[var(--border-subtle)]",
      )}
      layout="position"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenu.open(event, undefined);
      }}
      transition={{ duration: 0.25, ease: springEase }}
    >
      {isSelectable && (
        <button
          className="absolute inset-0 cursor-pointer rounded-xl"
          onClick={onSelect}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
          aria-label={`Seleziona ${progressiveLabel}`}
          type="button"
        />
      )}

      <div
        className={cn(
          "relative z-10 flex min-w-0 items-center gap-3.5",
          isSelectable && "pointer-events-none",
        )}
      >
        <m.div
          animate={{
            marginRight: isSelectable ? 0 : -14,
            opacity: isSelectable ? 1 : 0,
            width: isSelectable ? 20 : 0,
          }}
          className="shrink-0 overflow-hidden"
          initial={false}
          transition={{ duration: 0.25, ease: springEase }}
        >
          <m.button
            aria-checked={isSelected}
            aria-hidden={!isSelectable}
            className={cn(
              "pointer-events-auto flex size-[20px] shrink-0 items-center justify-center rounded-5px border transition-all",
              isSelected
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] opacity-100"
                : "border-[var(--border-subtle)] bg-[var(--surface-base)] opacity-100",
            )}
            disabled={!isSelectable}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            role="checkbox"
            tabIndex={isSelectable ? 0 : -1}
            type="button"
          >
            {isSelected ? (
              <svg
                aria-label="Selezionato"
                className="size-2.5 text-[var(--text-inverse)]"
                fill="none"
                viewBox="0 0 12 12"
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
            ) : null}
          </m.button>
        </m.div>

        <span
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-15px ring-1 ring-inset shadow-[inset_0_1px_0_color-mix(in_srgb,white_32%,transparent)]",
            isFinal
              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
              : isReview
                ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                : "bg-[var(--warning-soft)] text-[var(--warning-base)]",
            isFinal
              ? "ring-[color-mix(in_srgb,var(--success-base)_18%,transparent)]"
              : isReview
                ? "ring-[color-mix(in_srgb,var(--info-base)_18%,transparent)]"
                : "ring-[color-mix(in_srgb,var(--warning-base)_18%,transparent)]",
          )}
        >
          <span className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-current/45" />
          {isFinal ? (
            <CheckCircle2 className="size-5" />
          ) : isReview ? (
            <ThumbsUp className="size-5" />
          ) : (
            <Clock3 className="size-5" />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-14px font-semibold text-[var(--text-primary)]">{sal}</div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 text-10px font-semibold text-[var(--text-tertiary)]">
              {progressiveLabel}
            </span>
            <span className="min-w-0 truncate text-11px font-medium text-[var(--text-secondary)]">
              {period}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--surface-base)_64%,var(--accent-primary)_6%)] px-3.5 py-2.5 ring-1 ring-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] md:bg-transparent md:px-0 md:py-0 md:ring-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-10px font-semibold uppercase tracking-0_1em text-[var(--accent-primary)]">
            <ListChecks className="size-3.5 shrink-0" />
            Importo SAL
          </div>
          <div className="mt-1 truncate text-18px font-semibold leading-none tabular-nums text-[var(--text-primary)] md:text-19px">
            {value}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {incidence}% contratto
            </span>
            <span className="rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {lineCount} {lineCount === 1 ? "voce" : "voci"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-w-0 items-center gap-2.5 rounded-lg bg-[var(--surface-base)]/45 px-3.5 py-2.5 md:bg-transparent md:px-0 md:py-0">
        <CalendarDays className="size-4 shrink-0 text-[var(--text-tertiary)] md:hidden" />
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-0_1em text-[var(--text-tertiary)] md:hidden">
            Data
          </div>
          <div className="mt-0.5 truncate text-12px font-semibold tabular-nums text-[var(--text-primary)] md:mt-0">
            {date}
          </div>
        </div>
      </div>

      <div className="pointer-events-auto relative z-10 grid min-w-0 grid-cols-[104px_1px_minmax(0,1fr)] items-center gap-2.5 rounded-lg bg-[var(--surface-base)]/45 px-3.5 py-2.5 md:bg-transparent md:px-0 md:py-0">
        <div className="flex min-w-0 items-center justify-start">
          <span
            className={cn(
              "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full px-2 text-11px font-black shadow-[inset_0_1px_0_color-mix(in_srgb,white_30%,transparent)]",
              isFinal &&
                "bg-[color-mix(in_srgb,var(--success-base)_16%,var(--surface-base)_84%)] text-[color-mix(in_srgb,var(--success-base)_82%,var(--text-primary)_18%)] ring-1 ring-[color-mix(in_srgb,var(--success-base)_26%,transparent)]",
              isDraft &&
                "bg-[color-mix(in_srgb,var(--warning-base)_12%,var(--surface-base)_88%)] text-[color-mix(in_srgb,var(--warning-base)_82%,var(--text-primary)_18%)] ring-1 ring-[color-mix(in_srgb,var(--warning-base)_24%,transparent)]",
              isReview &&
                "bg-[color-mix(in_srgb,var(--info-base)_12%,var(--surface-base)_88%)] text-[color-mix(in_srgb,var(--info-base)_82%,var(--text-primary)_18%)] ring-1 ring-[color-mix(in_srgb,var(--info-base)_24%,transparent)]",
            )}
          >
            <span className="min-w-0 truncate leading-none">{status}</span>
          </span>
        </div>

        <div className="h-8 w-px shrink-0 bg-[color-mix(in_srgb,var(--border-subtle)_72%,var(--text-tertiary)_28%)] transition-none" />

        <div className="grid min-w-0 grid-cols-[96px_36px] items-center justify-start gap-2">
          {isDraft ? (
            <button
              className="inline-flex h-9 w-24 items-center justify-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base)_90%)] px-3 text-11px font-black text-[var(--accent-primary)] ring-1 ring-[color-mix(in_srgb,var(--accent-primary)_22%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_34%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_16%,var(--surface-base)_84%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onContinue?.();
              }}
              type="button"
            >
              <span className="leading-none">Continua</span>
              <ArrowRight className="size-3.5 translate-y-px" strokeWidth={2.4} />
            </button>
          ) : isReview ? (
            <button
              className="inline-flex h-9 w-24 items-center justify-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success-base)_12%,var(--surface-base)_88%)] px-3 text-11px font-black leading-none text-[var(--success-base)] ring-1 ring-[color-mix(in_srgb,var(--success-base)_24%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_34%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--success-base)_18%,var(--surface-base)_82%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onClose();
              }}
              type="button"
            >
              <ThumbsUp className="size-3.5 translate-y-px" />
              <span className="leading-none">Approva</span>
            </button>
          ) : (
            <span aria-hidden="true" className="block h-9 w-24" />
          )}

          <div ref={menuBtnRef} className="shrink-0">
            <button
              aria-label="Azioni SAL"
              className="inline-flex size-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--surface-base)_82%,var(--bg-muted)_18%)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/70 transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setMenuOpen((value) => !value);
              }}
              type="button"
            >
              <MoreVertical className="size-4" />
            </button>
            <DropdownMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              triggerRef={menuBtnRef}
            >
              {isDraft ? (
                <DropdownItem
                  icon={ArrowRight}
                  label="Continua bozza"
                  onClick={() => {
                    setMenuOpen(false);
                    onContinue?.();
                  }}
                />
              ) : null}
              {isDraft || isReview ? (
                <DropdownItem
                  icon={ThumbsUp}
                  label={isDraft ? "Invia in revisione" : "Approva"}
                  onClick={() => {
                    setMenuOpen(false);
                    onClose();
                  }}
                />
              ) : null}
              <DropdownItem
                icon={Trash2}
                label="Elimina"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                tone="danger"
              />
            </DropdownMenu>
          </div>
        </div>
      </div>

      {contextMenu.state ? (
        <AppContextMenu
          entries={buildSalCardContextMenuEntries({
            isDraft,
            isReview,
            ...(onContinue ? { onContinue } : {}),
            onWorkflow: onClose,
            onDelete,
          })}
          header={{ title: sal, subtitle: status }}
          onClose={contextMenu.close}
          position={{ x: contextMenu.state.x, y: contextMenu.state.y }}
        />
      ) : null}
    </m.article>
  );
}

export function TariffPanelDialog({
  isOpen,
  onClose,
  onSearchQueryChange,
  pendingTariffIds,
  tariffBooks,
  searchQuery,
  filteredTariffBooks,
  onToggleTariffBook,
  onConfirm,
  onSelectAll,
  onClearAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSearchQueryChange: Dispatch<SetStateAction<string>>;
  pendingTariffIds: string[];
  tariffBooks: DesktopTariffBook[];
  searchQuery: string;
  filteredTariffBooks: DesktopTariffBook[];
  onToggleTariffBook: (bookId: string) => void;
  onConfirm: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const selectedBooks = tariffBooks.filter((b) => pendingTariffIds.includes(b.id));
  const availableBooks = filteredTariffBooks.filter((b) => !pendingTariffIds.includes(b.id));
  const isSearching = searchQuery.trim().length > 0;

  return (
    <Dialog
      className="max-w-lg sm:max-w-xl lg:max-w-2xl"
      isOpen={isOpen}
      onClose={onClose}
      zIndex={"var(--z-dialog)"}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--info-base)]">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-16px font-semibold text-[var(--text-primary)]">
            Tariffari del progetto
          </h3>
          <p className="mt-0.5 text-12px text-[var(--text-secondary)]">
            {pendingTariffIds.length === 0
              ? "Nessun tariffario associato"
              : `${pendingTariffIds.length} associat${pendingTariffIds.length !== 1 ? "i" : "o"} · ${tariffBooks.length} disponibili`}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            className="h-10 w-full rounded-xl border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 pl-10 pr-10 text-13px font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Cerca per nome, ente o anno…"
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              onClick={() => onSearchQueryChange("")}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 max-h-[400px] overflow-y-auto">
        {filteredTariffBooks.length > 0 ? (
          <div className="mb-2 flex items-center gap-2 px-0.5">
            <button
              className="text-11px font-semibold text-[var(--accent-primary)] hover:underline"
              onClick={onSelectAll}
              type="button"
            >
              Seleziona tutti
            </button>
            {pendingTariffIds.length > 0 ? (
              <>
                <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                <button
                  className="text-11px font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                  onClick={onClearAll}
                  type="button"
                >
                  Deseleziona tutti
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {!isSearching && selectedBooks.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-[var(--success-base)]" />
              <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                Associati al progetto
              </span>
            </div>
            <div className="space-y-1.5">
              {selectedBooks.map((book) => (
                <m.button
                  key={book.id}
                  layout
                  className="flex w-full items-center gap-3 rounded-14px border border-[var(--accent-primary)]/30 bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] px-3.5 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_12%,var(--surface-base)_88%)]"
                  onClick={() => onToggleTariffBook(book.id)}
                  type="button"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)] text-[var(--text-inverse)]">
                    <m.svg
                      animate={{ scale: [0.6, 1.15, 1] }}
                      className="size-3.5"
                      initial={false}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    </m.svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13px font-semibold text-[var(--text-primary)]">
                      {book.name}
                    </span>
                    <span className="mt-0.5 block truncate text-11px font-medium text-[var(--text-secondary)]">
                      {book.sourceName} · {book.year}
                    </span>
                  </span>
                </m.button>
              ))}
            </div>

            {availableBooks.length > 0 && (
              <div className="border-t border-[var(--border-subtle)]/50 pt-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--border-subtle)]" />
                  <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                    Disponibili
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {availableBooks.map((book) => (
                    <TariffBookRow
                      key={book.id}
                      book={book}
                      isSelected={false}
                      onToggle={() => onToggleTariffBook(book.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTariffBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 size-6 text-[var(--text-tertiary)]" />
                <p className="text-12px font-medium text-[var(--text-tertiary)]">
                  {isSearching
                    ? "Nessun tariffario corrisponde alla ricerca."
                    : "Nessun tariffario disponibile."}
                </p>
              </div>
            ) : (
              filteredTariffBooks.map((book) => (
                <TariffBookRow
                  key={book.id}
                  book={book}
                  isSelected={pendingTariffIds.includes(book.id)}
                  onToggle={() => onToggleTariffBook(book.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <DialogActions className="mt-4">
        <div className="flex items-center gap-2 text-11px text-[var(--text-secondary)]">
          <span className="rounded-md bg-[var(--bg-muted)] px-2 py-1">
            {pendingTariffIds.length} selezionat
            {pendingTariffIds.length !== 1 ? "i" : "o"}
          </span>
        </div>
        <Button onClick={onClose} variant="ghost">
          Annulla
        </Button>
        <Button
          disabled={pendingTariffIds.length === 0}
          icon={Check}
          onClick={onConfirm}
          variant="primary"
        >
          Salva
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TariffBookRow({
  book,
  isSelected,
  onToggle,
}: {
  book: DesktopTariffBook;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <m.button
      key={book.id}
      layout
      className={cn(
        "flex w-full items-center gap-3 rounded-14px border px-3.5 py-3 text-left transition-colors",
        isSelected
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)]"
          : "border-transparent hover:bg-[var(--bg-muted)]",
      )}
      onClick={onToggle}
      type="button"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          isSelected
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-inverse)]"
            : "border-[var(--border-subtle)]",
        )}
      >
        {isSelected && (
          <m.svg
            animate={{ scale: [0.6, 1.15, 1] }}
            className="size-3.5"
            initial={false}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            viewBox="0 0 24 24"
          >
            <path
              d="M20 6L9 17l-5-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
            />
          </m.svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-13px font-semibold text-[var(--text-primary)]">
          {book.name}
        </span>
        <span className="mt-0.5 block truncate text-11px font-medium text-[var(--text-secondary)]">
          {book.sourceName} · {book.year}
        </span>
      </span>
    </m.button>
  );
}

export function DeleteConfirmDialog({
  deleteTargetId,
  onClose,
  onConfirm,
}: {
  deleteTargetId: string | null;
  onClose: () => void;
  onConfirm: (salId: string) => void;
}) {
  return (
    <Dialog isOpen={deleteTargetId !== null} onClose={onClose} zIndex={"var(--z-dialog)"}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger-base)]">
          <Trash2 className="size-5" />
        </span>
        <div>
          <div className="text-14px font-semibold text-[var(--text-primary)]">
            Eliminare questa SAL?
          </div>
          <p className="mt-2 text-13px leading-5 text-[var(--text-secondary)]">
            L'operazione rimuove definitivamente il documento. I dati non possono essere recuperati.
          </p>
        </div>
      </div>
      <DialogActions>
        <Button onClick={onClose} variant="ghost">
          Annulla
        </Button>
        <Button
          icon={Trash2}
          onClick={() => {
            if (deleteTargetId) {
              onConfirm(deleteTargetId);
            }
            onClose();
          }}
          variant="destructive"
        >
          Elimina
        </Button>
      </DialogActions>
    </Dialog>
  );
}
