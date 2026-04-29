import { useEffect, useMemo, useState } from "react";
import {
  type DesktopContract,
  type DesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
} from "@/lib/desktopData";
import {
  mapContractToSalProject,
  mapTariffBooksForContract,
  mapVoiceToDraft,
} from "../data/sal-mappers";
import type { SalProjectContext, SalTariffBookOption, SalVoiceDraft } from "../types";

type LoadState = {
  contracts: DesktopContract[];
  error: string | null;
  isLoading: boolean;
  selectedTariffBookId: string;
  tariffBooks: DesktopTariffBook[];
  voices: SalVoiceDraft[];
};

const initialLoadState: LoadState = {
  contracts: [],
  error: null,
  isLoading: true,
  selectedTariffBookId: "",
  tariffBooks: [],
  voices: [],
};

export function useSalCreationData() {
  const [state, setState] = useState<LoadState>(initialLoadState);

  useEffect(() => {
    let active = true;

    async function load() {
      setState((current) => ({ ...current, error: null, isLoading: true }));
      try {
        const [contractsResult, tariffBooksResult] = await Promise.all([
          listDesktopContracts([]),
          listDesktopTariffBooks([]),
        ]);

        if (!active) {
          return;
        }

        const contracts = contractsResult.data;
        const tariffBooks = tariffBooksResult.data;
        const selectedContract = selectContract(contracts);
        const orderedBooks = mapTariffBooksForContract(tariffBooks, selectedContract);
        const selectedTariffBook = orderedBooks[0] ?? tariffBooks[0] ?? null;
        const voicesResult = selectedTariffBook
          ? await listDesktopTariffVoices(selectedTariffBook.id, [])
          : { data: [] as const, source: "desktop" as const };

        if (!active) {
          return;
        }

        setState({
          contracts,
          error: null,
          isLoading: false,
          selectedTariffBookId: selectedTariffBook?.id ?? "",
          tariffBooks,
          voices: selectedTariffBook
            ? voicesResult.data.map((voice) => mapVoiceToDraft(voice, selectedTariffBook))
            : [],
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          error:
            error instanceof Error ? error.message : "Impossibile caricare contratti e tariffari.",
          isLoading: false,
        }));
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const selectedContract = useMemo(() => selectContract(state.contracts), [state.contracts]);
  const project = useMemo<SalProjectContext | null>(
    () => (selectedContract ? mapContractToSalProject(selectedContract) : null),
    [selectedContract],
  );
  const tariffBookOptions = useMemo<SalTariffBookOption[]>(
    () => mapTariffBooksForContract(state.tariffBooks, selectedContract),
    [selectedContract, state.tariffBooks],
  );
  const selectedTariffBook = useMemo(
    () =>
      tariffBookOptions.find((book) => book.id === state.selectedTariffBookId) ??
      tariffBookOptions[0] ??
      null,
    [state.selectedTariffBookId, tariffBookOptions],
  );

  async function selectTariffBook(tariffBookId: string) {
    const tariffBook = state.tariffBooks.find((book) => book.id === tariffBookId);
    if (!tariffBook) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      selectedTariffBookId: tariffBookId,
    }));

    try {
      const voicesResult = await listDesktopTariffVoices(tariffBookId, []);
      setState((current) => ({
        ...current,
        error: null,
        isLoading: false,
        voices: voicesResult.data.map((voice) => mapVoiceToDraft(voice, tariffBook)),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Impossibile caricare le voci tariffarie.",
        isLoading: false,
      }));
    }
  }

  return {
    contracts: state.contracts,
    error: state.error,
    isLoading: state.isLoading,
    project,
    selectedTariffBook,
    selectTariffBook,
    tariffBookOptions,
    voices: state.voices,
  };
}

function selectContract(contracts: readonly DesktopContract[]): DesktopContract | null {
  if (contracts.length === 0) {
    return null;
  }

  const selectedProjectId = readSelectedProjectId();
  return contracts.find((contract) => contract.id === selectedProjectId) ?? contracts[0] ?? null;
}

function readSelectedProjectId(): string | null {
  try {
    const rawValue = window.sessionStorage.getItem("quantara.selectedProjectDetail.v1");
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}
