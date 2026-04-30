import type {
  CreateDesktopContractRecordRequest,
  CreateDesktopTariffBookRecordRequest,
  DesktopContractRecord,
  DesktopTariffBookRecord,
  DesktopTariffPriorityRecord,
  DesktopTariffVoiceRecord,
  Money,
  TariffPdfMetadataRecord,
  UpdateDesktopTariffBookRecordRequest,
} from "@quantara/shared-types";
import { invoke } from "@tauri-apps/api/core";
import { invokeWithFallback } from "./tauri-wrapper";

export type DesktopMoney = Money;
export type DesktopTariffPriority = DesktopTariffPriorityRecord;
export type DesktopContract = DesktopContractRecord;
export type CreateDesktopContractRequest = CreateDesktopContractRecordRequest;
export type DesktopTariffBook = DesktopTariffBookRecord;
export type DesktopTariffVoice = DesktopTariffVoiceRecord;
export type CreateDesktopTariffBookRequest = CreateDesktopTariffBookRecordRequest;
export type UpdateDesktopTariffBookRequest = UpdateDesktopTariffBookRecordRequest;
export type TariffPdfMetadata = TariffPdfMetadataRecord;

export type DesktopDataResult<T> =
  | {
      data: T;
      source: "desktop";
    }
  | {
      data: T;
      message: string;
      source: "fallback";
    };

type InflightKey = "contracts" | "materials" | `tariff-books:${number}` | `tariff-voices:${string}:${number}`;

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
  return withInflightCache("contracts", () =>
    invokeWithFallback("list_contracts", {}, fallback, "dati dimostrativi"),
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
    frameworkAgreementCode: request.frameworkAgreementCode,
    id: request.id,
    safetyCostsNotSubjectToDiscount: {
      amount: request.safetyCostsNotSubjectToDiscount,
      currency: "EUR",
    },
    tariffPriorities: request.tariffPriorities,
    title: request.title,
  };

  if (!isTauriRuntime()) {
    return contract;
  }

  return invoke<DesktopContract>("create_contract", { request });
}

export async function updateDesktopContract(
  contractId: string,
  request: CreateDesktopContractRequest,
): Promise<DesktopContract> {
  if (!isTauriRuntime()) {
    return createDesktopContract(request);
  }

  return invoke<DesktopContract>("update_contract", { contractId, request });
}

export async function deleteDesktopContract(contractId: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke<void>("delete_contract", { contractId });
}

export async function listDesktopTariffBooks(
  fallback: DesktopTariffBook[],
): Promise<DesktopDataResult<DesktopTariffBook[]>> {
  return withInflightCache(`tariff-books:${fallback.length}`, () =>
    invokeWithFallback("list_tariff_books", {}, fallback, "dati dimostrativi"),
  );
}

export async function createDesktopTariffBook(
  request: CreateDesktopTariffBookRequest,
): Promise<DesktopTariffBook> {
  if (!isTauriRuntime()) {
    const { voices: _voices, ...book } = request;

    return book;
  }

  return invoke<DesktopTariffBook>("create_tariff_book", { request });
}

export async function updateDesktopTariffBook(
  tariffBookId: string,
  request: UpdateDesktopTariffBookRequest,
): Promise<DesktopTariffBook> {
  if (!isTauriRuntime()) {
    return {
      id: tariffBookId,
      ...request,
    };
  }

  return invoke<DesktopTariffBook>("update_tariff_book", { tariffBookId, request });
}

export async function deleteDesktopTariffBook(tariffBookId: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke<void>("delete_tariff_book", { tariffBookId });
}

export async function listDesktopTariffVoices(
  tariffBookId: string,
  fallback: DesktopTariffVoice[],
): Promise<DesktopDataResult<DesktopTariffVoice[]>> {
  return withInflightCache(`tariff-voices:${tariffBookId}:${fallback.length}`, () =>
    invokeWithFallback("list_tariff_voices", { tariffBookId }, fallback, "voci dimostrative"),
  );
}

export async function selectTariffPdfMetadata({
  onFileSelected,
  onPreviewStart,
}: {
  onFileSelected?: (path: string) => void;
  onPreviewStart?: (metadata: TariffPdfMetadata) => void;
} = {}): Promise<TariffPdfMetadata | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const { open } = await import("@tauri-apps/plugin-dialog");
  const selectedPath = await open({
    filters: [{ extensions: ["pdf", "json"], name: "Tariffario PDF o JSON parser" }],
    multiple: false,
  });

  if (typeof selectedPath !== "string") {
    return null;
  }

  const fallback = inferTariffMetadataFromPath(selectedPath);
  onFileSelected?.(selectedPath);
  onPreviewStart?.(fallback);

  try {
    return await invoke<TariffPdfMetadata>("import_tariff_pdf_preview", { path: selectedPath });
  } catch (error) {
    throw new Error(
      `Import tariffario non riuscito per ${fallback.name}: ${formatDesktopError(error)}`,
    );
  }
}

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

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatDesktopError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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

export type UpdateDesktopMaterialRequest = {
  code: string;
  description: string;
  category: string;
  unit: string;
  minQuantity: number;
  notes: string;
};

export type DesktopMaterialTransaction = {
  id: string;
  materialId: string;
  quantityChange: number;
  quantityAfter: number;
  transactionType: string;
  referenceId: string | null;
  description: string;
  createdAt: string;
};

export async function listDesktopMaterials(
  fallback: DesktopMaterial[],
): Promise<DesktopDataResult<DesktopMaterial[]>> {
  return withInflightCache("materials", () =>
    invokeWithFallback("list_materials", {}, fallback, "materiali dimostrativi"),
  );
}

export async function createDesktopMaterial(
  request: CreateDesktopMaterialRequest,
): Promise<DesktopMaterial> {
  if (!isTauriRuntime()) {
    return request;
  }

  return invoke<DesktopMaterial>("create_material", { request });
}

export async function updateDesktopMaterial(
  materialId: string,
  request: UpdateDesktopMaterialRequest,
): Promise<DesktopMaterial> {
  if (!isTauriRuntime()) {
    return { id: materialId, quantity: 0, ...request };
  }

  return invoke<DesktopMaterial>("update_material", { materialId, request });
}

export async function deleteDesktopMaterial(materialId: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke<void>("delete_material", { materialId });
}

export async function adjustDesktopMaterialStock(
  materialId: string,
  newQuantity: number,
  description: string,
): Promise<DesktopMaterial> {
  if (!isTauriRuntime()) {
    return { id: materialId, code: "", description: "", category: "", unit: "", notes: "", minQuantity: 0, quantity: newQuantity };
  }

  return invoke<DesktopMaterial>("adjust_material_stock", { materialId, newQuantity, description });
}

export async function deductDesktopMaterials(
  deductions: Array<[string, number, string]>,
): Promise<DesktopMaterial[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invoke<DesktopMaterial[]>("deduct_materials", { deductions });
}

export async function listDesktopMaterialTransactions(
  materialId: string,
): Promise<DesktopMaterialTransaction[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invoke<DesktopMaterialTransaction[]>("list_material_transactions", { materialId });
}


