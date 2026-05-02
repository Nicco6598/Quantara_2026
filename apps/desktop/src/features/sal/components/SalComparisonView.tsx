import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { type DiffResult, diffSalLines } from "../domain/sal-comparison";
import type { SalLineView } from "../types";
import { Currency } from "./SalCreationTables";

const SOFT_EASE = [0.22, 1, 0.36, 1] as const;

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

  return (
    <div className="space-y-3">
      {/* Totals comparison bar */}
      <div className="rounded-[12px] bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/60">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <span className="text-[var(--text-secondary)]">
            {beforeLabel}:{" "}
            <strong className="text-[var(--text-primary)]">
              <Currency value={totals.oldTotal} />
            </strong>
          </span>
          <span className="text-[var(--border-subtle)]">→</span>
          <span className="text-[var(--text-secondary)]">
            {afterLabel}:{" "}
            <strong className="text-[var(--text-primary)]">
              <Currency value={totals.newTotal} />
            </strong>
          </span>
          <span className="text-[var(--border-subtle)]">|</span>
          <span
            className={cn(
              "font-semibold",
              totals.diff > 0 && "text-[var(--danger-base)]",
              totals.diff < 0 && "text-[var(--success-base)]",
              totals.diff === 0 && "text-[var(--text-secondary)]",
            )}
          >
            {totals.diff > 0 ? "+" : ""}
            <Currency value={totals.diff} />
          </span>
          <span className="text-[var(--border-subtle)]">·</span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {totals.oldCount} voci → {totals.newCount} voci
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {totals.addedCount > 0 && (
            <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 font-semibold text-[var(--success-base)]">
              +{totals.addedCount} aggiunte
            </span>
          )}
          {totals.removedCount > 0 && (
            <span className="rounded-full bg-[var(--danger-soft)] px-2 py-0.5 font-semibold text-[var(--danger-base)]">
              -{totals.removedCount} rimosse
            </span>
          )}
          {totals.modifiedCount > 0 && (
            <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 font-semibold text-[var(--warning-base)]">
              ~{totals.modifiedCount} modificate
            </span>
          )}
          {totals.addedCount === 0 && totals.removedCount === 0 && totals.modifiedCount === 0 && (
            <span className="text-[var(--text-secondary)]">Identiche</span>
          )}
        </div>
      </div>

      {/* Comparison columns */}
      <div className="grid gap-3 md:grid-cols-2">
        <BeforeColumn diffs={diffs} label={beforeLabel} />
        <AfterColumn diffs={diffs} label={afterLabel} />
      </div>
    </div>
  );
}

function BeforeColumn({ diffs, label }: { diffs: DiffResult[]; label: string }) {
  const items = diffs.filter((d) => d.status !== "added");
  return (
    <div className="rounded-[12px] bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/60">
      <div className="border-b border-[var(--border-subtle)]/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--info-base)]">
        {label}
      </div>
      <div className="divide-y divide-[var(--border-subtle)]/30 max-h-[420px] overflow-y-auto">
        {items.map((d) => (
          <DiffRow key={`${d.voiceId}-b`} diff={d} side="before" />
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[var(--text-secondary)]">
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
    <div className="rounded-[12px] bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/60">
      <div className="border-b border-[var(--border-subtle)]/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-primary)]">
        {label}
      </div>
      <div className="divide-y divide-[var(--border-subtle)]/30 max-h-[420px] overflow-y-auto">
        {items.map((d) => (
          <DiffRow key={`${d.voiceId}-a`} diff={d} side="after" />
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[var(--text-secondary)]">
            Nessuna voce
          </div>
        )}
      </div>
    </div>
  );
}

function DiffRow({ diff, side }: { diff: DiffResult; side: "before" | "after" }) {
  const bgClass =
    diff.status === "added"
      ? "bg-[var(--success-soft)]/30"
      : diff.status === "removed"
        ? "bg-[var(--danger-soft)]/30"
        : diff.status === "modified"
          ? "bg-[var(--warning-soft)]/30"
          : "";

  const qty = side === "before" ? (diff.oldQuantity ?? 0) : diff.newQuantity;
  const total = side === "before" ? (diff.oldTotal ?? 0) : diff.newTotal;

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className={cn("px-4 py-2.5 text-[12px]", bgClass)}
      exit={{ opacity: 0, x: -12 }}
      initial={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2, ease: SOFT_EASE }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-[var(--text-primary)]">{diff.code}</span>
          <span className="ml-1.5 truncate text-[var(--text-secondary)]">{diff.description}</span>
        </div>
        <span className="shrink-0 font-mono text-[var(--text-primary)]">
          {qty.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
            {diff.status === "added"
              ? "Nuova"
              : diff.status === "removed"
                ? "Rimossa"
                : diff.status === "modified"
                  ? "Modificata"
                  : ""}
          </span>
          {side === "after" && diff.qtyDiff !== 0 && (
            <span
              className={cn(
                "text-[11px] font-semibold font-mono",
                diff.qtyDiff > 0 ? "text-[var(--danger-base)]" : "text-[var(--success-base)]",
              )}
            >
              {diff.qtyDiff > 0 ? "+" : ""}
              {diff.qtyDiff.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
            </span>
          )}
          {side === "after" && diff.surchargeChanged && (
            <span className="text-[10px] font-semibold text-[var(--warning-base)]">
              magg. cambiata
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] font-semibold text-[var(--accent-primary)]">
            <Currency value={total} />
          </span>
          {side === "after" && diff.totalDiff !== 0 && (
            <span
              className={cn(
                "text-[11px] font-semibold font-mono",
                diff.totalDiff > 0 ? "text-[var(--danger-base)]" : "text-[var(--success-base)]",
              )}
            >
              {diff.totalDiff > 0 ? "+" : ""}
              <Currency value={diff.totalDiff} />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
