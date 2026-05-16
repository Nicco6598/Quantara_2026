import { m } from "framer-motion";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { SPRING_EASE } from "@/motion";
import { cn } from "@/lib/utils";
import { type DiffResult, diffSalLines } from "../domain/sal-comparison";
import type { SalLineView } from "../types";
import { Currency } from "./SalCreationTables";

type SalComparisonViewProps = {
  before: SalLineView[];
  after: SalLineView[];
  beforeLabel?: string;
  afterLabel?: string;
};

export function SalComparisonView({
  before,
  after,
  beforeLabel = "SAL precedente",
  afterLabel = "SAL corrente",
}: SalComparisonViewProps) {
  const { diffs, totals } = useMemo(() => diffSalLines(before, after), [before, after]);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const visibleDiffs = useMemo(
    () => (showUnchanged ? diffs : diffs.filter((d) => d.status !== "unchanged")),
    [diffs, showUnchanged],
  );

  const unchangedCount = diffs.filter((d) => d.status === "unchanged").length;
  const hasChanges = diffs.some((d) => d.status !== "unchanged");

  return (
    <div className="space-y-3">
      {/* Totals comparison bar */}
      <div className="rounded-14px bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-10px font-medium uppercase tracking-caption text-[var(--text-secondary)]">
                  {beforeLabel}
                </div>
                <div className="mt-0.5 text-18px font-semibold text-[var(--text-primary)]">
                  <Currency value={totals.oldTotal} />
                </div>
              </div>
              <ArrowRight className="size-5 shrink-0 text-[var(--text-tertiary)]" />
              <div className="min-w-0">
                <div className="text-10px font-medium uppercase tracking-caption text-[var(--text-secondary)]">
                  {afterLabel}
                </div>
                <div className="mt-0.5 text-18px font-semibold text-[var(--text-primary)]">
                  <Currency value={totals.newTotal} />
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "shrink-0 rounded-10px px-3 py-2 text-center",
              totals.diff > 0 && "bg-[var(--warning-soft)]",
              totals.diff < 0 && "bg-[var(--success-soft)]",
              totals.diff === 0 && "bg-[var(--bg-muted)]",
            )}
          >
            <div className="text-9px font-medium uppercase tracking-caption text-[var(--text-secondary)]">
              Differenza
            </div>
            <div
              className={cn(
                "mt-0.5 text-16px font-bold tabular-nums leading-none",
                totals.diff > 0 && "text-[var(--danger-base)]",
                totals.diff < 0 && "text-[var(--success-base)]",
                totals.diff === 0 && "text-[var(--text-tertiary)]",
              )}
            >
              {totals.diff > 0 ? "+" : ""}
              <Currency value={totals.diff} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)]/40 pt-3">
          <span className="text-11px font-medium text-[var(--text-secondary)]">
            {totals.oldCount} voci → {totals.newCount} voci
          </span>
          {hasChanges && (
            <>
              <span className="text-[var(--border-subtle)]">·</span>
              {totals.addedCount > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-10px font-semibold text-[var(--success-base)]">
                  <Plus className="size-3" />
                  {totals.addedCount} aggiunte
                </span>
              )}
              {totals.removedCount > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-10px font-semibold text-[var(--danger-base)]">
                  <Minus className="size-3" />
                  {totals.removedCount} rimosse
                </span>
              )}
              {totals.modifiedCount > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-10px font-semibold text-[var(--warning-base)]">
                  ~{totals.modifiedCount} modificate
                </span>
              )}
            </>
          )}
          {unchangedCount > 0 && (
            <button
              className="ml-auto inline-flex items-center gap-1 text-10px font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
              onClick={() => setShowUnchanged(!showUnchanged)}
              type="button"
            >
              {unchangedCount} invariate
              <span className="ml-0.5">{showUnchanged ? "▲" : "▼"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comparison columns */}
      <div className="grid gap-3 md:grid-cols-2">
        <BeforeColumn diffs={visibleDiffs} label={beforeLabel} />
        <AfterColumn diffs={visibleDiffs} label={afterLabel} />
      </div>
    </div>
  );
}

function BeforeColumn({ diffs, label }: { diffs: DiffResult[]; label: string }) {
  const items = diffs.filter((d) => d.status !== "added");
  return (
    <div className="rounded-lg bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/50">
      <div className="border-b border-[var(--border-subtle)]/40 px-4 py-3">
        <div className="text-10px font-medium uppercase tracking-0_14em text-[var(--info-base)]">
          {label}
        </div>
        <div className="mt-0.5 text-11px font-medium text-[var(--text-tertiary)]">
          {items.length} voci
        </div>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]/20 max-h-[460px] overflow-y-auto">
        {items.map((d) => (
          <DiffRow key={`${d.voiceId}-b`} diff={d} side="before" />
        ))}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-12px text-[var(--text-tertiary)]">
            Nessuna voce
          </div>
        )}
      </div>
    </div>
  );
}

function AfterColumn({ diffs, label }: { diffs: DiffResult[]; label: string }) {
  const items = diffs.filter((d) => d.status !== "removed");
  return (
    <div className="rounded-lg bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/50">
      <div className="border-b border-[var(--border-subtle)]/40 px-4 py-3">
        <div className="text-10px font-medium uppercase tracking-0_14em text-[var(--accent-primary)]">
          {label}
        </div>
        <div className="mt-0.5 text-11px font-medium text-[var(--text-tertiary)]">
          {items.length} voci
        </div>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]/20 max-h-[460px] overflow-y-auto">
        {items.map((d) => (
          <DiffRow key={`${d.voiceId}-a`} diff={d} side="after" />
        ))}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-12px text-[var(--text-tertiary)]">
            Nessuna voce
          </div>
        )}
      </div>
    </div>
  );
}

function DiffRow({ diff, side }: { diff: DiffResult; side: "before" | "after" }) {
  const isChanged = diff.status !== "unchanged";
  const isVisible =
    (side === "before" && diff.status !== "added") ||
    (side === "after" && diff.status !== "removed");

  if (!isVisible) return null;

  const bgClass =
    diff.status === "added"
      ? "bg-[var(--success-soft)]/20"
      : diff.status === "removed"
        ? "bg-[var(--danger-soft)]/20"
        : diff.status === "modified"
          ? "bg-[var(--warning-soft)]/15"
          : "";

  const qty = side === "before" ? (diff.oldQuantity ?? 0) : diff.newQuantity;
  const total = side === "before" ? (diff.oldTotal ?? 0) : diff.newTotal;

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      className={cn("px-4 py-3 text-12px", bgClass)}
      exit={{ opacity: 0, x: -12 }}
      initial={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2, ease: SPRING_EASE }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isChanged && diff.status === "added" && (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--success-base)] text-[var(--text-inverse)]">
                <Plus className="size-2.5" strokeWidth={3} />
              </span>
            )}
            {isChanged && diff.status === "removed" && (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--danger-base)] text-[var(--text-inverse)]">
                <Minus className="size-2.5" strokeWidth={3} />
              </span>
            )}
            {isChanged && diff.status === "modified" && (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--warning-base)] text-[var(--text-inverse)] text-9px font-bold leading-none">
                ~
              </span>
            )}
            {!isChanged && (
              <span className="flex size-4 shrink-0 items-center justify-center">
                <span className="size-1.5 rounded-full bg-[var(--text-tertiary)]" />
              </span>
            )}
            <span
              className={cn(
                "font-semibold",
                isChanged ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
              )}
            >
              {diff.code}
            </span>
          </div>
          <div
            className={cn(
              "mt-0.5 truncate leading-4",
              isChanged ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]",
            )}
          >
            {diff.description}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "font-mono text-13px",
              isChanged
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--text-tertiary)]",
            )}
          >
            {qty.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
          </div>
          <div
            className={cn(
              "font-mono",
              isChanged
                ? "text-12px font-semibold text-[var(--accent-primary)]"
                : "text-11px text-[var(--text-tertiary)]",
            )}
          >
            <Currency value={total} />
          </div>
        </div>
      </div>

      {isChanged && side === "after" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {diff.qtyDiff !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-10px font-semibold font-mono",
                diff.qtyDiff > 0
                  ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                  : "bg-[var(--danger-soft)] text-[var(--danger-base)]",
              )}
            >
              {diff.qtyDiff > 0 ? "+" : ""}
              {diff.qtyDiff.toLocaleString("it-IT", { maximumFractionDigits: 3 })} qtà
            </span>
          )}
          {diff.totalDiff !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-10px font-semibold font-mono",
                diff.totalDiff > 0
                  ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                  : "bg-[var(--danger-soft)] text-[var(--danger-base)]",
              )}
            >
              {diff.totalDiff > 0 ? "+" : ""}
              <Currency value={diff.totalDiff} />
            </span>
          )}
          {diff.unitPriceDiff !== 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-10px font-semibold font-mono text-[var(--info-base)]">
              prezzo unit. cambiato
            </span>
          )}
          {diff.surchargeChanged && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-10px font-semibold text-[var(--warning-base)]">
              magg. cambiata
            </span>
          )}
        </div>
      )}
    </m.div>
  );
}
