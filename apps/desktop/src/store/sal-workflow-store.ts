import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateSalTitle } from "@/features/sal/domain/sal-utils";
import { createId } from "@/features/sal/domain/sal-workflow";
import { createSafeLocalStorage } from "@/lib/safe-storage";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import type {
  SalDocument,
  SalDocumentStatus,
  SalLine,
  SalMaterialUsage,
  SalProject,
  SalSurchargeKind,
  SalTariffVoice,
} from "@/features/sal/types";

type CreateSalInput = {
  projectId: string;
  date: string;
  closedAt?: string;
  description: string;
  notes: string;
  title: string;
  lines?: SalLine[];
  voices?: SalTariffVoice[];
  economicRules?: SalDocument["economicRules"];
  materialUsage?: SalMaterialUsage[];
  status?: SalDocumentStatus;
  total?: number;
};

type SalWorkflowStore = {
  activeProjectId: string;
  activeSalId: string;
  projects: SalProject[];
  salDocuments: SalDocument[];
  tariffVoices: SalTariffVoice[];
  createProject: (input: Omit<SalProject, "id"> & { id?: string }) => SalProject;
  createSal: (input: CreateSalInput) => SalDocument;
  updateSalDraft: (id: string, input: Partial<CreateSalInput>) => SalDocument | null;
  closeSal: (salId: string) => void;
  setSalStatus: (salId: string, status: SalDocumentStatus) => void;
  deleteSal: (salId: string) => void;
  addLineToSal: (salId: string, voiceId: string) => void;
  deleteLineFromSal: (salId: string, lineId: string) => void;
  updateLine: (
    salId: string,
    lineId: string,
    data: Partial<Pick<SalLine, "quantity" | "surcharge">>,
  ) => void;
  setActiveProject: (projectId: string) => void;
  setActiveSal: (salId: string) => void;
};

export const useSalWorkflowStore = create<SalWorkflowStore>()(
  persist(
    (set, get) => ({
      activeProjectId: "",
      activeSalId: "",
      projects: [],
      salDocuments: [],
      tariffVoices: [],

      createProject: (input) => {
        const project: SalProject = input.id
          ? (input as SalProject)
          : { ...input, id: createId("project") };

        const existing = get().projects.find((p) => p.id === project.id);
        if (existing) return existing;

        set((state) => ({
          activeProjectId: project.id,
          projects: [project, ...state.projects],
        }));
        return project;
      },

      createSal: (input) => {
        const currentCount = get().salDocuments.filter(
          (sal) => sal.projectId === input.projectId,
        ).length;
        const existingVoiceIds = new Set(get().tariffVoices.map((v) => v.id));
        const voicesToAdd = (input.voices ?? []).filter((v) => !existingVoiceIds.has(v.id));
        const isDraft = input.status !== "closed";
        const salLines =
          input.lines && input.lines.length > 0
            ? input.lines
            : (input.voices ?? []).map((voice) => ({
                id: createId("sal_line"),
                quantity: 0,
                surcharge: "none" as SalSurchargeKind,
                voiceId: voice.id,
              }));
        const sal: SalDocument = {
          date: input.date,
          description: input.description,
          ...(input.economicRules ? { economicRules: input.economicRules } : {}),
          ...(input.materialUsage ? { materialUsage: input.materialUsage } : {}),
          id: createId("sal"),
          lines: salLines,
          notes: input.notes,
          projectId: input.projectId,
          status: isDraft ? "draft" : "closed",
          title: generateSalTitle(input.title, currentCount),
          ...(isDraft ? {} : { closedAt: input.closedAt ?? new Date().toISOString().slice(0, 10) }),
          ...(typeof input.total === "number" && Number.isFinite(input.total)
            ? { total: input.total }
            : {}),
        };

        set((state) => ({
          activeProjectId: sal.projectId,
          activeSalId: sal.id,
          salDocuments: [sal, ...state.salDocuments],
          tariffVoices: [...voicesToAdd, ...state.tariffVoices],
        }));
        return sal;
      },

      updateSalDraft: (id, input) => {
        const existingVoiceIds = new Set(get().tariffVoices.map((v) => v.id));
        const voicesToAdd = (input.voices ?? []).filter((v) => !existingVoiceIds.has(v.id));
        let updated: SalDocument | null = null;

        set((state) => ({
          activeProjectId: input.projectId ?? state.activeProjectId,
          activeSalId: id,
          salDocuments: state.salDocuments.map((sal) => {
            if (sal.id !== id || sal.status !== "draft") return sal;

            updated = {
              ...sal,
              ...(input.date !== undefined && { date: input.date }),
              ...(input.description !== undefined && { description: input.description }),
              ...(input.economicRules !== undefined && { economicRules: input.economicRules }),
              ...(input.materialUsage !== undefined && { materialUsage: input.materialUsage }),
              ...(input.lines !== undefined && { lines: input.lines }),
              ...(input.notes !== undefined && { notes: input.notes }),
              ...(input.projectId !== undefined && { projectId: input.projectId }),
              ...(input.title !== undefined && { title: input.title.trim() || sal.title }),
              ...(typeof input.total === "number" && Number.isFinite(input.total)
                ? { total: input.total }
                : {}),
            };
            return updated;
          }),
          tariffVoices: [...voicesToAdd, ...state.tariffVoices],
        }));
        return updated;
      },

      closeSal: (salId) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId
              ? {
                  ...sal,
                  closedAt: new Date().toISOString().slice(0, 10),
                  status: "closed" as const,
                }
              : sal,
          ),
        })),

      setSalStatus: (salId, status) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId ? { ...sal, status } : sal,
          ),
        })),

      deleteSal: (salId) =>
        set((state) => {
          const deletedSal = state.salDocuments.find((sal) => sal.id === salId);
          if (!deletedSal) {
            return {
              salDocuments: state.salDocuments.filter((sal) => sal.id !== salId),
              activeSalId: state.activeSalId === salId ? "" : state.activeSalId,
            };
          }

          const orphanVoiceIds = new Set(deletedSal.lines.map((l) => l.voiceId));
          const usedVoiceIds = new Set<string>();
          for (const sal of state.salDocuments) {
            if (sal.id === salId) continue;
            for (const line of sal.lines) {
              usedVoiceIds.add(line.voiceId);
            }
          }

          return {
            salDocuments: state.salDocuments.filter((sal) => sal.id !== salId),
            tariffVoices: state.tariffVoices.filter(
              (v) => !orphanVoiceIds.has(v.id) || usedVoiceIds.has(v.id),
            ),
            activeSalId: state.activeSalId === salId ? "" : state.activeSalId,
          };
        }),

      addLineToSal: (salId, voiceId) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) => {
            if (sal.id !== salId || sal.status === "closed") return sal;
            if (sal.lines.some((line) => line.voiceId === voiceId)) return sal;
            return {
              ...sal,
              lines: [
                ...sal.lines,
                {
                  id: createId("sal_line"),
                  quantity: 0,
                  surcharge: "none" as SalSurchargeKind,
                  voiceId,
                },
              ],
            };
          }),
        })),

      deleteLineFromSal: (salId, lineId) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId && sal.status !== "closed"
              ? { ...sal, lines: sal.lines.filter((line) => line.id !== lineId) }
              : sal,
          ),
        })),

      updateLine: (salId, lineId, data) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId && sal.status !== "closed"
              ? {
                  ...sal,
                  lines: sal.lines.map((line) =>
                    line.id === lineId
                      ? {
                          ...line,
                          ...(data.quantity !== undefined && {
                            quantity: Math.max(0, data.quantity),
                          }),
                          ...(data.surcharge !== undefined && { surcharge: data.surcharge }),
                        }
                      : line,
                  ),
                }
              : sal,
          ),
        })),

      setActiveProject: (projectId) =>
        set((state) => ({
          activeProjectId: projectId,
          activeSalId:
            state.salDocuments.find((sal) => sal.projectId === projectId)?.id ?? state.activeSalId,
        })),

      setActiveSal: (salId) =>
        set((state) => {
          const sal = state.salDocuments.find((item) => item.id === salId);
          return {
            activeProjectId: sal?.projectId ?? state.activeProjectId,
            activeSalId: salId,
          };
        }),
    }),
    {
      name: STORAGE_KEYS.salWorkflow,
      version: 3,
      // Caps prevent localStorage quota exceeded errors.
      // Most users have <20 projects, <50 SAL documents, <2000 tariff voices.
      // Data beyond caps remains in memory and SQLite.
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        activeSalId: state.activeSalId,
        projects: state.projects.slice(0, 100),
        salDocuments: state.salDocuments.slice(0, 200),
        tariffVoices: state.tariffVoices.slice(0, 5000),
      }),
      migrate(persisted: unknown, version: number) {
        if (version === 0 || version === 1) {
          const raw = persisted as {
            activeProjectId?: string;
            activeSalId?: string;
            projects?: unknown[];
            salDocuments?: unknown[];
          };
          return {
            activeProjectId: raw.activeProjectId ?? "",
            activeSalId: raw.activeSalId ?? "",
            projects: Array.isArray(raw.projects) ? raw.projects : [],
            salDocuments: Array.isArray(raw.salDocuments) ? raw.salDocuments : [],
            tariffVoices: [],
          };
        }
        if (version === 2) {
          const raw = persisted as {
            activeProjectId?: string;
            activeSalId?: string;
            projects?: unknown[];
            salDocuments?: unknown[];
          };
          return {
            activeProjectId: raw.activeProjectId ?? "",
            activeSalId: raw.activeSalId ?? "",
            projects: Array.isArray(raw.projects) ? raw.projects : [],
            salDocuments: Array.isArray(raw.salDocuments) ? raw.salDocuments : [],
            tariffVoices: [],
          };
        }
        return persisted as SalWorkflowStore;
      },
      storage: createJSONStorage(() => createSafeLocalStorage()),
    },
  ),
);
