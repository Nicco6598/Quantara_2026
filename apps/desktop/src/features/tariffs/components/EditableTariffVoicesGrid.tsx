import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, Info, Link2, MapPin, Plus, Trash2, WandSparkles, X } from "lucide-react";
import {
  forwardRef,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { useContextMenu } from "@/hooks/useContextMenu";
import {
  buildTariffVoiceContextMenuEntries,
  copyTextToClipboard,
} from "@/lib/context-menu-presets";
import type { DesktopTariffVoice, TariffWarning } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import type { ImportPreviewGridLayout } from "../utils/import-preview-grid-layout";
import { isImportCustomVoice } from "../utils/import-preview-voice-split";
import type { VoiceGroup } from "../utils/tariff-grouping";
import { formatEditablePercent } from "../utils/tariffs-validation";

const CELL_BASE =
  "h-9 min-w-0 flex-1 rounded-lg border bg-[var(--surface-base)]/54 px-2.5 text-12px font-semibold text-[var(--text-primary)] outline-none shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_45%,transparent)] transition duration-[var(--duration-fast)] ease-standard focus:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]";
const CELL_EDIT =
  "border-[color-mix(in_srgb,var(--border-subtle)_92%,var(--text-secondary)_8%)] hover:border-[var(--accent-primary)]/60 hover:bg-[var(--surface-base)]";
const GRID_COLS = "grid grid-cols-[180px_minmax(460px,1fr)_78px_92px_108px_34px] gap-2.5 px-3 py-2";
const LARGE_GRID_SUMMARY_THRESHOLD = 2_500;

export type TariffGridSectionSummary = {
  id: string;
  categoria: string;
  groupsCount: number;
  rowsCount: number;
  errorCount: number;
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
  discardDraftField: (index: number, field: keyof DesktopTariffVoice) => void;
  drainDraftChanges: () => TariffGridDraftChange[];
  peekDraftChanges: () => TariffGridDraftChange[];
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
      className="fixed z-[var(--z-dropdown-portal)] w-72 rounded-14px bg-[var(--surface-base)] p-3 shadow-soft ring-1 ring-[var(--border-subtle)]"
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

function cellStateClass(invalid: boolean, highlighted: boolean): string {
  if (invalid) {
    return highlighted
      ? "border-[var(--danger-base)] bg-[color-mix(in_srgb,var(--danger-base)_12%,var(--surface-base)_88%)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger-base)_22%,transparent)]"
      : "border-[var(--danger-base)]/70 bg-[color-mix(in_srgb,var(--danger-base)_8%,var(--surface-base)_92%)]";
  }
  if (highlighted) {
    return "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent)]";
  }
  return "";
}

function ImportCell({
  align = "left",
  draftValue,
  field,
  highlighted,
  index,
  invalid = false,
  onDraftChange,
  onDraftCommit,
  onDraftDiscard,
  value,
  warnings,
}: {
  align?: "left" | "right";
  draftValue: string | undefined;
  field: keyof DesktopTariffVoice;
  highlighted: boolean;
  index: number;
  invalid?: boolean;
  onDraftChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftCommit: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
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
        className={`${CELL_BASE} ${CELL_EDIT} ${align === "right" ? "text-right" : ""} ${cellStateClass(invalid, highlighted)}`}
        aria-invalid={invalid || undefined}
        id={`import-cell-${index}-${field}`}
        onBlur={() => {
          isFocusedRef.current = false;
          onDraftCommit(index, field, localValue);
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
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--info-base)] transition-colors hover:bg-[var(--info-soft)]"
            title="Note parser (non bloccano l'import)"
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

function VoiceAuditPills({ voice }: { voice: DesktopTariffVoice }) {
  const issueCount = (voice.issues?.length ?? 0) + (voice.reviewFlags?.length ?? 0);
  const linkedCount = voice.linkedMaggiorazioni?.length ?? 0;
  const confidence =
    typeof voice.confidence === "number" ? Math.round(voice.confidence * 100) : null;
  const sourcePage = voice.source?.page;

  if (issueCount === 0 && linkedCount === 0 && confidence == null && sourcePage == null)
    return null;

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
      {confidence != null ? (
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-9px font-bold tabular-nums ${
            confidence >= 90
              ? "bg-[var(--success-soft)] text-[var(--success-base)]"
              : confidence >= 80
                ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                : "bg-[var(--warning-soft)] text-[var(--warning-base)]"
          }`}
          title="Confidenza parser"
        >
          {confidence}%
        </span>
      ) : null}
      {sourcePage != null ? (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 text-9px font-bold text-[var(--text-secondary)]"
          title={`Pagina sorgente ${sourcePage}${voice.source?.line ? `, riga ${voice.source.line}` : ""}`}
        >
          <MapPin className="size-2.5" />
          p.{sourcePage}
        </span>
      ) : null}
      {linkedCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-[var(--info-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--info-base)]"
          title="Maggiorazioni collegate"
        >
          <Link2 className="size-2.5" />
          {linkedCount}
        </span>
      ) : null}
      {issueCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 text-9px font-bold text-[var(--warning-base)]"
          title={[...(voice.issues ?? []), ...(voice.reviewFlags ?? [])].join(", ")}
        >
          <AlertTriangle className="size-2.5" />
          {issueCount}
        </span>
      ) : null}
    </div>
  );
}

function VoiceContextLine({ voice }: { voice: DesktopTariffVoice }) {
  const warningCount = voice.warnings?.length ?? 0;
  const rules = voice.applicabilityRules;
  const conditions = rules?.conditions ?? [];
  const parts = [
    voice.voceDesc ? `Voce: ${voice.voceDesc}` : "",
    voice.gruppoDesc ? `Gruppo: ${voice.gruppoDesc}` : "",
    conditions.length > 0 ? `Condizioni: ${conditions.map(formatAuditLabel).join(", ")}` : "",
    rules?.quotaManodoperaOnly ? "Quota manodopera" : "",
  ].filter(Boolean);

  if (parts.length === 0 && warningCount === 0) return null;

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-2.5 text-10px font-semibold leading-4 text-[var(--text-tertiary)]">
      {parts.slice(0, 3).map((part) => (
        <span className="max-w-full truncate" key={part}>
          {part}
        </span>
      ))}
      {warningCount > 0 ? (
        <span className="rounded-md bg-[var(--info-soft)] px-1.5 py-0.5 text-[var(--info-base)]">
          {warningCount} nota/e parser
        </span>
      ) : null}
    </div>
  );
}

function DescriptionCell({
  draftValue,
  field,
  highlighted,
  index,
  invalid = false,
  onDraftChange,
  onDraftCommit,
  onDraftDiscard,
  value,
}: {
  draftValue: string | undefined;
  field: keyof DesktopTariffVoice;
  highlighted: boolean;
  index: number;
  invalid?: boolean;
  onDraftChange: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftCommit: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
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
      className={`min-h-[34px] w-full resize-none rounded-lg border border-[color-mix(in_srgb,var(--border-subtle)_92%,var(--text-secondary)_8%)] bg-[var(--surface-base)]/54 px-2.5 py-2 text-12px font-semibold leading-1_45 text-[var(--text-primary)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_45%,transparent)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-standard hover:border-[var(--accent-primary)]/60 hover:bg-[var(--surface-base)] focus:bg-[var(--surface-base)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)] ${cellStateClass(invalid, highlighted)}`}
      aria-invalid={invalid || undefined}
      id={`import-cell-${index}-${field}`}
      onBlur={() => {
        isFocusedRef.current = false;
        onDraftCommit(index, field, localValue);
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
  onDraftCommit: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onDraftDiscard: (index: number, field: keyof DesktopTariffVoice) => void;
  onDelete: (index: number) => void;
};

type FlatGridItem =
  | { key: string; type: "add" }
  | { categoria: string; id: string; key: string; rowsCount: number; type: "category" }
  | {
      gruppo: string;
      gruppoDesc: string;
      key: string;
      rowsCount: number;
      type: "group";
      voiceGroupCount: number;
      warningCount: number;
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
  invalidCellKeys,
  isDuplicate,
  isInvalid,
  voice,
  onDraftChange,
  onDraftCommit,
  onDraftDiscard,
  onDelete,
}: VoiceRowProps & { invalidCellKeys: Set<string> }) {
  const isHighlighted = (field: keyof DesktopTariffVoice) => highlightedField === field;
  const isFieldInvalid = (field: keyof DesktopTariffVoice) =>
    invalidCellKeys.has(`${index}-${field}`);
  const getDraftValue = (field: keyof DesktopTariffVoice) =>
    draftByCellRef.current.get(getDraftKey(index, field));
  const contextMenu = useContextMenu<void>();
  const voiceCode = voice.officialCode || voice.id;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: tariff voice row exposes a context menu on right-click */}
      <div
        className={`${GRID_COLS} min-w-[980px] items-start rounded-xl border [contain:layout_style] [content-visibility:auto] [contain-intrinsic-size:auto_58px] ${
          isDuplicate
            ? "border-[var(--danger-base)]/35 bg-[color-mix(in_srgb,var(--danger-base)_6%,var(--surface-base)_94%)]"
            : "border-[color-mix(in_srgb,var(--border-subtle)_54%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_46%,transparent)]"
        } ${
          index % 2 === 0 && !isDuplicate
            ? "bg-[color-mix(in_srgb,var(--surface-base)_62%,transparent)]"
            : ""
        } ${
          isInvalid && !isDuplicate
            ? "border-l-[var(--danger-base)] shadow-[inset_3px_0_0_var(--danger-base)]"
            : ""
        }`}
        data-voice-id={voice.id}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest("input, textarea, button, select")) return;
          event.preventDefault();
          event.stopPropagation();
          contextMenu.open(event, undefined);
        }}
      >
        <div className="min-w-0">
          <ImportCell
            draftValue={getDraftValue("officialCode")}
            field="officialCode"
            highlighted={isHighlighted("officialCode")}
            index={index}
            invalid={isFieldInvalid("officialCode")}
            onDraftChange={onDraftChange}
            onDraftCommit={onDraftCommit}
            onDraftDiscard={onDraftDiscard}
            value={voice.officialCode}
            warnings={voice.warnings}
          />
          <VoiceAuditPills voice={voice} />
        </div>
        <div className="min-w-0">
          <DescriptionCell
            draftValue={getDraftValue("description")}
            field="description"
            highlighted={isHighlighted("description")}
            index={index}
            invalid={isFieldInvalid("description")}
            onDraftChange={onDraftChange}
            onDraftCommit={onDraftCommit}
            onDraftDiscard={onDraftDiscard}
            value={voice.description}
          />
          <VoiceContextLine voice={voice} />
        </div>
        <ImportCell
          draftValue={getDraftValue("unitOfMeasure")}
          field="unitOfMeasure"
          highlighted={isHighlighted("unitOfMeasure")}
          index={index}
          invalid={isFieldInvalid("unitOfMeasure")}
          onDraftChange={onDraftChange}
          onDraftCommit={onDraftCommit}
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
          invalid={isFieldInvalid("laborPercentage")}
          onDraftChange={onDraftChange}
          onDraftCommit={onDraftCommit}
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
          invalid={isFieldInvalid("unitPrice")}
          onDraftChange={onDraftChange}
          onDraftCommit={onDraftCommit}
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

        {contextMenu.state ? (
          <AppContextMenu
            entries={buildTariffVoiceContextMenuEntries({
              onCopyCode: () => void copyTextToClipboard(voiceCode),
              onDelete: () => onDelete(index),
            })}
            header={{ title: voiceCode, subtitle: voice.description }}
            onClose={contextMenu.close}
            position={{ x: contextMenu.state.x, y: contextMenu.state.y }}
          />
        ) : null}
      </div>
    </>
  );
}, areVoiceRowsEqual);

function areVoiceRowsEqual(
  previous: Readonly<VoiceRowProps & { invalidCellKeys: Set<string> }>,
  next: Readonly<VoiceRowProps & { invalidCellKeys: Set<string> }>,
) {
  return (
    previous.index === next.index &&
    previous.draftByCellRef === next.draftByCellRef &&
    previous.highlightedField === next.highlightedField &&
    previous.invalidCellKeys === next.invalidCellKeys &&
    previous.isDuplicate === next.isDuplicate &&
    previous.isInvalid === next.isInvalid &&
    previous.voice === next.voice &&
    previous.onDraftChange === next.onDraftChange &&
    previous.onDraftCommit === next.onDraftCommit &&
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
  onDraftActivity?: () => void;
  onDraftCommit?: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
  onSectionsChange?: (sections: TariffGridSectionSummary[]) => void;
  prebuiltLayout?: ImportPreviewGridLayout | null;
  scrollLayout?: "fill" | "viewport";
  scrollTarget?: TariffGridScrollTarget | null;
  validation: ImportValidation;
};

export const EditableTariffVoicesGrid = memo(
  forwardRef<EditableTariffVoicesGridHandle, EditableTariffVoicesGridProps>(
    function EditableTariffVoicesGrid(
      {
        duplicateCodes,
        groups,
        onAddVoice,
        onDelete,
        onDraftActivity,
        onDraftCommit,
        onSectionsChange,
        prebuiltLayout,
        scrollLayout = "viewport",
        scrollTarget,
        validation,
      },
      ref,
    ) {
      const invalidCellKeys = useMemo(
        () =>
          new Set([
            ...validation.invalidRows.map((row) => `${row.index}-${row.field}`),
            ...validation.duplicateRows.map((row) => `${row.index}-${row.field}`),
          ]),
        [validation.duplicateRows, validation.invalidRows],
      );
      const invalidRowIndices = useMemo(
        () =>
          new Set([
            ...validation.invalidRows.map((row) => row.index),
            ...validation.duplicateRows.map((row) => row.index),
          ]),
        [validation.duplicateRows, validation.invalidRows],
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

      const readDraftChanges = useCallback((): TariffGridDraftChange[] => {
        return [...draftByCellRef.current.entries()].map(([key, value]) => {
          const [rowIndex, field] = key.split(":");
          return {
            field: field as keyof DesktopTariffVoice,
            rowIndex: Number(rowIndex),
            value,
          };
        });
      }, []);

      const handleDraftChange = useCallback(
        (index: number, field: keyof DesktopTariffVoice, value: string) => {
          draftByCellRef.current.set(getDraftKey(index, field), value);
          onDraftActivity?.();
        },
        [onDraftActivity],
      );

      const handleDraftDiscard = useCallback((index: number, field: keyof DesktopTariffVoice) => {
        draftByCellRef.current.delete(getDraftKey(index, field));
      }, []);

      const handleDraftCommit = useCallback(
        (index: number, field: keyof DesktopTariffVoice, value: string) => {
          draftByCellRef.current.delete(getDraftKey(index, field));
          onDraftCommit?.(index, field, value);
        },
        [onDraftCommit],
      );

      useImperativeHandle(
        ref,
        () => ({
          discardDraftField: (index: number, field: keyof DesktopTariffVoice) => {
            draftByCellRef.current.delete(getDraftKey(index, field));
          },
          drainDraftChanges: () => {
            const changes = readDraftChanges();
            draftByCellRef.current.clear();
            return changes;
          },
          peekDraftChanges: readDraftChanges,
        }),
        [readDraftChanges],
      );

      const deferredGroups = useDeferredValue(groups);
      const sections = useMemo(() => {
        if (prebuiltLayout?.sections) {
          return prebuiltLayout.sections;
        }
        const catMap = new Map<string, Map<string, VoiceGroup[]>>();
        for (const group of deferredGroups) {
          const cat = group.categoria || "Altre";
          const grp = group.gruppo || "Altro";
          if (!catMap.has(cat)) catMap.set(cat, new Map());
          const grpMap = catMap.get(cat);
          if (!grpMap) continue;
          if (!grpMap.has(grp)) grpMap.set(grp, []);
          grpMap.get(grp)?.push(group);
        }
        return [...catMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b, "it", { numeric: true }))
          .map(([cat, grpMap]) => ({
            id: createCategoryId(cat),
            categoria: cat,
            groups: [...grpMap.entries()]
              .sort(([a], [b]) => a.localeCompare(b, "it", { numeric: true }))
              .map(([grp, voci]) => ({
                gruppo: grp,
                gruppoDesc: voci[0]?.gruppoDesc ?? "",
                voci: [...voci].sort((a, b) => Number(a.voce || "0") - Number(b.voce || "0")),
              })),
          }));
      }, [deferredGroups, prebuiltLayout?.sections]);

      const sectionSummaries = useMemo<TariffGridSectionSummary[]>(() => {
        const skipHeavyCounts = totalVoices > LARGE_GRID_SUMMARY_THRESHOLD;
        return sections.map((section) => {
          const rowsCount = section.groups.reduce(
            (sum, group) =>
              sum + group.voci.reduce((voiceSum, voice) => voiceSum + voice.children.length, 0),
            0,
          );
          if (skipHeavyCounts) {
            return {
              id: section.id,
              categoria: section.categoria,
              groupsCount: section.groups.length,
              rowsCount,
              errorCount: 0,
              warningCount: 0,
            };
          }
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
          const errorCount = section.groups.reduce(
            (sum, group) =>
              sum +
              group.voci.reduce(
                (voiceSum, voice) =>
                  voiceSum +
                  voice.children.reduce(
                    (rowSum, child) => rowSum + (invalidRowIndices.has(child.index) ? 1 : 0),
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
            errorCount,
            warningCount,
          };
        });
      }, [invalidRowIndices, sections, totalVoices]);

      useLayoutEffect(() => {
        onSectionsChange?.(sectionSummaries);
      }, [onSectionsChange, sectionSummaries]);

      const flatItems = useMemo<FlatGridItem[]>(() => {
        if (prebuiltLayout?.flatItems) {
          return prebuiltLayout.flatItems;
        }

        const items: FlatGridItem[] = [];

        if (onAddVoice) {
          items.push({ key: "add-row-top", type: "add" });
        }

        const pinnedCustom: Array<{ index: number; voice: DesktopTariffVoice }> = [];
        for (const group of deferredGroups) {
          for (const child of group.children) {
            if (isImportCustomVoice(child.voice)) {
              pinnedCustom.push(child);
            }
          }
        }
        pinnedCustom.sort((left, right) => left.index - right.index);

        if (pinnedCustom.length > 0) {
          items.push({ key: "columns-custom", type: "columns" });
          for (const { index, voice } of pinnedCustom) {
            items.push({ index, key: `row-${voice.id}`, type: "row", voice });
          }
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
            const warningCount = group.voci.reduce(
              (sum, voice) =>
                sum +
                voice.children.reduce(
                  (rowSum, child) => rowSum + (child.voice.warnings?.length ?? 0),
                  0,
                ),
              0,
            );
            items.push({
              gruppo: group.gruppo,
              gruppoDesc: group.gruppoDesc,
              key: `group-${section.categoria}-${group.gruppo}`,
              rowsCount: groupRowsCount,
              type: "group",
              voiceGroupCount: group.voci.length,
              warningCount,
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
                if (isImportCustomVoice(voice)) continue;
                items.push({ index, key: `row-${voice.id}`, type: "row", voice });
              }
            }
          }
        }

        items.push({
          groupCount: deferredGroups.length,
          key: "footer",
          totalVoices,
          type: "footer",
        });

        return items;
      }, [deferredGroups, onAddVoice, prebuiltLayout?.flatItems, sections, totalVoices]);

      const virtualizer = useVirtualizer({
        count: flatItems.length,
        estimateSize: (index) => {
          const item = flatItems[index];
          if (!item) return 44;
          if (item.type === "add") return 72;
          if (item.type === "category") return 66;
          if (item.type === "group") return 58;
          if (item.type === "voice") return 50;
          if (item.type === "columns") return 36;
          if (item.type === "footer") return 54;
          return 62;
        },
        getItemKey: (index) => flatItems[index]?.key ?? index,
        getScrollElement: () => scrollParentRef.current,
        overscan: scrollLayout === "fill" ? 8 : 18,
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
          row: 62,
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
        <div
          className={
            scrollLayout === "fill"
              ? "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
              : "w-full"
          }
        >
          {sections.length === 0 ? (
            <EmptyState
              icon={Info}
              title="Nessuna voce da importare."
              description="Le voci importate appariranno qui."
              className="rounded-2xl"
            />
          ) : (
            <div
              className={
                scrollLayout === "fill"
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "overflow-hidden"
              }
            >
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)]/70 pb-3">
                <div className="min-w-0">
                  <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-tertiary)]">
                    Ledger voci estratte
                  </div>
                  <div className="mt-1 text-13px font-semibold text-[var(--text-secondary)]">
                    {totalVoices.toLocaleString("it-IT")} righe in{" "}
                    {deferredGroups.length.toLocaleString("it-IT")} voci, virtualizzate
                  </div>
                </div>
              </div>
              <div
                data-tariff-virtual-scroll="true"
                className={
                  scrollLayout === "fill"
                    ? "h-0 min-h-0 flex-1 overflow-y-auto overflow-x-auto pr-2"
                    : "max-h-[72vh] min-h-[520px] overflow-auto pr-2"
                }
                ref={scrollParentRef}
              >
                <div
                  className="relative min-w-[980px]"
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const item = flatItems[virtualItem.index];
                    if (!item) return null;

                    return (
                      <div
                        className="absolute left-0 top-0 w-full pb-2"
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
                          onDraftCommit={handleDraftCommit}
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
  onDraftCommit,
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
  onDraftCommit: (index: number, field: keyof DesktopTariffVoice, value: string) => void;
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
      <div
        className="scroll-mt-24 border-b border-[var(--border-subtle)]/70 pt-5 pb-3"
        data-category={item.categoria}
        id={item.id}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-10px font-bold uppercase tracking-0_14em text-[var(--text-tertiary)]">
              Categoria
            </div>
            <h4 className="mt-1 text-24px font-semibold leading-none tracking-neg-0_035em text-[var(--text-primary)]">
              {item.categoria || "Altre"}
            </h4>
          </div>
          <span className="rounded-lg bg-[var(--surface-base)]/56 px-3 py-1.5 text-12px font-bold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/70">
            {item.rowsCount.toLocaleString("it-IT")}
          </span>
        </div>
      </div>
    );
  }

  if (item.type === "group") {
    return (
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--border-subtle)_54%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_42%,transparent)] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="rounded-lg bg-[var(--info-soft)] px-2.5 py-1 text-12px font-bold text-[var(--info-base)]">
              {item.gruppo}
            </span>
            {item.gruppoDesc ? (
              <span className="min-w-0 truncate text-13px font-bold text-[var(--text-primary)]">
                {item.gruppoDesc}
              </span>
            ) : null}
            {item.warningCount > 0 ? (
              <span
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--info-soft)]/80 px-2.5 text-11px font-semibold text-[var(--info-base)] ring-1 ring-[var(--info-base)]/15"
                title={`${item.warningCount.toLocaleString("it-IT")} note informative del parser nel gruppo (non bloccano l'import)`}
              >
                <Info className="size-3.5" />
                {item.warningCount.toLocaleString("it-IT")} note
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
      <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-muted)]/40 px-3 py-2.5">
        <span className="rounded-lg bg-[var(--surface-base)]/70 px-2.5 py-1 text-11px font-bold text-[var(--accent-primary)] ring-1 ring-[var(--border-subtle)]/60">
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
        className={`${GRID_COLS} min-w-[980px] rounded-xl bg-[color-mix(in_srgb,var(--bg-muted)_62%,transparent)] text-10px font-bold uppercase tracking-0_08em text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]/45`}
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
      <div>
        <VoiceRow
          draftByCellRef={draftByCellRef}
          highlightedField={highlightedCell?.rowIndex === item.index ? highlightedCell.field : null}
          index={item.index}
          invalidCellKeys={invalidCellKeys}
          isDuplicate={isDuplicate}
          isInvalid={rowInvalid}
          onDraftChange={onDraftChange}
          onDraftCommit={onDraftCommit}
          onDraftDiscard={onDraftDiscard}
          onDelete={onDelete}
          voice={item.voice}
        />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="rounded-xl border border-[var(--border-subtle)]/50 bg-[var(--bg-muted)]/30 px-5 py-3 text-12px font-medium text-[var(--text-secondary)]">
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

function formatAuditLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
