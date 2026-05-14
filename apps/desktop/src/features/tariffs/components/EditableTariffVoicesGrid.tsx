import { useVirtualizer } from "@tanstack/react-virtual";
import { Info, Plus, Trash2, WandSparkles, X } from "lucide-react";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { DesktopTariffVoice, TariffWarning } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import type { VoiceGroup } from "../utils/tariff-grouping";
import { formatEditablePercent } from "../utils/tariffs-validation";

const CELL_BASE =
  "h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-12px font-semibold text-[var(--text-primary)] outline-none transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]";
const CELL_EDIT = "border-transparent hover:border-[var(--border-subtle)]";
const GRID_COLS = "grid grid-cols-[160px_minmax(360px,1fr)_80px_100px_110px_36px] gap-3 px-5 py-2";

export type TariffGridSectionSummary = {
  id: string;
  categoria: string;
  groupsCount: number;
  rowsCount: number;
  warningCount: number;
};

export type TariffGridScrollTarget =
  | { categoryId: string; nonce: number; type: "category" }
  | { field: keyof DesktopTariffVoice; nonce: number; rowIndex: number; type: "cell" };

export type TariffGridDraftChange = {
  field: keyof DesktopTariffVoice;
  rowIndex: number;
  value: string;
};

export type EditableTariffVoicesGridHandle = {
  drainDraftChanges: () => TariffGridDraftChange[];
};

type HighlightedCell = {
  field: keyof DesktopTariffVoice;
  rowIndex: number;
};

function getDraftKey(index: number, field: keyof DesktopTariffVoice) {
  return `${index}:${field}`;
}

function WarningTooltip({
  warnings,
  anchorRef,
  onClose,
}: {
  warnings: TariffWarning[];
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, above: true });

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceAbove > spaceBelow || spaceBelow < 200;
    setPosition({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
      above,
    });
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[100] w-72 rounded-14px bg-[var(--surface-base)] p-3 shadow-soft ring-1 ring-[var(--border-subtle)]"
      style={{
        left: position.left,
        top: position.top,
        transform: position.above ? "translateY(-100%)" : "none",
      }}
    >
      <button
        className="absolute right-2 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        onClick={onClose}
        type="button"
      >
        <X className="size-3" />
      </button>
      <div className="max-h-48 space-y-3 overflow-y-auto pr-2">
        {warnings.map((w) => (
          <div key={w.id} className="space-y-1">
            <div className="text-11px font-bold text-[var(--warning-base)]">
              #{w.id} {w.title}
            </div>
            <div className="text-11px font-medium leading-normal text-[var(--text-secondary)]">
              {w.body}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function ImportCell({
  align = "left",
  draftValue,
  field,
  highlighted,
  index,
  onDraftChange,
  onDraftDiscard,
  value,
  warnings,
}: {
  align?: "left" | "right";
  draftValue: string | undefined;
  field: keyof DesktopTariffVoice;
  highlighted: boolean;
  index: number;
  onDraftChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftDiscard: (index: number, field: keyof DesktopTariffVoice) => void;
  value: string;
  warnings: TariffWarning[] | undefined;
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [localValue, setLocalValue] = useState(draftValue ?? value);
  const isFocusedRef = useRef(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(draftValue ?? value);
    }
  }, [draftValue, value]);

  return (
    <div className="relative flex items-center gap-1">
      <input
        className={`${CELL_BASE} ${CELL_EDIT} ${align === "right" ? "text-right" : ""} ${
          highlighted
            ? "border-[var(--warning-base)] bg-[color-mix(in_srgb,var(--warning-base)_10%,var(--surface-base)_90%)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--warning-base)_18%,transparent)]"
            : ""
        }`}
        id={`import-cell-${index}-${field}`}
        onBlur={() => {
          isFocusedRef.current = false;
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setLocalValue(nextValue);
          onDraftChange(index, field, nextValue);
        }}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setLocalValue(value);
            onDraftDiscard(index, field);
            event.currentTarget.blur();
          }
        }}
        value={localValue}
      />
      {warnings && warnings.length > 0 ? (
        <>
          <button
            ref={infoButtonRef}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--warning-base)] transition-colors hover:bg-[var(--warning-soft)]"
            onClick={() => setShowWarnings(!showWarnings)}
            type="button"
          >
            <Info className="size-3.5" />
          </button>
          {showWarnings ? (
            <WarningTooltip
              warnings={warnings}
              anchorRef={infoButtonRef}
              onClose={() => setShowWarnings(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function DescriptionCell({
  draftValue,
  field,
  highlighted,
  index,
  onDraftChange,
  onDraftDiscard,
  value,
}: {
  draftValue: string | undefined;
  field: keyof DesktopTariffVoice;
  highlighted: boolean;
  index: number;
  onDraftChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftDiscard: (index: number, field: keyof DesktopTariffVoice) => void;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(draftValue ?? value);
  const isFocusedRef = useRef(false);

  const fitContent = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.min(Math.max(element.scrollHeight, 38), 132);
    Object.assign(element.style, {
      height: `${nextHeight}px`,
      overflowY: element.scrollHeight > 132 ? "auto" : "hidden",
    });
  }, []);

  useLayoutEffect(() => {
    fitContent();
  }, [fitContent]);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(draftValue ?? value);
    }
  }, [draftValue, value]);

  return (
    <textarea
      className={`min-h-[34px] w-full resize-none rounded-md border border-transparent bg-transparent px-2.5 py-2 text-12px font-semibold leading-1_45 text-[var(--text-primary)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-subtle)] focus:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] ${
        highlighted
          ? "border-[var(--warning-base)] bg-[color-mix(in_srgb,var(--warning-base)_10%,var(--surface-base)_90%)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--warning-base)_18%,transparent)]"
          : ""
      }`}
      id={`import-cell-${index}-${field}`}
      onBlur={() => {
        isFocusedRef.current = false;
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setLocalValue(nextValue);
        onDraftChange(index, field, nextValue);
        fitContent();
      }}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setLocalValue(value);
          onDraftDiscard(index, field);
          event.currentTarget.blur();
        }
      }}
      ref={textareaRef}
      rows={1}
      value={localValue}
    />
  );
}

type VoiceRowProps = {
  draftByCellRef: { current: Map<string, string> };
  highlightedField: keyof DesktopTariffVoice | null;
  index: number;
  isDuplicate: boolean;
  isInvalid: boolean;
  voice: DesktopTariffVoice;
  onDraftChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftDiscard: (index: number, field: keyof DesktopTariffVoice) => void;
  onDelete: (index: number) => void;
};

type FlatGridItem =
  | { key: string; type: "add" }
  | { categoria: string; id: string; key: string; rowsCount: number; type: "category" }
  | {
      gruppo: string;
      gruppoDesc: string;
      hasWarnings: boolean;
      key: string;
      rowsCount: number;
      type: "group";
      voiceGroupCount: number;
    }
  | { key: string; type: "columns" }
  | {
      code: string;
      key: string;
      rowsCount: number;
      type: "voice";
      voce: string;
      voceDesc: string;
    }
  | { index: number; key: string; type: "row"; voice: DesktopTariffVoice }
  | { groupCount: number; key: string; totalVoices: number; type: "footer" };

const VoiceRow = memo(function VoiceRow({
  draftByCellRef,
  highlightedField,
  index,
  isDuplicate,
  isInvalid,
  voice,
  onDraftChange,
  onDraftDiscard,
  onDelete,
}: VoiceRowProps) {
  const isHighlighted = (field: keyof DesktopTariffVoice) => highlightedField === field;
  const getDraftValue = (field: keyof DesktopTariffVoice) =>
    draftByCellRef.current.get(getDraftKey(index, field));

  return (
    <div
      className={`${GRID_COLS} min-w-[900px] items-center [contain:layout_style] [content-visibility:auto] [contain-intrinsic-size:auto_44px] ${
        isDuplicate ? "bg-[var(--warning-soft)]/25" : ""
      } ${index % 2 === 0 && !isDuplicate ? "bg-[var(--surface-base)]/55" : ""} ${
        isInvalid && !isDuplicate ? "border-l-2 border-l-[var(--warning-base)]/50" : ""
      }`}
      data-voice-id={voice.id}
    >
      <ImportCell
        draftValue={getDraftValue("officialCode")}
        field="officialCode"
        highlighted={isHighlighted("officialCode")}
        index={index}
        onDraftChange={onDraftChange}
        onDraftDiscard={onDraftDiscard}
        value={voice.officialCode}
        warnings={voice.warnings}
      />
      <DescriptionCell
        draftValue={getDraftValue("description")}
        field="description"
        highlighted={isHighlighted("description")}
        index={index}
        onDraftChange={onDraftChange}
        onDraftDiscard={onDraftDiscard}
        value={voice.description}
      />
      <ImportCell
        draftValue={getDraftValue("unitOfMeasure")}
        field="unitOfMeasure"
        highlighted={isHighlighted("unitOfMeasure")}
        index={index}
        onDraftChange={onDraftChange}
        onDraftDiscard={onDraftDiscard}
        value={voice.unitOfMeasure}
        warnings={undefined}
      />
      <ImportCell
        align="right"
        draftValue={getDraftValue("laborPercentage")}
        field="laborPercentage"
        highlighted={isHighlighted("laborPercentage")}
        index={index}
        onDraftChange={onDraftChange}
        onDraftDiscard={onDraftDiscard}
        value={formatEditablePercent(voice.laborPercentage)}
        warnings={undefined}
      />
      <ImportCell
        align="right"
        draftValue={getDraftValue("unitPrice")}
        field="unitPrice"
        highlighted={isHighlighted("unitPrice")}
        index={index}
        onDraftChange={onDraftChange}
        onDraftDiscard={onDraftDiscard}
        value={Number.isFinite(voice.unitPrice) ? String(voice.unitPrice).replace(".", ",") : ""}
        warnings={undefined}
      />
      <button
        aria-label={`Elimina voce ${voice.officialCode || index + 1}`}
        className="flex size-9 items-center justify-center rounded-10px text-[var(--danger-base,var(--warning-base))] transition-colors hover:bg-[var(--warning-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        onClick={() => onDelete(index)}
        title="Elimina voce"
        type="button"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}, areVoiceRowsEqual);

function areVoiceRowsEqual(previous: Readonly<VoiceRowProps>, next: Readonly<VoiceRowProps>) {
  return (
    previous.index === next.index &&
    previous.draftByCellRef === next.draftByCellRef &&
    previous.highlightedField === next.highlightedField &&
    previous.isDuplicate === next.isDuplicate &&
    previous.isInvalid === next.isInvalid &&
    previous.voice === next.voice &&
    previous.onDraftChange === next.onDraftChange &&
    previous.onDraftDiscard === next.onDraftDiscard &&
    previous.onDelete === next.onDelete
  );
}

type EditableTariffVoicesGridProps = {
  duplicateCodes: Set<string>;
  groups: VoiceGroup[];
  onAddVoice?: () => void;
  onChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDelete: (index: number) => void;
  onSectionsChange?: (sections: TariffGridSectionSummary[]) => void;
  scrollTarget?: TariffGridScrollTarget | null;
  validation: ImportValidation;
};

export const EditableTariffVoicesGrid = memo(
  forwardRef<EditableTariffVoicesGridHandle, EditableTariffVoicesGridProps>(
    function EditableTariffVoicesGrid(
      { duplicateCodes, groups, onAddVoice, onDelete, onSectionsChange, scrollTarget, validation },
      ref,
    ) {
      const invalidCellKeys = useMemo(
        () => new Set(validation.invalidRows.map((row) => `${row.index}-${row.field}`)),
        [validation.invalidRows],
      );
      const totalVoices = useMemo(
        () => groups.reduce((sum, group) => sum + group.children.length, 0),
        [groups],
      );
      const scrollParentRef = useRef<HTMLDivElement>(null);
      const handledScrollTargetNonceRef = useRef<number | null>(null);
      const focusRetryRef = useRef<number | null>(null);
      const draftByCellRef = useRef(new Map<string, string>());
      const [highlightedCell, setHighlightedCell] = useState<HighlightedCell | null>(null);

      const handleDraftChange = useCallback(
        (index: number, field: keyof DesktopTariffVoice, value: string) => {
          draftByCellRef.current.set(getDraftKey(index, field), value);
        },
        [],
      );

      const handleDraftDiscard = useCallback((index: number, field: keyof DesktopTariffVoice) => {
        draftByCellRef.current.delete(getDraftKey(index, field));
      }, []);

      useImperativeHandle(
        ref,
        () => ({
          drainDraftChanges: () => {
            const changes = [...draftByCellRef.current.entries()].map(([key, value]) => {
              const [rowIndex, field] = key.split(":");
              return {
                field: field as keyof DesktopTariffVoice,
                rowIndex: Number(rowIndex),
                value,
              };
            });
            draftByCellRef.current.clear();
            return changes;
          },
        }),
        [],
      );

      const sections = useMemo(() => {
        const catMap = new Map<string, Map<string, VoiceGroup[]>>();
        for (const group of groups) {
          const cat = group.categoria || "Altre";
          const grp = group.gruppo || "Altro";
          if (!catMap.has(cat)) catMap.set(cat, new Map());
          const grpMap = catMap.get(cat);
          if (!grpMap) continue;
          if (!grpMap.has(grp)) grpMap.set(grp, []);
          grpMap.get(grp)?.push(group);
        }
        return [...catMap.entries()]
          .toSorted(([a], [b]) => a.localeCompare(b, "it", { numeric: true }))
          .map(([cat, grpMap]) => ({
            id: createCategoryId(cat),
            categoria: cat,
            groups: [...grpMap.entries()]
              .toSorted(([a], [b]) => a.localeCompare(b, "it", { numeric: true }))
              .map(([grp, voci]) => ({
                gruppo: grp,
                gruppoDesc: voci[0]?.gruppoDesc ?? "",
                voci: voci.toSorted((a, b) => Number(a.voce || "0") - Number(b.voce || "0")),
              })),
          }));
      }, [groups]);

      const sectionSummaries = useMemo<TariffGridSectionSummary[]>(
        () =>
          sections.map((section) => {
            const rowsCount = section.groups.reduce(
              (sum, group) =>
                sum + group.voci.reduce((voiceSum, voice) => voiceSum + voice.children.length, 0),
              0,
            );
            const warningCount = section.groups.reduce(
              (sum, group) =>
                sum +
                group.voci.reduce(
                  (voiceSum, voice) =>
                    voiceSum +
                    voice.children.reduce(
                      (rowSum, child) => rowSum + (child.voice.warnings?.length ?? 0),
                      0,
                    ),
                  0,
                ),
              0,
            );
            return {
              id: section.id,
              categoria: section.categoria,
              groupsCount: section.groups.length,
              rowsCount,
              warningCount,
            };
          }),
        [sections],
      );

      useLayoutEffect(() => {
        onSectionsChange?.(sectionSummaries);
      }, [onSectionsChange, sectionSummaries]);

      const flatItems = useMemo<FlatGridItem[]>(() => {
        const items: FlatGridItem[] = [];

        if (onAddVoice) {
          items.push({ key: "add-voice", type: "add" });
        }

        for (const section of sections) {
          const sectionRowsCount = section.groups.reduce(
            (sum, group) =>
              sum + group.voci.reduce((voiceSum, voice) => voiceSum + voice.children.length, 0),
            0,
          );
          items.push({
            categoria: section.categoria,
            id: section.id,
            key: `category-${section.categoria}`,
            rowsCount: sectionRowsCount,
            type: "category",
          });

          for (const group of section.groups) {
            const groupRowsCount = group.voci.reduce(
              (sum, voice) => sum + voice.children.length,
              0,
            );
            const hasWarnings = group.voci.some((voice) =>
              voice.children.some((child) => (child.voice.warnings?.length ?? 0) > 0),
            );
            items.push({
              gruppo: group.gruppo,
              gruppoDesc: group.gruppoDesc,
              hasWarnings,
              key: `group-${section.categoria}-${group.gruppo}`,
              rowsCount: groupRowsCount,
              type: "group",
              voiceGroupCount: group.voci.length,
            });

            for (const voiceGroup of group.voci) {
              if (voiceGroup.voce || voiceGroup.voceDesc) {
                items.push({
                  code: voiceGroup.code,
                  key: `voice-${voiceGroup.code}`,
                  rowsCount: voiceGroup.children.length,
                  type: "voice",
                  voce: voiceGroup.voce,
                  voceDesc: voiceGroup.voceDesc,
                });
              }

              items.push({ key: `columns-${voiceGroup.code}`, type: "columns" });

              for (const { index, voice } of voiceGroup.children) {
                items.push({ index, key: `row-${voice.id}`, type: "row", voice });
              }
            }
          }
        }

        items.push({
          groupCount: groups.length,
          key: "footer",
          totalVoices,
          type: "footer",
        });

        return items;
      }, [groups.length, onAddVoice, sections, totalVoices]);

      const virtualizer = useVirtualizer({
        count: flatItems.length,
        estimateSize: (index) => {
          const item = flatItems[index];
          if (!item) return 44;
          if (item.type === "add") return 72;
          if (item.type === "category") return 66;
          if (item.type === "group") return 58;
          if (item.type === "voice") return 50;
          if (item.type === "columns") return 38;
          if (item.type === "footer") return 54;
          return 48;
        },
        getItemKey: (index) => flatItems[index]?.key ?? index,
        getScrollElement: () => scrollParentRef.current,
        overscan: 18,
      });

      useEffect(() => {
        if (!scrollTarget) return;
        if (handledScrollTargetNonceRef.current === scrollTarget.nonce) return;
        if (focusRetryRef.current !== null) {
          window.clearTimeout(focusRetryRef.current);
          focusRetryRef.current = null;
        }

        const ITEM_ESTIMATED_SIZE: Record<FlatGridItem["type"], number> = {
          add: 72,
          category: 66,
          group: 58,
          voice: 50,
          columns: 38,
          row: 48,
          footer: 54,
        };

        const findTargetIndex = () =>
          flatItems.findIndex((item) => {
            if (scrollTarget.type === "category") {
              return item.type === "category" && item.id === scrollTarget.categoryId;
            }
            return item.type === "row" && item.index === scrollTarget.rowIndex;
          });

        const targetIndex = findTargetIndex();
        if (targetIndex < 0) return;

        const targetId =
          scrollTarget.type === "category"
            ? scrollTarget.categoryId
            : `import-cell-${scrollTarget.rowIndex}-${scrollTarget.field}`;

        const scrollParent = scrollParentRef.current;

        // -- Step 1: scroll using virtualizer's precise offset --
        try {
          virtualizer.scrollToIndex(targetIndex, {
            align: scrollTarget.type === "category" ? "start" : "center",
            behavior: "auto",
          });
        } catch {
          // fallback: estimate Y from flatItems
          if (scrollParent) {
            let estimatedOffset = 0;
            for (let i = 0; i < targetIndex; i++) {
              const item = flatItems[i];
              estimatedOffset += item ? ITEM_ESTIMATED_SIZE[item.type] : 48;
            }
            scrollParent.scrollTo({
              top: Math.max(0, estimatedOffset - scrollParent.clientHeight / 2 + 24),
            });
          }
        }

        // -- Step 2: wait for element to appear, then smooth-scrollIntoView --
        const scrollIntoElement = () => {
          const element = document.getElementById(targetId);
          if (element instanceof HTMLElement) {
            element.scrollIntoView({
              behavior: "smooth",
              block: scrollTarget.type === "category" ? "start" : "center",
            });
            if (scrollTarget.type === "cell") {
              element.focus({ preventScroll: true });
            }
            handledScrollTargetNonceRef.current = scrollTarget.nonce;
            return true;
          }
          return false;
        };

        if (scrollIntoElement()) {
          if (scrollTarget.type === "cell") {
            setHighlightedCell({ field: scrollTarget.field, rowIndex: scrollTarget.rowIndex });
          }
          return;
        }

        // If after 300ms the element still isn't in DOM, force an approximate scroll
        // (the virtualizer may have rejected scrollToIndex or items aren't measured yet)
        let attempts = 0;
        const retryScroll = () => {
          attempts += 1;
          if (scrollIntoElement()) {
            if (scrollTarget.type === "cell") {
              setHighlightedCell({ field: scrollTarget.field, rowIndex: scrollTarget.rowIndex });
            }
            focusRetryRef.current = null;
            return;
          }
          if (attempts === 3 && scrollParent) {
            // Fallback: force scroll to estimated position
            let estimatedOffset = 0;
            for (let i = 0; i < targetIndex; i++) {
              const item = flatItems[i];
              estimatedOffset += item ? ITEM_ESTIMATED_SIZE[item.type] : 48;
            }
            scrollParent.scrollTo({
              top: Math.max(0, estimatedOffset - scrollParent.clientHeight / 2 + 24),
            });
          }
          if (attempts >= 20) {
            focusRetryRef.current = null;
            return;
          }
          focusRetryRef.current = window.setTimeout(retryScroll, 100);
        };

        focusRetryRef.current = window.setTimeout(retryScroll, 100);

        return () => {
          if (focusRetryRef.current !== null) {
            window.clearTimeout(focusRetryRef.current);
            focusRetryRef.current = null;
          }
        };
      }, [flatItems, scrollTarget, virtualizer]);

      useEffect(() => {
        if (!highlightedCell) return;
        const key = `${highlightedCell.rowIndex}-${highlightedCell.field}`;
        if (!invalidCellKeys.has(key)) {
          setHighlightedCell(null);
        }
      }, [highlightedCell, invalidCellKeys]);

      return (
        <div>
          {sections.length === 0 ? (
            <div className="rounded-2xl bg-[var(--bg-muted)]/50 p-6 text-center text-13px font-medium text-[var(--text-secondary)]">
              Nessuna voce da importare.
            </div>
          ) : (
            <div className="rounded-18px border border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[var(--surface-base)] shadow-[0_16px_36px_color-mix(in_srgb,var(--shadow-color,rgba(15,23,42,0.10))_18%,transparent)]">
              <div
                data-tariff-virtual-scroll="true"
                className="max-h-[72vh] min-h-[520px] overflow-auto px-4 py-4"
                ref={scrollParentRef}
              >
                <div
                  className="relative"
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const item = flatItems[virtualItem.index];
                    if (!item) return null;

                    return (
                      <div
                        className="absolute left-0 top-0 w-full"
                        data-index={virtualItem.index}
                        key={virtualItem.key}
                        ref={virtualizer.measureElement}
                        style={{
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <VirtualGridItem
                          duplicateCodes={duplicateCodes}
                          draftByCellRef={draftByCellRef}
                          highlightedCell={highlightedCell}
                          invalidCellKeys={invalidCellKeys}
                          item={item}
                          onAddVoice={onAddVoice}
                          onDelete={onDelete}
                          onDraftChange={handleDraftChange}
                          onDraftDiscard={handleDraftDiscard}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    },
  ),
);

function VirtualGridItem({
  duplicateCodes,
  draftByCellRef,
  highlightedCell,
  invalidCellKeys,
  item,
  onAddVoice,
  onDelete,
  onDraftChange,
  onDraftDiscard,
}: {
  duplicateCodes: Set<string>;
  draftByCellRef: { current: Map<string, string> };
  highlightedCell: HighlightedCell | null;
  invalidCellKeys: Set<string>;
  item: FlatGridItem;
  onAddVoice: (() => void) | undefined;
  onDelete: (index: number) => void;
  onDraftChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftDiscard: (index: number, field: keyof DesktopTariffVoice) => void;
}) {
  if (item.type === "add") {
    return (
      <div className="pb-4">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-[var(--info-base)]/34 bg-[color-mix(in_srgb,var(--info-base)_7%,transparent)] px-4 text-12px font-semibold text-[var(--info-base)] transition-colors hover:border-[var(--info-base)]/60 hover:bg-[color-mix(in_srgb,var(--info-base)_14%,transparent)]"
          onClick={onAddVoice}
          title="Aggiungi voce personalizzata"
          type="button"
        >
          <WandSparkles className="size-4" />
          <span>Nuova voce</span>
          <Plus className="size-3.5" strokeWidth={3} />
        </button>
      </div>
    );
  }

  if (item.type === "category") {
    return (
      <div className="scroll-mt-24 pt-5 pb-3" data-category={item.categoria} id={item.id}>
        <div className="flex items-center gap-3">
          <h4 className="text-18px font-semibold tracking-neg-0_03em text-[var(--text-primary)]">
            Categorie {item.categoria || "Altre"}
          </h4>
          <span className="rounded-full bg-[var(--bg-muted-strong)] px-3 py-1 text-12px font-bold text-[var(--text-secondary)]">
            {item.rowsCount.toLocaleString("it-IT")}
          </span>
        </div>
      </div>
    );
  }

  if (item.type === "group") {
    return (
      <div className="rounded-t-18px border border-b-0 border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="rounded-md bg-[var(--info-soft)] px-2 py-1 text-12px font-bold text-[var(--info-base)]">
              {item.gruppo}
            </span>
            {item.gruppoDesc ? (
              <span className="min-w-0 truncate text-13px font-bold text-[var(--text-secondary)]">
                {item.gruppoDesc}
              </span>
            ) : null}
            {item.hasWarnings ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-base)]">
                <Info className="size-3" />
              </span>
            ) : null}
          </div>
          <span className="text-11px font-semibold text-[var(--text-secondary)]">
            {item.voiceGroupCount} voci · {item.rowsCount.toLocaleString("it-IT")} sottovoci
          </span>
        </div>
      </div>
    );
  }

  if (item.type === "voice") {
    return (
      <div className="flex items-center gap-3 border-x border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[var(--bg-muted)]/45 px-5 py-3">
        <span className="rounded-md bg-[var(--warning-soft)] px-2.5 py-1 text-11px font-bold text-[var(--accent-primary)]">
          VOCE {item.voce}
        </span>
        {item.voceDesc ? (
          <span className="min-w-0 flex-1 truncate text-12px font-semibold leading-normal text-[var(--text-secondary)]">
            {item.voceDesc}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 text-11px font-medium text-[var(--text-secondary)]">
          {item.rowsCount.toLocaleString("it-IT")} righe
        </span>
      </div>
    );
  }

  if (item.type === "columns") {
    return (
      <div
        className={`${GRID_COLS} min-w-[900px] border-x border-b border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)] text-10px font-bold uppercase tracking-0_08em text-[var(--text-secondary)]`}
      >
        <span>Codice</span>
        <span>Descrizione</span>
        <span>U.M.</span>
        <span className="text-right">Manod.</span>
        <span className="text-right">Prezzo</span>
        <span className="sr-only">Azioni</span>
      </div>
    );
  }

  if (item.type === "row") {
    const code = item.voice.officialCode.trim();
    const isDuplicate = duplicateCodes.has(code);
    const rowInvalid =
      invalidCellKeys.has(`${item.index}-officialCode`) ||
      isDuplicate ||
      invalidCellKeys.has(`${item.index}-description`) ||
      invalidCellKeys.has(`${item.index}-unitOfMeasure`) ||
      invalidCellKeys.has(`${item.index}-unitPrice`);

    return (
      <div className="border-x border-b border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)]">
        <VoiceRow
          draftByCellRef={draftByCellRef}
          highlightedField={highlightedCell?.rowIndex === item.index ? highlightedCell.field : null}
          index={item.index}
          isDuplicate={isDuplicate}
          isInvalid={rowInvalid}
          onDraftChange={onDraftChange}
          onDraftDiscard={onDraftDiscard}
          onDelete={onDelete}
          voice={item.voice}
        />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="rounded-xl border border-[var(--border-subtle)]/50 bg-[var(--bg-muted)]/40 px-5 py-3 text-12px font-medium text-[var(--text-secondary)]">
        {item.totalVoices.toLocaleString("it-IT")} sottovoci in{" "}
        {item.groupCount.toLocaleString("it-IT")} voci
      </div>
    </div>
  );
}

function createCategoryId(categoria: string): string {
  const safeCategoria = categoria.replace(/[^a-zA-Z0-9_-]+/g, "-") || "altre";
  return `tariff-cat-${safeCategoria}`;
}
