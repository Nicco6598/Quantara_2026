import {
  ArrowDownToLine,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  FileStack,
  Layers,
  Link2,
  Percent,
  Rows3,
  Trash2,
} from "lucide-react";
import {
  type AppContextMenuEntry,
  contextMenuItem,
  contextMenuSeparator,
} from "@/components/shared/AppContextMenu";

export type SalContextMenuScope =
  | "voice"
  | "measurements"
  | "measurement-row"
  | "mg-line"
  | "search-voice";

/**
 * Simplified & consistent context menu for SAL (designed for power users 20-60 years old).
 *
 * Key principles:
 * - One clear mental model: sections "Su questa riga" / "Su tutta la voce" / "Misure"
 * - Short, direct Italian labels
 * - Destructive actions always at the bottom with danger tone
 * - Reduced number of "copy" variants
 */
export function buildSalContextMenuEntries(options: {
  scope: SalContextMenuScope;
  canPasteVoice: boolean;
  canPasteMeasurements: boolean;
  hasMeasurementsToCopy: boolean;
  onCopyVoice: () => void;
  onPasteVoice: () => void;
  onCopyMeasurementRow?: () => void;
  onCopyMeasurementRowFull?: () => void;
  onPasteMeasurementRowAbove?: () => void;
  onPasteMeasurementRowBelow?: () => void;
  onCopyMeasurements: () => void;
  onPasteMeasurements: () => void;
  onDuplicateMeasurementRow?: () => void;
  onRemoveMeasurementRow?: () => void;
  onRemoveVoice?: () => void;
  onDuplicateVoice?: () => void;
  onOpenMgAllocation?: () => void;
  onRemoveMgLine?: () => void;
  onDeactivateMg?: () => void;
  onAddSearchVoice?: () => void;
  onCopySearchCode?: () => void;
}): AppContextMenuEntry[] {
  const entries: AppContextMenuEntry[] = [];

  // ── Search voice (from search field) ─────────────────────────
  if (options.scope === "search-voice") {
    entries.push(
      contextMenuItem({
        id: "add-search-voice",
        icon: CopyPlus,
        label: "Aggiungi al SAL",
        onSelect: () => options.onAddSearchVoice?.(),
      }),
      contextMenuItem({
        id: "copy-search-code",
        icon: Copy,
        label: "Copia codice",
        onSelect: () => options.onCopySearchCode?.(),
      }),
    );
    return entries;
  }

  // ── MG line ─────────────────────────────────────────────────
  if (options.scope === "mg-line") {
    entries.push(
      contextMenuItem({
        id: "mg-allocate",
        icon: Link2,
        label: "Assegna a voci",
        onSelect: () => options.onOpenMgAllocation?.(),
      }),
      contextMenuItem({
        id: "mg-deactivate",
        icon: Percent,
        label: "Svuota assegnazioni",
        onSelect: () => options.onDeactivateMg?.(),
      }),
      contextMenuSeparator(),
      contextMenuItem({
        id: "mg-remove",
        icon: Trash2,
        label: "Elimina maggiorazione",
        tone: "danger",
        onSelect: () => options.onRemoveMgLine?.(),
      }),
    );
    return entries;
  }

  // ── Measurement row (most common case) ──────────────────────
  if (options.scope === "measurement-row") {
    // SECTION: This specific row
    entries.push(
      contextMenuItem({
        id: "copy-measurement-row",
        icon: Rows3,
        label: "Copia riga (stazione)",
        shortcut: "Ctrl+C",
        onSelect: () => options.onCopyMeasurementRow?.(),
      }),
      contextMenuItem({
        id: "copy-measurement-row-full",
        icon: Copy,
        label: "Copia riga completa",
        onSelect: () => options.onCopyMeasurementRowFull?.(),
      }),
      contextMenuItem({
        id: "duplicate-measurement-row",
        icon: CopyPlus,
        label: "Duplica riga",
        onSelect: () => options.onDuplicateMeasurementRow?.(),
      }),
      contextMenuItem({
        id: "remove-measurement-row",
        icon: Trash2,
        label: "Elimina riga",
        tone: "danger",
        onSelect: () => options.onRemoveMeasurementRow?.(),
      }),
    );

    // Paste relative to this row
    entries.push(
      contextMenuSeparator(),
      contextMenuItem({
        id: "paste-above",
        icon: ArrowUpToLine,
        label: "Incolla sopra",
        disabled: !options.canPasteMeasurements,
        onSelect: () => options.onPasteMeasurementRowAbove?.(),
      }),
      contextMenuItem({
        id: "paste-below",
        icon: ArrowDownToLine,
        label: "Incolla sotto",
        disabled: !options.canPasteMeasurements,
        onSelect: () => options.onPasteMeasurementRowBelow?.(),
      }),
    );

    // Voice-level actions
    entries.push(
      contextMenuSeparator(),
      contextMenuItem({
        id: "copy-voice",
        icon: Copy,
        label: "Copia voce",
        onSelect: options.onCopyVoice,
      }),
      contextMenuItem({
        id: "duplicate-voice",
        icon: CopyPlus,
        label: "Duplica voce",
        onSelect: () => options.onDuplicateVoice?.(),
      }),
      contextMenuItem({
        id: "remove-voice",
        icon: Trash2,
        label: "Elimina voce",
        tone: "danger",
        onSelect: () => options.onRemoveVoice?.(),
      }),
    );

    return entries;
  }

  // ── Voice header ────────────────────────────────────────────
  if (options.scope === "voice") {
    entries.push(
      contextMenuItem({
        id: "copy-voice",
        icon: Copy,
        label: "Copia voce",
        shortcut: "Ctrl+C",
        onSelect: options.onCopyVoice,
      }),
      contextMenuItem({
        id: "paste-voice",
        icon: ClipboardPaste,
        label: "Incolla voce",
        shortcut: "Ctrl+V",
        disabled: !options.canPasteVoice,
        onSelect: options.onPasteVoice,
      }),
      contextMenuItem({
        id: "duplicate-voice",
        icon: CopyPlus,
        label: "Duplica voce",
        onSelect: () => options.onDuplicateVoice?.(),
      }),
      contextMenuItem({
        id: "remove-voice",
        icon: Trash2,
        label: "Elimina voce",
        tone: "danger",
        onSelect: () => options.onRemoveVoice?.(),
      }),
      contextMenuSeparator(),
    );
  }

  // Measurement bulk actions (voice + measurements area)
  if (options.scope === "voice" || options.scope === "measurements") {
    entries.push(
      contextMenuItem({
        id: "copy-measurements",
        icon: FileStack,
        label: "Copia tutte le righe misura",
        disabled: !options.hasMeasurementsToCopy,
        ...(options.scope === "measurements" ? { shortcut: "Ctrl+C" as const } : {}),
        onSelect: options.onCopyMeasurements,
      }),
      contextMenuItem({
        id: "paste-measurements",
        icon: Layers,
        label: "Incolla righe misura",
        shortcut: "Ctrl+V",
        disabled: !options.canPasteMeasurements,
        onSelect: options.onPasteMeasurements,
      }),
    );
  }

  return entries;
}
