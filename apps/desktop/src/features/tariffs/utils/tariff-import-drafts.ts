import { invoke } from "@tauri-apps/api/core";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import { isTauriRuntime } from "@/lib/tauri-wrapper";
import {
  compactImportDraftMetadatas,
  compactImportDraftVoicesList,
  resolveImportDraftVoicesList,
  runWhenIdle,
  yieldBeforeHeavyWork,
} from "./tariff-import-draft-persistence";
import {
  readImportDraftPayload,
  removeImportDraftPayload,
  writeImportDraftPayload,
} from "./tariff-import-draft-store";

// v5: disk storage (Tauri) + compact JSON; v4/v3: localStorage legacy.
const DRAFT_VERSION = 5;

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

export type TariffImportDraftSummary = {
  fileCount: number;
  id: string;
  name: string;
  reviewedCount: number;
  savedAt: string;
  totalVoices: number;
};

export function createDraftSignature(
  metadatas: readonly Pick<TariffPdfMetadata, "name" | "sourceName" | "year">[],
  regularCounts: readonly number[],
): string {
  return metadatas
    .map((metadata, index) =>
      [metadata.name, metadata.sourceName, metadata.year, regularCounts[index] ?? 0].join(":"),
    )
    .join("|")
    .replace(/[^a-zA-Z0-9:_|-]+/g, "_");
}

export function createDraftName(metadatas: TariffPdfMetadata[]): string {
  if (metadatas.length === 0) return "Bozza import tariffari";
  if (metadatas.length === 1) return metadatas[0]?.name ?? "Bozza import tariffario";
  return `${metadatas.length} file · ${metadatas[0]?.name ?? "Import tariffari"}`;
}

function countDraftVoices(editableVoicesList: readonly DesktopTariffVoice[][]): number {
  let total = 0;
  for (const voices of editableVoicesList) {
    total += voices.length;
  }
  return total;
}

function buildVersionedDraft(draft: Omit<ImportDraft, "version">): ImportDraft {
  return {
    ...draft,
    editableVoicesList: compactImportDraftVoicesList(draft.editableVoicesList),
    metadatas: compactImportDraftMetadatas(draft.metadatas),
    version: DRAFT_VERSION,
  };
}

function parseImportDraft(raw: string): ImportDraft | null {
  try {
    return JSON.parse(raw) as ImportDraft;
  } catch {
    return null;
  }
}

/** Catalog quick-list only; must not fail the main draft save (disk or localStorage). */
function writeDraftIndex(versionedDraft: ImportDraft) {
  try {
    const summaries = readTariffImportDraftIndex().filter((item) => item.id !== versionedDraft.id);
    const nextSummary: TariffImportDraftSummary = {
      fileCount: versionedDraft.metadatas.length,
      id: versionedDraft.id,
      name: versionedDraft.name,
      reviewedCount: versionedDraft.reviewedFiles.length,
      savedAt: versionedDraft.savedAt,
      totalVoices: countDraftVoices(versionedDraft.editableVoicesList),
    };

    window.localStorage.setItem(
      TARIFF_IMPORT_DRAFTS_INDEX_KEY,
      JSON.stringify([nextSummary, ...summaries].slice(0, 12)),
    );
    window.dispatchEvent(new CustomEvent("tariff-import-drafts-change"));
  } catch {
    /* index is optional when browser storage is full */
  }
}

function normalizeLoadedDraft(
  draft: ImportDraft,
  signature: string,
  expectedFileCount: number,
): ImportDraft | null {
  if (draft.version !== DRAFT_VERSION && draft.version !== 4 && draft.version !== 3) {
    return null;
  }
  if (draft.signature !== signature) {
    return null;
  }
  const voicesList = resolveImportDraftVoicesList(draft);
  if (voicesList.length !== expectedFileCount) {
    return null;
  }
  return {
    ...draft,
    editableVoicesList: voicesList,
  };
}

function normalizeDraftById(draft: ImportDraft): ImportDraft | null {
  if (draft.version !== DRAFT_VERSION && draft.version !== 4 && draft.version !== 3) {
    return null;
  }
  const voicesList = resolveImportDraftVoicesList(draft);
  if (voicesList.length !== draft.metadatas.length) {
    return null;
  }
  return {
    ...draft,
    editableVoicesList: voicesList,
  };
}

/** Load a saved session by storage id (catalog resume). */
export async function loadImportDraftByIdAsync(draftId: string): Promise<ImportDraft | null> {
  const raw = await readImportDraftPayload(draftId);
  if (!raw) return null;

  let draft: ImportDraft | null = null;
  await runWhenIdle(() => {
    draft = parseImportDraft(raw);
  });
  if (!draft) return null;
  return normalizeDraftById(draft);
}

export function buildTariffPreviewsFromImportDraft(draft: ImportDraft): TariffPdfMetadata[] {
  const voicesList = resolveImportDraftVoicesList(draft);
  return draft.metadatas.map((metadata, index) => ({
    ...metadata,
    voices: voicesList[index] ?? [],
  }));
}

/** Lightweight shells for preview mount — voices come from {@link ImportDraft}. */
export function buildTariffPreviewShellsFromImportDraft(draft: ImportDraft): TariffPdfMetadata[] {
  return draft.metadatas.map((metadata) => ({
    name: metadata.name,
    sourceName: metadata.sourceName,
    year: metadata.year,
    voices: [],
    ...(metadata.pagesTotal != null ? { pagesTotal: metadata.pagesTotal } : {}),
    ...(metadata.pagesParsed != null ? { pagesParsed: metadata.pagesParsed } : {}),
  }));
}

export function buildImportDraftSummary(
  draft: Pick<
    ImportDraft,
    "id" | "name" | "savedAt" | "metadatas" | "reviewedFiles" | "editableVoicesList"
  >,
): TariffImportDraftSummary {
  return {
    fileCount: draft.metadatas.length,
    id: draft.id,
    name: draft.name,
    reviewedCount: draft.reviewedFiles.length,
    savedAt: draft.savedAt,
    totalVoices: countDraftVoices(
      draft.editableVoicesList.length > 0
        ? draft.editableVoicesList
        : draft.metadatas.map((metadata) => metadata.voices ?? []),
    ),
  };
}

export function listTariffImportDraftSummaries(): TariffImportDraftSummary[] {
  return readTariffImportDraftIndex();
}

export async function listTariffImportDraftSummariesAsync(): Promise<TariffImportDraftSummary[]> {
  if (isTauriRuntime()) {
    try {
      const fromDisk = await invoke<TariffImportDraftSummary[]>(
        "list_tariff_import_draft_summaries",
      );
      if (fromDisk.length > 0) {
        return fromDisk;
      }
    } catch {
      /* fall through to index */
    }
  }
  return readTariffImportDraftIndex();
}

export async function loadImportDraftAsync(
  storageKey: string,
  signature: string,
  expectedFileCount: number,
): Promise<ImportDraft | null> {
  const raw = await readImportDraftPayload(storageKey);
  if (!raw) return null;
  const draft = parseImportDraft(raw);
  if (!draft) return null;
  return normalizeLoadedDraft(draft, signature, expectedFileCount);
}

/** @deprecated Use {@link loadImportDraftAsync}. Sync read for legacy localStorage only. */
export function loadImportDraft(
  storageKey: string,
  signature: string,
  expectedFileCount: number,
): ImportDraft | null {
  try {
    const rawDraft = window.localStorage.getItem(storageKey);
    if (!rawDraft) return null;
    const draft = parseImportDraft(rawDraft);
    if (!draft) return null;
    return normalizeLoadedDraft(draft, signature, expectedFileCount);
  } catch {
    return null;
  }
}

export function saveImportDraftRecord(draft: Omit<ImportDraft, "version">) {
  void saveImportDraftRecordAsync(draft);
}

export async function saveImportDraftRecordAsync(
  draft: Omit<ImportDraft, "version">,
): Promise<void> {
  if (typeof window === "undefined") return;

  const versionedDraft = buildVersionedDraft(draft);

  await yieldBeforeHeavyWork();

  let json = "";
  await runWhenIdle(() => {
    json = JSON.stringify(versionedDraft);
  });

  const summary = buildImportDraftSummary(versionedDraft);
  await writeImportDraftPayload(versionedDraft.id, json, summary);
  writeDraftIndex(versionedDraft);
}

export async function deleteTariffImportDraftAsync(id: string): Promise<void> {
  await removeImportDraftPayload(id);
  try {
    const summaries = readTariffImportDraftIndex().filter((item) => item.id !== id);
    window.localStorage.setItem(TARIFF_IMPORT_DRAFTS_INDEX_KEY, JSON.stringify(summaries));
    window.dispatchEvent(new CustomEvent("tariff-import-drafts-change"));
  } catch {
    /* ignore index cleanup errors */
  }
}

export function deleteTariffImportDraft(id: string) {
  void deleteTariffImportDraftAsync(id);
}

function readTariffImportDraftIndex(): TariffImportDraftSummary[] {
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
