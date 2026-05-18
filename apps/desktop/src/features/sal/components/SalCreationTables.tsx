import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import { Check, ChevronDown, Copy, Download, MoreHorizontal, Percent, Trash2 } from "lucide-react";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import { Currency } from "@/components/shared/Currency";
import { DragDropReorder } from "@/components/shared/DragDropReorder";
import { SPRING_EASE } from "@/motion";
import { InlineEdit } from "@/components/shared/InlineEdit";
import { StatusPill } from "@/components/shared/StatusPill";

export { Currency };

import { cn } from "@/lib/utils";
import type { SalEconomicRules, SalEconomicSummary, SalLineDraft, SalLineView } from "../types";

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
  onFactorChange,
  onNotesChange,
  onRemove,
  onReorder,
  onSurcharge,
}: {
  lines: SalLineView[];
  copiedVoiceId: string | null;
  onCopyLine: (lineId: string) => void;
  onFactorChange: (lineId: string, field: "factor1" | "factor2" | "factor3", value: number) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onReorder: (lines: SalLineDraft[]) => void;
  onSurcharge: (lineId: string, percent: number) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const hasExpandedRows = expandedRows.size > 0;
  const VIRTUAL_THRESHOLD = 24;
  const hasSafetySection = safetyLines.length > 0;
  const useVirtual = tableLines.length > VIRTUAL_THRESHOLD && !hasExpandedRows && !hasSafetySection;

  const rowVirtualizer = useVirtualizer({
    count: tableLines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 58,
    overscan: 5,
  });

  const handleToggleRow = (lineId: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const handleReorderVisibleLines = (orderedVisibleLines: SalLineDraft[]) => {
    const orderedVisibleIds = new Set(orderedVisibleLines.map((line) => line.id));
    const hiddenMgLines = lines.filter((line) => isMgRow(line.voice));
    const remainingLines = lines.filter(
      (line) => !orderedVisibleIds.has(line.id) && !isMgRow(line.voice),
    );
    onReorder([...orderedVisibleLines, ...remainingLines, ...hiddenMgLines]);
  };

  const handleReorderWorkLines = (orderedWorkLines: SalLineDraft[]) => {
    const hiddenMgLines = lines.filter((line) => isMgRow(line.voice));
    onReorder([...orderedWorkLines, ...safetyLines, ...hiddenMgLines]);
  };

  const handleReorderSafetyLines = (orderedSafetyLines: SalLineDraft[]) => {
    const hiddenMgLines = lines.filter((line) => isMgRow(line.voice));
    onReorder([...workLines, ...orderedSafetyLines, ...hiddenMgLines]);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/70">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_62%,var(--surface-base)_38%)] px-3 py-2">
        <div className="min-w-0">
          <div className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Registro misure
          </div>
          <div className="mt-0.5 text-12px font-medium text-[var(--text-secondary)]">
            {lines.length === 0
              ? "Nessuna voce inserita"
              : `${tableLines.length} voc${tableLines.length === 1 ? "e" : "i"} misurabil${tableLines.length === 1 ? "e" : "i"}${
                  mgLines.length > 0
                    ? ` · ${mgLines.length} maggiorazion${mgLines.length === 1 ? "e" : "i"} MG`
                    : ""
                }${safetyLines.length > 0 ? ` · ${safetyLines.length} OS` : ""}`}
          </div>
        </div>
        <div className="hidden items-center gap-2 text-11px font-semibold text-[var(--text-secondary)] md:flex">
          <span className="rounded-md bg-[var(--surface-base)] px-2 py-1 ring-1 ring-[var(--border-subtle)]">
            Celle editabili
          </span>
          <span className="rounded-md bg-[var(--surface-base)] px-2 py-1 ring-1 ring-[var(--border-subtle)]">
            Ctrl+C / Ctrl+V
          </span>
        </div>
      </div>

      {mgLines.length > 0 ? (
        <MgChargesPanel lines={tableLines} mgLines={mgLines} onRemove={onRemove} />
      ) : null}

      <div className="overflow-x-auto">
        <div ref={scrollRef} className="max-h-[620px] overflow-y-auto">
          <div className="min-w-[1460px]">
            <div className="sticky top-0 z-20 grid grid-cols-[58px_128px_minmax(340px,1.2fr)_70px_108px_112px_126px_118px_96px_130px_76px] border-b border-[var(--border-subtle)] bg-[var(--surface-base)] text-10px font-semibold uppercase tracking-0_12em text-[var(--text-secondary)] shadow-[0_8px_18px_color-mix(in_srgb,var(--text-primary)_6%,transparent)]">
              {[
                { label: "N.", dragSpace: !useVirtual },
                { label: "Codice voce" },
                { label: "Voce / categoria" },
                { label: "UM" },
                { label: "Prezzo unit." },
                { label: "Qtà calc." },
                { label: "Importo lordo" },
                { label: "Ribasso" },
                { label: "Magg. man." },
                { label: "Netto SAL" },
                { label: "Azioni" },
              ].map((col) => {
                const label = col.label;
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
                      "flex min-h-9 items-center border-r border-[var(--border-subtle)]/70 px-2 last:border-r-0",
                      isRight && "justify-end text-right",
                      col.dragSpace && "pl-7",
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
                <p className="max-w-md text-13px leading-5 text-[var(--text-secondary)]">
                  La griglia si popola come un foglio misure: fattori, maggiorazione, note e totali
                  restano modificabili in riga.
                </p>
              </div>
            ) : useVirtual ? (
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const line = tableLines[virtualRow.index];
                  if (!line) return null;
                  return (
                    <div
                      key={line.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <SelectedVoiceRow
                        index={virtualRow.index}
                        line={line}
                        expanded={expandedRows.has(line.id)}
                        isCopied={copiedVoiceId === line.id}
                        onCopy={() => onCopyLine(line.id)}
                        onFactorChange={onFactorChange}
                        onNotesChange={onNotesChange}
                        onRemove={onRemove}
                        onSurcharge={onSurcharge}
                        onToggle={() => handleToggleRow(line.id)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : hasSafetySection ? (
              <>
                <RegisterSectionHeader
                  amount={workLines.reduce((sum, line) => sum + line.totalAmount, 0)}
                  count={workLines.length}
                  label="Lavori soggetti a ribasso"
                  tone="work"
                />
                <DragDropReorder
                  items={workLines}
                  onReorder={handleReorderWorkLines}
                  renderItem={(line: SalLineView, index: number) => (
                    <SelectedVoiceRow
                      index={index}
                      key={line.id}
                      line={line}
                      expanded={expandedRows.has(line.id)}
                      isCopied={copiedVoiceId === line.id}
                      onCopy={() => onCopyLine(line.id)}
                      onFactorChange={onFactorChange}
                      onNotesChange={onNotesChange}
                      onRemove={onRemove}
                      onSurcharge={onSurcharge}
                      onToggle={() => handleToggleRow(line.id)}
                    />
                  )}
                  uniqueId={(line: SalLineView) => line.id}
                />
                <RegisterSectionHeader
                  amount={safetyLines.reduce((sum, line) => sum + line.totalAmount, 0)}
                  count={safetyLines.length}
                  label="Voci OS non soggette a ribasso"
                  tone="safety"
                />
                <DragDropReorder
                  items={safetyLines}
                  onReorder={handleReorderSafetyLines}
                  renderItem={(line: SalLineView, index: number) => (
                    <SelectedVoiceRow
                      index={workLines.length + index}
                      key={line.id}
                      line={line}
                      expanded={expandedRows.has(line.id)}
                      isCopied={copiedVoiceId === line.id}
                      onCopy={() => onCopyLine(line.id)}
                      onFactorChange={onFactorChange}
                      onNotesChange={onNotesChange}
                      onRemove={onRemove}
                      onSurcharge={onSurcharge}
                      onToggle={() => handleToggleRow(line.id)}
                    />
                  )}
                  uniqueId={(line: SalLineView) => line.id}
                />
              </>
            ) : (
              <DragDropReorder
                items={tableLines}
                onReorder={handleReorderVisibleLines}
                renderItem={(line: SalLineView, index: number) => (
                  <SelectedVoiceRow
                    index={index}
                    key={line.id}
                    line={line}
                    expanded={expandedRows.has(line.id)}
                    isCopied={copiedVoiceId === line.id}
                    onCopy={() => onCopyLine(line.id)}
                    onFactorChange={onFactorChange}
                    onNotesChange={onNotesChange}
                    onRemove={onRemove}
                    onSurcharge={onSurcharge}
                    onToggle={() => handleToggleRow(line.id)}
                  />
                )}
                uniqueId={(line: SalLineView) => line.id}
              />
            )}
          </div>
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
        "grid grid-cols-[58px_128px_minmax(340px,1.2fr)_70px_108px_112px_126px_118px_96px_130px_76px] border-b border-[var(--border-subtle)]/70 text-11px",
        tone === "safety"
          ? "bg-[color-mix(in_srgb,var(--danger-soft)_30%,var(--surface-base)_70%)]"
          : "bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--surface-base)_94%)]",
      )}
    >
      <div className="col-span-3 flex min-h-10 items-center gap-2 px-3 font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            tone === "safety" ? "bg-[var(--danger-base)]" : "bg-[var(--accent-primary)]",
          )}
        />
        {label}
      </div>
      <div className="col-span-5 flex items-center justify-end px-2 text-[var(--text-secondary)]">
        {count} voc{count === 1 ? "e" : "i"}
      </div>
      <div
        className={cn(
          "col-span-2 flex items-center justify-end px-2 font-black tabular-nums",
          tone === "safety" ? "text-[var(--danger-base)]" : "text-[var(--accent-primary)]",
        )}
      >
        <Currency value={amount} />
      </div>
      <div />
    </div>
  );
}

const MG_SEGMENT = "MG";

function isMgRow(voice: SalLineView["voice"]): boolean {
  return voice.code.split(".")[1]?.toUpperCase() === MG_SEGMENT;
}

function getMgTariffPrefix(voiceCode: string): string | null {
  const firstSegment = voiceCode.split(".")[0];
  return firstSegment && firstSegment.toUpperCase() !== MG_SEGMENT ? firstSegment : null;
}

function MgChargesPanel({
  lines,
  mgLines,
  onRemove,
}: {
  lines: SalLineView[];
  mgLines: SalLineView[];
  onRemove: (lineId: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--info-soft)_18%,var(--surface-base)_82%)] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--info-base)_12%,var(--surface-base)_88%)] text-[var(--info-base)]">
            <Percent className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-11px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Maggiorazioni MG
            </div>
            <div className="truncate text-12px text-[var(--text-secondary)]">
              Tenute fuori dal registro misure e distribuite sulle voci di riferimento.
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {mgLines.map((mgLine) => {
          const prefix = getMgTariffPrefix(mgLine.voice.code);
          const affectedLines = prefix
            ? lines.filter((line) => line.voice.code.startsWith(`${prefix}.`))
            : lines;
          const charge = mgLine.linkedCharges.find((entry) => entry.code.startsWith("MG."));
          return (
            <div
              className="rounded-lg bg-[var(--surface-base)] p-3 ring-1 ring-[color-mix(in_srgb,var(--info-base)_16%,var(--border-subtle)_84%)]"
              key={mgLine.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-12px font-bold text-[var(--info-base)]">
                      {mgLine.voice.code}
                    </span>
                    <span className="rounded-md bg-[color-mix(in_srgb,var(--info-base)_10%,var(--surface-base)_90%)] px-1.5 py-0.5 text-10px font-bold text-[var(--info-base)]">
                      {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
                    </span>
                    <span className="text-10px font-semibold uppercase tracking-0_12em text-[var(--text-tertiary)]">
                      {prefix ? `voci ${prefix}` : "tutte le voci"}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-12px leading-snug text-[var(--text-primary)]">
                    {mgLine.voice.description}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <div className="text-right">
                    <div className="text-13px font-black tabular-nums text-[var(--info-base)]">
                      +<Currency value={charge?.total ?? mgLine.totalAmount} />
                    </div>
                    <div className="mt-0.5 text-10px text-[var(--text-secondary)]">
                      base <Currency value={charge?.baseAmount ?? 0} />
                    </div>
                  </div>
                  <button
                    aria-label={`Rimuovi maggiorazione ${mgLine.voice.code}`}
                    className="flex size-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                    onClick={() => onRemove(mgLine.id)}
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {affectedLines.length === 0 ? (
                  <span className="rounded-md bg-[var(--warning-soft)] px-2 py-1 text-10px font-semibold text-[var(--warning-base)]">
                    Nessuna voce collegata
                  </span>
                ) : (
                  affectedLines.slice(0, 8).map((line) => (
                    <span
                      className="max-w-[220px] truncate rounded-md bg-[var(--bg-muted)] px-2 py-1 text-10px font-semibold text-[var(--text-secondary)]"
                      key={`${mgLine.id}-${line.id}`}
                      title={line.voice.description}
                    >
                      {line.voice.code}
                    </span>
                  ))
                )}
                {affectedLines.length > 8 ? (
                  <span className="rounded-md bg-[var(--bg-muted)] px-2 py-1 text-10px font-semibold text-[var(--text-tertiary)]">
                    +{affectedLines.length - 8}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
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
  onFactorChange,
  onNotesChange,
  onRemove,
  onSurcharge,
  onToggle,
}: {
  index: number;
  line: SalLineView;
  expanded: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onFactorChange: (lineId: string, field: "factor1" | "factor2" | "factor3", value: number) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onSurcharge: (lineId: string, percent: number) => void;
  onToggle: () => void;
}) {
  const linkedTotal = line.linkedCharges.reduce((sum, c) => sum + c.total, 0);
  const laborPct = line.voice.laborPercentage ?? 0;
  const hasDetails = Boolean(line.notes.trim()) || linkedTotal > 0 || laborPct > 0;

  return (
    <>
      <div
        data-line-id={line.id}
        className={cn(
          "grid grid-cols-[58px_128px_minmax(340px,1.2fr)_70px_108px_112px_126px_118px_96px_130px_76px] border-b border-[var(--border-subtle)]/60 text-12px transition-colors hover:bg-[color-mix(in_srgb,var(--info-soft)_20%,var(--surface-base)_80%)]",
          index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/24",
          expanded && "bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)]",
        )}
      >
        <GridCell muted>
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Comprimi" : "Espandi"} dettagli ${line.voice.code}`}
            className="flex h-8 w-full items-center justify-center gap-1 rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            onClick={onToggle}
            type="button"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", !expanded && "-rotate-90")}
            />
            <span className="font-semibold tabular-nums">{index + 1}</span>
          </button>
        </GridCell>
        <GridCell strong title={line.voice.code}>
          <span className="truncate">{line.voice.code}</span>
        </GridCell>
        <GridCell>
          <div className="flex min-w-0 items-start gap-1.5">
            <span className="min-w-0 flex-1">
              <div className="whitespace-normal break-words font-medium leading-snug text-[var(--text-primary)]">
                {line.voice.description}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="truncate text-10px text-[var(--text-secondary)]">
                  {line.voice.category}
                </span>
                {laborPct > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-base)_90%)] px-1.5 py-0.5 text-10px font-bold text-[var(--accent-primary)]">
                    <span className="size-1.5 rounded-full bg-[var(--accent-primary)]" />
                    Man. {laborPct}%
                  </span>
                ) : null}
                {line.voice.isSafetyCost ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--danger-soft)] px-1.5 py-0.5 text-10px font-bold text-[var(--danger-base)]">
                    OS
                  </span>
                ) : null}
              </div>
            </span>
          </div>
        </GridCell>
        <GridCell muted>{line.voice.unit}</GridCell>
        <GridCell align="right">
          <Currency value={line.voice.unitPrice} />
        </GridCell>
        <GridCell align="right" strong>
          <NumberValue value={line.quantity} />
        </GridCell>
        <GridCell align="right" strong>
          <Currency value={line.grossAmount} />
        </GridCell>
        <GridCell align="right">
          <span
            className={cn(
              line.discountAmount > 0
                ? "font-semibold text-[var(--danger-base)]"
                : "text-[var(--text-secondary)]",
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
            className="h-8 w-full rounded-none border-0 bg-transparent px-1 text-right text-12px font-semibold text-[var(--text-primary)] outline-none transition focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-inset focus:ring-[var(--ring-focus)]"
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
            placeholder="%"
            type="text"
            value={line.surchargePercent || ""}
          />
        </GridCell>
        <GridCell align="right" strong>
          <span className="text-[var(--accent-primary)]">
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
              onClick={onCopy}
              type="button"
              title={isCopied ? "Voce copiata - premi Ctrl+V per incollare" : "Copia voce"}
              transition={{ duration: 0.42, ease: SPRING_EASE }}
            >
              {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </m.button>
            <m.button
              aria-label={`Rimuovi ${line.voice.code}`}
              className="flex size-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
              onClick={() => onRemove(line.id)}
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
            "border-b border-[var(--border-subtle)]/70 px-4 py-3",
            index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/24",
          )}
        >
          <div className="ml-[58px] grid min-w-0 gap-3 xl:grid-cols-[minmax(520px,0.95fr)_minmax(360px,1fr)]">
            <div className="min-w-0 rounded-lg bg-[color-mix(in_srgb,var(--bg-muted)_58%,var(--surface-base)_42%)] p-3 ring-1 ring-[var(--border-subtle)]/70">
              <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                <span className="whitespace-nowrap text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
                  Libretto misura
                </span>
                <span className="whitespace-nowrap text-10px text-[var(--text-tertiary)]">
                  {line.factor1.toLocaleString("it-IT")} × {line.factor2.toLocaleString("it-IT")} ×{" "}
                  {line.factor3.toLocaleString("it-IT")} ={" "}
                  {line.quantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
                </span>
              </div>
              <div className="mb-3 overflow-x-auto rounded-md ring-1 ring-[var(--border-subtle)]/70">
                <div className="grid min-w-[560px] grid-cols-[minmax(180px,1fr)_56px_74px_74px_74px_96px] bg-[var(--surface-base)] text-10px font-bold uppercase tracking-0_12em text-[var(--text-tertiary)]">
                  {["Descrizione", "UM", "F1", "F2", "F3", "Qtà"].map((label) => (
                    <div
                      className="border-r border-[var(--border-subtle)]/60 px-2 py-1.5 last:border-r-0"
                      key={label}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid min-w-[560px] grid-cols-[minmax(180px,1fr)_56px_74px_74px_74px_96px] border-t border-[var(--border-subtle)]/60 bg-[var(--surface-base)] text-11px">
                  <div className="border-r border-[var(--border-subtle)]/60 px-2 py-2 text-[var(--text-primary)]">
                    {line.notes.trim() || "Misura corrente"}
                  </div>
                  <div className="border-r border-[var(--border-subtle)]/60 px-2 py-2 text-[var(--text-secondary)]">
                    {line.voice.unit}
                  </div>
                  {[
                    { key: "factor1", value: line.factor1 },
                    { key: "factor2", value: line.factor2 },
                    { key: "factor3", value: line.factor3 },
                  ].map((factor) => (
                    <div
                      className="border-r border-[var(--border-subtle)]/60 px-2 py-2 text-right font-mono tabular-nums text-[var(--text-primary)]"
                      key={`${line.id}-${factor.key}`}
                    >
                      {factor.value.toLocaleString("it-IT")}
                    </div>
                  ))}
                  <div className="px-2 py-2 text-right font-mono font-bold tabular-nums text-[var(--text-primary)]">
                    {line.quantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
                  </div>
                </div>
                <div className="grid min-w-[560px] grid-cols-[minmax(180px,1fr)_56px_74px_74px_74px_96px] border-t border-[var(--border-subtle)]/60 bg-[color-mix(in_srgb,var(--accent-primary)_5%,var(--surface-base)_95%)] text-11px font-bold">
                  <div className="col-span-5 px-2 py-2 text-right text-[var(--text-secondary)]">
                    sommano {line.voice.unit}
                  </div>
                  <div className="px-2 py-2 text-right font-mono tabular-nums text-[var(--accent-primary)]">
                    {line.quantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["factor1", "factor2", "factor3"] as const).map((field, fieldIndex) => (
                  <div className="block" key={field}>
                    <span className="mb-1 block text-10px font-semibold uppercase tracking-0_12em text-[var(--text-tertiary)]">
                      F{fieldIndex + 1}
                    </span>
                    <InlineEdit
                      ariaLabel={`Fattore ${fieldIndex + 1} per ${line.voice.code}`}
                      className="h-9 w-full rounded-md bg-[var(--surface-base)] px-2 text-right text-12px font-semibold ring-1 ring-[var(--border-subtle)]"
                      onCommit={(value) => onFactorChange(line.id, field, value)}
                      value={line[field]}
                    />
                  </div>
                ))}
              </div>
              {linkedTotal > 0 || hasDetails ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-11px text-[var(--text-secondary)]">
                  {linkedTotal > 0 ? (
                    <span className="rounded-md bg-[color-mix(in_srgb,var(--info-base)_10%,var(--surface-base)_90%)] px-2 py-1 font-semibold text-[var(--info-base)]">
                      Maggiorazioni collegate +<Currency value={linkedTotal} />
                    </span>
                  ) : null}
                  {laborPct > 0 ? (
                    <span>Manodopera {laborPct.toLocaleString("it-IT")}%</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg bg-[color-mix(in_srgb,var(--bg-muted)_58%,var(--surface-base)_42%)] p-3 ring-1 ring-[var(--border-subtle)]/70">
              <label className="block">
                <span className="mb-2 block text-10px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
                  Note riga
                </span>
                <textarea
                  className="min-h-20 w-full resize-y rounded-lg border border-[color-mix(in_srgb,var(--border-subtle)_65%,transparent)] bg-[var(--surface-base)] px-3 py-2 text-12px leading-snug text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  placeholder={
                    linkedTotal > 0
                      ? `Annota criterio maggiorazioni: ${linkedTotal.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`
                      : "Aggiungi note di misura, riferimenti o riserve..."
                  }
                  rows={3}
                  value={line.notes}
                  onChange={(e) => onNotesChange(line.id, e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
});

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
        "flex min-w-0 items-center border-r border-[var(--border-subtle)]/60 px-2 py-1 last:border-r-0",
        align === "center" && "justify-center text-center",
        align === "right" && "justify-end text-right tabular-nums",
        editable && "bg-[color-mix(in_srgb,var(--warning-soft)_18%,transparent)]",
        muted && "text-[var(--text-secondary)]",
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
      <div className="rounded-2xl bg-[var(--bg-muted)]/50">
        <EmptyTableState message="Il registro SAL apparirà quando avrai selezionato almeno una voce tariffaria." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-[var(--bg-muted)]/50">
      <div className="min-w-[1100px]">
        <div className="grid-col-fade sticky top-0 z-10 grid grid-cols-[44px_150px_105px_minmax(240px,1fr)_70px_118px_118px_112px_118px_60px_36px] gap-3 bg-[color-mix(in_srgb,var(--surface-base)_95%,var(--bg-muted)_5%)] p-3 text-xs font-semibold text-secondary shadow-[0_10px_24px_color-mix(in_srgb,var(--text-primary)_5%,transparent)]">
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
                  className="absolute left-0 right-0 border-t border-[var(--border-subtle)]/50"
                  data-index={virtualRow.index}
                  key={line.id}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <m.button
                    aria-expanded={expanded}
                    className="grid w-full grid-cols-[44px_150px_105px_minmax(240px,1fr)_70px_118px_118px_112px_118px_60px_36px] items-center p-3 text-left text-13px hover:bg-[var(--bg-muted)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
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
                    <MoreHorizontal className="size-5 text-[var(--text-secondary)]" />
                  </m.button>
                  {expanded ? (
                    <div className="grid gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/20 p-3 lg:grid-cols-[1.25fr_1fr]">
                      <NestedTable
                        columns={["Descrizione", "U.M.", "F1", "F2", "F3", "Qtà", "Note"]}
                        title="Misure"
                      >
                        {line.measurementRows.length === 0 ? (
                          <tr>
                            <td className="p-3 text-[var(--text-secondary)]" colSpan={7}>
                              Nessuna misura inserita.
                            </td>
                          </tr>
                        ) : (
                          line.measurementRows.map((row) => (
                            <tr className="border-t border-[var(--border-subtle)]/50" key={row.id}>
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
                            <td className="p-3 text-[var(--text-secondary)]" colSpan={5}>
                              Nessuna maggiorazione attiva.
                            </td>
                          </tr>
                        ) : (
                          line.linkedCharges.map((charge) => (
                            <tr
                              className="border-t border-[var(--border-subtle)]/50"
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
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--surface-base)]">
      {/* Receipt header */}
      <div className="border-b border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--surface-base)_96%)] px-4 py-2.5">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
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
      <div className="divide-y divide-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]">
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
                  <span className="truncate text-[var(--text-secondary)]">
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
      <div className="border-t border-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] bg-[color-mix(in_srgb,var(--accent-primary)_2%,var(--surface-base)_98%)] px-4 py-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-11px text-[var(--text-secondary)]">
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
          <div className="mt-1 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] pt-1 text-12px font-bold text-[var(--accent-primary)]">
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
        <div className="mt-1 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)] pt-1.5 text-13px font-black text-[var(--accent-primary)]">
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
    <div className="rounded-xl bg-[color-mix(in_srgb,var(--surface-base)_96%,var(--bg-muted)_4%)] ring-1 ring-[var(--border-subtle)]/70">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]/60 px-4 py-3">
        <span className="text-11px font-bold uppercase tracking-0_14em text-[var(--text-secondary)]">
          Riepilogo economico
        </span>
      </div>
      <div className="grid gap-px bg-[var(--border-subtle)]/40 md:grid-cols-2">
        {hasMg
          ? mgEntries.map((entry) => (
              <div
                className="flex flex-col justify-center bg-[color-mix(in_srgb,var(--surface-base)_90%,var(--info-base)_2%)] px-4 py-3"
                key={entry.code}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--info-base)_12%,var(--surface-base)_88%)] text-12px font-bold text-[var(--info-base)]">
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
                <div className="mt-1 flex items-center gap-2 pl-8 text-11px text-[var(--text-secondary)]">
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
          <div className="flex flex-col justify-center bg-[color-mix(in_srgb,var(--surface-base)_90%,var(--danger-base)_2%)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger-base)_12%,var(--surface-base)_88%)] text-12px font-bold text-[var(--danger-base)]">
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
            <div className="mt-1 flex items-center gap-2 pl-8 text-11px text-[var(--text-secondary)]">
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
        "flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-3",
        disabled && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="truncate text-sm font-semibold">{label}</span>
      </div>
      <span className="hidden text-xs font-semibold text-[var(--success-base)] md:inline">
        {disabled ? "Non disponibile" : "Pronto per export"}
      </span>
      <Download className="size-4 text-[var(--text-secondary)]" />
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
          <thead className="bg-[var(--bg-muted)]/45 text-[var(--text-secondary)]">
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
    <div className="border-t border-[var(--border-subtle)] px-4 py-8 text-center text-13px text-[var(--text-secondary)]">
      {message}
    </div>
  );
}
