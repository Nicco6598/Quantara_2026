import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";

// Invalida le bozze salvate con un comportamento di parsing/UI precedente.
// Serve soprattutto quando cambiano regole di normalizzazione (es. spazi nel codice voce).
const DRAFT_VERSION = 3;

import { STORAGE_KEYS } from "@/persistence/storage-keys";

const TARIFF_IMPORT_DRAFTS_INDEX_KEY = STORAGE_KEYS.tariffImportDraftsIndex;

export type ImportDraft = {
  draftedFiles: number[];
  editableVoicesList: DesktopTariffVoice[][];
  excludedFiles: number[];
  id: string;
  metadatas: TariffPdfMetadata[];
  name: string;
  reviewedFiles: number[];
  savedAt: string;
  signature: string;
  version: number;
};

type TariffImportDraftSummary = {
  fileCount: number;
  id: string;
  name: string;
  reviewedCount: number;
  savedAt: string;
  totalVoices: number;
};

export function createDraftSignature(metadatas: TariffPdfMetadata[]): string {
  return metadatas
    .map((metadata) =>
      [metadata.name, metadata.sourceName, metadata.year, metadata.voices.length].join(":"),
    )
    .join("|")
    .replace(/[^a-zA-Z0-9:_|-]+/g, "_");
}

export function createDraftName(metadatas: TariffPdfMetadata[]): string {
  if (metadatas.length === 0) return "Bozza import tariffari";
  if (metadatas.length === 1) return metadatas[0]?.name ?? "Bozza import tariffario";
  return `${metadatas.length} file · ${metadatas[0]?.name ?? "Import tariffari"}`;
}

export function loadImportDraft(
  storageKey: string,
  signature: string,
  expectedFileCount: number,
): ImportDraft | null {
  try {
    const rawDraft = localStorage.getItem(storageKey);
    if (!rawDraft) return null;
    const draft = JSON.parse(rawDraft) as ImportDraft;
    if (
      draft.version !== DRAFT_VERSION ||
      draft.signature !== signature ||
      draft.editableVoicesList.length !== expectedFileCount
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveImportDraftRecord(draft: Omit<ImportDraft, "version">) {
  if (typeof window === "undefined") return;

  const versionedDraft: ImportDraft = { ...draft, version: DRAFT_VERSION };
  window.localStorage.setItem(versionedDraft.id, JSON.stringify(versionedDraft));

  const summaries = listTariffImportDrafts().filter((item) => item.id !== versionedDraft.id);
  const nextSummary: TariffImportDraftSummary = {
    fileCount: versionedDraft.metadatas.length,
    id: versionedDraft.id,
    name: versionedDraft.name,
    reviewedCount: versionedDraft.reviewedFiles.length,
    savedAt: versionedDraft.savedAt,
    totalVoices: versionedDraft.metadatas.reduce(
      (sum, metadata) => sum + metadata.voices.length,
      0,
    ),
  };

  window.localStorage.setItem(
    TARIFF_IMPORT_DRAFTS_INDEX_KEY,
    JSON.stringify([nextSummary, ...summaries].slice(0, 12)),
  );
  window.dispatchEvent(new CustomEvent("tariff-import-drafts-change"));
}

function listTariffImportDrafts(): TariffImportDraftSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = window.localStorage.getItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is TariffImportDraftSummary =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.savedAt === "string",
        )
      : [];
  } catch {
    window.localStorage.removeItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY);
    return [];
  }
}

export function deleteTariffImportDraft(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(id);
  const summaries = listTariffImportDrafts().filter((item) => item.id !== id);
  window.localStorage.setItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY, JSON.stringify(summaries));
  window.dispatchEvent(new CustomEvent("tariff-import-drafts-change"));
}
