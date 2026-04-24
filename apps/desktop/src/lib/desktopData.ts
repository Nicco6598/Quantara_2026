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

export type DesktopTariffBook = {
  id: string;
  name: string;
  sourceName: string;
  status: string;
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

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function formatDesktopError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
