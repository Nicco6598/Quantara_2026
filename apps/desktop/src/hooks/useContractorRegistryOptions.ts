import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import { loadContractorRegistryNames } from "@/lib/contractor-registry";
import { normalizeContractorName } from "@/lib/shared-utils";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";

export function useContractorRegistryOptions(): string[] {
  const projectClients = useSalWorkflowStore(
    useShallow((state) => state.projects.map((project) => project.client)),
  );
  const [registry, setRegistry] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void loadContractorRegistryNames().then((names) => {
      if (active) {
        setRegistry(names);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useDataChangedListener(() => {
    void loadContractorRegistryNames().then(setRegistry);
  });

  return useMemo(() => {
    const names = new Set<string>();
    for (const name of [...registry, ...projectClients]) {
      const normalized = normalizeContractorName(name);
      if (normalized && normalized !== "Senza appaltatore") {
        names.add(normalized);
      }
    }
    return [...names].sort((left, right) => left.localeCompare(right, "it-IT"));
  }, [projectClients, registry]);
}
