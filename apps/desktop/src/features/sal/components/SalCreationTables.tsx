import { useVirtualizer } from "@tanstack/react-virtual";
import { m } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
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
  Trash2,
  X,
} from "lucide-react";
import {
  memo,
  type ClipboardEvent as ReactClipboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import type { SalVoiceSearchIndex } from "../hooks/useSalVoiceSearchIndex";
import {
  buildSalContextMenuEntries,
  type SalContextMenuScope,
  SalLineContextMenu,
} from "./SalLineContextMenu";
import { SalVoiceSearchField } from "./SalVoiceSearchField";
import { TemplatePicker } from "./TemplatePicker";

export { Currency };

import { cn } from "@/lib/utils";
import {
  extractMgTariffPrefix,
  getMgAssignableTargetLines,
  isMgVoice,
} from "../domain/sal-calculations";
import { shouldUseNativeClipboard, shouldUseNativePaste } from "../domain/sal-clipboard-events";
import { buildMeasurementTarget } from "../domain/sal-measurement-target";
import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineView,
  SalLinkedCharge,
  SalMeasurementRowDraft,
  SalVoiceDraft,
} from "../types";

type SalSearchConfig = {
  isLoading?: boolean;
  onSelectVoice: (voice: SalVoiceDraft) => void;
  onApplyTemplate: (template: SalTemplate) => void;
  onOpenTemplateDialog: () => void;
  searchIndex: SalVoiceSearchIndex;
  tariffBookIds: string[];
  voicesCount: number;
};

const INITIAL_EXPANDED_MEASURE_ROWS = 2;
const COLLAPSED_VOICE_ROW_HEIGHT = 48;
const SECTION_ROW_HEIGHT = 32;
/** Stima iniziale espanso (misurata via measureElement dopo il paint). */
const EXPANDED_VOICE_ROW_BASE = 340;
const EXPANDED_MEASUREMENT_ROW_HEIGHT = 52;

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

const SHEET_CODE_STICKY_LEFT = "left-[56px]";
const SHEET_GRID_COLS =
  "grid-cols-[56px_minmax(156px,1fr)_minmax(300px,2.2fr)_minmax(52px,0.35fr)_minmax(100px,0.7fr)_minmax(108px,0.75fr)_minmax(120px,0.8fr)]";
const SHEET_MIN_WIDTH = "w-full min-w-[960px]";

const MEASURE_GRID_COLS =
  "grid-cols-[40px_minmax(130px,0.8fr)_minmax(140px,0.9fr)_minmax(240px,1.6fr)_minmax(80px,0.55fr)_minmax(80px,0.55fr)_minmax(80px,0.55fr)_minmax(112px,0.7fr)_minmax(180px,1.1fr)_80px]";
const MEASURE_MIN_WIDTH = "w-full min-w-[980px]";
const MEASURE_INPUT_CLASS =
  "h-9 w-full rounded-md border border-[var(--border-subtle)]/45 bg-[var(--surface-base)]/70 px-2.5 text-14px font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--accent-primary)]/35 focus:border-[var(--accent-primary)] focus:bg-[var(--surface-base)] focus:ring-2 focus:ring-[var(--ring-focus)]";

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
        "flex min-h-9 items-center border-r border-[var(--border-subtle)]/30 px-2.5 py-1.5 text-12px font-bold uppercase tracking-wide",
        right && "justify-end text-right",
        columnKey === "#" && "sticky left-0 z-20 justify-center bg-[var(--surface-base)] px-2",
        columnKey === "code" &&
          cn("sticky z-[9] bg-[var(--surface-base)] px-2", SHEET_CODE_STICKY_LEFT),
        isNet &&
          "sticky right-0 z-10 bg-[var(--accent-primary)]/[0.06] text-[var(--accent-primary)]",
      )}
    >
      {label}
    </div>
  );
}

export function NumberValue({ value }: { value: number }) {
  return (
    <span className="font-mono text-14px font-semibold tabular-nums">
      {value.toLocaleString("it-IT", { maximumFractionDigits: 3, minimumFractionDigits: 3 })}
    </span>
  );
}
export const SelectedVoicesPanel = memo(function SelectedVoicesPanel({
  economicRules,
  lines,
  availableVoices,
  activeLineId,
  copiedVoiceId,
  onAllocateMg,
  onAddMgVoice,
  onActiveLineChange,
  onCopyLine,
  onCopyMeasurements,
  onPasteVoice,
  onPasteMeasurements,
  onCopyMeasurementRow,
  onPasteMeasurementRowAt,
  selectedMeasurementRow = null,
  onSelectMeasurementRow,
  canPasteVoice = false,
  canPasteMeasurements = false,
  getMeasurementsClipboardText,
  getMeasurementRowClipboardText,
  getVoiceClipboardText,
  onPasteClipboardText,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onDuplicateVoiceDirect,
  onCopyMeasurementRowFull,
  onNotesChange,
  onRemove,
  onRemoveMeasurementRow,
  onScrollToLineHandled,
  onUpdateMeasurementRow,
  scrollToLineId,
  search,
}: {
  economicRules: SalEconomicRules;
  lines: SalLineView[];
  availableVoices: SalVoiceDraft[];
  activeLineId?: string | null;
  copiedVoiceId: string | null;
  onAllocateMg: (mgLineId: string, targetLineIds: string[]) => void;
  onAddMgVoice: (voice: SalVoiceDraft) => void;
  onActiveLineChange?: (lineId: string) => void;
  onCopyLine: (lineId: string) => void;
  onCopyMeasurements?: (lineId: string) => void;
  onPasteVoice?: () => void;
  onPasteMeasurements?: (lineId: string) => void;
  onCopyMeasurementRow?: (lineId: string, rowIndex: number) => void;
  onCopyMeasurementRowFull?: (lineId: string, rowIndex: number) => void;
  onPasteMeasurementRowAt?: (lineId: string, insertIndex: number) => void;
  selectedMeasurementRow?: { lineId: string; rowIndex: number } | null;
  onSelectMeasurementRow?: (lineId: string, rowIndex: number) => void;
  canPasteVoice?: boolean;
  canPasteMeasurements?: boolean;
  getVoiceClipboardText: (lineId: string) => string | null;
  getMeasurementsClipboardText: (lineId: string) => string | null;
  getMeasurementRowClipboardText?: (lineId: string, rowIndex: number) => string | null;
  onPasteClipboardText: (lineId: string, text: string) => void;
  onAddMeasurementRow: (lineId: string) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onDuplicateVoiceDirect?: (lineId: string) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
  onScrollToLineHandled?: () => void;
  onUpdateMeasurementRow: (
    lineId: string,
    measurementId: string,
    updates: Partial<SalMeasurementRowDraft>,
  ) => void;
  scrollToLineId?: string | null;
  search?: SalSearchConfig;
}) {
  const [allocPanelMgId, setAllocPanelMgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<
    | {
        lineId: string;
        rowIndex?: number;
        scope: SalContextMenuScope;
        x: number;
        y: number;
      }
    | {
        scope: "search-voice";
        searchVoice: SalVoiceDraft;
        x: number;
        y: number;
      }
    | null
  >(null);
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
  const prevLineIdsRef = useRef<Set<string> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerHScrollRef = useRef<HTMLDivElement>(null);
  const syncHeaderHorizontalScroll = useCallback((scrollLeft: number) => {
    if (headerHScrollRef.current && headerHScrollRef.current.scrollLeft !== scrollLeft) {
      headerHScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);
  const syncBodyHorizontalScroll = useCallback((scrollLeft: number) => {
    if (scrollRef.current && scrollRef.current.scrollLeft !== scrollLeft) {
      scrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);
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
  const estimateRowSize = useCallback(
    (index: number) => {
      const item = registerItems[index];
      if (!item) return COLLAPSED_VOICE_ROW_HEIGHT;
      if (item.type === "section") return SECTION_ROW_HEIGHT;
      const rowCount = Math.max(1, item.line.measurementRows.length);
      return expandedRows.has(item.line.id)
        ? EXPANDED_VOICE_ROW_BASE + rowCount * EXPANDED_MEASUREMENT_ROW_HEIGHT
        : COLLAPSED_VOICE_ROW_HEIGHT;
    },
    [expandedRows, registerItems],
  );

  const rowVirtualizer = useVirtualizer({
    count: registerItems.length,
    estimateSize: estimateRowSize,
    getItemKey: (index) => registerItems[index]?.id ?? index,
    getScrollElement: () => scrollRef.current,
    overscan: 3,
  });

  const rowVirtualizerRef = useRef(rowVirtualizer);
  rowVirtualizerRef.current = rowVirtualizer;

  const registerItemsRef = useRef(registerItems);
  registerItemsRef.current = registerItems;

  const onActiveLineChangeRef = useRef(onActiveLineChange);
  const onScrollToLineHandledRef = useRef(onScrollToLineHandled);
  onActiveLineChangeRef.current = onActiveLineChange;
  onScrollToLineHandledRef.current = onScrollToLineHandled;

  useEffect(() => {
    const currentIds = new Set(tableLines.map((line) => line.id));

    if (prevLineIdsRef.current === null) {
      prevLineIdsRef.current = currentIds;
      return;
    }

    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevLineIdsRef.current.has(id)) newIds.push(id);
    }
    prevLineIdsRef.current = currentIds;

    const validIds = currentIds;
    setExpandedRows((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of newIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      for (const lineId of next) {
        if (!validIds.has(lineId)) {
          next.delete(lineId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tableLines.map]);

  useEffect(() => {
    if (!scrollToLineId) return;

    const lineId = scrollToLineId;
    setExpandedRows((current) => {
      if (current.has(lineId)) return current;
      const next = new Set(current);
      next.add(lineId);
      return next;
    });

    let cancelled = false;
    const scrollAfterLayout = () => {
      if (cancelled) return;
      const index = registerItemsRef.current.findIndex(
        (item) => item.type === "line" && item.line.id === lineId,
      );
      if (index < 0) {
        onScrollToLineHandledRef.current?.();
        return;
      }
      rowVirtualizerRef.current.scrollToIndex(index, { align: "center" });
      onActiveLineChangeRef.current?.(lineId);
      onScrollToLineHandledRef.current?.();
    };

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scrollAfterLayout);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
    };
  }, [scrollToLineId]);

  const handleToggleRow = useCallback((lineId: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setExpandedRows((current) => {
      if (allExpanded) {
        return current.size === 0 ? current : new Set();
      }
      const next = new Set(tableLines.map((l) => l.id));
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
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

  const allocPanelMgLine = allocPanelMgId
    ? lines.find((line) => line.id === allocPanelMgId)
    : undefined;

  const openSalContextMenu = useCallback(
    (lineId: string, scope: SalContextMenuScope, event: ReactMouseEvent, rowIndex?: number) => {
      event.preventDefault();
      event.stopPropagation();
      onActiveLineChange?.(lineId);
      if (scope === "measurement-row" && rowIndex != null) {
        onSelectMeasurementRow?.(lineId, rowIndex);
      }
      setContextMenu({
        lineId,
        scope,
        x: event.clientX,
        y: event.clientY,
        ...(rowIndex != null ? { rowIndex } : {}),
      });
    },
    [onActiveLineChange, onSelectMeasurementRow],
  );

  const contextMenuLine =
    contextMenu && "lineId" in contextMenu
      ? lines.find((item) => item.id === contextMenu.lineId)
      : undefined;
  const searchContextMenu =
    contextMenu && contextMenu.scope === "search-voice" && "searchVoice" in contextMenu
      ? contextMenu
      : null;

  const openSearchVoiceContextMenu = useCallback((voice: SalVoiceDraft, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      scope: "search-voice",
      searchVoice: voice,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const renderRow = useCallback(
    (line: SalLineView, index: number) => (
      <SelectedVoiceRow
        key={line.id}
        index={index}
        line={line}
        gridCols={SHEET_GRID_COLS}
        active={activeLineId === line.id}
        expanded={expandedRows.has(line.id)}
        isCopied={copiedVoiceId === line.id}
        {...(onActiveLineChange ? { onActivate: onActiveLineChange } : {})}
        onCopy={onCopyLine}
        onOpenContextMenu={openSalContextMenu}
        getVoiceClipboardText={getVoiceClipboardText}
        getMeasurementsClipboardText={getMeasurementsClipboardText}
        {...(getMeasurementRowClipboardText ? { getMeasurementRowClipboardText } : {})}
        onPasteClipboardText={onPasteClipboardText}
        {...(onCopyMeasurements ? { onCopyMeasurements } : {})}
        {...(onCopyMeasurementRow ? { onCopyMeasurementRow } : {})}
        {...(selectedMeasurementRow ? { selectedMeasurementRow } : {})}
        {...(onSelectMeasurementRow ? { onSelectMeasurementRow } : {})}
        onAddMeasurementRow={onAddMeasurementRow}
        onDuplicateMeasurementRow={onDuplicateMeasurementRow}
        onNotesChange={onNotesChange}
        onRemove={onRemove}
        onRemoveMeasurementRow={onRemoveMeasurementRow}
        onToggle={handleToggleRow}
        onUpdateMeasurementRow={onUpdateMeasurementRow}
      />
    ),
    [
      activeLineId,
      expandedRows,
      copiedVoiceId,
      onActiveLineChange,
      onCopyLine,
      openSalContextMenu,
      getVoiceClipboardText,
      getMeasurementsClipboardText,
      getMeasurementRowClipboardText,
      onPasteClipboardText,
      onCopyMeasurements,
      onCopyMeasurementRow,
      selectedMeasurementRow,
      onSelectMeasurementRow,
      onAddMeasurementRow,
      onDuplicateMeasurementRow,
      onNotesChange,
      onRemove,
      onRemoveMeasurementRow,
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
    <section className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--border-subtle)]/40 bg-[var(--surface-base)]">
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
            onOpenMgContextMenu={(mgLineId, event) =>
              openSalContextMenu(mgLineId, "mg-line", event)
            }
            onRemove={onRemove}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface-base)]">
        <div className="z-20 shrink-0 bg-[var(--surface-base)]">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
            <div className="grid grid-cols-1 items-center gap-3 px-4 py-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,520px)_minmax(0,1fr)]">
              <div className="min-w-0 lg:justify-self-start">
                <span className="text-15px font-bold text-[var(--text-primary)]">
                  Registro misure
                </span>
                <span className="ml-2 text-13px font-semibold text-[var(--text-secondary)]">
                  {summaryText}
                </span>
              </div>

              {search ? (
                <div className="w-full min-w-0 lg:justify-self-center lg:max-w-[520px]">
                  <SalVoiceSearchField
                    {...(search.isLoading ? { isLoading: true } : {})}
                    searchIndex={search.searchIndex}
                    tariffBookIds={search.tariffBookIds}
                    voicesCount={search.voicesCount}
                    onSelectVoice={search.onSelectVoice}
                    onOptionContextMenu={openSearchVoiceContextMenu}
                  />
                </div>
              ) : (
                <div className="hidden lg:block" />
              )}

              <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-self-end">
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
          </div>

          <div
            className="overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-[0_8px_20px_color-mix(in_srgb,var(--text-primary)_5%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => syncBodyHorizontalScroll(event.currentTarget.scrollLeft)}
            ref={headerHScrollRef}
          >
            <div
              className={cn(SHEET_MIN_WIDTH, "grid text-[var(--text-secondary)]", SHEET_GRID_COLS)}
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
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain"
          onScroll={(event) => syncHeaderHorizontalScroll(event.currentTarget.scrollLeft)}
          ref={scrollRef}
        >
          <div className={cn(SHEET_MIN_WIDTH, "relative")}>
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
                      ref={rowVirtualizer.measureElement}
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
      </div>

      {allocPanelMgLine ? (
        <MgAllocationPanel
          key={allocPanelMgLine.id}
          economicRules={economicRules}
          lineViews={lines}
          mgLine={allocPanelMgLine}
          onClose={() => setAllocPanelMgId(null)}
          onSave={onAllocateMg}
        />
      ) : null}

      {searchContextMenu ? (
        <SalLineContextMenu
          entries={buildSalContextMenuEntries({
            scope: "search-voice",
            canPasteVoice: false,
            canPasteMeasurements: false,
            hasMeasurementsToCopy: false,
            onCopyVoice: () => {},
            onPasteVoice: () => {},
            onCopyMeasurements: () => {},
            onPasteMeasurements: () => {},
            onAddSearchVoice: () => search?.onSelectVoice(searchContextMenu.searchVoice),
            onCopySearchCode: () => {
              void navigator.clipboard?.writeText(searchContextMenu.searchVoice.code);
            },
          })}
          header={{
            title: searchContextMenu.searchVoice.code,
            subtitle: searchContextMenu.searchVoice.description,
          }}
          onClose={() => setContextMenu(null)}
          position={{ x: searchContextMenu.x, y: searchContextMenu.y }}
        />
      ) : contextMenu && "lineId" in contextMenu ? (
        <SalLineContextMenu
          entries={buildSalContextMenuEntries({
            scope: contextMenu.scope,
            canPasteVoice,
            canPasteMeasurements,
            hasMeasurementsToCopy: (contextMenuLine?.measurementRows.length ?? 0) > 0,
            onCopyVoice: () => onCopyLine(contextMenu.lineId),
            onPasteVoice: () => onPasteVoice?.(),
            onCopyMeasurementRow: () => {
              const rowIndex = contextMenu.rowIndex ?? 0;
              onCopyMeasurementRow?.(contextMenu.lineId, rowIndex);
            },
            onCopyMeasurementRowFull: () => {
              const rowIndex = contextMenu.rowIndex ?? 0;
              onCopyMeasurementRowFull?.(contextMenu.lineId, rowIndex);
            },
            onPasteMeasurementRowAbove: () => {
              const rowIndex = contextMenu.rowIndex ?? 0;
              onPasteMeasurementRowAt?.(contextMenu.lineId, rowIndex);
            },
            onPasteMeasurementRowBelow: () => {
              const rowIndex = contextMenu.rowIndex ?? 0;
              onPasteMeasurementRowAt?.(contextMenu.lineId, rowIndex + 1);
            },
            onCopyMeasurements: () => onCopyMeasurements?.(contextMenu.lineId),
            onPasteMeasurements: () => onPasteMeasurements?.(contextMenu.lineId),
            onDuplicateMeasurementRow: () => {
              const rowIndex = contextMenu.rowIndex ?? 0;
              const row = contextMenuLine?.measurementRows[rowIndex];
              if (!row) return;
              onDuplicateMeasurementRow(
                contextMenu.lineId,
                buildMeasurementTarget(row.id, rowIndex),
              );
            },
            onRemoveMeasurementRow: () => {
              const rowIndex = contextMenu.rowIndex ?? 0;
              const row = contextMenuLine?.measurementRows[rowIndex];
              if (!row) return;
              onRemoveMeasurementRow(contextMenu.lineId, buildMeasurementTarget(row.id, rowIndex));
            },
            onDuplicateVoice: () => {
              if (onDuplicateVoiceDirect) {
                onDuplicateVoiceDirect(contextMenu.lineId);
              } else {
                onCopyLine(contextMenu.lineId);
                onPasteVoice?.();
              }
            },
            onRemoveVoice: () => onRemove(contextMenu.lineId),
            onOpenMgAllocation: () => setAllocPanelMgId(contextMenu.lineId),
            onRemoveMgLine: () => onRemove(contextMenu.lineId),
            onDeactivateMg: () => onAllocateMg(contextMenu.lineId, []),
          })}
          {...(contextMenuLine
            ? {
                header: {
                  title: contextMenuLine.voice.code,
                  subtitle:
                    contextMenu.scope === "measurement-row" && contextMenu.rowIndex != null
                      ? `Riga misura ${contextMenu.rowIndex + 1} · ${contextMenuLine.voice.unit}`
                      : contextMenu.scope === "measurements"
                        ? `${contextMenuLine.measurementRows.length} righe misura · ${contextMenuLine.voice.unit}`
                        : contextMenu.scope === "mg-line"
                          ? `Maggiorazione ${contextMenuLine.voice.unitPrice}%`
                          : contextMenuLine.voice.description,
                },
              }
            : {})}
          onClose={() => setContextMenu(null)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
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
        "grid border-b border-[var(--border-subtle)]/30 text-13px",
        gridCols,
        tone === "safety" ? "bg-[var(--danger-soft)]/60" : "bg-[var(--accent-primary)]/[0.04]",
      )}
    >
      <div className="sticky left-0 z-10 flex min-h-9 items-center justify-center border-r border-[var(--border-subtle)]/25 bg-inherit px-2 font-mono text-11px font-bold text-[var(--text-tertiary)]">
        #
      </div>
      <div
        className={cn(
          "sticky z-[9] flex min-h-9 items-center border-r border-[var(--border-subtle)]/25 bg-inherit px-2",
          SHEET_CODE_STICKY_LEFT,
        )}
      >
        <span
          className={cn(
            "size-2.5 rounded-sm shrink-0",
            tone === "safety" ? "bg-[var(--danger-base)]" : "bg-[var(--accent-primary)]",
          )}
        />
      </div>
      <div className="col-span-3 flex min-h-9 items-center gap-2 border-r border-[var(--border-subtle)]/25 px-2.5 bg-inherit">
        <span className="text-12px font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          {label}
        </span>
        <span className="text-11px font-semibold text-[var(--text-tertiary)]">
          {count} voc{count === 1 ? "e" : "i"}
        </span>
      </div>
      <div />
      <div />
      <div
        className={cn(
          "flex items-center justify-end px-3 text-14px font-bold tabular-nums",
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
  return isMgVoice(voice);
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

function buildSuggestedMgVoices(
  tariffMgSignals: SalLineView[],
  availableVoices: SalVoiceDraft[],
  selectedLines: SalLineView[],
): SalVoiceDraft[] {
  const selectedVoiceIds = new Set(selectedLines.map((line) => line.voice.id));
  const selectedCodes = new Set(selectedLines.map((line) => normalizeVoiceCode(line.voice.code)));
  const availableMgVoices = availableVoices.filter(
    (voice) => isMgVoice(voice) && !selectedVoiceIds.has(voice.id),
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
  onOpenMgContextMenu,
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
  onOpenMgContextMenu?: (mgLineId: string, event: ReactMouseEvent) => void;
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
    <div className="shrink-0 border-b border-[var(--border-subtle)]/25 bg-[var(--bg-muted)]/30 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center gap-1 rounded-md bg-[var(--info-soft)] px-2 text-11px font-black uppercase tracking-wider text-[var(--info-base)]">
          <Percent className="size-3.5" />
          Maggiorazioni
        </span>
        <span className="text-11px text-[var(--text-tertiary)]">
          Non si applicano finché non scegli le voci destinatarie
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
              {...(onOpenMgContextMenu ? { onOpenContextMenu: onOpenMgContextMenu } : {})}
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

function buildSalLineDisplayMeta(lineViews: readonly SalLineView[]) {
  const lineNumberById = new Map<string, number>();
  const countByCode = new Map<string, number>();
  let rowNumber = 0;
  for (const line of lineViews) {
    if (isMgRow(line.voice)) continue;
    rowNumber += 1;
    lineNumberById.set(line.id, rowNumber);
    countByCode.set(line.voice.code, (countByCode.get(line.voice.code) ?? 0) + 1);
  }
  return { countByCode, lineNumberById };
}

function getMgAllocationState(
  economicRules: SalEconomicRules,
  mgLineId: string,
): "active" | "inactive" {
  const manualAlloc = economicRules.mgManualAllocations?.[mgLineId];
  if (manualAlloc && manualAlloc.length > 0) return "active";
  return "inactive";
}

function MgRuleCard({
  compact,
  economicRules,
  lines,
  mgLine,
  onApplyAllocation,
  onOpenAllocation,
  onOpenContextMenu,
  onRemove,
}: {
  compact?: boolean;
  economicRules: SalEconomicRules;
  lines: SalLineView[];
  mgLine: SalLineView;
  onApplyAllocation: (mgLineId: string, targetLineIds: string[]) => void;
  onOpenAllocation: (mgLineId: string) => void;
  onOpenContextMenu?: (mgLineId: string, event: ReactMouseEvent) => void;
  onRemove: (mgLineId: string) => void;
}) {
  const manualAlloc = economicRules.mgManualAllocations?.[mgLine.id];
  const allocState = getMgAllocationState(economicRules, mgLine.id);
  const eligibleTargets = getMgAssignableTargetLines(lines);
  const targetCount = manualAlloc?.length ?? 0;
  const total = mgLine.linkedCharges.find((entry) => entry.code.startsWith("MG."))?.total ?? 0;
  const isActive = allocState === "active";

  if (compact) {
    return (
      <>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: MG allocation chip opens a context menu on right-click */}
        <div
          className={cn(
            "inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-11px",
            isActive
              ? "border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/[0.05]"
              : "border-[var(--border-subtle)]/45 bg-[var(--surface-base)]",
          )}
          onContextMenu={
            onOpenContextMenu ? (event) => onOpenContextMenu(mgLine.id, event) : undefined
          }
        >
          <span className="font-mono text-12px font-black text-[var(--text-primary)]">
            {mgLine.voice.code}
          </span>
          <span className="inline-flex items-center rounded-md bg-[var(--info-soft)] px-1.5 py-0.5 text-10px font-black tabular-nums text-[var(--info-base)]">
            {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
          </span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-10px font-bold uppercase tracking-wide",
              isActive
                ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
            )}
          >
            {isActive
              ? `Attiva · ${targetCount} voc${targetCount === 1 ? "e" : "i"}`
              : "Non applicata"}
          </span>
          <span className="font-mono text-12px font-bold tabular-nums text-[var(--accent-primary)]">
            <Currency value={total} />
          </span>
          <Button
            className={cn(
              "h-7 px-2 text-10px font-bold",
              isActive && "text-[var(--accent-primary)]",
            )}
            onClick={() => onOpenAllocation(mgLine.id)}
            size="sm"
            type="button"
            variant={isActive ? "secondary" : "primary"}
          >
            {isActive ? "Modifica voci" : "Assegna voci"}
          </Button>
          {isActive ? (
            <Button
              className="h-7 px-2 text-10px text-[var(--text-secondary)]"
              onClick={() => onApplyAllocation(mgLine.id, [])}
              size="sm"
              type="button"
              variant="ghost"
            >
              Disattiva
            </Button>
          ) : null}
          <button
            aria-label={`Rimuovi ${mgLine.voice.code}`}
            className="flex size-6 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
            onClick={() => onRemove(mgLine.id)}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: MG allocation panel opens a context menu on right-click */}
      <div
        className={cn(
          "grid gap-3 rounded-lg border bg-[var(--surface-base)] p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto]",
          isActive ? "border-[var(--accent-primary)]/35" : "border-[var(--border-subtle)]/55",
        )}
        onContextMenu={
          onOpenContextMenu ? (event) => onOpenContextMenu(mgLine.id, event) : undefined
        }
      >
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-mono text-13px font-black text-[var(--text-primary)]">
              {mgLine.voice.code}
            </span>
            <span className="rounded-md bg-[var(--info-soft)] px-2 py-0.5 text-11px font-black text-[var(--info-base)]">
              {mgLine.voice.unitPrice.toLocaleString("it-IT")}%
            </span>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-10px font-bold uppercase tracking-wide",
                isActive
                  ? "bg-[var(--success-soft)] text-[var(--success-base)]"
                  : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
              )}
            >
              {isActive
                ? `Attiva su ${targetCount} voc${targetCount === 1 ? "e" : "i"}`
                : "Non applicata"}
            </span>
          </div>
          <p className="mt-1.5 text-12px text-[var(--text-tertiary)]">
            {isActive
              ? `Maggiorazione calcolata sulle ${targetCount} voci selezionate.`
              : `${eligibleTargets.length} voc${eligibleTargets.length === 1 ? "e operativa" : "i operative"} nel SAL · scegli a quali applicarla.`}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              className={cn(
                "h-8 px-3 text-11px font-bold",
                isActive && "text-[var(--accent-primary)]",
              )}
              disabled={eligibleTargets.length === 0}
              onClick={() => onOpenAllocation(mgLine.id)}
              size="sm"
              type="button"
              variant={isActive ? "secondary" : "primary"}
            >
              {isActive ? "Modifica voci destinatarie" : "Scegli voci destinatarie"}
            </Button>
            {isActive ? (
              <Button
                className="h-8 px-3 text-11px"
                onClick={() => onApplyAllocation(mgLine.id, [])}
                size="sm"
                type="button"
                variant="ghost"
              >
                Disattiva maggiorazione
              </Button>
            ) : null}
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
    </>
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
  const eligible = useMemo(() => getMgAssignableTargetLines(lineViews), [lineViews]);
  const { countByCode, lineNumberById } = useMemo(
    () => buildSalLineDisplayMeta(lineViews),
    [lineViews],
  );
  const tariffPrefix = extractMgTariffPrefix(mgLine.voice.code);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const alloc = economicRules.mgManualAllocations?.[mgLine.id] ?? [];
    const assignableIds = new Set(eligible.map((line) => line.id));
    setSelected((prev) => {
      const next = new Set(alloc.filter((id) => assignableIds.has(id)));
      if (prev.size === next.size && [...next].every((id) => prev.has(id))) return prev;
      return next;
    });
  }, [eligible, mgLine.id, economicRules.mgManualAllocations]);

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
                Assegnazione sulle voci inserite nel SAL
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <Badge variant="info">{eligible.length} disponibili</Badge>
                </span>
              </p>
            </div>
          </div>
        </div>

        {eligible.length === 0 ? (
          <div className="px-5 py-8 text-center text-13px text-[var(--text-tertiary)]">
            Nessuna voce operativa
            {tariffPrefix ? ` con prefisso ${tariffPrefix}` : ""} nel SAL disponibile per
            l&apos;assegnazione.
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
              {eligible.map((line, idx) => {
                const rowNumber = lineNumberById.get(line.id);
                const hasDuplicateCode = (countByCode.get(line.voice.code) ?? 0) > 1;
                return (
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 border-b border-[var(--border-subtle)]/20 px-5 py-2.5 text-12px transition-colors hover:bg-[var(--accent-primary)]/[0.03]",
                      idx % 2 === 0 ? "bg-[var(--surface-base)]" : "bg-[var(--bg-muted)]/15",
                      selected.has(line.id) && "bg-[var(--accent-primary)]/[0.06]",
                    )}
                    key={line.id}
                  >
                    <input
                      checked={selected.has(line.id)}
                      className="size-4 rounded border-[var(--border-subtle)] text-[var(--accent-primary)] focus:ring-[var(--ring-focus)]"
                      onChange={() => handleToggle(line.id)}
                      type="checkbox"
                    />
                    {hasDuplicateCode && rowNumber != null ? (
                      <span className="shrink-0 rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-10px font-black tabular-nums text-[var(--text-secondary)]">
                        #{rowNumber}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[var(--text-primary)]">
                        {line.voice.code}
                      </span>
                      {hasDuplicateCode ? (
                        <span className="mt-0.5 block truncate text-10px font-medium text-[var(--text-tertiary)]">
                          Istanza duplicata nel SAL
                          {line.quantity > 0
                            ? ` · Qt\u00e0 ${line.quantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}`
                            : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="hidden min-w-0 max-w-[220px] truncate text-[var(--text-tertiary)] sm:block">
                      {line.voice.description}
                    </span>
                    <span className="shrink-0 font-mono text-11px font-bold tabular-nums text-[var(--text-secondary)]">
                      <Currency value={line.grossAmount} />
                    </span>
                  </label>
                );
              })}
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
                <Button
                  disabled={selected.size === 0}
                  onClick={handleSave}
                  size="sm"
                  variant="primary"
                >
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
  active = false,
  expanded,
  isCopied,
  onActivate,
  onCopy,
  onOpenContextMenu,
  getVoiceClipboardText,
  getMeasurementsClipboardText,
  getMeasurementRowClipboardText,
  onPasteClipboardText,
  onCopyMeasurements,
  onCopyMeasurementRow,
  selectedMeasurementRow,
  onSelectMeasurementRow,
  onAddMeasurementRow,
  onDuplicateMeasurementRow,
  onNotesChange,
  onRemove,
  onRemoveMeasurementRow,
  onToggle,
  onUpdateMeasurementRow,
}: {
  index: number;
  line: SalLineView;
  gridCols: string;
  active?: boolean;
  expanded: boolean;
  isCopied: boolean;
  onActivate?: (lineId: string) => void;
  onCopy: (lineId: string) => void;
  onOpenContextMenu: (
    lineId: string,
    scope: SalContextMenuScope,
    event: ReactMouseEvent,
    rowIndex?: number,
  ) => void;
  getVoiceClipboardText: (lineId: string) => string | null;
  getMeasurementsClipboardText: (lineId: string) => string | null;
  getMeasurementRowClipboardText?: (lineId: string, rowIndex: number) => string | null;
  onPasteClipboardText: (lineId: string, text: string) => void;
  onCopyMeasurements?: (lineId: string) => void;
  onCopyMeasurementRow?: (lineId: string, rowIndex: number) => void;
  selectedMeasurementRow?: { lineId: string; rowIndex: number } | null;
  onSelectMeasurementRow?: (lineId: string, rowIndex: number) => void;
  onAddMeasurementRow: (lineId: string) => void;
  onDuplicateMeasurementRow: (lineId: string, measurementId: string) => void;
  onNotesChange: (lineId: string, notes: string) => void;
  onRemove: (lineId: string) => void;
  onRemoveMeasurementRow: (lineId: string, measurementId: string) => void;
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
          "group grid cursor-pointer border-b border-[var(--border-subtle)]/30 text-14px transition-colors [content-visibility:auto] [contain-intrinsic-size:48px] hover:bg-[var(--accent-primary)]/[0.03]",
          gridCols,
          index % 2 !== 0 && "bg-[var(--bg-muted)]/5",
          expanded &&
            "shadow-[inset_3px_0_0_var(--accent-primary)] bg-[var(--accent-primary)]/[0.03]",
          active && "ring-2 ring-inset ring-[var(--accent-primary)]/35",
          isIncomplete && !expanded && "shadow-[inset_3px_0_0_var(--warning-base)]/60",
        )}
        title={
          isIncomplete
            ? "Voce incompleta: inserisci una quantit\u00e0 maggiore di zero."
            : undefined
        }
        onClick={() => {
          onActivate?.(line.id);
          onToggle(line.id);
        }}
        onFocus={() => onActivate?.(line.id)}
        onContextMenu={(event) => void onOpenContextMenu(line.id, "voice", event)}
        onCopy={(event: ReactClipboardEvent) => {
          if (shouldUseNativeClipboard(event)) return;
          const text = getVoiceClipboardText(line.id);
          if (!text) return;
          event.preventDefault();
          event.clipboardData.setData("text/plain", text);
          onCopy(line.id);
        }}
        onPaste={(event: ReactClipboardEvent) => {
          if (shouldUseNativePaste(event)) return;
          event.preventDefault();
          onPasteClipboardText(line.id, event.clipboardData.getData("text/plain"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate?.(line.id);
            onToggle(line.id);
          }
        }}
      >
        {/* N. + status indicator */}
        <GridCell align="center" className="sticky left-0 z-10 bg-inherit px-2 py-2" muted>
          <div className="flex w-full flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full ring-2 ring-[var(--surface-base)]",
                  isIncomplete
                    ? "bg-amber-400 ring-amber-400/25"
                    : "bg-emerald-500 ring-emerald-500/20",
                )}
                title={isIncomplete ? "Voce incompleta" : "Voce completa"}
              />
              <span className="min-w-[1.1rem] text-center font-mono text-13px font-black tabular-nums text-[var(--text-primary)]">
                {index + 1}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:text-[var(--text-secondary)]",
                !expanded && "-rotate-90",
              )}
            />
          </div>
        </GridCell>

        {/* Codice */}
        <GridCell className={cn("sticky z-[9] bg-inherit px-2 py-2", SHEET_CODE_STICKY_LEFT)}>
          <span
            className="inline-flex max-w-full items-center rounded-md border border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/[0.09] px-2.5 py-1.5 font-mono text-13px font-black leading-none tracking-tight text-[var(--accent-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-base)_55%,transparent)]"
            title={line.voice.code}
          >
            <span className="truncate">{line.voice.code}</span>
          </span>
        </GridCell>

        {/* Descrizione */}
        <GridCell>
          <div className="flex min-w-0 w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-14px font-semibold leading-snug text-[var(--text-primary)]"
                title={line.voice.description}
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
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                aria-label={isCopied ? "Copiata" : "Copia voce"}
                className={cn(
                  "flex size-7 items-center justify-center rounded transition-all",
                  isCopied
                    ? "bg-[var(--success-soft)] text-[var(--success-base)] opacity-100"
                    : "text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onActivate?.(line.id);
                  onCopy(line.id);
                }}
                type="button"
                title={isCopied ? "Voce copiata (Ctrl+V per incollare)" : "Copia voce (Ctrl+C)"}
              >
                {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
              <button
                aria-label={`Rimuovi ${line.voice.code}`}
                className="flex size-7 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(line.id);
                }}
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        </GridCell>

        {/* UM */}
        <GridCell muted>
          <span className="text-12px font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            {line.voice.unit}
          </span>
        </GridCell>

        {/* Qtà */}
        <GridCell align="right">
          <span className="text-14px font-bold tabular-nums text-[var(--text-primary)]">
            <NumberValue value={line.quantity} />
          </span>
        </GridCell>

        {/* Lordo */}
        <GridCell align="right">
          <span className="text-14px font-bold tabular-nums text-[var(--text-primary)]">
            <Currency value={line.grossAmount} />
          </span>
        </GridCell>

        {/* Netto SAL */}
        <div className="sticky right-0 z-10 flex min-h-[48px] min-w-0 items-center justify-end border-l border-[var(--border-subtle)]/30 bg-[var(--accent-primary)]/[0.06] px-3 py-1.5">
          <span className="text-16px font-black tabular-nums text-[var(--accent-primary)]">
            <Currency value={line.totalAmount} />
          </span>
        </div>
      </div>

      {/* Expanded: info bar + measurement rows */}
      {expanded && (
        <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--bg-muted)]/24 [contain:layout_style]">
          {/* Info bar: price, discount, MG% */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)]/25 bg-[var(--surface-base)] px-3 py-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-13px font-semibold text-[var(--text-primary)]">
              <span className="text-[var(--text-tertiary)] text-11px uppercase tracking-wider">
                Prezzo
              </span>
              <Currency value={line.voice.unitPrice} />
            </span>
            {line.voice.isSafetyCost && line.discountAmount === 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-12px font-medium text-[var(--text-secondary)]">
                Esclusa dal ribasso
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)]/40 bg-[var(--surface-base)] px-2 py-0.5 text-13px"
              title="Percentuale manodopera dal tariffario (sola lettura)"
            >
              <span className="text-11px font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Manodopera
              </span>
              <span className="font-mono text-13px font-bold tabular-nums text-[var(--text-primary)]">
                {(line.voice.laborPercentage ?? 0).toLocaleString("it-IT", {
                  maximumFractionDigits: 2,
                })}
                %
              </span>
            </span>
            {line.voice.isSafetyCost && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-11px font-bold text-[var(--danger-base)]">
                OS
              </span>
            )}
            {hasMissingMgDecision && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-11px font-bold text-[var(--warning-base)]">
                <AlertTriangle className="size-3" />
                MG?
              </span>
            )}
            {isIncomplete && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-11px font-bold text-[var(--warning-base)]">
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
            discountAmount={line.discountAmount}
            grossAmount={line.grossAmount}
            isSafetyCost={line.voice.isSafetyCost}
            totalAmount={line.totalAmount}
            unitPrice={line.voice.unitPrice}
            laborPercentage={line.voice.laborPercentage ?? 0}
            getMeasurementsClipboardText={getMeasurementsClipboardText}
            {...(getMeasurementRowClipboardText ? { getMeasurementRowClipboardText } : {})}
            {...(onCopyMeasurements ? { onCopyMeasurements } : {})}
            {...(onCopyMeasurementRow ? { onCopyMeasurementRow } : {})}
            selectedRowIndex={
              selectedMeasurementRow?.lineId === line.id ? selectedMeasurementRow.rowIndex : null
            }
            onSelectRow={(rowIndex) => onSelectMeasurementRow?.(line.id, rowIndex)}
            onOpenContextMenu={onOpenContextMenu}
            onPasteClipboardText={onPasteClipboardText}
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

function VoiceEconomicBreakdown({
  discountAmount,
  grossAmount,
  isSafetyCost,
  linkedCharges,
  totalAmount,
}: {
  discountAmount: number;
  grossAmount: number;
  isSafetyCost: boolean;
  linkedCharges: SalLinkedCharge[];
  totalAmount: number;
}) {
  const mgTotal = linkedCharges.reduce((sum, charge) => sum + charge.total, 0);
  const hasMg = mgTotal > 0;
  const hasDiscount = discountAmount > 0;
  const showFormula = hasMg || hasDiscount;

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2.5 border-t border-[var(--border-subtle)]/40 bg-[var(--surface-base)]/80 px-4 py-3.5">
      <div className="mr-auto text-12px font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        Riepilogo economico
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!showFormula ? (
          <EconomicBreakdownPill emphasis label="Netto" tone="accent" value={totalAmount} />
        ) : (
          <>
            <EconomicBreakdownPill label="Lordo" tone="neutral" value={grossAmount} />
            {hasMg ? (
              <>
                <ChevronRight
                  className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                  aria-hidden
                />
                <EconomicBreakdownPill label="MG" prefix="+" tone="info" value={mgTotal} />
              </>
            ) : null}
            {hasDiscount ? (
              <>
                <ChevronRight
                  className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
                  aria-hidden
                />
                <EconomicBreakdownPill
                  label="Ribasso"
                  prefix="−"
                  tone="danger"
                  value={discountAmount}
                />
              </>
            ) : null}
            <span className="px-0.5 text-13px font-bold text-[var(--text-tertiary)]" aria-hidden>
              =
            </span>
            <EconomicBreakdownPill emphasis label="Netto" tone="accent" value={totalAmount} />
          </>
        )}
      </div>
      {isSafetyCost && !hasDiscount ? (
        <span className="w-full text-right text-12px font-medium text-[var(--text-tertiary)]">
          Voce OS: importi non soggetti a ribasso
        </span>
      ) : null}
    </div>
  );
}

function EconomicBreakdownPill({
  emphasis = false,
  label,
  prefix,
  tone,
  value,
}: {
  emphasis?: boolean;
  label: string;
  prefix?: string;
  tone: "accent" | "danger" | "info" | "neutral";
  value: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ring-1",
        tone === "neutral" &&
          "bg-[var(--surface-base)] text-[var(--text-primary)] ring-[var(--border-subtle)]/50",
        tone === "info" &&
          "bg-[var(--info-soft)]/55 text-[var(--info-base)] ring-[var(--info-base)]/20",
        tone === "danger" &&
          "bg-[var(--danger-soft)]/55 text-[var(--danger-base)] ring-[var(--danger-base)]/20",
        tone === "accent" &&
          "bg-[var(--accent-primary)]/[0.08] text-[var(--accent-primary)] ring-[var(--accent-primary)]/25",
        emphasis && "px-3 py-1.5",
      )}
    >
      <span className="text-11px font-bold uppercase tracking-wide opacity-80">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          emphasis ? "text-16px font-black" : "text-14px font-bold",
        )}
      >
        {prefix}
        <Currency value={value} />
      </span>
    </span>
  );
}

const MeasurementRowsTable = memo(function MeasurementRowsTable({
  lineId,
  voiceCode,
  voiceDescription: _voiceDescription,
  rows,
  unit,
  totalQuantity,
  linkedCharges,
  discountAmount,
  grossAmount,
  isSafetyCost,
  totalAmount,
  unitPrice: _unitPrice,
  laborPercentage,
  getMeasurementsClipboardText,
  getMeasurementRowClipboardText,
  onCopyMeasurements,
  onCopyMeasurementRow,
  selectedRowIndex = null,
  onSelectRow,
  onOpenContextMenu,
  onPasteClipboardText,
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
  discountAmount: number;
  grossAmount: number;
  isSafetyCost: boolean;
  totalAmount: number;
  unitPrice: number;
  laborPercentage: number;
  getMeasurementsClipboardText: (lineId: string) => string | null;
  getMeasurementRowClipboardText?: (lineId: string, rowIndex: number) => string | null;
  onCopyMeasurements?: (lineId: string) => void;
  onCopyMeasurementRow?: (lineId: string, rowIndex: number) => void;
  selectedRowIndex?: number | null;
  onSelectRow?: (rowIndex: number) => void;
  onOpenContextMenu: (
    lineId: string,
    scope: SalContextMenuScope,
    event: ReactMouseEvent,
    rowIndex?: number,
  ) => void;
  onPasteClipboardText: (lineId: string, text: string) => void;
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
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: measurement grid supports clipboard and context-menu actions */}
      <div
        className="ml-6 min-w-0 border-l-2 border-[var(--accent-primary)]/30 bg-[var(--surface-base)] pl-2 [contain:layout_style]"
        onCopy={(event: ReactClipboardEvent) => {
          if (shouldUseNativeClipboard(event)) return;
          const text = getMeasurementsClipboardText(lineId);
          if (!text) return;
          event.preventDefault();
          event.stopPropagation();
          event.clipboardData.setData("text/plain", text);
          onCopyMeasurements?.(lineId);
        }}
        onPaste={(event: ReactClipboardEvent) => {
          if (shouldUseNativePaste(event)) return;
          event.preventDefault();
          event.stopPropagation();
          onPasteClipboardText(lineId, event.clipboardData.getData("text/plain"));
        }}
        onContextMenu={(event) => void onOpenContextMenu(lineId, "measurements", event)}
      >
        <div className="overflow-x-auto">
          <div className={MEASURE_MIN_WIDTH}>
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]/35 bg-[var(--bg-muted)]/15 px-4 py-2.5">
              <span className="font-mono text-14px font-bold text-[var(--text-primary)]">
                {voiceCode}
              </span>
              <span className="text-13px font-semibold tabular-nums text-[var(--text-secondary)]">
                {rows.length} rig{rows.length === 1 ? "a" : "he"},{" "}
                {totalQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })} {unit}
              </span>
              {rows.length > 0 && (
                <button
                  className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border-subtle)]/50 bg-[var(--surface-base)] px-2.5 text-12px font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
                  onClick={() => {
                    const index =
                      selectedRowIndex != null && selectedRowIndex >= 0
                        ? selectedRowIndex
                        : rows.length - 1;
                    const row = rows[index];
                    if (!row) return;
                    onDuplicateRow(lineId, buildMeasurementTarget(row.id, index));
                  }}
                  type="button"
                >
                  <Copy className="size-3" />
                  Duplica
                </button>
              )}
            </div>

            <div
              className={cn(
                "grid border-b border-[var(--border-subtle)]/40 bg-[var(--surface-base)] text-13px font-bold text-[var(--text-secondary)]",
                MEASURE_GRID_COLS,
              )}
            >
              {[
                "#",
                "Data",
                "Stazione",
                "Descrizione",
                "F1",
                "F2",
                "F3",
                "Parziale",
                "Note",
                "",
              ].map((label, index) => (
                <div
                  className={cn(
                    "flex min-h-10 items-center border-r border-[var(--border-subtle)]/30 px-2.5 last:border-r-0",
                    index === 0 && "justify-center bg-[var(--bg-muted)]/20",
                    index >= 4 && index <= 7 && "justify-end text-right",
                    index === 7 && "bg-[var(--accent-primary)]/[0.04] text-[var(--accent-primary)]",
                  )}
                  key={label || "measure-actions"}
                >
                  {label}
                </div>
              ))}
            </div>

            {rows.length === 0 ? (
              <div className="border-b border-[var(--border-subtle)]/40 bg-[var(--surface-base)] px-3 py-4 text-center text-14px text-[var(--text-tertiary)]">
                Nessuna riga misura. Aggiungi la prima riga per iniziare.
              </div>
            ) : (
              rows.map((row, rowIndex) => {
                const rowTarget = buildMeasurementTarget(row.id, rowIndex);
                return (
                  <>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: measurement row exposes a context menu on right-click */}
                    <div
                      className={cn(
                        "grid border-b border-[var(--border-subtle)]/35 bg-[var(--surface-base)] text-14px font-medium transition-colors hover:bg-[var(--accent-primary)]/[0.025]",
                        MEASURE_GRID_COLS,
                      )}
                      data-measurement-row
                      key={`${row.id}-${row.order}`}
                      onContextMenu={(event) => {
                        if (
                          (event.target as HTMLElement).closest("input, textarea, button, select")
                        ) {
                          return;
                        }
                        void onOpenContextMenu(lineId, "measurement-row", event, rowIndex);
                      }}
                      onCopy={(event: ReactClipboardEvent) => {
                        if (shouldUseNativeClipboard(event)) return;
                        const text = getMeasurementRowClipboardText?.(lineId, rowIndex);
                        if (!text) return;
                        event.preventDefault();
                        event.stopPropagation();
                        event.clipboardData.setData("text/plain", text);
                        onCopyMeasurementRow?.(lineId, rowIndex);
                      }}
                    >
                      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: row index selector for measurement clipboard actions */}
                      <div
                        className={cn(
                          "flex min-h-11 cursor-cell items-center justify-center border-r border-[var(--border-subtle)]/30 bg-[var(--bg-muted)]/22 font-mono text-13px font-black tabular-nums text-[var(--text-secondary)] transition-colors",
                          selectedRowIndex === rowIndex &&
                            "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] ring-2 ring-inset ring-[var(--accent-primary)]/35",
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectRow?.(rowIndex);
                        }}
                        title="Seleziona riga · tasto destro per copia/incolla"
                      >
                        {rowIndex + 1}
                      </div>
                      <MeasureCell>
                        <DatePicker
                          ariaLabel="Data misura"
                          className={cn(MEASURE_INPUT_CLASS, "text-center")}
                          iconClassName="hidden"
                          onChange={(value) => onUpdateRow(lineId, rowTarget, { date: value })}
                          placeholder="Data"
                          value={row.date}
                          valueClassName="text-center text-14px font-semibold"
                        />
                      </MeasureCell>
                      <MeasureCell>
                        <input
                          aria-label="Stazione"
                          className={MEASURE_INPUT_CLASS}
                          onChange={(e) =>
                            onUpdateRow(lineId, rowTarget, { station: e.target.value })
                          }
                          placeholder="Stazione"
                          value={row.station ?? ""}
                        />
                      </MeasureCell>
                      <MeasureCell>
                        <input
                          aria-label="Descrizione misura"
                          className={MEASURE_INPUT_CLASS}
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
                              className={cn(
                                MEASURE_INPUT_CLASS,
                                "text-right font-mono text-14px font-bold tabular-nums",
                              )}
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
                      <MeasureCell className="justify-end bg-[var(--accent-primary)]/[0.06] px-2.5">
                        <span className="font-mono text-16px font-black tabular-nums text-[var(--accent-primary)]">
                          {row.partialQuantity.toLocaleString("it-IT", {
                            maximumFractionDigits: 3,
                          })}
                        </span>
                      </MeasureCell>
                      <MeasureCell>
                        <input
                          aria-label="Note riga"
                          className={cn(
                            MEASURE_INPUT_CLASS,
                            "text-13px text-[var(--text-secondary)]",
                          )}
                          onChange={(e) =>
                            onUpdateRow(lineId, rowTarget, { notes: e.target.value })
                          }
                          placeholder="Note"
                          value={row.notes}
                        />
                      </MeasureCell>
                      <div className="flex items-center justify-center gap-1 border-r border-[var(--border-subtle)]/30 px-1.5 py-1 last:border-r-0 min-h-11">
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
                  </>
                );
              })
            )}

            <button
              className={cn(
                "grid border-b border-dashed border-[var(--border-subtle)]/55 bg-[var(--bg-muted)]/12 text-left text-13px font-semibold text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent-primary)]/35 hover:bg-[var(--accent-primary)]/[0.025] hover:text-[var(--accent-primary)]",
                MEASURE_GRID_COLS,
              )}
              onClick={() => onAddRow(lineId)}
              type="button"
            >
              <div className="border-r border-[var(--border-subtle)]/35" />
              <div className="col-span-9 flex min-h-10 items-center gap-2 px-2">
                <Plus className="size-4" />
                <span>Nuova riga misura</span>
              </div>
            </button>

            <div className="mt-1 border-t-2 border-[var(--border-subtle)]/55 bg-[var(--bg-muted)]/30 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-base)_40%,transparent)]">
              {linkedCharges.length > 0 && (
                <div className="border-b border-[var(--info-base)]/20">
                  {linkedCharges.map((charge) => (
                    <div
                      className={cn("grid text-13px bg-[var(--info-soft)]/20", MEASURE_GRID_COLS)}
                      key={charge.id}
                    >
                      <div className="flex min-h-10 items-center justify-center border-r border-[var(--border-subtle)]/25 bg-[var(--info-soft)]/30">
                        <Percent className="size-3.5 text-[var(--info-base)]" />
                      </div>
                      <MeasureCell className="bg-[var(--info-soft)]/15" />
                      <MeasureCell className="bg-[var(--info-soft)]/15" />
                      <MeasureCell className="bg-[var(--info-soft)]/15">
                        <span className="text-13px font-semibold text-[var(--info-base)]">
                          {charge.code.startsWith("MG.")
                            ? charge.code
                            : `MG ${charge.percent.toLocaleString("it-IT")}%`}
                        </span>
                      </MeasureCell>
                      <MeasureCell className="bg-[var(--info-soft)]/15 justify-end">
                        <span className="font-mono text-13px tabular-nums text-[var(--info-base)]">
                          {charge.code.startsWith("MG.")
                            ? charge.percent.toLocaleString("it-IT", { maximumFractionDigits: 2 })
                            : charge.percent.toLocaleString("it-IT", { maximumFractionDigits: 1 })}
                        </span>
                      </MeasureCell>
                      <MeasureCell className="bg-[var(--info-soft)]/15 justify-end">
                        <span className="font-mono text-13px tabular-nums text-[var(--info-base)]">
                          {charge.code.startsWith("MG.")
                            ? null
                            : (laborPercentage / 100).toLocaleString("it-IT", {
                                maximumFractionDigits: 2,
                              })}
                        </span>
                      </MeasureCell>
                      <MeasureCell className="bg-[var(--info-soft)]/15" />
                      <MeasureCell className="justify-end bg-[var(--info-base)]/[0.08]">
                        <span className="font-mono text-15px font-bold tabular-nums text-[var(--info-base)]">
                          +<Currency value={charge.total} />
                        </span>
                      </MeasureCell>
                      <MeasureCell className="bg-[var(--info-soft)]/15">
                        <span className="text-12px text-[var(--info-base)]/80">
                          {charge.description}
                        </span>
                      </MeasureCell>
                      <MeasureCell className="bg-[var(--info-soft)]/15" />
                    </div>
                  ))}
                </div>
              )}

              <div
                className={cn(
                  "grid border-b border-[var(--border-subtle)]/45 text-14px font-bold",
                  MEASURE_GRID_COLS,
                )}
              >
                <div className="col-span-7 border-r border-[var(--border-subtle)]/30 px-4 py-3 text-right text-[var(--text-secondary)]">
                  sommano {unit}
                </div>
                <div className="border-r border-[var(--border-subtle)]/30 bg-[var(--accent-primary)]/[0.06] px-3 py-3 text-right font-mono text-17px font-black tabular-nums text-[var(--accent-primary)]">
                  {totalQuantity.toLocaleString("it-IT", { maximumFractionDigits: 3 })}
                </div>
                <div className="border-r border-[var(--border-subtle)]/30" />
                <div />
              </div>

              <VoiceEconomicBreakdown
                discountAmount={discountAmount}
                grossAmount={grossAmount}
                isSafetyCost={isSafetyCost}
                linkedCharges={linkedCharges}
                totalAmount={totalAmount}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

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
        <span className="flex min-h-[44px] items-center border-r border-[var(--border-subtle)]/25 bg-[var(--bg-muted)]/15 px-2.5 font-mono text-11px font-bold uppercase text-[var(--text-secondary)]">
          Note
        </span>
        <textarea
          className="min-h-[44px] w-full resize-y border-0 bg-transparent px-2.5 py-2 text-14px leading-snug text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:bg-[var(--accent-primary)]/[0.025] focus:ring-2 focus:ring-inset focus:ring-[var(--ring-focus)]"
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
        "flex min-h-11 min-w-0 items-center border-r border-[var(--border-subtle)]/30 px-2 py-1 last:border-r-0",
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
        "flex min-h-[48px] min-w-0 items-center border-r border-[var(--border-subtle)]/30 px-2.5 py-1.5 last:border-r-0",
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
    if (isMgVoice(line.voice)) return sum;
    return (
      sum +
      line.linkedCharges.filter((c) => c.code.startsWith("MG.")).reduce((s, c) => s + c.total, 0)
    );
  }, 0);
  const surchargeTotal = lines.reduce(
    (sum, line) =>
      sum +
      (isMgVoice(line.voice)
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
    lines.reduce((sum, line) => (isMgVoice(line.voice) ? sum : sum + line.totalAmount), 0);
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
