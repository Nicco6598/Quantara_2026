import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import { createTariffBookId, sanitizeIdentifier } from "./tariffs-validation";

export type TariffImportConfirmMetadata = TariffPdfMetadata & {
  existingBookId?: string;
  importStatus: "active" | "draft";
};

export type ConfirmTariffImportItem = {
  existingBookId?: string;
  id: string;
  name: string;
  sourceName: string;
  status: string;
  voices: DesktopTariffVoice[];
  year: number;
};

export function assignTariffBookVoiceIds(
  tariffBookId: string,
  voices: readonly DesktopTariffVoice[],
): DesktopTariffVoice[] {
  const next = new Array<DesktopTariffVoice>(voices.length);
  for (let index = 0; index < voices.length; index++) {
    const voice = voices[index];
    if (!voice) continue;
    const code = voice.officialCode;
    next[index] = {
      ...voice,
      id: `voice_${tariffBookId}_${sanitizeIdentifier(code)}`,
      tariffBookId,
    };
  }
  return next;
}

export function buildConfirmTariffImportItems(
  metadatas: readonly TariffImportConfirmMetadata[],
  editableVoicesList: readonly DesktopTariffVoice[][],
  existingBookIds: readonly (string | undefined)[] | undefined,
): ConfirmTariffImportItem[] {
  const items: ConfirmTariffImportItem[] = [];
  for (let index = 0; index < metadatas.length; index++) {
    const metadata = metadatas[index];
    if (!metadata) continue;
    const voices = editableVoicesList[index] ?? metadata.voices ?? [];
    if (voices.length === 0) continue;

    const existingBookId = existingBookIds?.[index] ?? metadata.existingBookId;
    const tariffBookId = existingBookId ?? createTariffBookId(metadata);

    items.push({
      ...(existingBookId ? { existingBookId } : {}),
      id: tariffBookId,
      name: metadata.name,
      sourceName: metadata.sourceName,
      status: metadata.importStatus,
      voices: assignTariffBookVoiceIds(tariffBookId, voices),
      year: metadata.year,
    });
  }
  return items;
}
