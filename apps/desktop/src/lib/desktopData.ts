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

export async function listDesktopContracts(
  fallback: DesktopContract[],
): Promise<DesktopDataResult<DesktopContract[]>> {
  return invokeWithFallback("list_contracts", {}, fallback, "dati dimostrativi");
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
  return invokeWithFallback("list_tariff_books", {}, fallback, "dati dimostrativi");
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
  return invokeWithFallback("list_tariff_voices", { tariffBookId }, fallback, "voci dimostrative");
}

export async function selectTariffPdfMetadata(): Promise<TariffPdfMetadata | null> {
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
