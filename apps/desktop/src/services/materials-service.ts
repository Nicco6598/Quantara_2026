import { useCallback, useEffect, useState } from "react";
import {
  type DesktopMaterial,
  type CreateDesktopMaterialRequest,
  type UpdateDesktopMaterialRequest,
  type DesktopDataResult,
  listDesktopMaterials,
  createDesktopMaterial,
  updateDesktopMaterial,
  deleteDesktopMaterial,
  adjustDesktopMaterialStock,
} from "@/lib/desktopData";

type UseMaterialsServiceReturn = {
  materials: DesktopMaterial[];
  isLoading: boolean;
  refetch: () => void;
  create: (request: CreateDesktopMaterialRequest) => Promise<DesktopMaterial>;
  update: (id: string, request: UpdateDesktopMaterialRequest) => Promise<DesktopMaterial>;
  remove: (id: string) => Promise<void>;
  adjustStock: (id: string, newQuantity: number, description: string) => Promise<DesktopMaterial>;
};

export function useMaterialsService(): UseMaterialsServiceReturn {
  const [materials, setMaterials] = useState<DesktopMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(() => {
    let active = true;
    setIsLoading(true);
    const fbPromise = import.meta.env.DEV
      ? import("@/features/materials/materials-data").then((m) => m.fallbackMaterials)
      : Promise.resolve([] as DesktopMaterial[]);
    fbPromise.then((fb) => {
      if (!active) return;
      listDesktopMaterials(fb).then((result: DesktopDataResult<DesktopMaterial[]>) => {
        if (active) {
          setMaterials(result.data);
          setIsLoading(false);
        }
      });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetch();
    return cleanup;
  }, [fetch]);

  const create = useCallback(
    async (request: CreateDesktopMaterialRequest): Promise<DesktopMaterial> => {
      const created = await createDesktopMaterial(request);
      setMaterials((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const update = useCallback(
    async (id: string, request: UpdateDesktopMaterialRequest): Promise<DesktopMaterial> => {
      const updated = await updateDesktopMaterial(id, request);
      setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteDesktopMaterial(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const adjustStock = useCallback(
    async (id: string, newQuantity: number, description: string): Promise<DesktopMaterial> => {
      const adjusted = await adjustDesktopMaterialStock(id, newQuantity, description);
      setMaterials((prev) => prev.map((m) => (m.id === id ? adjusted : m)));
      return adjusted;
    },
    [],
  );

  return { materials, isLoading, refetch: fetch, create, update, remove, adjustStock };
}
