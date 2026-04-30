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
  selectedTariffBookIds: string[];
  tariffBooks: DesktopTariffBook[];
  voices: SalVoiceDraft[];
};

const initialLoadState: LoadState = {
  contracts: [],
  error: null,
  isLoading: true,
  selectedTariffBookIds: [],
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
        const defaultSelectedIds =
          orderedBooks
            .filter((book) => book.isPriority)
            .map((book) => book.id)
            .slice(0, 3) ?? [];
        const selectedTariffBookIds =
          defaultSelectedIds.length > 0
            ? defaultSelectedIds
            : orderedBooks[0]
              ? [orderedBooks[0].id]
              : [];
        const voices = await loadVoicesForBooks(selectedTariffBookIds, tariffBooks);

        if (!active) {
          return;
        }

        setState({
          contracts,
          error: null,
          isLoading: false,
          selectedTariffBookIds,
          tariffBooks,
          voices,
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
      tariffBookOptions.find((book) => state.selectedTariffBookIds.includes(book.id)) ??
      tariffBookOptions[0] ??
      null,
    [state.selectedTariffBookIds, tariffBookOptions],
  );
  const selectedTariffBooks = useMemo(
    () => tariffBookOptions.filter((book) => state.selectedTariffBookIds.includes(book.id)),
    [state.selectedTariffBookIds, tariffBookOptions],
  );

  async function selectTariffBook(tariffBookId: string) {
    const exists = state.tariffBooks.some((book) => book.id === tariffBookId);
    if (!exists) {
      return;
    }
    const isSelected = state.selectedTariffBookIds.includes(tariffBookId);
    const nextSelectedIds = isSelected
      ? state.selectedTariffBookIds.filter((id) => id !== tariffBookId)
      : [...state.selectedTariffBookIds, tariffBookId];
    if (nextSelectedIds.length === 0) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      selectedTariffBookIds: nextSelectedIds,
    }));

    try {
      const voices = await loadVoicesForBooks(nextSelectedIds, state.tariffBooks);
      setState((current) => ({
        ...current,
        error: null,
        isLoading: false,
        voices,
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
    selectedTariffBooks,
    selectTariffBook,
    tariffBookOptions,
    voices: state.voices,
  };
}

async function loadVoicesForBooks(
  tariffBookIds: string[],
  tariffBooks: readonly DesktopTariffBook[],
): Promise<SalVoiceDraft[]> {
  const selectedBooks = tariffBookIds
    .map((id) => tariffBooks.find((book) => book.id === id))
    .filter((book): book is DesktopTariffBook => book != null);
  const results = await Promise.all(
    selectedBooks.map(async (book) => {
      const voicesResult = await listDesktopTariffVoices(book.id, []);
      return voicesResult.data.map((voice) => mapVoiceToDraft(voice, book));
    }),
  );
  const uniqueById = new Map<string, SalVoiceDraft>();
  for (const voice of results.flat()) {
    uniqueById.set(voice.id, voice);
  }
  return [...uniqueById.values()];
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
