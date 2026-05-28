import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import { groupEditableTariffVoices, type VoiceGroup } from "./tariff-grouping";
import { splitRegularAndMaggiorazioni } from "./import-preview-voice-split";
import {
  enrichValidationRows,
  getImportValidation,
  getImportValidationSummary,
  type ImportValidationRow,
} from "./tariffs-validation";

export type ImportPreviewFileDerivation = {
  gridValidation: ImportValidation;
  groups: VoiceGroup[] | null;
  invalidRows: ImportValidationRow[] | null;
  regular: DesktopTariffVoice[];
};

function buildInvalidRowsForSession(
  gridValidation: ImportValidation,
  regularVoices: readonly DesktopTariffVoice[],
) {
  if (gridValidation.invalidRows.length === 0 && gridValidation.duplicateRows.length === 0) {
    return [];
  }

  return enrichValidationRows(
    [
      ...gridValidation.invalidRows,
      ...gridValidation.duplicateRows.map((row) => ({
        ...row,
        field: row.field as keyof DesktopTariffVoice,
      })),
    ],
    regularVoices,
  );
}

let sessionCache: Map<number, ImportPreviewFileDerivation> | null = null;
let materializeGeneration = 0;

function yieldUiFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export function clearImportPreviewSessionCache() {
  sessionCache = null;
  materializeGeneration += 1;
}

export function getImportPreviewSessionCache() {
  return sessionCache;
}

export function ensureImportPreviewSessionGroups(fileIndex: number): VoiceGroup[] {
  const entry = sessionCache?.get(fileIndex);
  if (!entry) return [];
  if (!entry.groups) {
    entry.groups = groupEditableTariffVoices(entry.regular);
  }
  return entry.groups;
}

export function ensureImportPreviewInvalidRows(fileIndex: number): ImportValidationRow[] {
  const entry = sessionCache?.get(fileIndex);
  if (!entry) return [];
  if (entry.invalidRows) return entry.invalidRows;

  const gridValidation =
    entry.gridValidation.invalidRows.length > 0 || entry.gridValidation.duplicateRows.length > 0
      ? entry.gridValidation
      : getImportValidation(entry.regular);

  entry.gridValidation = gridValidation;
  entry.invalidRows = buildInvalidRowsForSession(gridValidation, entry.regular);
  return entry.invalidRows;
}

/** Phase 1: summaries for all files + full data for active file. Phase 2 (background): error rows for others. */
export async function prewarmImportPreviewSession(
  metadatas: readonly TariffPdfMetadata[],
  options?: {
    activeFileIndex?: number;
    onPhaseReady?: (phase: "initial" | "errors") => void;
  },
) {
  clearImportPreviewSessionCache();
  const generation = materializeGeneration;
  const cache = new Map<number, ImportPreviewFileDerivation>();
  const total = metadatas.length;
  const activeIndex = Math.min(Math.max(options?.activeFileIndex ?? 0, 0), Math.max(0, total - 1));

  for (let index = 0; index < total; index++) {
    const metadata = metadatas[index];
    if (!metadata) continue;

    const { regular } = splitRegularAndMaggiorazioni(metadata.voices);

    if (index === activeIndex) {
      const gridValidation = getImportValidation(regular);
      cache.set(index, {
        gridValidation,
        groups: groupEditableTariffVoices(regular),
        invalidRows: buildInvalidRowsForSession(gridValidation, regular),
        regular,
      });
    } else {
      cache.set(index, {
        gridValidation: getImportValidationSummary(regular),
        groups: null,
        invalidRows: null,
        regular,
      });
    }

    await yieldUiFrame();
  }

  sessionCache = cache;
  options?.onPhaseReady?.("initial");

  void materializeImportPreviewErrorRows(generation, options?.onPhaseReady);
}

async function materializeImportPreviewErrorRows(
  generation: number,
  onPhaseReady?: (phase: "initial" | "errors") => void,
) {
  const cache = sessionCache;
  if (!cache) return;

  for (const [index] of cache) {
    if (generation !== materializeGeneration) return;
    ensureImportPreviewInvalidRows(index);
    await yieldUiFrame();
  }

  if (generation === materializeGeneration) {
    onPhaseReady?.("errors");
  }
}
