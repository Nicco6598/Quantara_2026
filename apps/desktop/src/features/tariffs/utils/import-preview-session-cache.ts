import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import { buildImportPreviewGridLayout, patchGridLayoutVoice } from "./import-preview-grid-layout";
import { isMaggiorazioneVoice, splitRegularAndMaggiorazioni } from "./import-preview-voice-split";
import { groupEditableTariffVoicesAsync, type VoiceGroup } from "./tariff-grouping";
import {
  enrichValidationRows,
  getImportValidation,
  getImportValidationSummary,
  type ImportValidationRow,
} from "./tariffs-validation";

export type ImportPreviewFileDerivation = {
  gridLayout: ReturnType<typeof buildImportPreviewGridLayout> | null;
  gridValidation: ImportValidation;
  groups: VoiceGroup[] | null;
  invalidRows: ImportValidationRow[] | null;
  regular: DesktopTariffVoice[];
  /** Full row-level validation (duplicate rows, enriched errors) is ready. */
  validationComplete: boolean;
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
let warmedPrewarmKey: string | null = null;
const validationUpgradesInFlight = new Set<number>();

const UI_SLICE_BUDGET_MS = 48;
const GROUPING_SLICE_BUDGET_MS = 14;
const GROUPING_SLICE_SIZE = 1_500;
const SPLIT_SLICE_SIZE = 4_000;

export function buildImportPreviewPrewarmKey(metadatas: readonly TariffPdfMetadata[]): string {
  return metadatas
    .map(
      (metadata) =>
        `${metadata.name}\0${metadata.sourceName ?? ""}\0${metadata.year ?? ""}\0${metadata.voices.length}`,
    )
    .join("\n");
}

function yieldUiFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function yieldUiSlice(startedAt: number): Promise<void> {
  if (performance.now() - startedAt < UI_SLICE_BUDGET_MS) return;
  await yieldUiFrame();
}

async function splitRegularAndMaggiorazioniAsync(
  voices: readonly DesktopTariffVoice[],
  generation: number,
) {
  const regular: DesktopTariffVoice[] = [];
  const maggiorazioni: DesktopTariffVoice[] = [];
  let sliceStartedAt = performance.now();

  for (let index = 0; index < voices.length; index++) {
    if (generation !== materializeGeneration) return { regular: [], maggiorazioni: [] };
    const voice = voices[index];
    if (!voice) continue;
    if (isMaggiorazioneVoice(voice)) maggiorazioni.push(voice);
    else regular.push(voice);

    if (
      index > 0 &&
      index % SPLIT_SLICE_SIZE === 0 &&
      performance.now() - sliceStartedAt >= UI_SLICE_BUDGET_MS
    ) {
      await yieldUiFrame();
      sliceStartedAt = performance.now();
    }
  }

  return { regular, maggiorazioni };
}

function scheduleIdleTask(task: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => task(), { timeout: 120 });
    return;
  }
  void yieldUiFrame().then(task);
}

export function clearImportPreviewSessionCache() {
  sessionCache = null;
  warmedPrewarmKey = null;
  materializeGeneration += 1;
  validationUpgradesInFlight.clear();
}

export function getImportPreviewSessionCache() {
  return sessionCache;
}

function ensureSessionMap(
  metadatas: readonly TariffPdfMetadata[],
): Map<number, ImportPreviewFileDerivation> {
  const key = buildImportPreviewPrewarmKey(metadatas);
  if (!sessionCache || warmedPrewarmKey !== key) {
    clearImportPreviewSessionCache();
    warmedPrewarmKey = key;
    sessionCache = new Map();
  }
  return sessionCache;
}

export function invalidateImportPreviewFileStructure(fileIndex: number) {
  const entry = sessionCache?.get(fileIndex);
  if (!entry) return;
  entry.groups = null;
  entry.gridLayout = null;
  entry.invalidRows = null;
  entry.validationComplete = false;
}

export function isImportPreviewFileReady(fileIndex: number): boolean {
  const entry = sessionCache?.get(fileIndex);
  return Boolean(
    entry?.groups &&
      entry.gridLayout &&
      (entry.groups.length > 0 || entry.regular.length === 0) &&
      countGroupedChildren(entry.groups) === entry.regular.length,
  );
}

export function patchImportPreviewSessionVoice(
  fileIndex: number,
  regularIndex: number,
  field: keyof DesktopTariffVoice,
  value: string | number | null,
) {
  const entry = sessionCache?.get(fileIndex);
  if (!entry) return;

  const regularVoice = entry.regular[regularIndex];
  if (regularVoice) {
    entry.regular[regularIndex] = { ...regularVoice, [field]: value };
  }

  if (!entry.groups) return;
  for (const group of entry.groups) {
    for (const child of group.children) {
      if (child.index !== regularIndex) continue;
      child.voice = { ...child.voice, [field]: value };
      patchGridLayoutVoice(entry.gridLayout, regularIndex, field, value);
      refreshImportPreviewSessionValidation(fileIndex);
      return;
    }
  }
}

/** Recompute summary + drop stale error list after inline edit. */
export function refreshImportPreviewSessionValidation(fileIndex: number) {
  const entry = sessionCache?.get(fileIndex);
  if (!entry) return;
  entry.gridValidation = getImportValidationSummary(entry.regular);
  entry.invalidRows = null;
}

/** Read-only: groups are built only by prewarm/regroup (never synchronously on the UI thread during render). */
export function ensureImportPreviewSessionGroups(fileIndex: number): VoiceGroup[] {
  const entry = sessionCache?.get(fileIndex);
  if (!entry?.groups) return [];
  return entry.groups;
}

function countGroupedChildren(groups: readonly VoiceGroup[]): number {
  return groups.reduce((sum, group) => sum + group.children.length, 0);
}

async function materializeImportPreviewEntry(
  voices: readonly DesktopTariffVoice[],
  index: number,
  cache: Map<number, ImportPreviewFileDerivation>,
  generation: number,
  existing?: ImportPreviewFileDerivation,
): Promise<void> {
  const sliceStart = performance.now();
  const { regular } = await splitRegularAndMaggiorazioniAsync(voices, generation);
  await yieldUiSlice(sliceStart);
  if (generation !== materializeGeneration) return;

  const groups = await groupEditableTariffVoicesAsync(
    regular,
    GROUPING_SLICE_BUDGET_MS,
    GROUPING_SLICE_SIZE,
  );

  await yieldUiFrame();
  if (generation !== materializeGeneration) return;

  const gridValidation = existing?.gridValidation ?? getImportValidationSummary(regular);
  const hasBlockingIssues = gridValidation.invalidCount + gridValidation.duplicateCount > 0;
  const gridLayout = buildImportPreviewGridLayout(groups);

  cache.set(index, {
    gridLayout,
    gridValidation,
    groups,
    invalidRows:
      existing?.invalidRows ??
      (gridValidation.invalidRows.length > 0 || gridValidation.duplicateRows.length > 0
        ? buildInvalidRowsForSession(gridValidation, regular)
        : []),
    regular,
    validationComplete: existing?.validationComplete ?? false,
  });

  if (hasBlockingIssues && !(existing?.validationComplete ?? false)) {
    scheduleFileValidationUpgrade(index);
  }
}

export function ensureImportPreviewInvalidRows(fileIndex: number): ImportValidationRow[] {
  const entry = sessionCache?.get(fileIndex);
  if (!entry) return [];
  if (entry.invalidRows) return entry.invalidRows;

  if (!entry.validationComplete) {
    entry.invalidRows = buildInvalidRowsForSession(entry.gridValidation, entry.regular);
    scheduleFileValidationUpgrade(fileIndex);
    return entry.invalidRows;
  }

  const gridValidation =
    entry.gridValidation.invalidRows.length > 0 || entry.gridValidation.duplicateRows.length > 0
      ? entry.gridValidation
      : getImportValidation(entry.regular);

  entry.gridValidation = gridValidation;
  entry.invalidRows = buildInvalidRowsForSession(gridValidation, entry.regular);
  return entry.invalidRows;
}

async function upgradeFileValidation(
  fileIndex: number,
  generation: number,
  onPhaseReady?: (phase: "initial" | "validation") => void,
): Promise<void> {
  await yieldUiFrame();
  if (generation !== materializeGeneration) return;

  const entry = sessionCache?.get(fileIndex);
  if (!entry || entry.validationComplete) return;

  const sliceStart = performance.now();
  await yieldUiSlice(sliceStart);

  if (generation !== materializeGeneration) return;

  const gridValidation = getImportValidation(entry.regular);
  entry.gridValidation = gridValidation;
  entry.invalidRows = buildInvalidRowsForSession(gridValidation, entry.regular);
  entry.validationComplete = true;

  if (generation === materializeGeneration) {
    onPhaseReady?.("validation");
  }
}

function scheduleFileValidationUpgrade(
  fileIndex: number,
  onPhaseReady?: (phase: "initial" | "validation") => void,
  urgent = false,
): void {
  if (validationUpgradesInFlight.has(fileIndex)) return;
  validationUpgradesInFlight.add(fileIndex);
  const generation = materializeGeneration;
  const run = () => {
    void upgradeFileValidation(fileIndex, generation, onPhaseReady).finally(() => {
      validationUpgradesInFlight.delete(fileIndex);
    });
  };
  if (urgent) {
    void yieldUiFrame().then(run);
    return;
  }
  scheduleIdleTask(run);
}

async function prewarmFileAtIndex(
  metadata: TariffPdfMetadata,
  index: number,
  cache: Map<number, ImportPreviewFileDerivation>,
  generation: number,
): Promise<void> {
  const existing = cache.get(index);
  if (isImportPreviewFileReady(index)) {
    return;
  }
  if (metadata.voices.length === 0) {
    cache.set(index, {
      gridLayout: buildImportPreviewGridLayout([]),
      gridValidation: getImportValidationSummary([]),
      groups: [],
      invalidRows: [],
      regular: [],
      validationComplete: true,
    });
    return;
  }

  await materializeImportPreviewEntry(metadata.voices, index, cache, generation, existing);
}

/** Prewarm / regroup from the live editable list (after add/delete/edit). */
export async function prewarmImportPreviewVoices(
  metadatas: readonly TariffPdfMetadata[],
  fileIndex: number,
  voices: readonly DesktopTariffVoice[],
  options?: {
    onPhaseReady?: (phase: "initial" | "validation") => void;
  },
) {
  const cache = ensureSessionMap(metadatas);
  const generation = materializeGeneration;
  const existing = cache.get(fileIndex);

  if (
    existing?.groups &&
    existing.groups.length > 0 &&
    countGroupedChildren(existing.groups) === splitRegularAndMaggiorazioni(voices).regular.length
  ) {
    options?.onPhaseReady?.("initial");
    return;
  }

  await materializeImportPreviewEntry(
    voices,
    fileIndex,
    cache,
    generation,
    existing
      ? { ...existing, groups: null, invalidRows: null, validationComplete: false }
      : undefined,
  );
  if (generation !== materializeGeneration) return;

  options?.onPhaseReady?.("initial");
  scheduleFileValidationUpgrade(fileIndex, options?.onPhaseReady);
}

/** Prewarm a single file (active tab or after switch). */
export async function prewarmImportPreviewFile(
  metadatas: readonly TariffPdfMetadata[],
  fileIndex: number,
  options?: {
    onPhaseReady?: (phase: "initial" | "validation") => void;
  },
) {
  const metadata = metadatas[fileIndex];
  if (!metadata) return;

  const cache = ensureSessionMap(metadatas);
  const generation = materializeGeneration;
  const entry = cache.get(fileIndex);

  if (isImportPreviewFileReady(fileIndex)) {
    if (!entry?.validationComplete) {
      scheduleFileValidationUpgrade(fileIndex, options?.onPhaseReady);
    }
    return;
  }

  await prewarmFileAtIndex(metadata, fileIndex, cache, generation);
  if (generation !== materializeGeneration) return;

  options?.onPhaseReady?.("initial");
  scheduleFileValidationUpgrade(fileIndex, options?.onPhaseReady);
}

/** Prewarm only the active file; other files load on demand when selected. */
export async function prewarmImportPreviewSession(
  metadatas: readonly TariffPdfMetadata[],
  options?: {
    activeFileIndex?: number;
    onPhaseReady?: (phase: "initial" | "validation") => void;
  },
) {
  const total = metadatas.length;
  if (total === 0) return;

  const activeIndex = Math.min(Math.max(options?.activeFileIndex ?? 0, 0), total - 1);
  const fileOptions = options?.onPhaseReady ? { onPhaseReady: options.onPhaseReady } : undefined;
  await prewarmImportPreviewFile(metadatas, activeIndex, fileOptions);
}
