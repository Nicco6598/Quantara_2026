import { invoke } from "@tauri-apps/api/core";

export type DesktopMoney = {
  amount: number;
  currency: "EUR";
};

export type DesktopTariffPriority = {
  priority: number;
  reason: string;
  tariffBookId: string;
};

export type DesktopContract = {
  applicationContractCode: string;
  contractualAmount: DesktopMoney;
  frameworkAgreementCode: string;
  id: string;
  tariffPriorities: DesktopTariffPriority[];
  title: string;
};

export type CreateDesktopContractRequest = {
  applicationContractCode: string;
  contractualAmount: number;
  frameworkAgreementCode: string;
  id: string;
  tariffPriorities: DesktopTariffPriority[];
  title: string;
};

export type DesktopTariffBook = {
  id: string;
  name: string;
  sourceName: string;
  status: string;
  year: number;
};

export type DesktopTariffVoice = {
  category: string;
  description: string;
  id: string;
  officialCode: string;
  tariffBookId: string;
  unitOfMeasure: string;
  unitPrice: number;
};

export type CreateDesktopTariffBookRequest = DesktopTariffBook & {
  voices?: DesktopTariffVoice[];
};

export type UpdateDesktopTariffBookRequest = Omit<DesktopTariffBook, "id">;

export type TariffPdfMetadata = {
  name: string;
  sourceName: string;
  voices: DesktopTariffVoice[];
  year: number;
};

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
  if (!isTauriRuntime()) {
    return {
      data: fallback,
      message: "Runtime browser: dati dimostrativi.",
      source: "fallback",
    };
  }

  try {
    const data = await invoke<DesktopContract[]>("list_contracts");

    return {
      data,
      source: "desktop",
    };
  } catch (error) {
    return {
      data: fallback,
      message: formatDesktopError(error),
      source: "fallback",
    };
  }
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
  if (!isTauriRuntime()) {
    return {
      data: fallback,
      message: "Runtime browser: dati dimostrativi.",
      source: "fallback",
    };
  }

  try {
    const data = await invoke<DesktopTariffBook[]>("list_tariff_books");

    return {
      data,
      source: "desktop",
    };
  } catch (error) {
    return {
      data: fallback,
      message: formatDesktopError(error),
      source: "fallback",
    };
  }
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
  if (!isTauriRuntime()) {
    return {
      data: fallback,
      message: "Runtime browser: voci dimostrative.",
      source: "fallback",
    };
  }

  try {
    const data = await invoke<DesktopTariffVoice[]>("list_tariff_voices", { tariffBookId });

    return {
      data,
      source: "desktop",
    };
  } catch (error) {
    return {
      data: fallback,
      message: formatDesktopError(error),
      source: "fallback",
    };
  }
}

export async function selectTariffPdfMetadata(): Promise<TariffPdfMetadata | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const { open } = await import("@tauri-apps/plugin-dialog");
  const selectedPath = await open({
    filters: [{ extensions: ["pdf"], name: "PDF tariffario" }],
    multiple: false,
  });

  if (typeof selectedPath !== "string") {
    return null;
  }

  const fallback = inferTariffMetadataFromPath(selectedPath);

  try {
    return await invoke<TariffPdfMetadata>("import_tariff_pdf_preview", { path: selectedPath });
  } catch {
    return fallback;
  }
}

function inferTariffMetadataFromPath(path: string): TariffPdfMetadata {
  const fileName = path.split(/[\\/]/).pop()?.replace(/\.pdf$/i, "") ?? "Tariffario importato";
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
