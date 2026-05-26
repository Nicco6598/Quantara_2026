import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Download,
  FileText,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Percent,
  Plus,
  Route,
  Trash2,
  X,
} from "lucide-react";
import {
  memo,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Currency } from "@/components/shared/Currency";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { DatePicker } from "@/components/shared/form";
import { Panel } from "@/components/shared/Panel";
import { StatusPill } from "@/components/shared/StatusPill";
import { SPRING_EASE } from "@/motion";
import type { SalTemplate } from "@/store/template-store";
import {
  buildIndexedVoiceOptions,
  buildTariffSearchTokens,
  filterIndexedVoiceOptions,
  type SalAutocompleteOption,
} from "./SalSearchBar";
import { TemplatePicker } from "./TemplatePicker";

export { Currency };

import { cn } from "@/lib/utils";
import { extractMgTariffPrefix, isMgCode } from "../domain/sal-calculations";
import { buildMeasurementTarget } from "../domain/sal-measurement-target";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLinkedCharge,
  SalLineView,
  SalMeasurementRowDraft,
  SalVoiceDraft,
} from "../types";

type SalSearchConfig = {
  voices: SalVoiceDraft[];
  tariffBookIds: string[];
  isLoading?: boolean;
  onSelectVoice: (voice: SalVoiceDraft) => void;
  onApplyTemplate: (template: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
};

const INITIAL_EXPANDED_MEASURE_ROWS = 8;

type ColumnKey = "#" | "code" | "description" | "unit" | "quantity" | "gross" | "net";

const SHEET_COLUMN_LABELS = [
  { key: "#" as ColumnKey, label: "#", right: false },
  { key: "code" as ColumnKey, label: "Codice", right: false },
  { key: "description" as ColumnKey, label: "Descrizione", right: false },
  { key: "unit" as ColumnKey, label: "UM", right: false },
  { key: "quantity" as ColumnKey, label: "Qt\u00e0", right: true },
  { key: "gross" as ColumnKey, label: "Lordo", right: true },
  { key: "net" as ColumnKey, label: "Netto", right: true },
] as const;

const SHEET_GRID_COLS = "grid-cols-[32px_116px_minmax(260px,1.5fr)_44px_90px_100px_108px]";
const SHEET_MIN_WIDTH = "min-w-[750px]";

const MEASURE_GRID_COLS =
  "grid-cols-[36px_120px_100px_minmax(200px,1fr)_68px_68px_68px_96px_minmax(140px,0.8fr)_68px]";
const MEASURE_MIN_WIDTH = "min-w-[900px]";

function ColumnHeader({
  columnKey,
  label,
  right,
  isNet,
}: {
  columnKey: ColumnKey;
  label: string;
  right: boolean;
  isNet?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center border-r border-[var(--border-subtle)]/30 px-2 py-1",
        right && "justify-end text-right",
        columnKey === "#" && "sticky left-0 z-20 justify-center bg-[var(--surface-base)]",
        columnKey === "code" && "sticky left-[32px] z-[9] bg-[var(--surface-base)]",
        isNet &&
          "sticky right-0 z-10 bg-[var(--accent-primary)]/[0.05] text-[var(--accent-primary)]",
      )}
    >
      {label}
    </div>
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
  economicRules,
  lines,
  availableVoices,
  copiedVoiceId,
  onAllocateMg,
  onAddMgVoice,
  onCopyLine,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onNotesChange,
  onRemove,
  onRemoveMeasurementRow,
  onSurcharge,
  onUpdateMeasurementRow,
  search,
}: {
  economicRules: SalEconomicRules;
  lines: SalLineView[];
  availableVoices: SalVoiceDraft[];
  copiedVoiceId: string | null;
  onAllocateMg: (mgLineId: string, targetLineIds: string[]) => void;
  onAddMgVoice: (voice: SalVoiceDraft) => void;
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
  search?: SalSearchConfig;
}) {
  const [allocPanelMgId, setAllocPanelMgId] = useState<string | null>(null);
  const tableLines = useMemo(() => lines.filter((line) => !isMgRow(line.voice)), [lines]);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    () => new Set(tableLines.slice(0, INITIAL_EXPANDED_MEASURE_ROWS).map((line) => line.id)),
  );
  const workLines = useMemo(
    () => tableLines.filter((line) => !line.voice.isSafetyCost),
    [tableLines],
  );
  const safetyLines = useMemo(
    () => tableLines.filter((line) => line.voice.isSafetyCost),
    [tableLines],
  );
  const mgLines = useMemo(() => lines.filter((line) => isMgRow(line.voice)), [lines]);
  const tariffMgSignals = useMemo(
    () => tableLines.filter((line) => hasTariffMaggiorazioneSignal(line)),
    [tableLines],
  );
  const manualSurchargeLines = useMemo(
    () => tableLines.filter((line) => line.surchargePercent > 0),
    [tableLines],
  );
  const suggestedMgVoices = useMemo(
    () => buildSuggestedMgVoices(tariffMgSignals, availableVoices, lines),
    [availableVoices, lines, tariffMgSignals],
  );
  const allExpanded = tableLines.length > 0 && expandedRows.size === tableLines.length;
  const hasSafetySection = safetyLines.length > 0;
  const prevLineIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(tableLines.map((l) => l.id));
    const newIds = tableLines.filter((l) => !prevLineIdsRef.current.has(l.id)).map((l) => l.id);
    if (newIds.length > 0) {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.add(id);
        return next;
      });
    }
    prevLineIdsRef.current = currentIds;
  }, [tableLines]);
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
      if (!item) return 40;
      if (item.type === "section") return 32;
      const rowCount = Math.max(1, item.line.measurementRows.length);
      return expandedRows.has(item.line.id) ? 220 + rowCount * 42 : 40;
    },
    getItemKey: (index) => registerItems[index]?.id ?? index,
    getScrollElement: () => scrollRef.current,
    overscan: 3,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer]);

  useEffect(() => {
    setExpandedRows((current) => {
      const validIds = new Set(tableLines.map((line) => line.id));
      const next = new Set([...current].filter((lineId) => validIds.has(lineId)));
      return next.size === current.size ? current : next;
    });
  }, [tableLines]);

  const handleToggleRow = useCallback((lineId: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }, []);

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

  const deferredSearchVoices = useDeferredValue(search?.voices ?? []);
  const searchIndex = useMemo(
    () => buildIndexedVoiceOptions(deferredSearchVoices),
    [deferredSearchVoices],
  );
  const voiceByOptionId = useMemo(
    () => new Map(deferredSearchVoices.map((v) => [v.id, v])),
    [deferredSearchVoices],
  );
  const searchTariffBookCount = search?.tariffBookIds.length ?? 0;
  const tariffTokensByBookId = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const voice of deferredSearchVoices) {
      if (searchTariffBookCount > 0 && result.size >= searchTariffBookCount) break;
      if (!result.has(voice.tariffBookId)) {
        result.set(voice.tariffBookId, buildTariffSearchTokens(voice));
      }
    }
    return result;
  }, [deferredSearchVoices, searchTariffBookCount]);

  const filterOptions = useCallback(
    (_options: SalAutocompleteOption[], query: string) => {
      return filterIndexedVoiceOptions({
        index: searchIndex,
        query,
        tariffTokensByBookId,
      });
    },
    [searchIndex, tariffTokensByBookId],
  );

  const allocPanelMgLine = allocPanelMgId
    ? lines.find((line) => line.id === allocPanelMgId)
    : undefined;

  const renderRow = useCallback(
    (line: SalLineView, index: number) => (
      <SelectedVoiceRow
        key={line.id}
        index={index}
        line={line}
        gridCols={SHEET_GRID_COLS}
        expanded={expandedRows.has(line.id)}
        isCopied={copiedVoiceId === line.id}
        onCopy={onCopyLine}
        onAddMeasurementRow={onAddMeasurementRow}
        onDuplicateMeasurementRow={onDuplicateMeasurementRow}
        onNotesChange={onNotesChange}
        onRemove={onRemove}
        onRemoveMeasurementRow={onRemoveMeasurementRow}
        onSurcharge={onSurcharge}
        onToggle={handleToggleRow}
        onUpdateMeasurementRow={onUpdateMeasurementRow}
      />
    ),
    [
      expandedRows,
      copiedVoiceId,
      onCopyLine,
      onAddMeasurementRow,
      onDuplicateMeasurementRow,
      onNotesChange,
      onRemove,
      onRemoveMeasurementRow,
      onSurcharge,
      handleToggleRow,
      onUpdateMeasurementRow,
    ],
  );

  const summaryText =
    lines.length === 0
      ? "Nessuna voce inserita"
      : `${tableLines.length} voc${tableLines.length === 1 ? "e" : "i"} misurabil${tableLines.length === 1 ? "e" : "i"}${
          mgLines.length > 0
            ? `, ${mgLines.length} maggiorazion${mgLines.length === 1 ? "e" : "i"} MG`
            : ""
        }${safetyLines.length > 0 ? `, ${safetyLines.length} OS` : ""}`;
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]">
      {mgLines.length > 0 || tariffMgSignals.length > 0 || manualSurchargeLines.length > 0 ? (
        <div className="border-b border-[var(--border-subtle)]/30 bg-[var(--bg-muted)]/20 p-2">
          <MaggiorazioniStepPanel
            economicRules={economicRules}
            lines={tableLines}
            manualSurchargeLines={manualSurchargeLines}
            mgLines={mgLines}
            suggestedMgVoices={suggestedMgVoices}
            tariffMgSignals={tariffMgSignals}
            onAddMgVoice={onAddMgVoice}
            onApplyAllocation={onAllocateMg}
            onOpenAllocation={setAllocPanelMgId}
            onRemove={onRemove}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-[var(--surface-base)]" ref={scrollRef}>
        <div className={cn(SHEET_MIN_WIDTH, "relative")}>
          <div className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)]/30 px-3 py-2">
              <div className="min-w-0">
                <span className="text-13px font-bold text-[var(--text-primary)]">
                  Registro misure
                </span>
                <span className="ml-2 text-12px font-semibold text-[var(--text-secondary)]">
                  {summaryText}
                </span>
              </div>

              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                {search && (
                  <div className="min-w-[320px] flex-1 xl:w-[500px] xl:flex-none">
                    <AutocompleteInput
                      options={[]}
                      onSelect={(o) => {
                        const v =
                          (o.id ? voiceByOptionId.get(o.id) : undefined) ??
                          search.voices.find((x) => x.code === o.value);
                        if (v) search.onSelectVoice(v);
                      }}
                      placeholder={
                        search.isLoading
                          ? `Caricamento voci (${search.tariffBookIds.length} tariffari)...`
                          : `Cerca codice, descrizione o categoria (${search.voices.length} voci)`
                      }
                      filterOptions={filterOptions}
                    />
                  </div>
                )}
                {search?.isLoading && (
                  <span className="inline-flex h-8 items-center gap-1 rounded-md bg-[var(--bg-muted)] px-2 text-11px font-medium text-[var(--text-tertiary)]">
                    <Loader2 className="size-3 animate-spin" />
                    Caricamento
                  </span>
                )}
                {search && (
                  <>
                    <TemplatePicker
                      onApply={search.onApplyTemplate}
                      tariffBookId={search.tariffBookIds[0] ?? ""}
                    />
                    {tableLines.length > 0 && (
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-subtle)]/60 bg-[var(--surface-base)] px-2.5 text-11px font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                        onClick={search.onOpenTemplateDialog}
                        type="button"
                      >
                        <BookOpen className="size-3.5" />
                        Template
                      </button>
                    )}
                  </>
                )}
                <button
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.08] px-2.5 text-11px font-black text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/[0.13]"
                  onClick={handleToggleAll}
                  title="Ctrl+Shift+E"
                  type="button"
                >
                  {allExpanded ? (
                    <ChevronsUp className="size-3.5" />
                  ) : (
                    <ChevronsDown className="size-3.5" />
                  )}
                  {allExpanded ? "Comprimi" : "Espandi"}
                </button>
              </div>
            </div>

            <div
              className={cn(
                "grid border-b border-[var(--border-subtle)] bg-[var(--surface-base)] text-11px font-semibold uppercase tracking-wide text-[var(--text-secondary)]",
                SHEET_GRID_COLS,
              )}
            >
              {SHEET_COLUMN_LABELS.map(({ key, label, right }, index) => (
                <ColumnHeader
                  key={key}
                  columnKey={key}
                  label={label}
                  right={right}
                  isNet={index === 6}
                />
              ))}
            </div>
          </div>

          {/* Virtualized rows */}
          {tableLines.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center">
              <div className="text-center">
                <p className="text-14px font-bold text-[var(--text-secondary)]">
                  Il foglio misure &egrave; vuoto
                </p>
                <p className="mt-1.5 text-13px text-[var(--text-tertiary)]">
                  Cerca una voce tariffaria: ogni voce diventa una riga modificabile in griglia.
                </p>
              </div>
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
                        gridCols={SHEET_GRID_COLS}
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

      {allocPanelMgLine ? (
        <MgAllocationPanel
          economicRules={economicRules}
          lineViews={lines}
          mgLine={allocPanelMgLine}
          onClose={() => setAllocPanelMgId(null)}
          onSave={onAllocateMg}
        />
      ) : null}
    </section>
  );
});

function RegisterSectionHeader({
  amount,
  count,
  gridCols,
  label,
  tone,
}: {
  amount: number;
  count: number;
  gridCols: string;
  label: string;
  tone: "safety" | "work";
}) {
  return (
    <div
      className={cn(
        "grid border-b border-[var(--border-subtle)]/30 text-12px",
        gridCols,
        tone === "safety" ? "bg-[var(--danger-soft)]/60" : "bg-[var(--accent-primary)]/[0.04]",
      )}
    >
      <div className="sticky left-0 z-10 flex min-h-7 items-center justify-center border-r border-[var(--border-subtle)]/25 bg-inherit font-mono text-10px font-bold text-[var(--text-tertiary)]">
        #
      </div>
      <div className="flex min-h-7 items-center border-r border-[var(--border-subtle)]/25 px-2 bg-inherit">
        <span
          className={cn(
            "size-2.5 rounded-sm shrink-0",
            tone === "safety" ? "bg-[var(--danger-base)]" : "bg-[var(--accent-primary)]",
          )}
        />
      </div>
      <div className="col-span-3 flex min-h-7 items-center gap-2 border-r border-[var(--border-subtle)]/25 px-2 bg-inherit">
        <span className="text-11px font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          {label}
        </span>
        <span className="text-10px text-[var(--text-tertiary)]">
          {count} voc{count === 1 ? "e" : "i"}
        </span>
      </div>
      <div />
      <div />
      <div
        className={cn(
          "flex items-center justify-end px-2 text-12px font-bold tabular-nums",
          tone === "safety" ? "text-[var(--danger-base)]" : "text-[var(--accent-primary)]",
        )}
      >
        <Currency value={amount} />
      </div>
      <div className="sticky right-0 z-10 flex min-h-7 items-center justify-end border-l border-[var(--border-subtle)]/25 bg-inherit px-2 font-bold tabular-nums" />
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

function normalizeVoiceCode(code: string): string {
  return code.trim().toUpperCase();
}

function hasTariffMaggiorazioneSignal(line: SalLineView): boolean {
  return (
    (line.voice.linkedMaggiorazioni?.length ?? 0) > 0 ||
    line.voice.applicabilityRules?.mentionsMaggiorazione === true
  );
}

function getEligibleMgTargets(mgLine: SalLineView, lines: SalLineView[]): SalLineView[] {
  const prefix = getMgTariffPrefix(mgLine.voice.code);
  return lines.filter((line) => {
    if (isMgCode(line.voice.code)) return false;
    if (line.grossAmount <= 0) return false;
    if (!prefix) return true;
    return line.voice.code.startsWith(`${prefix}.`);
  });
}

function buildSuggestedMgVoices(
  tariffMgSignals: SalLineView[],
  availableVoices: SalVoiceDraft[],
  selectedLines: SalLineView[],
): SalVoiceDraft[] {
  const selectedVoiceIds = new Set(selectedLines.map((line) => line.voice.id));
  const selectedCodes = new Set(selectedLines.map((line) => normalizeVoiceCode(line.voice.code)));
  const availableMgVoices = availableVoices.filter(
    (voice) => isMgCode(voice.code) && !selectedVoiceIds.has(voice.id),
  );
  if (availableMgVoices.length === 0) return [];

  const explicitRefs = new Set<string>();
  const signalPrefixes = new Set<string>();
  for (const line of tariffMgSignals) {
    const prefix = line.voice.code.split(".")[0];
    if (prefix) signalPrefixes.add(normalizeVoiceCode(prefix));
    for (const ref of line.voice.linkedMaggiorazioni ?? []) {
      explicitRefs.add(normalizeVoiceCode(ref));
    }
  }

  const suggestions = availableMgVoices.filter((voice) => {
    const code = normalizeVoiceCode(voice.code);
    if (selectedCodes.has(code)) return false;
    if (explicitRefs.has(code)) return true;
    const prefix = getMgTariffPrefix(code);
    return prefix ? signalPrefixes.has(normalizeVoiceCode(prefix)) : tariffMgSignals.length > 0;
  });

  return suggestions.slice(0, 6);
}

function getManualSurchargeTotal(line: SalLineView): number {
  return line.linkedCharges
    .filter((charge) => !charge.code.startsWith("MG."))
    .reduce((sum, charge) => sum + charge.total, 0);
}

function getMgLinkedTotal(line: SalLineView): number {
  return line.linkedCharges
    .filter((charge) => charge.code.startsWith("MG."))
    .reduce((sum, charge) => sum + charge.total, 0);
}

function MaggiorazioniStepPanel({
  economicRules,
  lines,
  manualSurchargeLines,
  mgLines,
  suggestedMgVoices,
  tariffMgSignals,
  onAddMgVoice,
  onApplyAllocation,
  onOpenAllocation,
  onRemove,
}: {
  economicRules: SalEconomicRules;
  lines: SalLineView[];
  manualSurchargeLines: SalLineView[];
  mgLines: SalLineView[];
  suggestedMgVoices: SalVoiceDraft[];
  tariffMgSignals: SalLineView[];
  onAddMgVoice: (voice: SalVoiceDraft) => void;
  onApplyAllocation: (mgLineId: string, targetLineIds: string[]) => void;
  onOpenAllocation: (mgLineId: string) => void;
  onRemove: (mgLineId: string) => void;
}) {
  const totalMg = lines.reduce((sum, line) => sum + getMgLinkedTotal(line), 0);
  const manualTotal = manualSurchargeLines.reduce(
    (sum, line) => sum + getManualSurchargeTotal(line),
    0,
  );
  const pendingSignals = tariffMgSignals.filter(
    (line) => getMgLinkedTotal(line) <= 0 && line.surchargePercent <= 0,
  );

  const [collapsed, setCollapsed] = useState(mgLines.length > 3);
  const visibleMg = collapsed ? mgLines.slice(0, 3) : mgLines;
  const visibleSignals = tariffMgSignals.slice(0, 2);
  const hasMoreMg = mgLines.length > 3;
  const hasMoreSignals = tariffMgSignals.length > visibleSignals.length;

  return (
    <div className="border-b border-[var(--border-subtle)]/25 bg-[var(--bg-muted)]/30 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex h-5 items-center gap-1 rounded bg-[var(--info-soft)] px-1.5 text-10px font-black uppercase tracking-wider text-[var(--info-base)]">
          <Percent className="size-3" />
          MG
        </span>
        {pendingSignals.length > 0 ? (
          <span className="inline-flex h-5 items-center gap-1 rounded bg-[var(--warning-soft)] px-1.5 text-10px font-bold text-[var(--warning-base)]">
            <AlertTriangle className="size-3" />
            {pendingSignals.length} da valutare
          </span>
        ) : null}
        <span className="ml-auto font-mono text-11px font-bold tabular-nums text-[var(--info-base)]">
          +<Currency value={totalMg + manualTotal} />
        </span>
      </div>

      {mgLines.length > 0 || tariffMgSignals.length > 0 ? (
        <div className="flex flex-wrap items-start gap-1.5">
          {visibleMg.map((mgLine) => (
            <MgRuleCard
              compact
              economicRules={economicRules}
              key={mgLine.id}
              lines={lines}
              mgLine={mgLine}
              onApplyAllocation={onApplyAllocation}
              onOpenAllocation={onOpenAllocation}
              onRemove={onRemove}
            />
          ))}
          {hasMoreMg ? (
            <button
              className="inline-flex h-7 items-center rounded border border-dashed border-[var(--border-subtle)]/60 bg-[var(--surface-base)]/70 px-2 text-10px font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)]"
              onClick={() => setCollapsed(!collapsed)}
              type="button"
            >
              {collapsed ? `+${mgLines.length - 3} MG` : "Meno"}
            </button>
          ) : null}
          {visibleSignals.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSignals.map((line) => (
                <span
                  className="inline-flex h-6 items-center gap-1 rounded bg-[var(--warning-soft)]/40 px-1.5 text-10px font-bold text-[var(--warning-base)]"
                  key={line.id}
                >
                  <AlertTriangle className="size-3" />
                  {line.voice.code} segnala MG
                </span>
              ))}
              {hasMoreSignals ? (
                <span className="text-10px font-semibold text-[var(--text-tertiary)]">
                  +{tariffMgSignals.length - visibleSignals.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          className="p-3"
          description="Le maggiorazioni si generano dalle voci collegate nel tariffario."
          icon={Percent}
          title="Nessuna voce MG"
        />
      )}

      {suggestedMgVoices.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded bg-[var(--info-soft)]/30 px-2 py-1.5">
          <span className="mr-1 flex items-center gap-1 text-10px font-black uppercase tracking-wider text-[var(--info-base)]">
            <ListChecks className="size-3" />
            Suggerite
          </span>
          {suggestedMgVoices.map((voice) => (
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded bg-[var(--surface-base)] px-2 text-10px font-bold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]/60 transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--accent-primary)]"
              key={voice.id}
              onClick={() => onAddMgVoice(voice)}
              type="button"
            >
              <Plus className="size-3 text-[var(--info-base)]" />
              <span className="font-mono">{voice.code}</span>
              <span className="text-[var(--text-tertiary)]">
                {voice.unitPrice.toLocaleString("it-IT")}%
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MgRuleCard({
  compact,
  economicRules,
  lines,
  mgLine,
  onApplyAllocation,
  onOpenAllocation,
  onRemove,
}: {
  compact?: boolean;
  economicRules: SalEconomicRules;
  lines: SalLineView[];
  mgLine: SalLineView;
  onApplyAllocation: (mgLineId: string, targetLineIds: string[]) => void;
  onOpenAllocation: (mgLineId: string) => void;
  onRemove: (mgLineId: string) => void;
}) {
  const prefix = getMgTariffPrefix(mgLine.voice.code);
  const manualAlloc = economicRules.mgManualAllocations?.[mgLine.id];
  const hasManual = manualAlloc != null;
  const autoTargets = getEligibleMgTargets(mgLine, lines);
  const targetCount = hasManual ? manualAlloc.length : autoTargets.length;
  const total = mgLine.linkedCharges.find((entry) => entry.code.startsWith("MG."))?.total ?? 0;
  const isDisabled = hasManual && manualAlloc.length === 0;
  const targetIds = autoTargets.map((line) => line.id);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)]/30 bg-[var(--surface-base)] px-2.5 py-1 text-11px">
        <span className="font-mono text-11px font-black text-[var(--text-primary)]">
          {mgLine.voice.code}
        </span>
        <span className="inline-flex items-center rounded bg-[var(--info-soft)] px-1 py-0.5 text-10px font-black tabular-nums text-[var(--info-base)]">
          {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
        </span>
        <span className="text-[var(--text-tertiary)] text-10px">
          {isDisabled ? "disattivata" : hasManual ? `${targetCount} voci` : (prefix ?? "tutte")}
        </span>
        <span className="font-mono text-11px font-bold tabular-nums text-[var(--accent-primary)]">
          <Currency value={total} />
        </span>
        <Button
          className="h-6 px-1.5 text-10px"
          onClick={() => onOpenAllocation(mgLine.id)}
          size="sm"
          type="button"
          variant="outline"
        >
          Scegli
        </Button>
        <Button
          className="h-6 px-1.5 text-10px text-[var(--danger-base)]"
          onClick={() => onApplyAllocation(mgLine.id, [])}
          size="sm"
          type="button"
          variant="outline"
        >
          Escludi
        </Button>
        <button
          aria-label={`Rimuovi ${mgLine.voice.code}`}
          className="flex size-5 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
          onClick={() => onRemove(mgLine.id)}
          type="button"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border bg-[var(--surface-base)]/82 p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto]",
        isDisabled
          ? "border-[var(--danger-base)]/25"
          : hasManual
            ? "border-[var(--accent-primary)]/35"
            : "border-[var(--border-subtle)]/55",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-12px font-black text-[var(--text-primary)]">
            {mgLine.voice.code}
          </span>
          <span className="rounded-sm bg-[var(--info-soft)] px-1.5 py-0.5 text-10px font-black text-[var(--info-base)]">
            {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-11px text-[var(--text-tertiary)]">
          <Route className="size-3.5" />
          {isDisabled
            ? "disattivata"
            : hasManual
              ? `${targetCount} destinatar${targetCount === 1 ? "ia" : "ie"} manuali`
              : prefix
                ? `auto su prefisso ${prefix}`
                : "auto su tutte le voci"}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            className="inline-flex h-7 items-center rounded-md bg-[var(--accent-primary)] px-2 text-11px font-bold text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={targetIds.length === 0}
            onClick={() => onApplyAllocation(mgLine.id, targetIds)}
            type="button"
          >
            Applica proposta
          </button>
          <button
            className="inline-flex h-7 items-center rounded-md bg-[var(--bg-muted)] px-2 text-11px font-bold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/60 transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
            onClick={() => onOpenAllocation(mgLine.id)}
            type="button"
          >
            Scegli voci
          </button>
          <button
            className="inline-flex h-7 items-center rounded-md bg-[var(--danger-soft)] px-2 text-11px font-bold text-[var(--danger-base)] transition-opacity hover:opacity-85"
            onClick={() => onApplyAllocation(mgLine.id, [])}
            type="button"
          >
            Escludi
          </button>
        </div>
      </div>
      <div className="flex min-w-[120px] items-center justify-between gap-2 md:justify-end">
        <div className="text-right">
          <div className="text-12px font-black tabular-nums text-[var(--accent-primary)]">
            <Currency value={total} />
          </div>
          <div className="text-10px font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            importo MG
          </div>
        </div>
        <button
          aria-label={`Rimuovi ${mgLine.voice.code}`}
          className="flex size-8 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
          onClick={() => onRemove(mgLine.id)}
          title="Rimuovi voce MG dal SAL"
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function MgAllocationPanel({
  economicRules,
  lineViews,
  mgLine,
  onClose,
  onSave,
}: {
  economicRules: SalEconomicRules;
  lineViews: SalLineView[];
  mgLine: SalLineView;
  onClose: () => void;
  onSave: (mgLineId: string, targetLineIds: string[]) => void;
}) {
  const prefix = getMgTariffPrefix(mgLine.voice.code);
  const eligible = useMemo(
    () =>
      lineViews.filter((line) => {
        if (isMgCode(line.voice.code)) return false;
        if (line.grossAmount <= 0) return false;
        if (prefix) return line.voice.code.startsWith(`${prefix}.`);
        return true;
      }),
    [lineViews, prefix],
  );
  const currentAlloc = economicRules.mgManualAllocations?.[mgLine.id];
  const eligibleIds = useMemo(() => new Set(eligible.map((l) => l.id)), [eligible]);
  const validAlloc = useMemo(
    () => currentAlloc?.filter((id) => eligibleIds.has(id)),
    [currentAlloc, eligibleIds],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(validAlloc && validAlloc.length > 0 ? validAlloc : eligible.map((l) => l.id)),
  );
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const allSelected = selected.size === eligible.length;
  const someSelected = selected.size > 0 && !allSelected;

  const handleToggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === eligible.length) return new Set();
      return new Set(eligible.map((l) => l.id));
    });
  }, [eligible]);

  const handleToggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    onSave(mgLine.id, [...selectedRef.current]);
    onClose();
  }, [onSave, mgLine.id, onClose]);

  const handleRemove = useCallback(() => {
    onSave(mgLine.id, []);
    onClose();
  }, [onSave, mgLine.id, onClose]);

  return (
    <Dialog className="max-w-xl" contentClassName="p-0" isOpen onClose={onClose} title="">
      <Panel padding="none">
        <div className="border-b border-[var(--border-subtle)]/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/[0.1]">
              <ListChecks className="size-5 text-[var(--accent-primary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-14px font-bold text-[var(--text-primary)]">
                {mgLine.voice.code}
                <span className="ml-2 font-mono text-[var(--accent-primary)]">
                  {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
                </span>
              </h3>
              <p className="mt-0.5 text-12px text-[var(--text-tertiary)]">
                {prefix
                  ? `Assegnazione su voci con prefisso ${prefix}`
                  : "Assegnazione su tutte le voci"}
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <Badge variant="info">{eligible.length} disponibili</Badge>
                </span>
              </p>
            </div>
          </div>
        </div>

        {eligible.length === 0 ? (
          <div className="px-5 py-8 text-center text-13px text-[var(--text-tertiary)]">
            Nessuna voce {prefix ? `con prefisso ${prefix}` : ""} con importo positivo disponibile.
          </div>
        ) : (
          <>
            <div className="px-5 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-[var(--bg-muted)]/25 px-3 py-2.5 text-12px font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]/40">
                <input
                  checked={allSelected}
                  className="size-4 rounded border-[var(--border-subtle)] text-[var(--accent-primary)] focus:ring-[var(--ring-focus)]"
                  onChange={handleToggleAll}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  type="checkbox"
                />
                <span>{allSelected ? "Deseleziona tutto" : "Seleziona tutto"}</span>
                <span className="ml-auto font-mono text-11px tabular-nums text-[var(--text-tertiary)]">
                  {selected.size}/{eligible.length}
                </span>
              </label>
            </div>

            <div className="max-h-[300px] overflow-y-auto border-t border-[var(--border-subtle)]/30">
              {eligible.map((line, idx) => (
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-b border-[var(--border-subtle)]/20 px-5 py-2.5 text-12px transition-colors hover:bg-[var(--accent-primary)]/[0.03]",
                    idx % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/15",
                  )}
                  key={line.id}
                >
                  <input
                    checked={selected.has(line.id)}
                    className="size-4 rounded border-[var(--border-subtle)] text-[var(--accent-primary)] focus:ring-[var(--ring-focus)]"
                    onChange={() => handleToggle(line.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold text-[var(--text-primary)]">
                    {line.voice.code}
                  </span>
                  <span className="hidden min-w-0 max-w-[260px] truncate text-[var(--text-tertiary)] sm:block">
                    {line.voice.description}
                  </span>
                  <span className="shrink-0 font-mono text-11px font-bold tabular-nums text-[var(--text-secondary)]">
                    <Currency value={line.grossAmount} />
                  </span>
                </label>
              ))}
            </div>

            <DialogActions className="items-center justify-between px-5 py-3">
              <Button onClick={handleRemove} size="sm" variant="ghost">
                <Trash2 className="size-3.5" />
                Rimuovi MG
              </Button>
              <div className="flex items-center gap-2">
                <Button onClick={onClose} size="sm" variant="secondary">
                  Annulla
                </Button>
                <Button onClick={handleSave} size="sm" variant="primary">
                  <Check className="size-3.5" />
                  Applica a {selected.size} voc{selected.size === 1 ? "e" : "i"}
                </Button>
              </div>
            </DialogActions>
          </>
        )}
      </Panel>
    </Dialog>
  );
}

const SelectedVoiceRow = memo(function SelectedVoiceRow({
  index,
  line,
  gridCols,
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
  gridCols: string;
  expanded: boolean;
  isCopied: boolean;
  onCopy: (lineId: string) => void;
  onAddMeasurementRow: (lineId: string) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
  onSurcharge: (lineId: string, percent: number) => void;
  onToggle: (lineId: string) => void;
  onUpdateMeasurementRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
}) {
  const isIncomplete = line.status !== "complete";
  const hasTariffMgSignal = hasTariffMaggiorazioneSignal(line);
  const mgLinkedTotal = getMgLinkedTotal(line);
  const hasMissingMgDecision =
    hasTariffMgSignal && mgLinkedTotal <= 0 && line.surchargePercent <= 0;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: div[role=button] needed for grid layout, <button> can't be a grid container */}
      <div
        data-line-id={line.id}
        role="button"
        tabIndex={0}
        className={cn(
          "group grid cursor-pointer border-b border-[var(--border-subtle)]/30 text-13px transition-colors [content-visibility:auto] [contain-intrinsic-size:40px] hover:bg-[var(--accent-primary)]/[0.03]",
          gridCols,
          index % 2 !== 0 && "bg-[var(--bg-muted)]/5",
          expanded &&
            "shadow-[inset_3px_0_0_var(--accent-primary)] bg-[var(--accent-primary)]/[0.03]",
          isIncomplete && !expanded && "shadow-[inset_3px_0_0_var(--warning-base)]/60",
        )}
        title={
          isIncomplete
            ? "Voce incompleta: inserisci una quantit\u00e0 maggiore di zero."
            : undefined
        }
        onClick={() => {
          onToggle(line.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(line.id);
          }
        }}
      >
        {/* N. + status indicator */}
        <GridCell className="sticky left-0 z-10 bg-inherit px-0" muted>
          <span className="flex h-full w-full min-h-[40px] items-center justify-center gap-1.5 text-[var(--text-secondary)]">
            <span
              className={cn(
                "size-[6px] rounded-full shrink-0",
                isIncomplete
                  ? "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]"
                  : "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
              )}
            />
            <span className="font-mono text-11px font-bold tabular-nums">{index + 1}</span>
            <ChevronDown
              className={cn(
                "size-3 transition-transform opacity-40 group-hover:opacity-100",
                !expanded && "-rotate-90",
              )}
            />
          </span>
        </GridCell>

        {/* Codice */}
        <GridCell className="sticky left-[32px] z-[9] bg-inherit" muted>
          <span className="whitespace-nowrap font-mono text-12px font-semibold text-[var(--text-secondary)]">
            {line.voice.code}
          </span>
        </GridCell>

        {/* Descrizione */}
        <GridCell className="relative">
          <div className="min-w-0">
            <div
              className="truncate text-13px font-medium text-[var(--text-primary)]"
              title={line.voice.category || undefined}
            >
              {line.voice.description}
            </div>
            <div className="flex items-center gap-1">
              {line.voice.isSafetyCost && (
                <span className="inline-flex items-center gap-0.5 rounded bg-[var(--danger-soft)] px-1 text-10px font-bold text-[var(--danger-base)]">
                  OS
                </span>
              )}
            </div>
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              aria-label={isCopied ? "Copiata" : "Copia voce"}
              className={cn(
                "flex size-6 items-center justify-center rounded transition-all",
                isCopied
                  ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onCopy(line.id);
              }}
              type="button"
              title={isCopied ? "Voce copiata - premi Ctrl+V per incollare" : "Copia voce"}
            >
              {isCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </button>
            <button
              aria-label={`Rimuovi ${line.voice.code}`}
              className="flex size-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(line.id);
              }}
              type="button"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </GridCell>

        {/* UM */}
        <GridCell muted>
          <span className="text-11px font-semibold text-[var(--text-tertiary)]">
            {line.voice.unit}
          </span>
        </GridCell>

        {/* Qtà */}
        <GridCell align="right">
          <span className="text-13px font-semibold tabular-nums text-[var(--text-primary)]">
            <NumberValue value={line.quantity} />
          </span>
        </GridCell>

        {/* Lordo */}
        <GridCell align="right" className="relative">
          <div className="flex flex-col items-end">
            <span className="text-13px font-semibold tabular-nums text-[var(--text-primary)]">
              <Currency value={line.grossAmount} />
            </span>
            {(line.discountAmount > 0 || line.surchargePercent > 0 || mgLinkedTotal > 0) && (
              <span className="text-10px tabular-nums text-[var(--text-tertiary)]">
                {line.discountAmount > 0 && (
                  <span className="text-[var(--danger-base)]">
                    -{((line.discountAmount / line.grossAmount) * 100).toFixed(1)}%
                  </span>
                )}
                {line.discountAmount > 0 && (line.surchargePercent > 0 || mgLinkedTotal > 0) && " "}
                {(line.surchargePercent > 0 || mgLinkedTotal > 0) && (
                  <span className="text-[var(--info-base)]">+MG</span>
                )}
              </span>
            )}
          </div>
        </GridCell>

        {/* Netto SAL */}
        <div className="sticky right-0 z-10 flex min-h-[40px] min-w-0 items-center justify-end border-l border-[var(--border-subtle)]/30 bg-[var(--accent-primary)]/[0.04] px-2 py-1">
          <span className="text-13px font-bold tabular-nums text-[var(--accent-primary)]">
            <Currency value={line.totalAmount} />
          </span>
        </div>
      </div>

      {/* Expanded: info bar + measurement rows */}
      {expanded && (
        <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--bg-muted)]/24">
          {/* Info bar: price, discount, MG% */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)]/25 bg-[var(--surface-base)] px-3 py-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-12px font-semibold text-[var(--text-primary)]">
              <span className="text-[var(--text-tertiary)] text-10px uppercase tracking-wider">
                Prezzo
              </span>
              <Currency value={line.voice.unitPrice} />
            </span>
            {line.discountAmount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--danger-soft)]/60 px-2 py-0.5 text-12px font-semibold text-[var(--danger-base)]">
                <span className="text-10px uppercase tracking-wider">Ribasso</span>
                -<Currency value={line.discountAmount} />
              </span>
            )}
            {line.voice.isSafetyCost && line.discountAmount === 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-12px font-medium text-[var(--text-secondary)]">
                Esclusa dal ribasso
              </span>
            )}
            {line.surchargePercent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--info-soft)] px-2 py-0.5 text-12px font-bold tabular-nums text-[var(--info-base)]">
                <span className="text-10px uppercase tracking-wider font-semibold">MG</span>+
                {line.surchargePercent.toLocaleString("it-IT")}%
              </span>
            )}
            {mgLinkedTotal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--info-soft)]/50 px-2 py-0.5 text-12px font-semibold tabular-nums text-[var(--info-base)]">
                <Percent className="size-3" />
                +<Currency value={mgLinkedTotal} />
              </span>
            )}
            <label className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)]/40 bg-[var(--surface-base)] px-2 py-0.5 text-12px">
              <span className="text-10px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                MG%
              </span>
              <input
                aria-label={`Maggiorazione % per ${line.voice.code}`}
                className={cn(
                  "h-6 w-14 rounded-sm border px-1.5 text-right font-mono text-12px font-bold tabular-nums outline-none transition",
                  hasMissingMgDecision
                    ? "border-[var(--warning-base)]/40 bg-[var(--warning-soft)]/30 text-[var(--warning-base)]"
                    : "border-transparent bg-transparent text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]",
                )}
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
            </label>
            {line.voice.isSafetyCost && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-10px font-bold text-[var(--danger-base)]">
                OS
              </span>
            )}
            {hasMissingMgDecision && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-10px font-bold text-[var(--warning-base)]">
                <AlertTriangle className="size-3" />
                MG?
              </span>
            )}
            {isIncomplete && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-10px font-bold text-[var(--warning-base)]">
                Da completare
              </span>
            )}
          </div>

          <MeasurementRowsTable
            lineId={line.id}
            voiceCode={line.voice.code}
            voiceDescription={line.voice.description}
            rows={line.measurementRows}
            unit={line.voice.unit}
            totalQuantity={line.quantity}
            linkedCharges={line.linkedCharges}
            grossAmount={line.grossAmount}
            totalAmount={line.totalAmount}
            unitPrice={line.voice.unitPrice}
            surchargePercent={line.surchargePercent}
            laborPercentage={line.voice.laborPercentage ?? 0}
            onSurcharge={onSurcharge}
            onAddRow={onAddMeasurementRow}
            onRemoveRow={onRemoveMeasurementRow}
            onDuplicateRow={onDuplicateMeasurementRow}
            onUpdateRow={onUpdateMeasurementRow}
          />
          <VoiceNotes
            lineId={line.id}
            linkedCharges={line.linkedCharges}
            notes={line.notes}
            onNotesChange={onNotesChange}
          />
        </div>
      )}
    </>
  );
});

function MeasurementRowsTable({
  lineId,
  voiceCode,
  voiceDescription: _voiceDescription,
  rows,
  unit,
  totalQuantity,
  linkedCharges,
  grossAmount,
  totalAmount,
  unitPrice: _unitPrice,
  surchargePercent: _surchargePercent,
  laborPercentage,
  onSurcharge: _onSurcharge,
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
  linkedCharges: SalLinkedCharge[];
  grossAmount: number;
  totalAmount: number;
  unitPrice: number;
  surchargePercent: number;
  laborPercentage: number;
  onSurcharge: (lineId: string, percent: number) => void;
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
    <div className="ml-[32px] min-w-0 border-l border-[var(--accent-primary)]/25 bg-[var(--surface-base)]">
      <div className="overflow-x-auto">
        <div className={MEASURE_MIN_WIDTH}>
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/15 px-3 py-1.5">
            <span className="font-mono text-11px font-bold text-[var(--text-primary)]">
              {voiceCode}
            </span>
            <span className="text-11px tabular-nums text-[var(--text-secondary)]">
              {rows.length} rig{rows.length === 1 ? "a" : "he"},{" "}
              {totalQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })} {unit}
            </span>
            {lastRow && (
              <button
                className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-subtle)]/50 bg-[var(--surface-base)] px-2 text-11px font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
                onClick={() =>
                  onDuplicateRow(lineId, buildMeasurementTarget(lastRow.id, rows.length - 1))
                }
                type="button"
              >
                <Copy className="size-3" />
                Duplica
              </button>
            )}
          </div>

          <div
            className={cn(
              "grid border-b border-[var(--border-subtle)]/40 bg-[var(--surface-base)] text-11px font-semibold text-[var(--text-secondary)]",
              MEASURE_GRID_COLS,
            )}
          >
            {["#", "Data", "Stazione", "Descrizione", "F1", "F2", "F3", "Parziale", "Note", ""].map(
              (label, index) => (
                <div
                  className={cn(
                    "flex min-h-7 items-center border-r border-[var(--border-subtle)]/30 px-2 last:border-r-0",
                    index === 0 && "justify-center bg-[var(--bg-muted)]/20",
                    index >= 4 && index <= 7 && "justify-end text-right",
                    index === 7 && "bg-[var(--accent-primary)]/[0.04] text-[var(--accent-primary)]",
                  )}
                  key={label || "measure-actions"}
                >
                  {label}
                </div>
              ),
            )}
          </div>

          {rows.length === 0 ? (
            <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--surface-base)] px-3 py-4 text-center text-12px text-[var(--text-tertiary)]">
              Nessuna riga misura. Aggiungi la prima riga per iniziare.
            </div>
          ) : (
            rows.map((row, rowIndex) => {
              const rowTarget = buildMeasurementTarget(row.id, rowIndex);
              return (
                <div
                  className={cn(
                    "grid border-b border-[var(--border-subtle)]/35 bg-[var(--surface-base)] text-11px font-medium transition-colors hover:bg-[var(--accent-primary)]/[0.025]",
                    MEASURE_GRID_COLS,
                  )}
                  key={`${row.id}-${row.order}`}
                >
                  <div className="flex items-center justify-center border-r border-[var(--border-subtle)]/30 bg-[var(--bg-muted)]/22 font-mono text-11px font-black tabular-nums text-[var(--text-secondary)] min-h-9">
                    {rowIndex + 1}
                  </div>
                  <MeasureCell>
                    <DatePicker
                      ariaLabel="Data misura"
                      className="w-full rounded-sm border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/60 px-2 text-12px font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 focus-visible:bg-[var(--surface-base)] h-7"
                      iconClassName="hidden"
                      onChange={(value) => onUpdateRow(lineId, rowTarget, { date: value })}
                      placeholder="Data"
                      value={row.date}
                      valueClassName="text-center"
                    />
                  </MeasureCell>
                  <MeasureCell>
                    <input
                      aria-label="Stazione"
                      className="w-full rounded-sm border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/60 px-2 text-12px font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)] h-7"
                      onChange={(e) => onUpdateRow(lineId, rowTarget, { station: e.target.value })}
                      placeholder="Stazione"
                      value={row.station ?? ""}
                    />
                  </MeasureCell>
                  <MeasureCell>
                    <input
                      aria-label="Descrizione misura"
                      className="w-full rounded-sm border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/60 px-2 text-12px font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)] h-7"
                      onChange={(e) =>
                        onUpdateRow(lineId, rowTarget, { description: e.target.value })
                      }
                      placeholder="Descrizione"
                      value={row.description}
                    />
                  </MeasureCell>
                  {MEASUREMENT_FACTOR_FIELDS.map((field) => {
                    const draftKey = `${row.id}:${row.order}:${field}`;
                    return (
                      <MeasureCell key={draftKey}>
                        <input
                          aria-label={field}
                          className="w-full rounded-sm border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/60 px-2 text-right font-mono text-12px font-semibold tabular-nums text-[var(--text-primary)] outline-none transition hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)] h-7"
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
                      </MeasureCell>
                    );
                  })}
                  <MeasureCell className="justify-end bg-[var(--accent-primary)]/[0.045]">
                    <span className="font-mono text-13px font-black tabular-nums text-[var(--accent-primary)]">
                      {row.partialQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
                    </span>
                  </MeasureCell>
                  <MeasureCell>
                    <input
                      aria-label="Note riga"
                      className="w-full rounded-sm border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/60 px-2 text-12px font-medium text-[var(--text-secondary)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)] h-7"
                      onChange={(e) => onUpdateRow(lineId, rowTarget, { notes: e.target.value })}
                      placeholder="Note"
                      value={row.notes}
                    />
                  </MeasureCell>
                  <div className="flex items-center justify-center gap-1 border-r border-[var(--border-subtle)]/30 px-1.5 py-1 last:border-r-0 min-h-9">
                    <button
                      aria-label="Duplica riga"
                      className="flex size-7 items-center justify-center rounded-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => onDuplicateRow(lineId, rowTarget)}
                      type="button"
                    >
                      <Copy className="size-3" />
                    </button>
                    <button
                      aria-label="Elimina riga"
                      className={cn(
                        "flex size-7 items-center justify-center rounded-sm transition-colors",
                        hasMultipleRows
                          ? "text-[var(--text-secondary)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
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
            className={cn(
              "grid border-b border-dashed border-[var(--border-subtle)]/55 bg-[var(--bg-muted)]/12 text-left text-11px font-semibold text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent-primary)]/35 hover:bg-[var(--accent-primary)]/[0.025] hover:text-[var(--accent-primary)]",
              MEASURE_GRID_COLS,
            )}
            onClick={() => onAddRow(lineId)}
            type="button"
          >
            <div className="border-r border-[var(--border-subtle)]/35" />
            <div className="col-span-9 flex min-h-9 items-center gap-2 px-2">
              <Plus className="size-3.5" />
              <span>Nuova riga misura</span>
            </div>
          </button>

          {/* Maggiorazioni virtual sub-rows */}
          {linkedCharges.length > 0 && (
            <div className="border-b border-[var(--info-base)]/15">
              {linkedCharges.map((charge) => (
                <div
                  className={cn("grid text-11px bg-[var(--info-soft)]/20", MEASURE_GRID_COLS)}
                  key={charge.id}
                >
                  <div className="flex items-center justify-center border-r border-[var(--border-subtle)]/25 bg-[var(--info-soft)]/30 min-h-9">
                    <Percent className="size-3 text-[var(--info-base)]" />
                  </div>
                  <MeasureCell className="bg-[var(--info-soft)]/15" />
                  <MeasureCell className="bg-[var(--info-soft)]/15" />
                  <MeasureCell className="bg-[var(--info-soft)]/15">
                    <span className="text-11px font-semibold text-[var(--info-base)]">
                      {charge.code.startsWith("MG.")
                        ? charge.code
                        : `MG ${charge.percent.toLocaleString("it-IT")}%`}
                    </span>
                  </MeasureCell>
                  <MeasureCell className="bg-[var(--info-soft)]/15 justify-end">
                    <span className="font-mono text-11px tabular-nums text-[var(--info-base)]">
                      {charge.code.startsWith("MG.")
                        ? charge.percent.toLocaleString("it-IT", { maximumFractionDigits: 2 })
                        : charge.percent.toLocaleString("it-IT", { maximumFractionDigits: 1 })}
                    </span>
                  </MeasureCell>
                  <MeasureCell className="bg-[var(--info-soft)]/15 justify-end">
                    <span className="font-mono text-11px tabular-nums text-[var(--info-base)]">
                      {charge.code.startsWith("MG.")
                        ? null
                        : (laborPercentage / 100).toLocaleString("it-IT", {
                            maximumFractionDigits: 2,
                          })}
                    </span>
                  </MeasureCell>
                  <MeasureCell className="bg-[var(--info-soft)]/15" />
                  <MeasureCell className="justify-end bg-[var(--info-base)]/[0.08]">
                    <span className="font-mono text-13px font-bold tabular-nums text-[var(--info-base)]">
                      +<Currency value={charge.total} />
                    </span>
                  </MeasureCell>
                  <MeasureCell className="bg-[var(--info-soft)]/15">
                    <span className="text-10px text-[var(--info-base)]/70">
                      {charge.description}
                    </span>
                  </MeasureCell>
                  <MeasureCell className="bg-[var(--info-soft)]/15" />
                </div>
              ))}
            </div>
          )}

          {/* Totals footer */}
          <div
            className={cn(
              "grid border-b border-[var(--border-subtle)]/40 text-12px font-bold",
              MEASURE_GRID_COLS,
            )}
          >
            <div className="col-span-7 px-2 py-2 text-right text-[var(--text-secondary)]">
              sommano {unit}
            </div>
            <div className="px-2 py-2 text-right font-mono tabular-nums text-[var(--accent-primary)]">
              {totalQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
            </div>
            <div />
            <div />
          </div>

          {/* Economic summary: Lordo → +MG → Netto */}
          <div
            className={cn(
              "grid border-b border-[var(--border-subtle)]/25 bg-[var(--bg-muted)]/40 text-11px",
              MEASURE_GRID_COLS,
            )}
          >
            <div className="col-span-4" />
            <div className="col-span-3 flex items-center justify-end gap-3 px-2 py-1.5">
              <span className="text-[var(--text-tertiary)]">
                Lordo <Currency value={grossAmount} />
              </span>
              {linkedCharges.length > 0 && (
                <span className="text-[var(--info-base)] font-semibold">
                  +MG <Currency value={linkedCharges.reduce((s, c) => s + c.total, 0)} />
                </span>
              )}
              <span className="font-bold text-[var(--accent-primary)]">
                Netto <Currency value={totalAmount} />
              </span>
            </div>
            <div />
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
    <div className="ml-[32px] border-l border-[var(--border-subtle)]/30 bg-[var(--surface-base)]">
      <label className="grid border-b border-[var(--border-subtle)]/30 md:grid-cols-[120px_minmax(0,1fr)]">
        <span className="flex min-h-[40px] items-center border-r border-[var(--border-subtle)]/25 bg-[var(--bg-muted)]/15 px-2.5 font-mono text-10px font-bold uppercase text-[var(--text-secondary)]">
          Note
        </span>
        <textarea
          className="min-h-[40px] w-full resize-y border-0 bg-transparent px-2.5 py-1.5 text-13px leading-snug text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:bg-[var(--accent-primary)]/[0.025] focus:ring-2 focus:ring-inset focus:ring-[var(--ring-focus)]"
          placeholder={
            linkedTotal > 0
              ? `Annota criterio maggiorazioni: ${linkedTotal.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`
              : "Aggiungi note della voce, riferimenti o riserve..."
          }
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(lineId, e.target.value)}
        />
      </label>
    </div>
  );
}

function MeasureCell({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-9 min-w-0 items-center border-r border-[var(--border-subtle)]/30 px-1.5 py-0.5 last:border-r-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function GridCell({
  align = "left",
  children,
  className,
  editable,
  muted,
  strong,
  title,
}: {
  align?: "center" | "left" | "right";
  children: ReactNode;
  className?: string;
  editable?: boolean;
  muted?: boolean;
  strong?: boolean;
  title?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40px] min-w-0 items-center border-r border-[var(--border-subtle)]/30 px-2 py-1 last:border-r-0",
        align === "center" && "justify-center text-center",
        align === "right" && "justify-end text-right tabular-nums",
        editable && "bg-[var(--bg-muted)]/25",
        muted && "text-[var(--text-tertiary)]",
        strong && "font-semibold text-[var(--text-primary)]",
        className,
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
        <EmptyState
          description="Il registro SAL apparir\u00e0 quando avrai selezionato almeno una voce tariffaria."
          icon={FileText}
          title="Nessuna voce"
        />
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
          <span>Quantit\u00e0 totale</span>
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
                        columns={["Descrizione", "U.M.", "F1", "F2", "F3", "Qt\u00e0", "Note"]}
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
  const mgTotal = lines.reduce((sum, line) => {
    if (isMgCode(line.voice.code)) return sum;
    return (
      sum +
      line.linkedCharges.filter((c) => c.code.startsWith("MG.")).reduce((s, c) => s + c.total, 0)
    );
  }, 0);
  const surchargeTotal = lines.reduce(
    (sum, line) =>
      sum +
      (isMgCode(line.voice.code)
        ? 0
        : line.linkedCharges
            .filter((c) => !c.code.startsWith("MG."))
            .reduce((s, c) => s + c.total, 0)),
    0,
  );
  const hasMg = mgTotal > 0;
  const hasSurcharges = surchargeTotal > 0;
  const total =
    summary?.total ??
    lines.reduce((sum, line) => (isMgCode(line.voice.code) ? sum : sum + line.totalAmount), 0);
  const maxLines = compact ? 4 : 7;
  const truncated = lines.length > maxLines;

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--surface-base)] ring-1 ring-[var(--border-subtle)]/50">
      {/* Receipt header */}
      <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--accent-primary)]/[0.02] px-4 py-2.5">
        <div className="text-11px font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
          Libretto delle misure
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-12px font-bold text-[var(--text-primary)]">
            Stato Avanzamento Lavori
          </span>
          <span className="text-12px text-[var(--text-tertiary)]">
            {lines.length} voci,{" "}
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
            Anteprima dopo l&apos;inserimento delle voci.
          </div>
        ) : (
          <>
            {lines.slice(0, maxLines).map((line, idx) => (
              <div key={line.id} className="flex items-center gap-3 px-4 py-1.5 text-12px">
                <span className="w-5 shrink-0 text-right text-[var(--text-tertiary)]">
                  {idx + 1}
                </span>
                <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="shrink-0 font-medium text-[var(--text-primary)]">
                    {line.voice.code}
                  </span>
                  <span className="text-[var(--border-subtle)]/60">/</span>
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
              <div className="px-4 py-1.5 text-center text-11px text-[var(--text-tertiary)]">
                + altre {lines.length - maxLines} voci
              </div>
            )}
          </>
        )}
      </div>

      {/* Receipt footer \u2014 matches equation layout */}
      <div className="border-t border-[var(--border-subtle)]/40 bg-[var(--accent-primary)]/[0.01] px-4 py-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-12px text-[var(--text-tertiary)]">
            <span>Voci lordo</span>
            <span className="tabular-nums font-semibold text-[var(--text-primary)]">
              {grossTotal.toLocaleString("it-IT", {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          {hasMg && (
            <div className="flex items-center justify-between text-12px text-[var(--info-base)]">
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
            <div className="flex items-center justify-between text-12px text-[var(--info-base)]">
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
          <div className="mt-1 flex items-center justify-between text-12px text-[var(--danger-base)]">
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
        <span className="text-12px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
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
                      {entry.percent.toLocaleString("it-IT")}% \u2014 {entry.tariffLabel}
                    </span>
                  </div>
                  <span className="shrink-0 text-13px font-bold text-[var(--info-base)]">
                    +<Currency value={entry.total} />
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-8 text-12px text-[var(--text-tertiary)]">
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
