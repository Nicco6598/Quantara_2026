import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Download,
  MoreHorizontal,
  Percent,
  Plus,
  Trash2,
} from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Currency } from "@/components/shared/Currency";
import { StatusPill } from "@/components/shared/StatusPill";
import { SPRING_EASE } from "@/motion";

export { Currency };

import { cn } from "@/lib/utils";
import { buildMeasurementTarget } from "../domain/sal-measurement-target";
import { extractMgTariffPrefix, isMgCode } from "../domain/sal-calculations";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineView,
  SalMeasurementRowDraft,
} from "../types";

export function NumberValue({ value }: { value: number }) {
  return (
    <span className="font-mono">
      {value.toLocaleString("it-IT", { maximumFractionDigits: 3, minimumFractionDigits: 3 })}
    </span>
  );
}

export const SelectedVoicesPanel = memo(function SelectedVoicesPanel({
  lines,
  copiedVoiceId,
  onCopyLine,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onNotesChange,
  onRemove,
  onRemoveMeasurementRow,
  onSurcharge,
  onUpdateMeasurementRow,
}: {
  lines: SalLineView[];
  copiedVoiceId: string | null;
  onCopyLine: (lineId: string) => void;
  onAddMeasurementRow: (lineId: string) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
  onSurcharge: (lineId: string, percent: number) => void;
  onUpdateMeasurementRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    () => new Set(lines.map((l) => l.id)),
  );
  const tableLines = useMemo(() => lines.filter((line) => !isMgRow(line.voice)), [lines]);
  const workLines = useMemo(
    () => tableLines.filter((line) => !line.voice.isSafetyCost),
    [tableLines],
  );
  const safetyLines = useMemo(
    () => tableLines.filter((line) => line.voice.isSafetyCost),
    [tableLines],
  );
  const mgLines = useMemo(() => lines.filter((line) => isMgRow(line.voice)), [lines]);
  const allExpanded = expandedRows.size === tableLines.length;
  const hasSafetySection = safetyLines.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerItems = useMemo(() => {
    const items: Array<
      | {
          type: "section";
          id: string;
          amount: number;
          count: number;
          label: string;
          tone: "safety" | "work";
        }
      | { type: "line"; id: string; line: SalLineView; index: number }
    > = [];
    if (hasSafetySection) {
      items.push({
        amount: workLines.reduce((sum, line) => sum + line.totalAmount, 0),
        count: workLines.length,
        id: "section-work",
        label: "Lavori soggetti a ribasso",
        tone: "work",
        type: "section",
      });
      workLines.forEach((line, index) => {
        items.push({ id: line.id, index, line, type: "line" });
      });
      items.push({
        amount: safetyLines.reduce((sum, line) => sum + line.totalAmount, 0),
        count: safetyLines.length,
        id: "section-safety",
        label: "Voci OS non soggette a ribasso",
        tone: "safety",
        type: "section",
      });
      safetyLines.forEach((line, index) => {
        items.push({ id: line.id, index: workLines.length + index, line, type: "line" });
      });
      return items;
    }
    tableLines.forEach((line, index) => {
      items.push({ id: line.id, index, line, type: "line" });
    });
    return items;
  }, [hasSafetySection, safetyLines, tableLines, workLines]);
  const rowVirtualizer = useVirtualizer({
    count: registerItems.length,
    estimateSize: (index) => {
      const item = registerItems[index];
      if (!item) return 72;
      if (item.type === "section") return 37;
      const rowCount = Math.max(1, item.line.measurementRows.length);
      return expandedRows.has(item.line.id) ? 216 + rowCount * 49 : 72;
    },
    getItemKey: (index) => registerItems[index]?.id ?? index,
    getScrollElement: () => scrollRef.current,
    overscan: 6,
  });

  useEffect(() => {
    setExpandedRows((current) => {
      const next = new Set(current);
      let changed = false;
      for (const line of tableLines) {
        if (!next.has(line.id)) {
          next.add(line.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [tableLines]);

  const handleToggleRow = (lineId: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const handleToggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(tableLines.map((l) => l.id)));
    }
  }, [allExpanded, tableLines]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        handleToggleAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleToggleAll]);

  const renderRow = (line: SalLineView, index: number) => (
    <SelectedVoiceRow
      key={line.id}
      index={index}
      line={line}
      expanded={expandedRows.has(line.id)}
      isCopied={copiedVoiceId === line.id}
      onCopy={() => onCopyLine(line.id)}
      onAddMeasurementRow={onAddMeasurementRow}
      onDuplicateMeasurementRow={onDuplicateMeasurementRow}
      onNotesChange={onNotesChange}
      onRemove={onRemove}
      onRemoveMeasurementRow={onRemoveMeasurementRow}
      onSurcharge={onSurcharge}
      onToggle={() => handleToggleRow(line.id)}
      onUpdateMeasurementRow={onUpdateMeasurementRow}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/50">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)]/40 px-4 py-2">
        <div className="min-w-0">
          <div className="text-11px font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            Registro misure
          </div>
          <div className="mt-0.5 text-12px text-[var(--text-tertiary)]">
            {lines.length === 0
              ? "Nessuna voce inserita"
              : `${tableLines.length} voc${tableLines.length === 1 ? "e" : "i"} misurabil${tableLines.length === 1 ? "e" : "i"}${
                  mgLines.length > 0
                    ? ` · ${mgLines.length} maggiorazion${mgLines.length === 1 ? "e" : "i"} MG`
                    : ""
                }${safetyLines.length > 0 ? ` · ${safetyLines.length} OS` : ""}`}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-11px text-[var(--text-tertiary)]">
          {mgLines.length > 0 ? (
            <MgInlineSummary lines={tableLines} mgLines={mgLines} onRemove={onRemove} />
          ) : null}
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.08] px-3 font-black text-[var(--accent-primary)] shadow-sm transition-colors hover:bg-[var(--accent-primary)]/[0.12] hover:text-[var(--accent-primary)]"
            onClick={handleToggleAll}
            title="Ctrl+Shift+E"
            type="button"
          >
            {allExpanded ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
            {allExpanded ? "Comprimi" : "Espandi"}
            <span className="rounded bg-[var(--surface-base)]/80 px-1.5 py-0.5 text-9px font-black text-[var(--text-tertiary)] ring-1 ring-[var(--border-subtle)]/50">
              Ctrl Shift E
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto" ref={scrollRef}>
        <div className="min-w-[1460px]">
          {/* Header row */}
          <div className="sticky top-0 z-20 grid grid-cols-[58px_128px_minmax(340px,1.2fr)_70px_108px_112px_126px_118px_96px_130px_76px] border-b border-[var(--border-subtle)]/40 bg-[var(--surface-base)] text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)] shadow-[0_1px_0_var(--border-subtle)]">
            {[
              "N.",
              "Codice voce",
              "Voce / categoria",
              "UM",
              "Prezzo unit.",
              "Qtà calc.",
              "Importo lordo",
              "Ribasso",
              "Magg. man.",
              "Netto SAL",
              "Azioni",
            ].map((label) => {
              const isRight =
                label === "Prezzo unit." ||
                label === "Qtà calc." ||
                label === "Importo lordo" ||
                label === "Ribasso" ||
                label === "Magg. man." ||
                label === "Netto SAL";
              return (
                <div
                  className={cn(
                    "flex min-h-8 items-center border-r border-[var(--border-subtle)]/45 px-2.5 text-[var(--text-secondary)] last:border-r-0",
                    isRight && "justify-end text-right",
                  )}
                  key={label}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {tableLines.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <p className="text-14px font-semibold text-[var(--text-primary)]">
                Aggiungi una voce dal campo di ricerca.
              </p>
              <p className="max-w-md text-13px leading-relaxed text-[var(--text-tertiary)]">
                La griglia si popola come un foglio misure: fattori, maggiorazione, note e totali
                restano modificabili in riga.
              </p>
            </div>
          ) : (
            <div
              className="relative"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = registerItems[virtualRow.index];
                if (!item) return null;
                return (
                  <div
                    data-index={virtualRow.index}
                    key={item.id}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {item.type === "section" ? (
                      <RegisterSectionHeader
                        amount={item.amount}
                        count={item.count}
                        label={item.label}
                        tone={item.tone}
                      />
                    ) : (
                      renderRow(item.line, item.index)
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function RegisterSectionHeader({
  amount,
  count,
  label,
  tone,
}: {
  amount: number;
  count: number;
  label: string;
  tone: "safety" | "work";
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[58px_128px_minmax(340px,1.2fr)_70px_108px_112px_126px_118px_96px_130px_76px] border-b border-[var(--border-subtle)]/60 text-12px",
        tone === "safety" ? "bg-[var(--danger-soft)]" : "bg-[var(--accent-primary)]/[0.08]",
      )}
    >
      <div className="col-span-3 flex min-h-9 items-center gap-2.5 px-3 font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            tone === "safety" ? "bg-[var(--danger-base)]" : "bg-[var(--accent-primary)]",
          )}
        />
        {label}
      </div>
      <div className="col-span-5 flex items-center justify-end px-2 font-medium text-[var(--text-secondary)]">
        {count} voc{count === 1 ? "e" : "i"}
      </div>
      <div
        className={cn(
          "col-span-2 flex items-center justify-end px-2 text-13px font-black tabular-nums",
          tone === "safety" ? "text-[var(--danger-base)]" : "text-[var(--accent-primary)]",
        )}
      >
        <Currency value={amount} />
      </div>
      <div />
    </div>
  );
}

const MEASUREMENT_FACTOR_FIELDS = ["factor1", "factor2", "factor3"] as const;

function isDecimalDraft(value: string): boolean {
  return /^\d*(?:[,.]\d*)?$/.test(value.trim());
}

function formatFactorInput(value: number): string {
  if (!value) return "";
  return String(value).replace(".", ",");
}

function isMgRow(voice: SalLineView["voice"]): boolean {
  return isMgCode(voice.code);
}

function getMgTariffPrefix(voiceCode: string): string | null {
  return extractMgTariffPrefix(voiceCode);
}

function MgInlineSummary({
  lines,
  mgLines,
  onRemove,
}: {
  lines: SalLineView[];
  mgLines: SalLineView[];
  onRemove: (lineId: string) => void;
}) {
  const totalMg = mgLines.reduce((sum, line) => {
    const charge = line.linkedCharges.find((entry) => entry.code.startsWith("MG."));
    return sum + (charge?.total ?? line.totalAmount);
  }, 0);

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--info-base)]/35 bg-[var(--info-soft)] px-2 py-1.5 shadow-sm">
      <span
        className="inline-flex h-6 items-center gap-1.5 rounded-md text-10px font-black uppercase tracking-wider text-[var(--info-base)]"
        title={`Totale maggiorazioni MG: ${totalMg.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`}
      >
        <span className="flex size-5 items-center justify-center rounded bg-[var(--info-base)] text-[var(--text-inverse)]">
          <Percent className="size-3" />
        </span>
        Maggiorazioni +<Currency value={totalMg} />
      </span>
      <div className="flex max-w-[340px] items-center gap-1 overflow-hidden">
        {mgLines.slice(0, 3).map((mgLine) => {
          const prefix = getMgTariffPrefix(mgLine.voice.code);
          const affectedCount = prefix
            ? lines.filter((line) => line.voice.code.startsWith(`${prefix}.`)).length
            : lines.length;
          return (
            <button
              aria-label={`Rimuovi maggiorazione ${mgLine.voice.code}`}
              className="inline-flex h-6 max-w-[136px] items-center gap-1 rounded-md bg-[var(--surface-base)] px-2 text-10px font-black text-[var(--info-base)] shadow-sm ring-1 ring-[var(--info-base)]/25 transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
              key={mgLine.id}
              onClick={() => onRemove(mgLine.id)}
              title={`${mgLine.voice.code} su ${prefix ? `voci ${prefix}.*` : "tutte le voci"} (${affectedCount} voci). Click per rimuovere.`}
              type="button"
            >
              <span className="truncate">{mgLine.voice.code}</span>
              <span className="shrink-0">{mgLine.voice.unitPrice.toLocaleString("it-IT")}%</span>
            </button>
          );
        })}
        {mgLines.length > 3 ? (
          <span className="inline-flex h-7 items-center rounded-md bg-[var(--bg-muted)] px-2 text-10px font-semibold text-[var(--text-tertiary)]">
            +{mgLines.length - 3}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const SelectedVoiceRow = memo(function SelectedVoiceRow({
  index,
  line,
  expanded,
  isCopied,
  onCopy,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onNotesChange,
  onRemove,
  onRemoveMeasurementRow,
  onSurcharge,
  onToggle,
  onUpdateMeasurementRow,
}: {
  index: number;
  line: SalLineView;
  expanded: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onAddMeasurementRow: (lineId: string) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
  onSurcharge: (lineId: string, percent: number) => void;
  onToggle: () => void;
  onUpdateMeasurementRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
}) {
  const laborPct = line.voice.laborPercentage ?? 0;
  const isIncomplete = line.status !== "complete";

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: div[role=button] needed for grid layout, <button> can't be a grid container */}
      <div
        data-line-id={line.id}
        role="button"
        tabIndex={0}
        className={cn(
          "grid cursor-pointer grid-cols-[58px_128px_minmax(340px,1.2fr)_70px_108px_112px_126px_118px_96px_130px_76px] border-b border-l-2 border-b-[var(--border-subtle)]/40 border-l-transparent text-12px transition-colors [content-visibility:auto] [contain-intrinsic-size:72px] hover:bg-[var(--bg-muted)]/40",
          index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/30",
          expanded &&
            "border-l-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.045] ring-1 ring-inset ring-[var(--accent-primary)]/15",
          isIncomplete &&
            "bg-[var(--warning-soft)]/35 ring-1 ring-inset ring-[var(--warning-base)]/20",
        )}
        title={
          isIncomplete ? "Voce incompleta: inserisci una quantità maggiore di zero." : undefined
        }
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle();
        }}
      >
        <GridCell muted>
          <button
            type="button"
            aria-label={`${expanded ? "Comprimi" : "Espandi"} dettagli ${line.voice.code}`}
            className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronDown className={cn("size-4 transition-transform", !expanded && "-rotate-90")} />
            <span className="text-11px font-bold tabular-nums text-[var(--text-secondary)]">
              {index + 1}
            </span>
          </button>
        </GridCell>
        <GridCell strong title={line.voice.code}>
          <span className="truncate text-13px font-bold text-[var(--text-primary)]">
            {line.voice.code}
          </span>
        </GridCell>
        <GridCell>
          <div className="flex min-w-0 items-start gap-1.5">
            <span className="min-w-0 flex-1">
              <div className="whitespace-normal break-words text-13px font-semibold leading-snug text-[var(--text-primary)]">
                {line.voice.description}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="truncate text-11px font-medium text-[var(--text-secondary)]">
                  {line.voice.category}
                </span>
                {laborPct > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-primary)]/10 px-2 py-0.5 text-10px font-bold text-[var(--accent-primary)]">
                    <span className="size-1.5 rounded-full bg-[var(--accent-primary)]" />
                    Man. {laborPct}%
                  </span>
                ) : null}
                {line.voice.isSafetyCost ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--danger-soft)] px-2 py-0.5 text-10px font-bold text-[var(--danger-base)]">
                    OS
                  </span>
                ) : null}
                {isIncomplete ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--warning-soft)] px-2 py-0.5 text-10px font-bold text-[var(--warning-base)]">
                    Da completare
                  </span>
                ) : null}
              </div>
            </span>
          </div>
        </GridCell>
        <GridCell muted>
          <span className="text-11px font-semibold text-[var(--text-secondary)]">
            {line.voice.unit}
          </span>
        </GridCell>
        <GridCell align="right">
          <span className="text-12px font-semibold tabular-nums text-[var(--text-secondary)]">
            <Currency value={line.voice.unitPrice} />
          </span>
        </GridCell>
        <GridCell align="right" strong>
          <span className="text-13px font-bold tabular-nums text-[var(--text-primary)]">
            <NumberValue value={line.quantity} />
          </span>
        </GridCell>
        <GridCell align="right" strong>
          <span className="text-13px font-bold tabular-nums text-[var(--text-primary)]">
            <Currency value={line.grossAmount} />
          </span>
        </GridCell>
        <GridCell align="right">
          <span
            className={cn(
              "text-12px font-semibold tabular-nums",
              line.discountAmount > 0 ? "text-[var(--danger-base)]" : "text-[var(--text-tertiary)]",
            )}
            title={
              line.voice.isSafetyCost && line.discountAmount === 0
                ? "Voce OS esclusa dal ribasso"
                : "Ribasso gara applicato alla voce"
            }
          >
            {line.discountAmount > 0 ? "-" : ""}
            <Currency value={line.discountAmount} />
          </span>
        </GridCell>
        <GridCell align="right" editable>
          <input
            aria-label={`Maggiorazione % per ${line.voice.code}`}
            className="h-8 w-full rounded-none border-0 bg-transparent px-1.5 text-right text-12px font-bold text-[var(--text-primary)] outline-none transition focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-inset focus:ring-[var(--ring-focus)]"
            inputMode="decimal"
            onChange={(event) => {
              const raw = event.target.value.replace(",", ".");
              if (raw === "") {
                onSurcharge(line.id, 0);
                return;
              }
              const val = Number.parseFloat(raw);
              if (Number.isFinite(val) && val >= 0) {
                onSurcharge(line.id, val);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="%"
            type="text"
            value={line.surchargePercent || ""}
          />
        </GridCell>
        <GridCell align="right" strong>
          <span className="text-14px font-black tabular-nums text-[var(--accent-primary)]">
            <Currency value={line.totalAmount} />
          </span>
        </GridCell>
        <GridCell align="center">
          <div className="flex items-center justify-center gap-1">
            <m.button
              aria-label={isCopied ? "Copiata" : "Copia voce"}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-all",
                isCopied
                  ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              type="button"
              title={isCopied ? "Voce copiata - premi Ctrl+V per incollare" : "Copia voce"}
              transition={{ duration: 0.42, ease: SPRING_EASE }}
            >
              {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </m.button>
            <m.button
              aria-label={`Rimuovi ${line.voice.code}`}
              className="flex size-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(line.id);
              }}
              type="button"
              transition={{ duration: 0.42, ease: SPRING_EASE }}
            >
              <Trash2 className="size-3.5" />
            </m.button>
          </div>
        </GridCell>
      </div>
      {expanded ? (
        <div
          className={cn(
            "border-b border-[var(--border-subtle)]/30 px-3 py-2.5",
            index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/15",
          )}
        >
          <div className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)]">
            <div className="border-r border-[var(--border-subtle)]/40" />
            <div className="min-w-0 pl-3">
              <MeasurementRowsTable
                lineId={line.id}
                voiceCode={line.voice.code}
                voiceDescription={line.voice.description}
                rows={line.measurementRows}
                unit={line.voice.unit}
                totalQuantity={line.quantity}
                onAddRow={onAddMeasurementRow}
                onRemoveRow={onRemoveMeasurementRow}
                onDuplicateRow={onDuplicateMeasurementRow}
                onUpdateRow={onUpdateMeasurementRow}
              />
            </div>
          </div>
          <VoiceNotes
            lineId={line.id}
            linkedCharges={line.linkedCharges}
            notes={line.notes}
            onNotesChange={onNotesChange}
          />
        </div>
      ) : null}
    </>
  );
});

function MeasurementRowsTable({
  lineId,
  voiceCode,
  voiceDescription,
  rows,
  unit,
  totalQuantity,
  onAddRow,
  onRemoveRow,
  onDuplicateRow,
  onUpdateRow,
}: {
  lineId: string;
  voiceCode: string;
  voiceDescription: string;
  rows: SalMeasurementRowDraft[];
  unit: string;
  totalQuantity: number;
  onAddRow: (lineId: string) => void;
  onRemoveRow: (lineId: string, measurementId: string) => void;
  onDuplicateRow: (lineId: string, measurementId: string) => void;
  onUpdateRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
}) {
  const hasMultipleRows = rows.length > 1;
  const lastRow = rows[rows.length - 1];
  const [factorDrafts, setFactorDrafts] = useState<Record<string, string>>({});
  const COLS =
    "grid-cols-[142px_112px_minmax(220px,1.2fr)_74px_74px_74px_104px_minmax(160px,0.85fr)_72px]";

  useEffect(() => {
    setFactorDrafts((current) => {
      const validKeys = new Set<string>();
      for (const row of rows) {
        for (const field of MEASUREMENT_FACTOR_FIELDS) {
          validKeys.add(`${row.id}:${row.order}:${field}`);
        }
      }
      const next = Object.fromEntries(
        Object.entries(current).filter(([key]) => validKeys.has(key)),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [rows]);

  return (
    <div className="min-w-0">
      <div className="overflow-hidden bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/55">
        <div className="grid gap-3 border-b border-[var(--border-subtle)]/50 bg-[var(--bg-muted)]/18 px-3 py-1.5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-10px font-black uppercase tracking-wider text-[var(--text-tertiary)]">
                Libretto misure
              </span>
              <span className="rounded-sm bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-11px font-bold text-[var(--text-secondary)]">
                {voiceCode}
              </span>
              <span className="min-w-0 truncate text-12px font-semibold text-[var(--text-primary)]">
                {voiceDescription}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-10px text-[var(--text-tertiary)]">
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {rows.length} rig{rows.length === 1 ? "a" : "he"}
              </span>
              <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
              <span>
                Totale {totalQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })} {unit}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lastRow ? (
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-subtle)]/60 bg-[var(--surface-base)] px-2.5 text-11px font-bold text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                onClick={() =>
                  onDuplicateRow(lineId, buildMeasurementTarget(lastRow.id, rows.length - 1))
                }
                type="button"
              >
                <Copy className="size-3.5" />
                Duplica ultima
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className={`grid min-w-[1010px] ${COLS} bg-[var(--bg-muted)]/35 text-10px font-black uppercase tracking-wider text-[var(--text-secondary)]`}
          >
            {["Data", "Stazione", "Descrizione", "F1", "F2", "F3", "Parziale", "Note", ""].map(
              (label) => (
                <div
                  className="border-r border-[var(--border-subtle)]/40 px-2 py-2 last:border-r-0"
                  key={label || "actions"}
                >
                  {label}
                </div>
              ),
            )}
          </div>

          {rows.length === 0 ? (
            <div className="grid min-w-[1010px] grid-cols-1 border-t border-[var(--border-subtle)]/30 bg-[var(--surface-base)]">
              <div className="px-3 py-4 text-center text-11px text-[var(--text-tertiary)]">
                Nessuna riga misura. Aggiungi la prima riga per iniziare.
              </div>
            </div>
          ) : (
            rows.map((row, rowIndex) => {
              const rowTarget = buildMeasurementTarget(row.id, rowIndex);
              return (
                <div
                  className={`grid min-w-[1010px] ${COLS} border-t border-[var(--border-subtle)]/30 bg-[var(--surface-base)] text-11px font-medium transition-colors hover:bg-[var(--accent-primary)]/[0.025]`}
                  key={`${row.id}-${row.order}`}
                >
                  <div className="border-r border-[var(--border-subtle)]/40 px-2 py-2">
                    <input
                      aria-label="Data misura"
                      className="sal-date-input h-9 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/25 px-2 text-12px font-medium text-[var(--text-primary)] outline-none transition [color-scheme:light] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)] dark:[color-scheme:dark]"
                      onChange={(e) => onUpdateRow(lineId, rowTarget, { date: e.target.value })}
                      type="date"
                      value={row.date}
                    />
                  </div>
                  <div className="border-r border-[var(--border-subtle)]/40 px-2 py-2">
                    <input
                      aria-label="Stazione"
                      className="h-9 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/25 px-2.5 text-12px font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                      onChange={(e) => onUpdateRow(lineId, rowTarget, { station: e.target.value })}
                      placeholder="Stazione"
                      value={row.station ?? ""}
                    />
                  </div>
                  <div className="border-r border-[var(--border-subtle)]/40 px-2 py-2">
                    <input
                      aria-label="Descrizione misura"
                      className="h-9 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/25 px-2.5 text-12px font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                      onChange={(e) =>
                        onUpdateRow(lineId, rowTarget, { description: e.target.value })
                      }
                      placeholder="Descrizione"
                      value={row.description}
                    />
                  </div>
                  {MEASUREMENT_FACTOR_FIELDS.map((field) => {
                    const draftKey = `${row.id}:${row.order}:${field}`;
                    return (
                      <div
                        className="border-r border-[var(--border-subtle)]/40 px-2 py-2"
                        key={draftKey}
                      >
                        <input
                          aria-label={field}
                          className="h-9 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/25 px-2 text-right font-mono text-12px font-semibold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          inputMode="decimal"
                          onBlur={() => {
                            setFactorDrafts((current) => {
                              const { [draftKey]: _removed, ...next } = current;
                              return next;
                            });
                          }}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!isDecimalDraft(raw)) return;
                            setFactorDrafts((current) => ({ ...current, [draftKey]: raw }));
                            const normalized = raw.replace(",", ".");
                            const val = normalized === "" ? 0 : Number.parseFloat(normalized);
                            if (Number.isFinite(val)) {
                              onUpdateRow(lineId, rowTarget, { [field]: val });
                            }
                          }}
                          value={factorDrafts[draftKey] ?? formatFactorInput(row[field])}
                        />
                      </div>
                    );
                  })}
                  <div className="border-r border-[var(--border-subtle)]/40 px-2 py-2 text-right font-mono font-bold tabular-nums text-[var(--text-primary)]">
                    <span className="flex h-9 items-center justify-end rounded-md bg-[var(--accent-primary)]/[0.08] px-2.5 text-12px font-bold text-[var(--accent-primary)]">
                      {row.partialQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
                    </span>
                  </div>
                  <div className="border-r border-[var(--border-subtle)]/40 px-2 py-2">
                    <input
                      aria-label="Note riga"
                      className="h-9 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/25 px-2.5 text-12px font-medium text-[var(--text-secondary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                      onChange={(e) => onUpdateRow(lineId, rowTarget, { notes: e.target.value })}
                      placeholder="Note"
                      value={row.notes}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 px-1.5 py-1.5">
                    <button
                      aria-label="Duplica riga"
                      className="flex size-8 items-center justify-center rounded-md border border-[var(--border-subtle)]/45 bg-[var(--surface-base)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => onDuplicateRow(lineId, rowTarget)}
                      type="button"
                    >
                      <Copy className="size-3" />
                    </button>
                    <button
                      aria-label="Elimina riga"
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md transition-colors",
                        hasMultipleRows
                          ? "border border-[var(--border-subtle)]/45 bg-[var(--surface-base)] text-[var(--text-secondary)] shadow-sm hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                          : "cursor-not-allowed text-[var(--text-tertiary)] opacity-35",
                      )}
                      disabled={!hasMultipleRows}
                      onClick={() => onRemoveRow(lineId, rowTarget)}
                      type="button"
                      title={
                        hasMultipleRows
                          ? "Elimina riga"
                          : "Il libretto deve mantenere almeno una riga"
                      }
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <button
            className={`grid min-w-[1010px] ${COLS} border-t border-dashed border-[var(--border-subtle)]/55 bg-transparent text-left text-11px font-semibold text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent-primary)]/35 hover:text-[var(--accent-primary)]`}
            onClick={() => onAddRow(lineId)}
            type="button"
          >
            <div />
            <div className="col-span-8 flex items-center gap-2 px-2 py-2">
              <Plus className="size-3.5" />
              <span>Nuova riga misura</span>
            </div>
          </button>

          <div
            className={`grid min-w-[1010px] ${COLS} border-t border-[var(--border-subtle)]/30 bg-[var(--accent-primary)]/[0.06] text-11px font-bold`}
          >
            <div className="col-span-6 px-2 py-2 text-right text-[var(--text-tertiary)]">
              sommano {unit}
            </div>
            <div className="px-2 py-2 text-right font-mono tabular-nums text-[var(--accent-primary)]">
              {totalQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
            </div>
            <div />
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceNotes({
  lineId,
  linkedCharges,
  notes,
  onNotesChange,
}: {
  lineId: string;
  linkedCharges: { code: string; total: number }[];
  notes: string;
  onNotesChange: (lineId: string, notes: string) => void;
}) {
  const linkedTotal = linkedCharges.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="mt-2 rounded-lg bg-[var(--surface-base)] p-2.5 ring-1 ring-[var(--border-subtle)]/50">
      <label className="block">
        <span className="mb-2 block text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Note della voce principale
        </span>
        <textarea
          className="min-h-[52px] w-full resize-y rounded-lg border border-[var(--border-subtle)]/50 bg-[var(--bg-muted)]/25 px-3 py-2 text-12px leading-snug text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          placeholder={
            linkedTotal > 0
              ? `Annota criterio maggiorazioni: ${linkedTotal.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`
              : "Aggiungi note della voce, riferimenti o riserve..."
          }
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(lineId, e.target.value)}
        />
      </label>
    </div>
  );
}

function GridCell({
  align = "left",
  children,
  editable,
  muted,
  strong,
  title,
}: {
  align?: "center" | "left" | "right";
  children: ReactNode;
  editable?: boolean;
  muted?: boolean;
  strong?: boolean;
  title?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center border-r border-[var(--border-subtle)]/40 px-2.5 py-1.5 last:border-r-0",
        align === "center" && "justify-center text-center",
        align === "right" && "justify-end text-right tabular-nums",
        editable && "bg-[var(--bg-muted)]/25",
        muted && "text-[var(--text-tertiary)]",
        strong && "font-semibold text-[var(--text-primary)]",
      )}
      title={title}
    >
      {children}
    </div>
  );
}

export function AccountingRows({ lines }: { lines: SalLineView[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(lines[0]?.id ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    estimateSize: (index) => {
      const line = lines[index];
      return expandedId === line?.id ? 280 : 48;
    },
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--bg-muted)]/30">
        <EmptyTableState message="Il registro SAL apparirà quando avrai selezionato almeno una voce tariffaria." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-[var(--bg-muted)]/30">
      <div className="min-w-[1100px]">
        <div className="sticky top-0 z-10 grid grid-cols-[44px_150px_105px_minmax(240px,1fr)_70px_118px_118px_112px_118px_60px_36px] gap-3 bg-[var(--surface-base)] p-3 text-xs font-semibold text-secondary shadow-[0_10px_24px_color-mix(in_srgb,var(--text-primary)_3%,transparent)]">
          <span />
          <span>Tariffario</span>
          <span>Codice</span>
          <span>Descrizione voce</span>
          <span>U.M.</span>
          <span>Quantità totale</span>
          <span>Totale voci</span>
          <span>Sconto</span>
          <span>Totale SAL</span>
          <span>Stato</span>
          <span />
        </div>
        <div ref={scrollRef} style={{ height: "600px", overflow: "auto" }}>
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const line = lines[virtualRow.index];
              if (!line) return null;
              const expanded = expandedId === line.id;
              return (
                <div
                  className="absolute left-0 right-0 border-t border-[var(--border-subtle)]/30"
                  data-index={virtualRow.index}
                  key={line.id}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <m.button
                    aria-expanded={expanded}
                    className="grid w-full grid-cols-[44px_150px_105px_minmax(240px,1fr)_70px_118px_118px_112px_118px_60px_36px] items-center p-3 text-left text-13px hover:bg-[var(--bg-muted)]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => setExpandedId(expanded ? null : line.id)}
                    type="button"
                    transition={{ duration: 0.42, ease: SPRING_EASE }}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 text-[var(--accent-primary)] transition-transform",
                        !expanded && "-rotate-90",
                      )}
                    />
                    <span>{line.voice.tariffBookName}</span>
                    <span>{line.voice.code}</span>
                    <span className="font-semibold">{line.voice.description}</span>
                    <span>{line.voice.unit}</span>
                    <span className="font-semibold">
                      <NumberValue value={line.quantity} />
                    </span>
                    <span className="font-semibold">
                      <Currency value={line.grossAmount} />
                    </span>
                    <span className="font-semibold text-[var(--danger-base)]">
                      -<Currency value={line.discountAmount} />
                    </span>
                    <span className="font-bold text-[var(--accent-primary)]">
                      <Currency value={line.totalAmount} />
                    </span>
                    <StatusPill tone={line.status === "complete" ? "success" : "warning"}>
                      {line.status === "complete" ? "Completa" : "Da completare"}
                    </StatusPill>
                    <MoreHorizontal className="size-5 text-[var(--text-tertiary)]" />
                  </m.button>
                  {expanded ? (
                    <div className="grid gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/15 p-3 lg:grid-cols-[1.25fr_1fr]">
                      <NestedTable
                        columns={["Descrizione", "U.M.", "F1", "F2", "F3", "Qtà", "Note"]}
                        title="Misure"
                      >
                        {line.measurementRows.length === 0 ? (
                          <tr>
                            <td className="p-3 text-[var(--text-tertiary)]" colSpan={7}>
                              Nessuna misura inserita.
                            </td>
                          </tr>
                        ) : (
                          line.measurementRows.map((row) => (
                            <tr className="border-t border-[var(--border-subtle)]/30" key={row.id}>
                              <td className="px-3 py-2">{row.description}</td>
                              <td className="px-3 py-2">{row.unit}</td>
                              <td className="px-3 py-2 text-right">
                                {row.factor1.toLocaleString("it-IT")}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {row.factor2.toLocaleString("it-IT")}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {row.factor3.toLocaleString("it-IT")}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                {row.partialQuantity.toLocaleString("it-IT")}
                              </td>
                              <td className="px-3 py-2">{row.notes}</td>
                            </tr>
                          ))
                        )}
                      </NestedTable>
                      <NestedTable
                        columns={["Codice", "Tipo", "Base", "%", "Importo"]}
                        title="Collegate"
                      >
                        {line.linkedCharges.length === 0 ? (
                          <tr>
                            <td className="p-3 text-[var(--text-tertiary)]" colSpan={5}>
                              Nessuna maggiorazione attiva.
                            </td>
                          </tr>
                        ) : (
                          line.linkedCharges.map((charge) => (
                            <tr
                              className="border-t border-[var(--border-subtle)]/30"
                              key={charge.id}
                            >
                              <td className="px-3 py-2">{charge.code}</td>
                              <td className="px-3 py-2">{charge.description}</td>
                              <td className="px-3 py-2 text-right">
                                <Currency value={charge.baseAmount} />
                              </td>
                              <td className="px-3 py-2 text-right">
                                {charge.percent.toLocaleString("it-IT")} %
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                <Currency value={charge.total} />
                              </td>
                            </tr>
                          ))
                        )}
                      </NestedTable>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const DOC_PREVIEW_EMPTY_LINES: SalLineView[] = [];

export function DocumentPreview({
  compact = false,
  lines = DOC_PREVIEW_EMPTY_LINES,
  summary,
}: {
  compact?: boolean;
  lines?: SalLineView[];
  summary?: SalEconomicSummary;
}) {
  const grossTotal = summary?.grossAmount ?? lines.reduce((sum, line) => sum + line.grossAmount, 0);
  const discountTotal =
    summary?.discountAmount ?? lines.reduce((sum, line) => sum + line.discountAmount, 0);
  const mgTotal = lines.reduce(
    (sum, line) =>
      sum +
      line.linkedCharges.filter((c) => c.code.startsWith("MG.")).reduce((s, c) => s + c.total, 0),
    0,
  );
  const surchargeTotal = lines.reduce(
    (sum, line) =>
      sum +
      line.linkedCharges.filter((c) => !c.code.startsWith("MG.")).reduce((s, c) => s + c.total, 0),
    0,
  );
  const hasMg = mgTotal > 0;
  const hasSurcharges = surchargeTotal > 0;
  const total = summary?.total ?? lines.reduce((sum, line) => sum + line.totalAmount, 0);
  const maxLines = compact ? 4 : 7;
  const truncated = lines.length > maxLines;

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/50">
      {/* Receipt header */}
      <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--accent-primary)]/[0.02] px-4 py-2.5">
        <div className="text-10px font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
          Libretto delle misure
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-12px font-bold text-[var(--text-primary)]">
            Stato Avanzamento Lavori
          </span>
          <span className="text-10px text-[var(--text-tertiary)]">
            {lines.length} voci ·{" "}
            {total.toLocaleString("it-IT", {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {/* Receipt items */}
      <div className="divide-y divide-[var(--border-subtle)]/20">
        {lines.length === 0 ? (
          <div className="px-4 py-6 text-center text-12px text-[var(--text-tertiary)]">
            Anteprima dopo l'inserimento delle voci.
          </div>
        ) : (
          <>
            {lines.slice(0, maxLines).map((line, idx) => (
              <div key={line.id} className="flex items-center gap-3 px-4 py-1.5 text-11px">
                <span className="w-5 shrink-0 text-right text-[var(--text-tertiary)]">
                  {idx + 1}
                </span>
                <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="shrink-0 font-medium text-[var(--text-primary)]">
                    {line.voice.code}
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="truncate text-[var(--text-tertiary)]">
                    {line.voice.description}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-2 text-right tabular-nums">
                  <span className="text-[var(--text-tertiary)]">
                    {line.quantity.toLocaleString("it-IT")} {line.voice.unit}
                  </span>
                  <span className="w-20 font-semibold text-[var(--text-primary)]">
                    {line.totalAmount.toLocaleString("it-IT", {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            ))}
            {truncated && (
              <div className="px-4 py-1.5 text-center text-10px text-[var(--text-tertiary)]">
                + altre {lines.length - maxLines} voci
              </div>
            )}
          </>
        )}
      </div>

      {/* Receipt footer — matches equation layout */}
      <div className="border-t border-[var(--border-subtle)]/40 bg-[var(--accent-primary)]/[0.01] px-4 py-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-11px text-[var(--text-tertiary)]">
            <span>Voci lordo</span>
            <span className="tabular-nums font-semibold text-[var(--text-primary)]">
              {grossTotal.toLocaleString("it-IT", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          {hasMg && (
            <div className="flex items-center justify-between text-11px text-[var(--info-base)]">
              <span>+ Maggiorazioni MG</span>
              <span className="tabular-nums font-semibold">
                +
                {mgTotal.toLocaleString("it-IT", {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          {hasSurcharges && (
            <div className="flex items-center justify-between text-11px text-[var(--info-base)]">
              <span>+ Maggiorazioni su manodopera</span>
              <span className="tabular-nums font-semibold">
                +
                {surchargeTotal.toLocaleString("it-IT", {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>
        {hasMg || hasSurcharges ? (
          <div className="mt-1 flex items-center justify-between border-t border-[var(--border-subtle)]/30 pt-1 text-12px font-bold text-[var(--accent-primary)]">
            <span>= Totale con maggiorazioni</span>
            <span className="tabular-nums">
              {(grossTotal + mgTotal + surchargeTotal).toLocaleString("it-IT", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        ) : null}
        {discountTotal > 0 && (
          <div className="mt-1 flex items-center justify-between text-11px text-[var(--danger-base)]">
            <span>- Ribasso gara</span>
            <span className="tabular-nums font-semibold">
              -
              {discountTotal.toLocaleString("it-IT", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-[var(--border-subtle)]/30 pt-1.5 text-13px font-black text-[var(--accent-primary)]">
          <span>= Totale netto SAL</span>
          <span className="tabular-nums">
            {total.toLocaleString("it-IT", {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BreakdownDetails({
  lineViews,
  economicRules,
}: {
  lineViews: SalLineView[];
  economicRules: SalEconomicRules;
}) {
  const voiceCountByPrefix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of lineViews) {
      const prefix = line.voice.code.split(".")[0] ?? "";
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
    return counts;
  }, [lineViews]);

  const mgEntries = lineViews.flatMap((line) =>
    line.linkedCharges
      .filter((c) => c.code.startsWith("MG."))
      .map((c) => {
        const tariffPrefix = c.code.replace("MG.", "");
        const voiceCount =
          tariffPrefix === "ALL"
            ? lineViews.filter((v) => v.linkedCharges.length === 0).length
            : (voiceCountByPrefix.get(tariffPrefix) ?? 0);
        return {
          code: c.code,
          description: c.description,
          percent: c.percent,
          baseAmount: c.baseAmount,
          total: c.total,
          tariffLabel: tariffPrefix === "ALL" ? "tutte le voci" : `solo voci ${tariffPrefix}`,
          voiceCount,
        };
      }),
  );

  const discountAmount = lineViews.reduce((s, l) => s + l.discountAmount, 0);
  const discountableAmount = lineViews.reduce(
    (s, l) => s + (l.voice.isSafetyCost ? 0 : l.netAmount),
    0,
  );
  const discountedVoiceCount = lineViews.filter((l) => l.discountAmount > 0).length;
  const hasMg = mgEntries.length > 0;
  const hasDiscount = discountAmount > 0;

  if (!hasMg && !hasDiscount) return null;

  return (
    <div className="rounded-xl bg-[var(--surface-base)]/80 ring-1 ring-[var(--border-subtle)]/50">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]/40 px-4 py-3">
        <span className="text-11px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Riepilogo economico
        </span>
      </div>
      <div className="grid gap-px bg-[var(--border-subtle)]/30 md:grid-cols-2">
        {hasMg
          ? mgEntries.map((entry) => (
              <div
                className="flex flex-col justify-center bg-[var(--surface-base)] px-4 py-3"
                key={entry.code}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--info-base)]/10 text-12px font-bold text-[var(--info-base)]">
                      MG
                    </span>
                    <span className="truncate text-12px font-semibold text-[var(--text-primary)]">
                      {entry.percent.toLocaleString("it-IT")}% — {entry.tariffLabel}
                    </span>
                  </div>
                  <span className="shrink-0 text-13px font-bold text-[var(--info-base)]">
                    +<Currency value={entry.total} />
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-8 text-11px text-[var(--text-tertiary)]">
                  <span>
                    su <Currency value={entry.baseAmount} />
                  </span>
                  <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
                  <span>{entry.voiceCount} voci</span>
                </div>
              </div>
            ))
          : null}
        {hasDiscount ? (
          <div className="flex flex-col justify-center bg-[var(--surface-base)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--danger-base)]/10 text-12px font-bold text-[var(--danger-base)]">
                  %
                </span>
                <span className="truncate text-12px font-semibold text-[var(--text-primary)]">
                  Ribasso {economicRules.discountPercent.toLocaleString("it-IT")}%
                </span>
              </div>
              <span className="shrink-0 text-13px font-bold text-[var(--danger-base)]">
                -<Currency value={discountAmount} />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 pl-8 text-11px text-[var(--text-tertiary)]">
              <span>
                su <Currency value={discountableAmount} />
              </span>
              <span className="size-1 rounded-full bg-[var(--border-subtle)]" />
              <span>{discountedVoiceCount} voci</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OutputRow({
  disabled,
  icon,
  label,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-3.5",
        disabled && "opacity-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      <span className="hidden text-xs font-medium text-[var(--success-base)] md:inline">
        {disabled ? "Non disponibile" : "Pronto per export"}
      </span>
      <Download className="size-4 text-[var(--text-tertiary)]" />
    </div>
  );
}

function NestedTable({
  children,
  columns,
  title,
}: {
  children: ReactNode;
  columns: string[];
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)]">
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-13px font-bold text-[var(--text-primary)]">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-12px">
          <thead className="bg-[var(--bg-muted)]/30 text-[var(--text-tertiary)]">
            <tr>
              {columns.map((col) => (
                <th className="px-3 py-2 font-semibold" key={col}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyTableState({ message }: { message: string }) {
  return (
    <div className="border-t border-[var(--border-subtle)] px-4 py-8 text-center text-13px text-[var(--text-tertiary)]">
      {message}
    </div>
  );
}
