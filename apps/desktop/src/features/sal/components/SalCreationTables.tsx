import { motion } from "framer-motion";
import { Check, ChevronDown, Copy, Download, MoreHorizontal, Trash2 } from "lucide-react";
import { memo, type ReactNode, useState } from "react";
import { DragDropReorder } from "@/components/shared/DragDropReorder";
import { InlineEdit } from "@/components/shared/InlineEdit";
import { cn } from "@/lib/utils";
import type { SalEconomicSummary, SalLineDraft, SalLineView, SalVerificationCheck } from "../types";

const BUTTER_EASE = [0.22, 1, 0.36, 1] as const;

export function Currency({ value }: { value: number }) {
  return (
    <span className="font-mono">
      {value.toLocaleString("it-IT", {
        currency: "EUR",
        minimumFractionDigits: 2,
        style: "currency",
      })}
    </span>
  );
}

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
  onCopyLine: (voiceId: string) => void;
  onFactorChange: (
    voiceId: string,
    field: "factor1" | "factor2" | "factor3",
    value: number,
  ) => void;
  onNotesChange: (voiceId: string, notes: string) => void;
  onRemove: (voiceId: string) => void;
  onReorder: (lines: SalLineDraft[]) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[20px] bg-[var(--bg-muted)]/40 ring-1 ring-[var(--border-subtle)]/60">
      <div className="max-h-[680px] overflow-y-auto">
        <div className="min-w-[1060px] break-words">
          {/* LINE 2 header — data columns */}
          <div className="grid-col-fade sticky top-0 z-10 grid grid-cols-[72px_92px_92px_92px_112px_130px_120px_100px_130px] items-center gap-3 bg-[var(--surface-base)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)] shadow-[0_1px_0_var(--border-subtle)]">
            <span className="pl-1">U.M.</span>
            <span className="pr-2 text-right">Fattore 1</span>
            <span className="pr-2 text-right">Fattore 2</span>
            <span className="pr-2 text-right">Fattore 3</span>
            <span className="text-right">Quantità</span>
            <span className="text-right">Totale voci</span>
            <span className="text-right">Sconto</span>
            <span className="pr-2 text-right">Magg.</span>
            <span className="text-right">Totale SAL</span>
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                Cerca una voce tariffaria qui sopra e aggiungila alla bozza.
              </p>
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
                  isCopied={copiedVoiceId === line.voice.id}
                  onCopy={() => onCopyLine(line.voice.id)}
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
  );
});

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
  onFactorChange: (
    voiceId: string,
    field: "factor1" | "factor2" | "factor3",
    value: number,
  ) => void;
  onNotesChange: (voiceId: string, notes: string) => void;
  onRemove: (voiceId: string) => void;
  onSurcharge: (voiceId: string, percent: number) => void;
}) {
  const linkedTotal = line.linkedCharges.reduce((sum, c) => sum + c.total, 0);
  const laborPct = line.voice.laborPercentage ?? 0;

  return (
    <div
      data-voice-id={line.voice.id}
      className={cn(
        "border-t border-[var(--border-subtle)]/60",
        index % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/30",
      )}
    >
      {/* LINE 1 — Voice number + code + description + action buttons */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-1">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg-muted)]/60 text-[11px] font-bold text-[var(--text-tertiary)]">
          {index + 1}
        </span>
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-px shrink-0 font-bold text-[14px] tracking-tight text-[var(--text-primary)]">
            {line.voice.code}
          </span>
          <span className="min-w-0 flex-1 text-[12px] font-medium leading-normal text-[var(--text-secondary)]">
            {line.voice.description}
          </span>
          {laborPct > 0 && (
            <span className="mt-px shrink-0 rounded-full bg-[var(--info-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--info-base)]">
              Manodopera {laborPct}%
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <motion.button
            aria-label={isCopied ? "Copiata" : "Copia voce"}
            className={cn(
              "flex size-8 items-center justify-center rounded-[10px] transition-all",
              isCopied
                ? "text-[var(--success-base)]"
                : "text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
            )}
            onClick={onCopy}
            type="button"
            title={isCopied ? "Voce copiata — premi Ctrl+V per incollare" : "Copia voce (Ctrl+C)"}
            whileHover={{ scale: 1.1, y: -1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.42, ease: BUTTER_EASE }}
          >
            {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </motion.button>
          <motion.button
            aria-label={`Rimuovi ${line.voice.code}`}
            className="flex size-8 items-center justify-center rounded-[10px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
            onClick={() => onRemove(line.voice.id)}
            type="button"
            whileHover={{ scale: 1.1, y: -1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.42, ease: BUTTER_EASE }}
          >
            <Trash2 className="size-4" />
          </motion.button>
        </div>
      </div>

      {/* LINE 2 — Data grid: U.M. | Fattore 1 | Fattore 2 | Fattore 3 | Quantità | Totale Voci | Sconto | Magg. | Totale SAL */}
      <div className="grid-col-fade grid grid-cols-[72px_92px_92px_92px_112px_130px_120px_100px_130px] items-center gap-3 px-4 py-1.5 text-[13px]">
        <span className="text-[12px] font-medium text-[var(--text-tertiary)]">
          {line.voice.unit}
        </span>

        <div className="flex justify-end">
          <InlineEdit
            ariaLabel={`Fattore 1 per ${line.voice.code}`}
            className="w-20"
            onCommit={(value) => onFactorChange(line.voice.id, "factor1", value)}
            value={line.factor1}
          />
        </div>

        <div className="flex justify-end">
          <InlineEdit
            ariaLabel={`Fattore 2 per ${line.voice.code}`}
            className="w-20"
            onCommit={(value) => onFactorChange(line.voice.id, "factor2", value)}
            value={line.factor2}
          />
        </div>

        <div className="flex justify-end">
          <InlineEdit
            ariaLabel={`Fattore 3 per ${line.voice.code}`}
            className="w-20"
            onCommit={(value) => onFactorChange(line.voice.id, "factor3", value)}
            value={line.factor3}
          />
        </div>

        <span className="text-right font-bold text-[var(--text-primary)]">
          <NumberValue value={line.quantity} />
        </span>

        <span className="text-right font-bold text-[var(--text-primary)]">
          <Currency value={line.grossAmount} />
        </span>

        <div className="flex min-w-0 flex-col items-end gap-1">
          <span
            className={cn(
              "text-right font-bold",
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
          <DiscountBadge line={line} />
        </div>

        <div className="flex justify-end">
          <input
            aria-label={`Maggiorazione % per ${line.voice.code}`}
            className="h-8 w-[76px] rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-muted)]/60 px-2 text-right text-[12px] font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--text-secondary)]/40 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            inputMode="decimal"
            onChange={(event) => {
              const raw = event.target.value.replace(",", ".");
              if (raw === "") {
                onSurcharge(line.voice.id, 0);
                return;
              }
              const val = Number.parseFloat(raw);
              if (Number.isFinite(val) && val >= 0) {
                onSurcharge(line.voice.id, val);
              }
            }}
            placeholder="%"
            type="text"
            value={line.surchargePercent || ""}
          />
        </div>

        <span className="text-right text-[14px] font-bold text-[var(--accent-primary)]">
          <Currency value={line.totalAmount} />
        </span>
      </div>

      {/* LINE 3 — Calculation breakdown: Prezzo Totale + Totale Maggiorazione */}
      <div className="grid grid-cols-2 gap-3 px-4 py-1.5">
        <div className="flex items-center gap-2 rounded-[8px] bg-[var(--surface-inset)] px-3 py-1.5">
          <span className="shrink-0 text-[11px] font-semibold text-[var(--text-secondary)]">
            Prezzo Totale:
          </span>
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {line.quantity.toLocaleString("it-IT")}{" "}
            <span className="text-[var(--text-tertiary)]/60">×</span>{" "}
            {line.voice.unitPrice.toLocaleString("it-IT", {
              currency: "EUR",
              minimumFractionDigits: 2,
              style: "currency",
            })}
          </span>
          <span className="ml-auto font-bold text-[12px] text-[var(--text-primary)]">
            = <Currency value={line.grossAmount} />
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-[8px] bg-[var(--surface-inset)] px-3 py-1.5">
          <span className="shrink-0 text-[11px] font-semibold text-[var(--text-secondary)]">
            Maggiorazione:
          </span>
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {line.surchargePercent}% <span className="text-[var(--text-tertiary)]/60">×</span>{" "}
            {laborPct}%
          </span>
          <span className="ml-auto font-bold text-[12px] text-[var(--success-base)]">
            = <Currency value={linkedTotal} />
          </span>
          {laborPct === 0 && line.surchargePercent > 0 && (
            <span className="shrink-0 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[9px] font-bold text-[var(--warning-base)]">
              Manodopera 0%
            </span>
          )}
        </div>
      </div>

      {/* LINE 4 — Notes inline input */}
      <div className="px-4 pb-3">
        <input
          className="w-full rounded-[8px] border border-[var(--border-subtle)]/40 bg-[var(--bg-muted)]/30 px-3 py-1 text-[12px] text-[var(--text-secondary)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--text-secondary)]/30 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          placeholder="Aggiungi nota descrittiva..."
          value={line.notes}
          onChange={(e) => onNotesChange(line.voice.id, e.target.value)}
        />
      </div>
    </div>
  );
});

function DiscountBadge({ line }: { line: SalLineView }) {
  if (line.discountAmount > 0) {
    return (
      <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--success-base)]">
        Ribassata
      </span>
    );
  }

  if (line.voice.isSafetyCost) {
    return (
      <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning-base)]">
        OS esclusa
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
      Non ribassata
    </span>
  );
}

export function AccountingRows({ lines }: { lines: SalLineView[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(lines[0]?.id ?? null);

  if (lines.length === 0) {
    return (
      <div className="rounded-[20px] bg-[var(--bg-muted)]/50">
        <EmptyTableState message="Il registro SAL apparirà quando avrai selezionato almeno una voce tariffaria." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] bg-[var(--bg-muted)]/50">
      <div className="min-w-[1100px]">
        <div className="grid-col-fade sticky top-0 z-10 grid grid-cols-[44px_150px_105px_minmax(240px,1fr)_70px_118px_118px_112px_118px_54px] gap-3 bg-[color-mix(in_srgb,var(--surface-base)_95%,var(--bg-muted)_5%)] px-3 py-3 text-xs font-semibold text-secondary shadow-[0_10px_24px_color-mix(in_srgb,var(--text-primary)_5%,transparent)]">
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
              <motion.button
                aria-expanded={expanded}
                className="grid w-full grid-cols-[44px_150px_105px_minmax(240px,1fr)_70px_118px_118px_112px_118px_54px] items-center px-3 py-3 text-left text-[13px] hover:bg-[var(--bg-muted)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => setExpandedId(expanded ? null : line.id)}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.42, ease: BUTTER_EASE }}
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
              </motion.button>
              {expanded ? (
                <div className="grid gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/20 p-3 lg:grid-cols-[1.25fr_1fr]">
                  <NestedTable
                    columns={["Descrizione", "U.M.", "F1", "F2", "F3", "Qtà", "Note"]}
                    title="Misure"
                  >
                    {line.measurementRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={7}>
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
                        <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={5}>
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

export function DocumentPreview({
  compact = false,
  lines = [],
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
        "rounded-[12px] border border-[var(--border-subtle)] bg-white p-4 text-[#10182f] shadow-inner",
        compact && "p-3 text-[11px]",
      )}
    >
      <div className="grid grid-cols-3 border border-[#c9d2e3] text-center text-xs font-semibold">
        <div className="p-3 text-left">
          COMUNE DI ESEMPIO
          <br />
          Ufficio Tecnico
        </div>
        <div className="border-x border-[#c9d2e3] p-3">
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
          <tr className="bg-[#f4f6fa]">
            {["N.", "Codice", "Descrizione", "U.M.", "Qtà", "Prezzo", "Importo"].map((h) => (
              <th className="border border-[#c9d2e3] p-2 text-left" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td className="border border-[#c9d2e3] p-3 text-center text-[#53617a]" colSpan={7}>
                Anteprima dopo l'inserimento delle voci.
              </td>
            </tr>
          ) : (
            lines.slice(0, compact ? 5 : 8).map((line, idx) => (
              <tr key={line.id}>
                <td className="border border-[#c9d2e3] p-2">{idx + 1}</td>
                <td className="border border-[#c9d2e3] p-2">{line.voice.code}</td>
                <td className="border border-[#c9d2e3] p-2">{line.voice.description}</td>
                <td className="border border-[#c9d2e3] p-2">{line.voice.unit}</td>
                <td className="border border-[#c9d2e3] p-2 text-right">
                  {line.quantity.toLocaleString("it-IT")}
                </td>
                <td className="border border-[#c9d2e3] p-2 text-right">
                  {line.voice.unitPrice.toLocaleString("it-IT")}
                </td>
                <td className="border border-[#c9d2e3] p-2 text-right">
                  {line.totalAmount.toLocaleString("it-IT")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-3 overflow-hidden rounded-[8px] border border-[#c9d2e3] text-xs">
        <div className="grid grid-cols-[1fr_180px] border-b border-[#c9d2e3]">
          <div className="p-2 font-semibold">Totale voci</div>
          <div className="border-l border-[#c9d2e3] p-2 text-right font-semibold">
            {grossTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </div>
        </div>
        {linkedTotal > 0 ? (
          <div className="grid grid-cols-[1fr_180px] border-b border-[#c9d2e3]">
            <div className="p-2">Maggiorazioni</div>
            <div className="border-l border-[#c9d2e3] p-2 text-right">
              {linkedTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_180px] border-b border-[#c9d2e3] text-[#b42318]">
          <div className="p-2">Ribasso gara</div>
          <div className="border-l border-[#c9d2e3] p-2 text-right">
            -{discountTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_180px] bg-[#eef5ff] font-bold">
          <div className="p-2">TOTALE ATTUALE SAL</div>
          <div className="border-l border-[#c9d2e3] p-2 text-right text-[#006BFF]">
            {total.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </div>
        </div>
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
        "flex items-center justify-between rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-3",
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

export function CheckRow({ check }: { check: SalVerificationCheck }) {
  return (
    <div className="grid grid-cols-[minmax(220px,1fr)_120px_minmax(220px,1.4fr)] items-center border-b border-[var(--border-subtle)] px-3 py-3 text-[13px] last:border-b-0">
      <span className="flex items-center gap-2 font-semibold">
        <span
          className={cn(
            "size-4 rounded-full",
            check.tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
            check.tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
            check.tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          )}
        />
        {check.label}
      </span>
      <StatusPill tone={check.tone}>{check.result}</StatusPill>
      <span className="text-xs text-[var(--text-secondary)]">{check.detail}</span>
    </div>
  );
}

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "info" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold",
        tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "info" && "bg-[var(--info-soft)] text-[var(--info-base)]",
      )}
    >
      {children}
    </span>
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
    <div className="overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-base)]">
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[13px] font-bold text-[var(--text-primary)]">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
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
    <div className="border-t border-[var(--border-subtle)] px-4 py-8 text-center text-[13px] text-[var(--text-secondary)]">
      {message}
    </div>
  );
}
