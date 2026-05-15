import type {
  CreateDesktopContractRecordRequest,
  CreateDesktopTariffBookRecordRequest,
  DesktopContractRecord,
  DesktopTariffBookRecord,
  DesktopTariffVoiceCountRecord,
  DesktopTariffVoiceRecord,
  TariffPdfMetadataRecord,
  TariffWarning,
  UpdateDesktopTariffBookRecordRequest,
} from "@quantara/shared-types";
import { invoke } from "@tauri-apps/api/core";
import { invokeWithFallback, isTauriRuntime } from "./tauri-wrapper";

export type DesktopContract = DesktopContractRecord;
export type CreateDesktopContractRequest = CreateDesktopContractRecordRequest;
export type DesktopTariffBook = DesktopTariffBookRecord;
export type DesktopTariffVoice = DesktopTariffVoiceRecord;
export type DesktopTariffVoiceCount = DesktopTariffVoiceCountRecord;
export type CreateDesktopTariffBookRequest = CreateDesktopTariffBookRecordRequest;
export type UpdateDesktopTariffBookRequest = UpdateDesktopTariffBookRecordRequest;
export type TariffPdfMetadata = TariffPdfMetadataRecord;
export type { TariffWarning };

import { cachedFetch } from "./fetch-cache";
import type { DesktopDataResult } from "./tauri-wrapper";

export type { DesktopDataResult };

const tariffVoiceCache = new Map<string, DesktopTariffVoiceRecord[]>();
const previewContractsStorageKey = "quantara.preview.contracts.v1";

type InflightKey =
  | "contracts"
  | "materials"
  | `tariff-books:${number}`
  | `tariff-voice-counts:${number}:${number}`
  | `tariff-voices:${string}:${number}`;

const inflightRequests = new Map<InflightKey, Promise<DesktopDataResult<unknown>>>();

function withInflightCache<T>(key: InflightKey, run: () => Promise<DesktopDataResult<T>>) {
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<DesktopDataResult<T>>;
  }

  const request = run().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, request as Promise<DesktopDataResult<unknown>>);
  return request;
}

export async function listDesktopContracts(
  fallback: DesktopContract[],
): Promise<DesktopDataResult<DesktopContract[]>> {
  if (!isTauriRuntime()) {
    return {
      data: readPreviewContracts(fallback),
      message: "Runtime browser: dati contratti locali in anteprima.",
      source: "fallback",
    };
  }

  return cachedFetch("contracts", () =>
    withInflightCache("contracts", () =>
      invokeWithFallback("list_contracts", {}, fallback, "dati dimostrativi"),
    ),
  );
}

export async function createDesktopContract(
  request: CreateDesktopContractRequest,
): Promise<DesktopContract> {
  const contract: DesktopContract = {
    applicationContractCode: request.applicationContractCode,
    contractualAmount: {
      amount: request.contractualAmount,
      currency: "EUR",
    },
    contractorId: request.contractorName ? `contractor_${request.contractorName}` : null,
    contractorName: request.contractorName ?? null,
    frameworkAgreementCode: request.frameworkAgreementCode,
    id: request.id,
    tenderDiscountPercent: request.tenderDiscountPercent,
    tariffPriorities: request.tariffPriorities,
    title: request.title,
    osExcludedAmount: request.osExcludedAmount ?? null,
  };

  if (!isTauriRuntime()) {
    writePreviewContracts(upsertById(readPreviewContracts([]), contract));
    return contract;
  }

  return invoke<DesktopContract>("create_contract", { request });
}

export async function updateDesktopContract(
  contractId: string,
  request: CreateDesktopContractRequest,
): Promise<DesktopContract> {
  if (!isTauriRuntime()) {
    const updated = await createDesktopContract({ ...request, id: contractId });
    writePreviewContracts(upsertById(readPreviewContracts([]), updated));
    return updated;
  }

  return invoke<DesktopContract>("update_contract", { contractId, request });
}

export async function deleteDesktopContract(contractId: string): Promise<void> {
  if (!isTauriRuntime()) {
    writePreviewContracts(
      readPreviewContracts([]).filter((contract) => contract.id !== contractId),
    );
    return;
  }

  await invoke<void>("delete_contract", { contractId });
}

function readPreviewContracts(fallback: DesktopContract[]): DesktopContract[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(previewContractsStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    const contracts = parsed.filter(isDesktopContract);
    return contracts.length > 0 ? contracts : fallback;
  } catch {
    return fallback;
  }
}

function writePreviewContracts(contracts: DesktopContract[]): void {
  try {
    window.localStorage.setItem(previewContractsStorageKey, JSON.stringify(contracts));
  } catch {
    // Browser preview persistence is best-effort.
  }
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const existingIndex = items.findIndex((current) => current.id === item.id);
  if (existingIndex === -1) {
    return [item, ...items];
  }

  const next = [...items];
  next[existingIndex] = item;
  return next;
}

function isDesktopContract(value: unknown): value is DesktopContract {
  if (!value || typeof value !== "object") {
    return false;
  }

  const contract = value as Partial<DesktopContract>;
  return (
    typeof contract.id === "string" &&
    typeof contract.title === "string" &&
    typeof contract.applicationContractCode === "string" &&
    typeof contract.frameworkAgreementCode === "string" &&
    typeof contract.contractualAmount?.amount === "number" &&
    typeof contract.contractualAmount.currency === "string" &&
    (contract.contractorId === undefined ||
      contract.contractorId === null ||
      typeof contract.contractorId === "string") &&
    (contract.contractorName === undefined ||
      contract.contractorName === null ||
      typeof contract.contractorName === "string") &&
    typeof contract.tenderDiscountPercent === "number" &&
    Array.isArray(contract.tariffPriorities)
  );
}

export async function listDesktopTariffBooks(
  fallback: DesktopTariffBook[],
): Promise<DesktopDataResult<DesktopTariffBook[]>> {
  return cachedFetch(`tariff-books:${fallback.length}`, () =>
    withInflightCache(`tariff-books:${fallback.length}`, () =>
      invokeWithFallback("list_tariff_books", {}, fallback, "dati dimostrativi"),
    ),
  );
}

export async function createDesktopTariffBook(
  request: CreateDesktopTariffBookRequest,
): Promise<DesktopTariffBook> {
  if (!isTauriRuntime()) {
    const { voices: _voices, ...book } = request;

    if (_voices) {
      tariffVoiceCache.set(book.id, _voices);
    }

    return book;
  }

  return invoke<DesktopTariffBook>("create_tariff_book", { request });
}

export async function updateDesktopTariffBook(
  tariffBookId: string,
  request: UpdateDesktopTariffBookRequest & { voices?: DesktopTariffVoiceRecord[] },
): Promise<DesktopTariffBook> {
  if (!isTauriRuntime()) {
    const { voices: _voices, ...book } = request;

    if (_voices) {
      tariffVoiceCache.set(tariffBookId, _voices);
    }

    return {
      id: tariffBookId,
      ...book,
    };
  }

  return invoke<DesktopTariffBook>("update_tariff_book", { tariffBookId, request });
}

export async function deleteDesktopTariffBook(tariffBookId: string): Promise<void> {
  if (!isTauriRuntime()) {
    tariffVoiceCache.delete(tariffBookId);
    return;
  }

  await invoke<void>("delete_tariff_book", { tariffBookId });
}

export async function listDesktopTariffVoices(
  tariffBookId: string,
  fallback: DesktopTariffVoice[],
): Promise<DesktopDataResult<DesktopTariffVoice[]>> {
  const cached = tariffVoiceCache.get(tariffBookId);
  if (cached) {
    return { data: cached, source: "desktop" } as DesktopDataResult<DesktopTariffVoice[]>;
  }

  return cachedFetch(`tariff-voices:${tariffBookId}`, () =>
    withInflightCache(`tariff-voices:${tariffBookId}:${fallback.length}`, () =>
      invokeWithFallback("list_tariff_voices", { tariffBookId }, fallback, "voci dimostrative"),
    ),
  );
}

export async function listDesktopTariffVoiceCounts(
  fallbackBooks: readonly DesktopTariffBook[],
  fallbackVoices: readonly DesktopTariffVoice[],
): Promise<DesktopDataResult<DesktopTariffVoiceCount[]>> {
  const counts = fallbackBooks.map((book) => ({
    count: tariffVoiceCache.has(book.id)
      ? (tariffVoiceCache.get(book.id)?.length ?? 0)
      : fallbackVoices.filter((voice) => voice.tariffBookId === book.id).length,
    tariffBookId: book.id,
  }));

  return withInflightCache(
    `tariff-voice-counts:${fallbackBooks.length}:${fallbackVoices.length}`,
    () => invokeWithFallback("list_tariff_voice_counts", {}, counts, "conteggi dimostrativi"),
  );
}

export async function selectMultipleTariffPdfMetadatas(
  onProgress: (status: ImportFileProgress) => void,
): Promise<TariffPdfMetadata[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  const { open } = await import("@tauri-apps/plugin-dialog");
  const selectedPaths = await open({
    filters: [{ extensions: ["pdf", "json"], name: "Tariffario PDF o JSON parser" }],
    multiple: true,
  });

  if (!selectedPaths || selectedPaths.length === 0) {
    return [];
  }

  const paths = selectedPaths as string[];

  paths.forEach((path, index) => {
    const fallback = inferTariffMetadataFromPath(path);
    onProgress({ fileName: fallback.name, index, total: paths.length, status: "pending" });
  });

  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

  // Mark all files as "processing" synchronously so the modal shows them all at once
  for (const [index, path] of paths.entries()) {
    const fallback = inferTariffMetadataFromPath(path);
    onProgress({ fileName: fallback.name, index, total: paths.length, status: "processing" });
  }

  // Process all files in parallel — each resolve triggers its own progress update
  const pending = paths.map(async (path, index) => {
    const fallback = inferTariffMetadataFromPath(path);
    try {
      const metadata = await invoke<TariffPdfMetadata>("import_tariff_pdf_preview", { path });
      onProgress({
        fileName: fallback.name,
        index,
        total: paths.length,
        status: "done",
        ...(metadata.pagesTotal !== undefined && { pagesTotal: metadata.pagesTotal }),
        ...(metadata.pagesParsed !== undefined && { pagesParsed: metadata.pagesParsed }),
      });
      return metadata;
    } catch (error) {
      onProgress({
        fileName: fallback.name,
        index,
        total: paths.length,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  });

  const results = await Promise.all(pending);
  return results.filter(Boolean) as TariffPdfMetadata[];
}

export type ImportFileProgress = {
  fileName: string;
  index: number;
  total: number;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  pagesTotal?: number;
  pagesParsed?: number;
};

function inferTariffMetadataFromPath(path: string): TariffPdfMetadata {
  const fileName =
    path
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.(pdf|json)$/i, "") ?? "Tariffario importato";
  const normalized = fileName.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const yearMatch = normalized.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  const sourceName = inferSourceName(normalized);

  return {
    name: normalized,
    sourceName,
    voices: [],
    year,
  };
}

function inferSourceName(value: string) {
  const lowerValue = value.toLowerCase();

  if (lowerValue.includes("lombardia")) {
    return "Regione Lombardia";
  }

  if (lowerValue.includes("rfi")) {
    return "RFI";
  }

  if (lowerValue.includes("anas")) {
    return "ANAS";
  }

  if (lowerValue.includes("piemonte")) {
    return "Regione Piemonte";
  }

  return "Ente da confermare";
}

// ── Materials ────────────────────────────────────────────────────────────────

export type DesktopMaterial = {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  notes: string;
};

export type CreateDesktopMaterialRequest = {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  notes: string;
};

const previewMaterialsStorageKey = "quantara.preview.materials.v1";

function readPreviewMaterials(fallback: DesktopMaterial[]): DesktopMaterial[] {
  try {
    const stored = localStorage.getItem(previewMaterialsStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as DesktopMaterial[];
      return parsed;
    }
  } catch {
    /* no-op */
  }
  return fallback;
}

function writePreviewMaterials(materials: DesktopMaterial[]) {
  try {
    localStorage.setItem(previewMaterialsStorageKey, JSON.stringify(materials));
  } catch {
    /* no-op */
  }
}

export async function listDesktopMaterials(
  fallback: DesktopMaterial[],
): Promise<DesktopDataResult<DesktopMaterial[]>> {
  if (!isTauriRuntime()) {
    let data = readPreviewMaterials([]);
    if (data.length === 0 && fallback.length > 0) {
      writePreviewMaterials(fallback);
      data = fallback;
    }
    return {
      data,
      message: "Runtime browser: dati materiali locali in anteprima.",
      source: "fallback",
    };
  }
  return cachedFetch("materials", () =>
    withInflightCache("materials", () =>
      invokeWithFallback("list_materials", {}, fallback, "materiali dimostrativi"),
    ),
  );
}

export async function createDesktopMaterial(
  request: CreateDesktopMaterialRequest,
): Promise<DesktopMaterial> {
  if (!isTauriRuntime()) {
    const current = readPreviewMaterials([]);
    current.push(request);
    writePreviewMaterials(current);
    return request;
  }

  return invoke<DesktopMaterial>("create_material", { request });
}

export async function updateDesktopMaterial(
  materialId: string,
  request: CreateDesktopMaterialRequest,
): Promise<DesktopMaterial> {
  if (!isTauriRuntime()) {
    let current = readPreviewMaterials([]);
    const index = current.findIndex((m) => m.id === materialId);
    const cleanRequest = Object.fromEntries(
      Object.entries(request).filter(([_, v]) => v !== undefined),
    ) as CreateDesktopMaterialRequest;
    if (index >= 0) {
      current[index] = { ...current[index], ...cleanRequest };
    } else {
      current = [request, ...current];
    }
    writePreviewMaterials(current);
    return request;
  }

  return invoke<DesktopMaterial>("update_material", { materialId, request });
}

export async function restoreMaterialsFromSalUsage(
  usage: { materialId: string; quantity: number }[],
): Promise<void> {
  if (usage.length === 0) return;
  const { data: all } = await listDesktopMaterials([]);
  const map = new Map(all.map((m) => [m.id, m]));
  for (const { materialId, quantity } of usage) {
    const mat = map.get(materialId);
    if (mat) {
      await updateDesktopMaterial(materialId, {
        id: mat.id,
        code: mat.code,
        description: mat.description,
        category: mat.category,
        unit: mat.unit,
        quantity: mat.quantity + quantity,
        minQuantity: mat.minQuantity,
        notes: mat.notes,
      });
    }
  }
}

export async function deleteDesktopMaterial(materialId: string): Promise<void> {
  if (!isTauriRuntime()) {
    const current = readPreviewMaterials([]);
    writePreviewMaterials(current.filter((m) => m.id !== materialId));
    return;
  }

  await invoke<void>("delete_material", { materialId });
}
