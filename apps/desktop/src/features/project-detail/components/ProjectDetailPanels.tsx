import { m } from "framer-motion";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  type LucideIcon,
  MoreVertical,
  Play,
  Search,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { StatusPill } from "@/components/shared/StatusPill";
import { BezelSurface } from "@/components/shared/ui-primitives";
import type { DesktopTariffBook } from "@/lib/desktopData";
import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-5", className)}>{children}</BezelSurface>;
}

export function PanelTitle({ children, icon: Icon }: { children: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2 text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
      <Icon className="size-4 text-[var(--info-base)]" />
      {children}
    </div>
  );
}

export function MetricCard({
  badge,
  caption,
  icon: Icon,
  label,
  tone,
  value,
}: {
  badge?: string;
  caption: string;
  icon: LucideIcon;
  label: string;
  tone: "blue" | "info" | "success" | "warning" | "danger";
  value: string;
}) {
  return (
    <BezelSurface
      innerClassName={cn(
        "group flex min-h-[104px] items-center gap-4 p-4 2xl:min-h-[120px]",
        tone === "blue" ? "bg-[var(--info-soft)]/20" : "",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          (!tone || tone === "blue" || tone === "info") &&
            "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-1.5 truncate text-19px font-semibold leading-none",
            (!tone || tone === "blue" || tone === "info") && "text-[var(--text-primary)]",
            tone === "success" && "text-[var(--success-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
          )}
        >
          {value}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-11px font-medium text-[var(--text-tertiary)]">{caption}</span>
          {badge ? (
            <span className="rounded-full bg-[var(--bg-muted-strong)] px-2 py-0.5 text-10px font-semibold text-[var(--text-secondary)]">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </BezelSurface>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-12px font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="max-w-[58%] text-right text-13px font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

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

  const isSelectable = onSelect !== undefined;
  const springEase = [0.22, 1, 0.36, 1] as const;

  return (
    <m.article
      className={cn(
        "group relative grid gap-3.5 rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_62%,var(--surface-base)_38%)] px-4 py-4 ring-1 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[color-mix(in_srgb,var(--bg-muted)_76%,var(--surface-base)_24%)] sm:px-5 md:grid-cols-[minmax(220px,1fr)_176px_120px_minmax(240px,max-content)] md:items-center md:gap-4",
        isSelected
          ? "bg-[var(--selection-bg)] ring-[var(--accent-primary)]/50"
          : "ring-[var(--border-subtle)]/60 hover:ring-[var(--border-subtle)]",
      )}
      layout="position"
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
            "flex size-11 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
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
          {isFinal ? <CheckCircle2 className="size-5" /> : <Clock3 className="size-5" />}
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

      <div className="pointer-events-auto relative z-10 flex min-w-0 items-center justify-between gap-2.5 rounded-lg bg-[var(--surface-base)]/45 px-3.5 py-2.5 md:justify-end md:bg-transparent md:px-0 md:py-0">
        <StatusPill tone={tone}>{status}</StatusPill>

        {isDraft ? (
          <Button
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onContinue?.();
            }}
            variant="secondary"
          >
            <Play className="size-3.5" />
            Continua
          </Button>
        ) : isReview ? (
          <Button
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onClose();
            }}
            variant="secondary"
          >
            <ThumbsUp className="size-3.5" />
            Approva
          </Button>
        ) : isFinal ? (
          <span
            className={cn(
              "hidden items-center gap-1.5 rounded-full px-3 py-1 text-11px font-semibold sm:inline-flex",
              "bg-[var(--success-soft)] text-[var(--success-base)]",
            )}
          >
            <ThumbsUp className="size-3.5" />
            Approvata
          </span>
        ) : null}

        <div ref={menuBtnRef}>
          <Button
            aria-label="Azioni SAL"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setMenuOpen((value) => !value);
            }}
            variant="icon"
          >
            <MoreVertical className="size-4" />
          </Button>
          <DropdownMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            triggerRef={menuBtnRef}
          >
            {isDraft ? (
              <DropdownItem
                icon={Play}
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
}) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} zIndex={75}>
      <div>
        <h3 className="text-16px font-semibold text-[var(--text-primary)]">
          Tariffari del progetto
        </h3>
        <p className="mt-0.5 text-12px text-[var(--text-secondary)]">
          {pendingTariffIds.length} selezionat
          {pendingTariffIds.length !== 1 ? "i" : "o"} · {tariffBooks.length} disponibili
        </p>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            className="h-10 w-full rounded-xl border border-[var(--border-subtle)]/70 bg-[var(--bg-muted)]/65 pl-10 pr-3 text-13px font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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

      <div className="mt-4 max-h-[340px] overflow-y-auto">
        {filteredTariffBooks.length === 0 ? (
          <p className="py-6 text-center text-12px font-medium text-[var(--text-tertiary)]">
            {searchQuery
              ? "Nessun tariffario corrisponde alla ricerca."
              : "Nessun tariffario disponibile."}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredTariffBooks.map((book) => {
              const isSelected = pendingTariffIds.includes(book.id);
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
                  onClick={() => onToggleTariffBook(book.id)}
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
                    {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
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
            })}
          </div>
        )}
      </div>

      <DialogActions className="mt-4">
        <Button onClick={onClose} variant="ghost">
          Annulla
        </Button>
        <Button icon={Check} onClick={onConfirm} variant="primary">
          Salva
        </Button>
      </DialogActions>
    </Dialog>
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
    <Dialog isOpen={deleteTargetId !== null} onClose={onClose} zIndex={75}>
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
          onClick={() => deleteTargetId && onConfirm(deleteTargetId)}
          variant="destructive"
        >
          Elimina
        </Button>
      </DialogActions>
    </Dialog>
  );
}
