import { useEffect, useMemo, useState } from "react";
import {
  type DesktopContract,
  type DesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
} from "@/lib/desktopData";
import { readStringRecord } from "@/lib/shared-utils";
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from "@/persistence/storage-keys";
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
  selectedContractId: string;
  selectedTariffBookIds: string[];
  tariffBooks: DesktopTariffBook[];
  voices: SalVoiceDraft[];
};

const initialLoadState: LoadState = {
  contracts: [],
  error: null,
  isLoading: true,
  selectedContractId: "",
  selectedTariffBookIds: [],
  tariffBooks: [],
  voices: [],
};

const projectContractorStorageKey = STORAGE_KEYS.projectContractors;

function readSelectedProjectId(): string | null {
  try {
    const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.selectedProjectDetail);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

function writeSelectedProjectId(id: string) {
  try {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEYS.selectedProjectDetail,
      JSON.stringify({ id }),
    );
  } catch {
    /* no-op */
  }
}

export function useSalCreationData() {
  const [state, setState] = useState<LoadState>(initialLoadState);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [contractsResult, tariffBooksResult] = await Promise.all([
          listDesktopContracts([]),
          listDesktopTariffBooks([]),
        ]);

        if (!active) return;

        const contracts = contractsResult.data;
        const tariffBooks = tariffBooksResult.data;
        const savedId = readSelectedProjectId();
        const defaultContract = contracts.find((c) => c.id === savedId) ?? contracts[0] ?? null;
        const defaultId = defaultContract?.id ?? "";
        const orderedBooks = mapTariffBooksForContract(tariffBooks, defaultContract);
        const defaultSelectedIds = orderedBooks.map((book) => book.id);
        const selectedTariffBookIds = defaultSelectedIds;
        const voices = await loadVoicesForBooks(selectedTariffBookIds, tariffBooks);

        if (!active) return;

        setState({
          contracts,
          error: null,
          isLoading: false,
          selectedContractId: defaultId,
          selectedTariffBookIds,
          tariffBooks,
          voices,
        });
      } catch (error) {
        if (!active) return;
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

  const selectedContract = useMemo(
    () =>
      state.contracts.find((c) => c.id === state.selectedContractId) ?? state.contracts[0] ?? null,
    [state.contracts, state.selectedContractId],
  );
  const projectContractors = useMemo(() => readStringRecord(projectContractorStorageKey), []);
  const project = useMemo<SalProjectContext | null>(
    () =>
      selectedContract
        ? mapContractToSalProject(selectedContract, projectContractors[selectedContract.id])
        : null,
    [projectContractors, selectedContract],
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

  async function restoreTariffBookIds(tariffBookIds: string[]) {
    const validIds = tariffBookIds.filter((id) => tariffBookOptions.some((book) => book.id === id));
    if (validIds.length === 0) return;

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      selectedTariffBookIds: validIds,
    }));

    try {
      const voices = await loadVoicesForBooks(validIds, state.tariffBooks);
      setState((current) => ({
        ...current,
        error: null,
        isLoading: false,
        voices,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Impossibile caricare i tariffari.",
        isLoading: false,
      }));
    }
  }

  async function selectTariffBook(tariffBookId: string) {
    const exists = tariffBookOptions.some((book) => book.id === tariffBookId);
    if (!exists) return;
    const isSelected = state.selectedTariffBookIds.includes(tariffBookId);
    const nextSelectedIds = isSelected
      ? state.selectedTariffBookIds.filter((id) => id !== tariffBookId)
      : [...state.selectedTariffBookIds, tariffBookId];
    if (nextSelectedIds.length === 0) return;

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

  async function setContract(contractId: string) {
    const contract = state.contracts.find((c) => c.id === contractId);
    if (!contract) return;
    writeSelectedProjectId(contractId);
    const bookIds = mapTariffBooksForContract(state.tariffBooks, contract).map((b) => b.id);
    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      selectedContractId: contractId,
      selectedTariffBookIds: bookIds,
    }));
    try {
      const voices = bookIds.length > 0 ? await loadVoicesForBooks(bookIds, state.tariffBooks) : [];
      setState((current) => ({
        ...current,
        error: null,
        isLoading: false,
        voices,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Errore nel cambio progetto.",
        isLoading: false,
      }));
    }
  }

  return {
    contracts: state.contracts,
    error: state.error,
    isLoading: state.isLoading,
    project,
    restoreTariffBookIds,
    selectedContractId: state.selectedContractId,
    selectedTariffBook,
    selectedTariffBooks,
    selectTariffBook,
    setContract,
    tariffBookOptions,
    voices: state.voices,
  };
}

async function loadVoicesForBooks(
  tariffBookIds: string[],
  tariffBooks: readonly DesktopTariffBook[],
): Promise<SalVoiceDraft[]> {
  const bookMap = new Map(tariffBooks.map((book) => [book.id, book]));
  const selectedBooks = tariffBookIds.reduce<DesktopTariffBook[]>((books, id) => {
    const book = bookMap.get(id);
    if (book != null) books.push(book);
    return books;
  }, []);
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
