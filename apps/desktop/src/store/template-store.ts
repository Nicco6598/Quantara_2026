import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId } from "@/features/sal/domain/sal-workflow";
import type { SalEconomicRules } from "@/features/sal/types";

type TemplateVoiceEntry = {
  voiceId: string;
  factor1: number;
  factor2: number;
  factor3: number;
  surchargePercent: number;
};

type SalTemplate = {
  createdAt: string;
  economicRules: SalEconomicRules;
  id: string;
  name: string;
  voiceEntries: TemplateVoiceEntry[];
  tariffBookId: string;
};

type TemplateStore = {
  deleteTemplate: (id: string) => void;
  listTemplates: () => SalTemplate[];
  saveTemplate: (
    name: string,
    voiceEntries: TemplateVoiceEntry[],
    economicRules: SalEconomicRules,
    tariffBookId: string,
  ) => SalTemplate;
  templates: SalTemplate[];
};

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],

      saveTemplate: (name, voiceEntries, economicRules, tariffBookId) => {
        const template: SalTemplate = {
          createdAt: new Date().toISOString(),
          economicRules,
          id: createId("template"),
          name,
          voiceEntries,
          tariffBookId,
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

      listTemplates: () => get().templates,
    }),
    {
      name: "quantara-sal-templates-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export type { SalTemplate, TemplateVoiceEntry };
