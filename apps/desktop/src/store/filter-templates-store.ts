import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId } from "@/features/sal/domain/sal-workflow";
import { createSafeLocalStorage } from "@/lib/safe-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";

export type FilterTemplateScope = "accounting" | "materials" | "sal";

export type FilterTemplate = {
  id: string;
  name: string;
  scope: FilterTemplateScope;
  filters: Record<string, unknown>;
  createdAt: string;
};

type FilterTemplatesStore = {
  templates: FilterTemplate[];
  saveTemplate: (
    name: string,
    scope: FilterTemplateScope,
    filters: Record<string, unknown>,
  ) => FilterTemplate;
  deleteTemplate: (id: string) => void;
  applyTemplate: (id: string) => FilterTemplate | undefined;
  listTemplates: (scope: FilterTemplateScope) => FilterTemplate[];
};

export const useFilterTemplatesStore = create<FilterTemplatesStore>()(
  persist(
    (set, get) => ({
      templates: [],

      saveTemplate: (name, scope, filters) => {
        const template: FilterTemplate = {
          id: createId("ftpl"),
          name,
          scope,
          filters,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          templates: [template, ...state.templates].slice(0, 20),
        }));

        return template;
      },

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      applyTemplate: (id) => {
        return get().templates.find((t) => t.id === id);
      },

      listTemplates: (scope) => {
        return get().templates.filter((t) => t.scope === scope);
      },
    }),
    {
      name: STORAGE_KEYS.filterTemplates,
      storage: createJSONStorage(() => createSafeLocalStorage()),
    },
  ),
);
