import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportDraft } from "./tariff-import-drafts";

function hasItems<T>(value: readonly T[] | undefined): value is readonly T[] {
  return Array.isArray(value) && value.length > 0;
}

/** Omit empty optional fields to shrink large imports. */
export function compactVoiceForDraft(voice: DesktopTariffVoice): DesktopTariffVoice {
  const compact: DesktopTariffVoice = {
    category: voice.category,
    description: voice.description,
    id: voice.id,
    officialCode: voice.officialCode,
    tariffBookId: voice.tariffBookId,
    unitOfMeasure: voice.unitOfMeasure,
    unitPrice: voice.unitPrice,
  };

  if (voice.laborPercentage != null && Number.isFinite(voice.laborPercentage)) {
    compact.laborPercentage = voice.laborPercentage;
  }
  if (voice.categoriaDesc) compact.categoriaDesc = voice.categoriaDesc;
  if (voice.gruppoDesc) compact.gruppoDesc = voice.gruppoDesc;
  if (voice.voce) compact.voce = voice.voce;
  if (voice.voceDesc) compact.voceDesc = voice.voceDesc;
  if (voice.isMaggiorazione) compact.isMaggiorazione = true;
  if (typeof voice.confidence === "number" && Number.isFinite(voice.confidence)) {
    compact.confidence = voice.confidence;
  }
  if (hasItems(voice.warnings)) compact.warnings = voice.warnings;
  if (hasItems(voice.issues)) compact.issues = voice.issues;
  if (hasItems(voice.reviewFlags)) compact.reviewFlags = voice.reviewFlags;
  if (hasItems(voice.warningIds)) compact.warningIds = voice.warningIds;
  if (hasItems(voice.linkedMaggiorazioni)) compact.linkedMaggiorazioni = voice.linkedMaggiorazioni;
  if (voice.source?.page != null) compact.source = voice.source;
  if (voice.applicabilityRules) compact.applicabilityRules = voice.applicabilityRules;

  return compact;
}

/** Strip heavy parser payloads — voices live in `editableVoicesList` only. */
export function compactImportDraftMetadatas(
  metadatas: readonly TariffPdfMetadata[],
): TariffPdfMetadata[] {
  return metadatas.map((metadata) => ({
    name: metadata.name,
    sourceName: metadata.sourceName,
    year: metadata.year,
    voices: [],
    ...(metadata.pagesTotal != null ? { pagesTotal: metadata.pagesTotal } : {}),
    ...(metadata.pagesParsed != null ? { pagesParsed: metadata.pagesParsed } : {}),
  }));
}

export function compactImportDraftVoicesList(
  editableVoicesList: readonly DesktopTariffVoice[][],
): DesktopTariffVoice[][] {
  return editableVoicesList.map((voices) => voices.map(compactVoiceForDraft));
}

export function resolveImportDraftVoicesList(draft: ImportDraft): DesktopTariffVoice[][] {
  if (draft.editableVoicesList.length > 0) {
    return draft.editableVoicesList;
  }
  return draft.metadatas.map((metadata) => metadata.voices ?? []);
}

export function runWhenIdle(task: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const run = () => {
      try {
        task();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 3_000 });
    } else {
      window.setTimeout(run, 0);
    }
  });
}

/** Yields once so loading UI can paint before heavy JSON work. */
export async function yieldBeforeHeavyWork(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}
