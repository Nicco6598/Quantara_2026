import { ChevronDown, ChevronLeft, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Currency } from "@/components/shared/Currency";
import { EmptyState } from "@/components/shared/EmptyState";
import { DatePicker } from "@/components/shared/form";
import { cn } from "@/lib/utils";
import type { SalEconomicRules, SalLineView, SalMeasurementRowDraft } from "../types";

type SalGuidedViewProps = {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  onAddMeasurementRow: (lineId: string) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
  onUpdateMeasurementRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
  onSurcharge: (lineId: string, percent: number) => void;
  onRemove: (lineId: string) => void;
  onSelectLine: (lineId: string | null) => void;
};

export const SalGuidedView = memo(function SalGuidedView({
  economicRules,
  lineViews,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onRemoveMeasurementRow,
  onUpdateMeasurementRow,
  onSurcharge,
  onRemove,
  onSelectLine,
}: SalGuidedViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const safeIndex = Math.min(currentIndex, Math.max(0, lineViews.length - 1));
  const currentLine = lineViews[safeIndex];
  const totalLines = lineViews.length;

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalLines - 1, i + 1));
  }, [totalLines]);

  const handleToggleRow = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const handleEditFactor = useCallback(
    (rowId: string, field: "factor1" | "factor2" | "factor3", value: number) => {
      if (!currentLine) return;
      onUpdateMeasurementRow(currentLine.id, rowId, { [field]: value });
    },
    [currentLine, onUpdateMeasurementRow],
  );

  const handleInspect = useCallback(() => {
    if (currentLine) onSelectLine(currentLine.id);
  }, [currentLine, onSelectLine]);

  if (totalLines === 0) {
    return (
      <EmptyState
        description="Cerca e seleziona voci dal tariffario per iniziare."
        icon={Search}
        title="Nessuna voce"
      />
    );
  }

  if (!currentLine) return null;

  const isIncomplete = currentLine.status !== "complete";
  const mgCharges = currentLine.linkedCharges.filter((c) => c.code.startsWith("MG."));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Navigation header */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-base)] px-4 py-3 ring-1 ring-[var(--border-subtle)]/50">
        <div className="min-w-0">
          <div className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Voce {safeIndex + 1} di {totalLines}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-15px font-bold text-[var(--text-primary)]">
              {currentLine.voice.code}
            </span>
            <span className="min-w-0 truncate text-13px font-medium text-[var(--text-secondary)]">
              {currentLine.voice.description}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="flex size-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
            disabled={safeIndex === 0}
            onClick={handlePrev}
            type="button"
            aria-label="Voce precedente"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
            disabled={safeIndex >= totalLines - 1}
            onClick={handleNext}
            type="button"
            aria-label="Voce successiva"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Voice details */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-3">
        {/* Info card */}
        <div className="rounded-xl bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral">{currentLine.voice.category}</Badge>
              <Badge variant="neutral">{currentLine.voice.unit}</Badge>
              {currentLine.voice.isSafetyCost && <Badge variant="danger">OS</Badge>}
              {currentLine.voice.laborPercentage > 0 && (
                <Badge variant="info">Man. {currentLine.voice.laborPercentage}%</Badge>
              )}
              {isIncomplete && <Badge variant="warning">Da completare</Badge>}
            </div>
            <div className="text-right">
              <div className="text-10px font-medium text-[var(--text-tertiary)]">Prezzo unit.</div>
              <div className="text-14px font-bold text-[var(--text-primary)]">
                <Currency value={currentLine.voice.unitPrice} />
              </div>
            </div>
          </div>

          {/* Surcharge control */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-12px font-medium text-[var(--text-secondary)]">
              Maggiorazione %
            </span>
            <input
              aria-label="Maggiorazione percentuale"
              className="h-8 w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)]/25 px-2.5 text-right font-mono text-13px font-semibold tabular-nums text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              inputMode="decimal"
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                const val = Number.parseFloat(raw);
                if (Number.isFinite(val) && val >= 0) onSurcharge(currentLine.id, val);
                else if (raw === "") onSurcharge(currentLine.id, 0);
              }}
              placeholder="0"
              type="text"
              value={currentLine.surchargePercent || ""}
            />
          </div>
        </div>

        {/* Measurement rows */}
        <div className="rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/50">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/40 px-4 py-2.5">
            <span className="text-11px font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Misure ({currentLine.measurementRows.length})
            </span>
            <button
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--accent-primary)]/8 px-2.5 text-11px font-bold text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/[0.12]"
              onClick={() => onAddMeasurementRow(currentLine.id)}
              type="button"
            >
              <Plus className="size-3.5" />
              Aggiungi
            </button>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]/30">
            {currentLine.measurementRows.map((row, idx) => (
              <div key={row.id}>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-muted)]/40"
                  onClick={() => handleToggleRow(row.id)}
                  type="button"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform",
                      !expandedRows.has(row.id) && "-rotate-90",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-12px font-medium text-[var(--text-secondary)]">
                    {row.description || `Riga ${idx + 1} — ${row.date || "senza data"}`}
                  </span>
                  <span className="shrink-0 font-mono text-12px font-bold tabular-nums text-[var(--text-primary)]">
                    {row.partialQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}{" "}
                    {row.unit}
                  </span>
                </button>
                {expandedRows.has(row.id) && (
                  <div className="border-t border-[var(--border-subtle)]/20 bg-[var(--bg-muted)]/15 px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-10px font-medium text-[var(--text-tertiary)]">
                          Data
                        </span>
                        <DatePicker
                          ariaLabel="Data misura"
                          className="mt-0.5 h-8 rounded-md border-[var(--border-subtle)]/35 px-2 text-12px"
                          iconClassName="size-3.5"
                          onChange={(value) =>
                            onUpdateMeasurementRow(currentLine.id, row.id, {
                              date: value,
                            })
                          }
                          placeholder="Data"
                          value={row.date}
                        />
                      </div>
                      <div>
                        <span className="text-10px font-medium text-[var(--text-tertiary)]">
                          Stazione / sezione
                        </span>
                        <input
                          aria-label="Stazione o sezione"
                          className="mt-0.5 h-8 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--surface-base)] px-2 text-12px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          onChange={(e) =>
                            onUpdateMeasurementRow(currentLine.id, row.id, {
                              station: e.target.value,
                            })
                          }
                          placeholder="Stazione"
                          type="text"
                          value={row.station ?? ""}
                        />
                      </div>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      <div>
                        <span className="text-10px font-medium text-[var(--text-tertiary)]">
                          Fattore 1
                        </span>
                        <input
                          aria-label="Fattore 1"
                          className="mt-0.5 h-8 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--surface-base)] px-2 text-right font-mono text-12px font-semibold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          inputMode="decimal"
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            const val = raw === "" ? 0 : Number.parseFloat(raw);
                            if (Number.isFinite(val) && val >= 0)
                              handleEditFactor(row.id, "factor1", val);
                          }}
                          type="text"
                          value={row.factor1 || ""}
                        />
                      </div>
                      <div>
                        <span className="text-10px font-medium text-[var(--text-tertiary)]">
                          Fattore 2
                        </span>
                        <input
                          aria-label="Fattore 2"
                          className="mt-0.5 h-8 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--surface-base)] px-2 text-right font-mono text-12px font-semibold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          inputMode="decimal"
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            const val = raw === "" ? 0 : Number.parseFloat(raw);
                            if (Number.isFinite(val) && val >= 0)
                              handleEditFactor(row.id, "factor2", val);
                          }}
                          type="text"
                          value={row.factor2 || ""}
                        />
                      </div>
                      <div>
                        <span className="text-10px font-medium text-[var(--text-tertiary)]">
                          Fattore 3
                        </span>
                        <input
                          aria-label="Fattore 3"
                          className="mt-0.5 h-8 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--surface-base)] px-2 text-right font-mono text-12px font-semibold tabular-nums text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                          inputMode="decimal"
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            const val = raw === "" ? 0 : Number.parseFloat(raw);
                            if (Number.isFinite(val) && val >= 0)
                              handleEditFactor(row.id, "factor3", val);
                          }}
                          type="text"
                          value={row.factor3 || ""}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-10px font-medium text-[var(--text-tertiary)]">
                        Descrizione
                      </span>
                      <input
                        aria-label="Descrizione misura"
                        className="mt-0.5 h-8 w-full rounded-md border border-[var(--border-subtle)]/35 bg-[var(--surface-base)] px-2 text-12px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                        onChange={(e) =>
                          onUpdateMeasurementRow(currentLine.id, row.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Descrizione misura"
                        type="text"
                        value={row.description}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-12px font-semibold text-[var(--accent-primary)]">
                        Parziale:{" "}
                        {row.partialQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}{" "}
                        {row.unit}
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--border-subtle)]/45 bg-[var(--surface-base)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                          onClick={() => onDuplicateMeasurementRow(currentLine.id, row.id)}
                          type="button"
                          aria-label="Duplica riga"
                        >
                          <Plus className="size-3" />
                        </button>
                        <button
                          className="flex size-7 items-center justify-center rounded-md border border-[var(--border-subtle)]/45 bg-[var(--surface-base)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)] disabled:opacity-30"
                          disabled={currentLine.measurementRows.length <= 1}
                          onClick={() => onRemoveMeasurementRow(currentLine.id, row.id)}
                          type="button"
                          aria-label="Elimina riga"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-[var(--surface-base)] p-4 ring-1 ring-[var(--border-subtle)]/50">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-12px">
              <span className="text-[var(--text-secondary)]">Qtà totale</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {currentLine.quantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}{" "}
                {currentLine.voice.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-12px">
              <span className="text-[var(--text-secondary)]">Importo lordo</span>
              <span className="font-semibold text-[var(--text-primary)]">
                <Currency value={currentLine.grossAmount} />
              </span>
            </div>
            {currentLine.surchargePercent > 0 && (
              <div className="flex items-center justify-between text-12px">
                <span className="text-[var(--info-base)]">
                  + Magg. {currentLine.surchargePercent}%
                </span>
                <span className="font-semibold text-[var(--info-base)]">
                  +<Currency value={currentLine.linkedCharges.reduce((s, c) => s + c.total, 0)} />
                </span>
              </div>
            )}
            {mgCharges.length > 0 && (
              <div className="flex items-center justify-between text-12px">
                <span className="text-[var(--info-base)]">+ MG distribuite</span>
                <span className="font-semibold text-[var(--info-base)]">
                  +<Currency value={mgCharges.reduce((s, c) => s + c.total, 0)} />
                </span>
              </div>
            )}
            {economicRules.discountEnabled && !currentLine.voice.isSafetyCost && (
              <div className="flex items-center justify-between text-12px">
                <span className="text-[var(--danger-base)]">
                  - Ribasso ({economicRules.discountPercent}%)
                </span>
                <span className="font-semibold text-[var(--danger-base)]">
                  -<Currency value={currentLine.discountAmount} />
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)]/30 pt-2 text-14px font-bold">
              <span className="text-[var(--accent-primary)]">Netto SAL</span>
              <span className="text-[var(--accent-primary)]">
                <Currency value={currentLine.totalAmount} />
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 text-11px"
            onClick={handleInspect}
            size="sm"
            type="button"
            variant="secondary"
          >
            Dettaglio completo
          </Button>
          <Button
            className="text-11px text-[var(--danger-base)]"
            onClick={() => onRemove(currentLine.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
            Rimuovi
          </Button>
        </div>
      </div>
    </div>
  );
});
