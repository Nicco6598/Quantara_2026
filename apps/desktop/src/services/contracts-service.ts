import { useCallback, useEffect, useState } from "react";
import {
  type CreateDesktopContractRequest,
  createDesktopContract,
  type DesktopContract,
  type DesktopDataResult,
  deleteDesktopContract,
  listDesktopContracts,
  updateDesktopContract,
} from "@/lib/desktopData";

type UseContractsServiceReturn = {
  contracts: DesktopContract[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  create: (request: CreateDesktopContractRequest) => Promise<DesktopContract>;
  update: (contractId: string, request: CreateDesktopContractRequest) => Promise<DesktopContract>;
  remove: (contractId: string) => Promise<void>;
};

export function useContractsService(fallback: DesktopContract[] = []): UseContractsServiceReturn {
  const [contracts, setContracts] = useState<DesktopContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    let active = true;
    setIsLoading(true);
    listDesktopContracts(fallback)
      .then((result: DesktopDataResult<DesktopContract[]>) => {
        if (active) {
          setContracts(result.data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Errore caricamento contratti");
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [fallback]);

  useEffect(() => {
    const cleanup = fetch();
    return cleanup;
  }, [fetch]);

  const create = useCallback(
    async (request: CreateDesktopContractRequest): Promise<DesktopContract> => {
      const created = await createDesktopContract(request);
      setContracts((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const update = useCallback(
    async (contractId: string, request: CreateDesktopContractRequest): Promise<DesktopContract> => {
      const updated = await updateDesktopContract(contractId, request);
      setContracts((prev) => prev.map((c) => (c.id === contractId ? updated : c)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (contractId: string): Promise<void> => {
    await deleteDesktopContract(contractId);
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
  }, []);

  return { contracts, isLoading, error, refetch: fetch, create, update, remove };
}
