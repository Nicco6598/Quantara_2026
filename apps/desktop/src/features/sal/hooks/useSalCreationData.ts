import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import {
  type DesktopContract,
  type DesktopTariffBook,
  listDesktopContracts,
  listDesktopTariffBooks,
  listDesktopTariffVoices,
} from "@/lib/desktopData";
import { readLegacyProjectContractors, resolveContractorName } from "@/lib/contractor-resolve";
import { getWorkflowProjectId, selectProjectForWorkflow } from "@/lib/workflow-navigation";
import {
  mapContractToSalProject,
  mapTariffBooksForContract,
  mapVoiceToDraft,
} from "../data/sal-mappers";
import type { SalProjectContext, SalTariffBookOption, SalVoiceDraft } from "../types";

type LoadState = {
  contracts: DesktopContract[];
  error: string | null;
  isBootstrapping: boolean;
  isVoicesLoading: boolean;
  selectedContractId: string;
  selectedTariffBookIds: string[];
  tariffBooks: DesktopTariffBook[];
  voices: SalVoiceDraft[];
};

const initialLoadState: LoadState = {
  contracts: [],
  error: null,
  isBootstrapping: true,
  isVoicesLoading: false,
  selectedContractId: "",
  selectedTariffBookIds: [],
  tariffBooks: [],
  voices: [],
};

function sameIdSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function booksHaveVoicesLoaded(
  voices: readonly SalVoiceDraft[],
  bookIds: readonly string[],
): boolean {
  if (bookIds.length === 0) return true;
  const loaded = new Set(voices.map((voice) => voice.tariffBookId));
  return bookIds.every((id) => loaded.has(id));
}

export function useSalCreationData() {
  const [state, setState] = useState<LoadState>(initialLoadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const mergeVoices = useCallback(
    (current: SalVoiceDraft[], incoming: SalVoiceDraft[]): SalVoiceDraft[] => {
      const byId = new Map(current.map((voice) => [voice.id, voice]));
      for (const voice of incoming) {
        byId.set(voice.id, voice);
      }
      return [...byId.values()];
    },
    [],
  );

  const loadVoicesForMissingBooks = useCallback(
    async (
      bookIds: string[],
      tariffBooks: readonly DesktopTariffBook[],
      currentVoices: SalVoiceDraft[],
    ): Promise<SalVoiceDraft[]> => {
      const missing = bookIds.filter(
        (bookId) => !currentVoices.some((voice) => voice.tariffBookId === bookId),
      );
      if (missing.length === 0) {
        return currentVoices;
      }
      const loaded = await loadVoicesForBooks(missing, tariffBooks);
      return mergeVoices(currentVoices, loaded);
    },
    [mergeVoices],
  );

  const loadCreationData = useCallback(async () => {
    const [contractsResult, tariffBooksResult] = await Promise.all([
      listDesktopContracts([]),
      listDesktopTariffBooks([]),
    ]);

    const contracts = contractsResult.data;
    const tariffBooks = tariffBooksResult.data;
    const savedId = getWorkflowProjectId();
    const defaultContract = contracts.find((c) => c.id === savedId) ?? contracts[0] ?? null;
    const defaultId = defaultContract?.id ?? "";
    const orderedBooks = mapTariffBooksForContract(tariffBooks, defaultContract);
    const selectedTariffBookIds = orderedBooks.map((book) => book.id);
    const voices =
      selectedTariffBookIds.length > 0
        ? await loadVoicesForBooks(selectedTariffBookIds, tariffBooks)
        : [];

    setState({
      contracts,
      error: null,
      isBootstrapping: false,
      isVoicesLoading: false,
      selectedContractId: defaultId,
      selectedTariffBookIds,
      tariffBooks,
      voices,
    });
  }, []);

  const refreshMetadata = useCallback(async () => {
    const [contractsResult, tariffBooksResult] = await Promise.all([
      listDesktopContracts([]),
      listDesktopTariffBooks([]),
    ]);

    setState((current) => ({
      ...current,
      contracts: contractsResult.data,
      tariffBooks: tariffBooksResult.data,
      error: null,
    }));
  }, []);

  useEffect(() => {
    let active = true;

    loadCreationData().catch((error) => {
      if (!active) return;
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : "Impossibile caricare contratti e tariffari.",
        isBootstrapping: false,
        isVoicesLoading: false,
      }));
    });

    return () => {
      active = false;
    };
  }, [loadCreationData]);

  useDataChangedListener(() => {
    void refreshMetadata();
  });

  const selectedContract = useMemo(
    () =>
      state.contracts.find((c) => c.id === state.selectedContractId) ?? state.contracts[0] ?? null,
    [state.contracts, state.selectedContractId],
  );
  const legacyContractors = useMemo(() => readLegacyProjectContractors(), []);
  const project = useMemo<SalProjectContext | null>(
    () =>
      selectedContract
        ? mapContractToSalProject(
            selectedContract,
            resolveContractorName(selectedContract, legacyContractors),
          )
        : null,
    [legacyContractors, selectedContract],
  );
  const tariffBookOptions = useMemo<SalTariffBookOption[]>(
    () => mapTariffBooksForContract(state.tariffBooks, selectedContract),
    [selectedContract, state.tariffBooks],
  );
  const selectedTariffBookIdSet = useMemo(
    () => new Set(state.selectedTariffBookIds),
    [state.selectedTariffBookIds],
  );
  const tariffBookOptionIdSet = useMemo(
    () => new Set(tariffBookOptions.map((book) => book.id)),
    [tariffBookOptions],
  );
  const selectedTariffBook = useMemo(
    () =>
      tariffBookOptions.find((book) => selectedTariffBookIdSet.has(book.id)) ??
      tariffBookOptions[0] ??
      null,
    [selectedTariffBookIdSet, tariffBookOptions],
  );
  const selectedTariffBooks = useMemo(
    () => tariffBookOptions.filter((book) => selectedTariffBookIdSet.has(book.id)),
    [selectedTariffBookIdSet, tariffBookOptions],
  );

  const restoreTariffBookIds = useCallback(
    async (tariffBookIds: string[]) => {
      const validIds = tariffBookIds.filter((id) => tariffBookOptionIdSet.has(id));
      if (validIds.length === 0) return;

      const current = stateRef.current;
      if (
        sameIdSet(validIds, current.selectedTariffBookIds) &&
        booksHaveVoicesLoaded(current.voices, validIds)
      ) {
        return;
      }

      if (booksHaveVoicesLoaded(current.voices, validIds)) {
        setState((prev) => ({
          ...prev,
          selectedTariffBookIds: validIds,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        error: null,
        isVoicesLoading: true,
        selectedTariffBookIds: validIds,
      }));

      try {
        const voices = await loadVoicesForMissingBooks(
          validIds,
          current.tariffBooks,
          current.voices,
        );
        setState((prev) => ({
          ...prev,
          error: null,
          isVoicesLoading: false,
          voices,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Impossibile caricare i tariffari.",
          isVoicesLoading: false,
        }));
      }
    },
    [loadVoicesForMissingBooks, tariffBookOptionIdSet],
  );

  const selectTariffBook = useCallback(
    async (tariffBookId: string) => {
      if (!tariffBookOptionIdSet.has(tariffBookId)) return;
      const current = stateRef.current;
      const isSelected = current.selectedTariffBookIds.includes(tariffBookId);
      const nextSelectedIds = isSelected
        ? current.selectedTariffBookIds.filter((id) => id !== tariffBookId)
        : [...current.selectedTariffBookIds, tariffBookId];
      if (nextSelectedIds.length === 0) return;

      if (isSelected) {
        const removedSet = new Set([tariffBookId]);
        setState((prev) => ({
          ...prev,
          selectedTariffBookIds: nextSelectedIds,
          voices: prev.voices.filter((voice) => !removedSet.has(voice.tariffBookId)),
        }));
        return;
      }

      if (booksHaveVoicesLoaded(current.voices, nextSelectedIds)) {
        setState((prev) => ({
          ...prev,
          selectedTariffBookIds: nextSelectedIds,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        error: null,
        isVoicesLoading: true,
        selectedTariffBookIds: nextSelectedIds,
      }));

      try {
        const voices = await loadVoicesForMissingBooks(
          nextSelectedIds,
          current.tariffBooks,
          current.voices,
        );
        setState((prev) => ({
          ...prev,
          error: null,
          isVoicesLoading: false,
          voices,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Errore nel cambio tariffario.",
          isVoicesLoading: false,
        }));
      }
    },
    [loadVoicesForMissingBooks, tariffBookOptionIdSet],
  );

  const setContract = useCallback(async (contractId: string) => {
    const current = stateRef.current;
    const contract = current.contracts.find((c) => c.id === contractId);
    if (!contract) return;
    selectProjectForWorkflow(contractId);
    const bookIds = mapTariffBooksForContract(current.tariffBooks, contract).map((b) => b.id);

    setState((prev) => ({
      ...prev,
      error: null,
      isVoicesLoading: bookIds.length > 0,
      selectedContractId: contractId,
      selectedTariffBookIds: bookIds,
    }));

    try {
      const voices =
        bookIds.length > 0 ? await loadVoicesForBooks(bookIds, current.tariffBooks) : [];
      setState((prev) => ({
        ...prev,
        error: null,
        isVoicesLoading: false,
        voices,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Errore nel cambio progetto.",
        isVoicesLoading: false,
      }));
    }
  }, []);

  const setSelectedTariffBookIds = useCallback(
    async (tariffBookIds: string[]) => {
      const validIds = tariffBookIds.filter((id) => tariffBookOptionIdSet.has(id));
      if (validIds.length === 0) return;

      const current = stateRef.current;
      if (
        sameIdSet(validIds, current.selectedTariffBookIds) &&
        booksHaveVoicesLoaded(current.voices, validIds)
      ) {
        return;
      }

      const nextIds = new Set(validIds);
      const removedIds = current.selectedTariffBookIds.filter((id) => !nextIds.has(id));

      if (booksHaveVoicesLoaded(current.voices, validIds)) {
        let voices = current.voices;
        if (removedIds.length > 0) {
          const removedSet = new Set(removedIds);
          voices = voices.filter((voice) => !removedSet.has(voice.tariffBookId));
        }
        setState((prev) => ({
          ...prev,
          selectedTariffBookIds: validIds,
          voices,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        error: null,
        isVoicesLoading: true,
        selectedTariffBookIds: validIds,
      }));

      try {
        let voices = current.voices;
        if (removedIds.length > 0) {
          const removedSet = new Set(removedIds);
          voices = voices.filter((voice) => !removedSet.has(voice.tariffBookId));
        }
        voices = await loadVoicesForMissingBooks(validIds, current.tariffBooks, voices);
        setState((prev) => ({
          ...prev,
          error: null,
          isVoicesLoading: false,
          voices,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Errore selezione tariffari.",
          isVoicesLoading: false,
        }));
      }
    },
    [loadVoicesForMissingBooks, tariffBookOptionIdSet],
  );

  return {
    contracts: state.contracts,
    error: state.error,
    isBootstrapping: state.isBootstrapping,
    isLoading: state.isBootstrapping,
    isVoicesLoading: state.isVoicesLoading,
    project,
    restoreTariffBookIds,
    selectedContractId: state.selectedContractId,
    selectedTariffBook,
    selectedTariffBooks,
    selectTariffBook,
    setSelectedTariffBookIds,
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
