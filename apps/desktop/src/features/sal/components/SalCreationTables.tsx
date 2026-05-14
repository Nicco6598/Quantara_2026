import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import { Check, ChevronDown, Copy, Download, MoreHorizontal, Trash2 } from "lucide-react";
import { memo, type ReactNode, useRef, useState } from "react";
import { Currency } from "@/components/shared/Currency";
import { DragDropReorder } from "@/components/shared/DragDropReorder";
import { SPRING_EASE } from "@/components/shared/easings";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const VIRTUAL_THRESHOLD = 20;
  const useVirtual = lines.length > VIRTUAL_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

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
              : `${lines.length} voc${lines.length === 1 ? "e" : "i"} in lavorazione`}
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

      <div className="overflow-x-auto">
        <div ref={scrollRef} className="max-h-[620px] overflow-y-auto">
          <div className="min-w-[1460px]">
            <div className="sticky top-0 z-20 grid grid-cols-[44px_128px_minmax(300px,1.2fr)_70px_108px_86px_86px_86px_112px_126px_118px_86px_130px_76px] border-b border-[var(--border-subtle)] bg-[var(--surface-base)] text-10px font-semibold uppercase tracking-0_12em text-[var(--text-secondary)] shadow-[0_8px_18px_color-mix(in_srgb,var(--text-primary)_6%,transparent)]">
              {[
                { label: "N.", dragSpace: !useVirtual },
                { label: "Codice voce" },
                { label: "Voce / categoria" },
                { label: "UM" },
                { label: "Prezzo unit." },
                { label: "Fatt. 1" },
                { label: "Fatt. 2" },
                { label: "Fatt. 3" },
                { label: "Qtà calc." },
                { label: "Importo lordo" },
                { label: "Ribasso" },
                { label: "Magg. %" },
                { label: "Netto SAL" },
                { label: "Azioni" },
              ].map((col) => {
                const label = col.label;
                const isRight =
                  label === "Prezzo unit." ||
                  label === "Fatt. 1" ||
                  label === "Fatt. 2" ||
                  label === "Fatt. 3" ||
                  label === "Qtà calc." ||
                  label === "Importo lordo" ||
                  label === "Ribasso" ||
                  label === "Magg. %" ||
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

            {lines.length === 0 ? (
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
                  const line = lines[virtualRow.index];
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
                        isCopied={copiedVoiceId === line.id}
                        onCopy={() => onCopyLine(line.id)}
                        onFactorChange={onFactorChange}
                        onNotesChange={onNotesChange}
                        onRemove={onRemove}
                        onSurcharge={onSurcharge}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <DragDropReorder
                items={lines}
                onReorder={onReorder}
                renderItem={(line: SalLineView, index: number) => (
                  <SelectedVoiceRow
                    index={index}
                    key={line.id}
                    line={line}
                    isCopied={copiedVoiceId === line.id}
                    onCopy={() => onCopyLine(line.id)}
                    onFactorChange={onFactorChange}
                    onNotesChange={onNotesChange}
                    onRemove={onRemove}
                    onSurcharge={onSurcharge}
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

const MG_SEGMENT = "MG";

function isMgRow(voice: SalLineView["voice"]): boolean {
  return voice.code.split(".")[1]?.toUpperCase() === MG_SEGMENT;
}

const SelectedVoiceRow = memo(function SelectedVoiceRow({
  index,
  line,
  isCopied,
  onCopy,
  onFactorChange,
  onNotesChange,
  onRemove,
  onSurcharge,
}: {
  index: number;
  line: SalLineView;
  isCopied: boolean;
  onCopy: () => void;
  onFactorChange: (lineId: string, field: "factor1" | "factor2" | "factor3", value: number) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onSurcharge: (lineId: string, percent: number) => void;
}) {
  const linkedTotal = line.linkedCharges.reduce((sum, c) => sum + c.total, 0);
  const laborPct = line.voice.laborPercentage ?? 0;
  const isMg = isMgRow(line.voice);
  const mgTariffPrefix = isMg
    ? line.voice.code?.split(".")[0]?.toUpperCase() === MG_SEGMENT
      ? null
      : (line.voice.code?.split(".")[0] ?? null)
    : null;

  return (
    <>
      <div
        data-line-id={line.id}
        className={cn(
          "grid grid-cols-[44px_128px_minmax(300px,1.2fr)_70px_108px_86px_86px_86px_112px_126px_118px_86px_130px_76px] border-b border-[var(--border-subtle)]/60 text-12px transition-colors hover:bg-[color-mix(in_srgb,var(--info-soft)_20%,var(--surface-base)_80%)]",
          index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/24",
          isMg && "bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--surface-base)_94%)]",
        )}
      >
        <GridCell muted>{index + 1}</GridCell>
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
                {isMg ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--info-base)_12%,var(--surface-base)_88%)] px-1.5 py-0.5 text-10px font-bold text-[var(--info-base)]">
                    MG{mgTariffPrefix ? ` · solo ${mgTariffPrefix}` : ""}
                  </span>
                ) : null}
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
          {isMg ? (
            <span className="font-bold text-[var(--info-base)]">{line.voice.unitPrice}%</span>
          ) : (
            <Currency value={line.voice.unitPrice} />
          )}
        </GridCell>
        <GridCell align="right" editable={!isMg}>
          {isMg ? (
            <span className="text-[var(--text-tertiary)]">—</span>
          ) : (
            <InlineEdit
              ariaLabel={`Fattore 1 per ${line.voice.code}`}
              className="w-full"
              onCommit={(value) => onFactorChange(line.id, "factor1", value)}
              value={line.factor1}
            />
          )}
        </GridCell>
        <GridCell align="right" editable={!isMg}>
          {isMg ? (
            <span className="text-[var(--text-tertiary)]">—</span>
          ) : (
            <InlineEdit
              ariaLabel={`Fattore 2 per ${line.voice.code}`}
              className="w-full"
              onCommit={(value) => onFactorChange(line.id, "factor2", value)}
              value={line.factor2}
            />
          )}
        </GridCell>
        <GridCell align="right" editable={!isMg}>
          {isMg ? (
            <span className="text-[var(--text-tertiary)]">—</span>
          ) : (
            <InlineEdit
              ariaLabel={`Fattore 3 per ${line.voice.code}`}
              className="w-full"
              onCommit={(value) => onFactorChange(line.id, "factor3", value)}
              value={line.factor3}
            />
          )}
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
      <div
        className={cn(
          "border-b border-[var(--border-subtle)]/60",
          index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/24",
        )}
      >
        <div className="mx-5 pb-3 pt-1">
          <textarea
            className="w-full resize-none overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--border-subtle)_50%,transparent)] bg-[var(--surface-base)] px-3 py-2 text-12px leading-snug text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            placeholder={
              linkedTotal > 0
                ? `Magg. ${linkedTotal.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`
                : "Nota..."
            }
            rows={1}
            value={line.notes}
            onChange={(e) => {
              onNotesChange(line.id, e.target.value);
              const style = e.currentTarget.style;
              style.height = "auto";
              style.height = `${Math.max(e.currentTarget.scrollHeight, 36)}px`;
            }}
          />
        </div>
      </div>
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
        {lines.map((line) => {
          const expanded = expandedId === line.id;
          return (
            <div className="border-t border-[var(--border-subtle)]/50" key={line.id}>
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
                        <tr className="border-t border-[var(--border-subtle)]/50" key={charge.id}>
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
  const linkedTotal =
    summary?.linkedChargeAmount ??
    lines.reduce(
      (sum, line) => sum + line.linkedCharges.reduce((inner, charge) => inner + charge.total, 0),
      0,
    );
  const total = summary?.total ?? lines.reduce((sum, line) => sum + line.totalAmount, 0);
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 text-[var(--text-primary)] shadow-inner",
        compact && "p-3 text-11px",
      )}
    >
      <div className="grid grid-cols-3 border border-[var(--border-subtle)] text-center text-xs font-semibold">
        <div className="p-3 text-left">
          COMUNE DI ESEMPIO
          <br />
          Ufficio Tecnico
        </div>
        <div className="border-x border-[var(--border-subtle)] p-3">
          LIBRETTO DELLE MISURE
          <br />
          Stato Avanzamento Lavori n. 1
        </div>
        <div className="p-3 text-left">
          Progetto: TEST
          <br />
          Codice: QNT-01
          <br />
          Anno: 2026
        </div>
      </div>
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[var(--bg-muted)]">
            {["N.", "Codice", "Descrizione", "U.M.", "Qtà", "Prezzo", "Importo"].map((h) => (
              <th className="border border-[var(--border-subtle)] p-2 text-left" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td
                className="border border-[var(--border-subtle)] p-3 text-center text-[var(--text-tertiary)]"
                colSpan={7}
              >
                Anteprima dopo l'inserimento delle voci.
              </td>
            </tr>
          ) : (
            lines.slice(0, compact ? 5 : 8).map((line, idx) => (
              <tr key={line.id}>
                <td className="border border-[var(--border-subtle)] p-2">{idx + 1}</td>
                <td className="border border-[var(--border-subtle)] p-2">{line.voice.code}</td>
                <td className="border border-[var(--border-subtle)] p-2">
                  {line.voice.description}
                </td>
                <td className="border border-[var(--border-subtle)] p-2">{line.voice.unit}</td>
                <td className="border border-[var(--border-subtle)] p-2 text-right">
                  {line.quantity.toLocaleString("it-IT")}
                </td>
                <td className="border border-[var(--border-subtle)] p-2 text-right">
                  {line.voice.unitPrice.toLocaleString("it-IT")}
                </td>
                <td className="border border-[var(--border-subtle)] p-2 text-right">
                  {line.totalAmount.toLocaleString("it-IT")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-3 overflow-hidden rounded-md border border-[var(--border-subtle)] text-xs">
        <div className="grid grid-cols-[1fr_180px] border-b border-[var(--border-subtle)]">
          <div className="p-2 font-semibold">Totale voci</div>
          <div className="border-l border-[var(--border-subtle)] p-2 text-right font-semibold">
            {grossTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </div>
        </div>
        {linkedTotal > 0 ? (
          <div className="grid grid-cols-[1fr_180px] border-b border-[var(--border-subtle)]">
            <div className="p-2">Maggiorazioni</div>
            <div className="border-l border-[var(--border-subtle)] p-2 text-right">
              {linkedTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_180px] border-b border-[var(--border-subtle)] text-[var(--danger-base)]">
          <div className="p-2">Ribasso gara</div>
          <div className="border-l border-[var(--border-subtle)] p-2 text-right">
            -{discountTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_180px] bg-[var(--info-soft)] font-bold">
          <div className="p-2">TOTALE ATTUALE SAL</div>
          <div className="border-l border-[var(--border-subtle)] p-2 text-right text-[var(--accent-primary)]">
            {total.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </div>
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
  const mgEntries = lineViews.flatMap((line) =>
    line.linkedCharges
      .filter((c) => c.code.startsWith("MG."))
      .map((c) => {
        const tariffPrefix = c.code.replace("MG.", "");
        const voiceCount =
          tariffPrefix === "ALL"
            ? lineViews.filter((v) => v.linkedCharges.length === 0).length
            : lineViews.filter((v) => v.voice.code.startsWith(`${tariffPrefix}.`)).length;
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
