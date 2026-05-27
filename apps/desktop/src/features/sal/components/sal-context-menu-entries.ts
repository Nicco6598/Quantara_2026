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

export function buildSalContextMenuEntries(options: {
  scope: SalContextMenuScope;
  canPasteVoice: boolean;
  canPasteMeasurements: boolean;
  hasMeasurementsToCopy: boolean;
  onCopyVoice: () => void;
  onPasteVoice: () => void;
  onCopyMeasurementRow?: () => void;
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

  if (options.scope === "search-voice") {
    entries.push(
      contextMenuItem({
        id: "add-search-voice",
        icon: CopyPlus,
        label: "Aggiungi al SAL",
        hint: "Inserisce la voce nel registro misure",
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

  if (options.scope === "mg-line") {
    entries.push(
      contextMenuItem({
        id: "mg-allocate",
        icon: Link2,
        label: "Assegna voci destinatarie",
        onSelect: () => options.onOpenMgAllocation?.(),
      }),
      contextMenuItem({
        id: "mg-deactivate",
        icon: Percent,
        label: "Disattiva maggiorazione",
        onSelect: () => options.onDeactivateMg?.(),
      }),
      contextMenuSeparator(),
      contextMenuItem({
        id: "mg-remove",
        icon: Trash2,
        label: "Rimuovi voce MG",
        tone: "danger",
        onSelect: () => options.onRemoveMgLine?.(),
      }),
    );
    return entries;
  }

  if (options.scope === "measurement-row") {
    entries.push(
      contextMenuItem({
        id: "copy-measurement-row",
        icon: Rows3,
        label: "Copia riga",
        hint: "Una singola riga misura (stile Excel)",
        shortcut: "Ctrl+C",
        onSelect: () => options.onCopyMeasurementRow?.(),
      }),
      contextMenuItem({
        id: "paste-measurement-above",
        icon: ArrowUpToLine,
        label: "Incolla sopra",
        disabled: !options.canPasteMeasurements,
        onSelect: () => options.onPasteMeasurementRowAbove?.(),
      }),
      contextMenuItem({
        id: "paste-measurement-below",
        icon: ArrowDownToLine,
        label: "Incolla sotto",
        disabled: !options.canPasteMeasurements,
        onSelect: () => options.onPasteMeasurementRowBelow?.(),
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
      contextMenuSeparator(),
    );
  }

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

  if (options.scope === "voice" || options.scope === "measurements") {
    entries.push(
      contextMenuItem({
        id: "copy-measurements",
        icon: FileStack,
        label: "Copia righe misura",
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
