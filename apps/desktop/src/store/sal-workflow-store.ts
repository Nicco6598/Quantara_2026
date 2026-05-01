import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateSalTitle } from "@/features/sal/domain/sal-utils";
import {
  createId,
  type SalDocument,
  type SalLine,
  type SalProject,
  type SalSurchargeKind,
  type SalTariffVoice,
} from "@/features/sal/domain/sal-workflow";

type CreateProjectInput = Omit<SalProject, "id">;
type CreateTariffVoiceInput = Omit<SalTariffVoice, "id">;
type CreateSalInput = Pick<SalDocument, "date" | "description" | "notes" | "projectId" | "title">;
type CreateDraftSalWithLinesInput = CreateSalInput & {
  voices: SalTariffVoice[];
};
type CloseNewSalInput = CreateSalInput & {
  lines: SalLine[];
  total?: number;
  voices?: SalTariffVoice[];
};

type SalWorkflowStore = {
  activeProjectId: string;
  activeSalId: string;
  addLineToSal: (salId: string, voiceId: string) => void;
  closeSal: (salId: string) => void;
  createProject: (input: CreateProjectInput) => SalProject;
  createProjectWithId: (input: SalProject) => SalProject;
  createClosedSal: (input: CloseNewSalInput) => SalDocument;
  createSal: (input: CreateSalInput) => SalDocument;
  createSalDraftWithLines: (input: CreateDraftSalWithLinesInput) => SalDocument;
  createTariffVoice: (input: CreateTariffVoiceInput) => SalTariffVoice;
  deleteLineFromSal: (salId: string, lineId: string) => void;
  deleteSal: (salId: string) => void;
  projects: SalProject[];
  salDocuments: SalDocument[];
  setActiveProject: (projectId: string) => void;
  setActiveSal: (salId: string) => void;
  tariffVoices: SalTariffVoice[];
  updateLineQuantity: (salId: string, lineId: string, quantity: number) => void;
  updateLineSurcharge: (salId: string, lineId: string, surcharge: SalSurchargeKind) => void;
};

export const useSalWorkflowStore = create<SalWorkflowStore>()(
  persist(
    (set, get) => ({
      activeProjectId: "",
      activeSalId: "",
      addLineToSal: (salId, voiceId) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) => {
            if (sal.id !== salId || sal.status === "closed") {
              return sal;
            }

            const alreadyAdded = sal.lines.some((line) => line.voiceId === voiceId);

            if (alreadyAdded) {
              return sal;
            }

            const line: SalLine = {
              id: createId("sal_line"),
              quantity: 0,
              surcharge: "none",
              voiceId,
            };

            return {
              ...sal,
              lines: [...sal.lines, line],
            };
          }),
        })),
      closeSal: (salId) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId
              ? {
                  ...sal,
                  closedAt: new Date().toISOString().slice(0, 10),
                  status: "closed",
                }
              : sal,
          ),
        })),
      createProject: (input) => {
        const project: SalProject = {
          ...input,
          id: createId("project"),
        };

        set((state) => ({
          activeProjectId: project.id,
          projects: [project, ...state.projects],
        }));

        return project;
      },
      createProjectWithId: (input) => {
        const existing = get().projects.find((project) => project.id === input.id);

        if (existing) {
          return existing;
        }

        set((state) => ({
          activeProjectId: input.id,
          projects: [input, ...state.projects],
        }));

        return input;
      },
      createClosedSal: (input) => {
        const currentCount = get().salDocuments.filter(
          (sal) => sal.projectId === input.projectId,
        ).length;
        const existingVoiceIds = new Set(get().tariffVoices.map((voice) => voice.id));
        const voicesToAdd = (input.voices ?? []).filter((voice) => !existingVoiceIds.has(voice.id));
        const sal: SalDocument = {
          date: input.date,
          description: input.description,
          id: createId("sal"),
          lines: input.lines,
          notes: input.notes,
          projectId: input.projectId,
          status: "closed",
          title: generateSalTitle(input.title, currentCount),
          closedAt: new Date().toISOString().slice(0, 10),
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
      createSal: (input) => {
        const currentCount = get().salDocuments.filter(
          (sal) => sal.projectId === input.projectId,
        ).length;
        const sal: SalDocument = {
          ...input,
          id: createId("sal"),
          lines: [],
          status: "draft",
          title: generateSalTitle(input.title, currentCount),
        };

        set((state) => ({
          activeProjectId: sal.projectId,
          activeSalId: sal.id,
          salDocuments: [sal, ...state.salDocuments],
        }));

        return sal;
      },
      createSalDraftWithLines: (input) => {
        const currentCount = get().salDocuments.filter(
          (sal) => sal.projectId === input.projectId,
        ).length;
        const existingVoiceIds = new Set(get().tariffVoices.map((voice) => voice.id));
        const voicesToAdd = input.voices.filter((voice) => !existingVoiceIds.has(voice.id));
        const sal: SalDocument = {
          date: input.date,
          description: input.description,
          id: createId("sal"),
          lines: input.voices.map((voice) => ({
            id: createId("sal_line"),
            quantity: 0,
            surcharge: "none",
            voiceId: voice.id,
          })),
          notes: input.notes,
          projectId: input.projectId,
          status: "draft",
          title: generateSalTitle(input.title, currentCount),
        };

        set((state) => ({
          activeProjectId: sal.projectId,
          activeSalId: sal.id,
          salDocuments: [sal, ...state.salDocuments],
          tariffVoices: [...voicesToAdd, ...state.tariffVoices],
        }));

        return sal;
      },
      createTariffVoice: (input) => {
        const voice: SalTariffVoice = {
          ...input,
          id: createId("voice"),
        };

        set((state) => ({
          tariffVoices: [voice, ...state.tariffVoices],
        }));

        return voice;
      },
      deleteLineFromSal: (salId, lineId) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId && sal.status !== "closed"
              ? {
                  ...sal,
                  lines: sal.lines.filter((line) => line.id !== lineId),
                }
              : sal,
          ),
        })),
      deleteSal: (salId) =>
        set((state) => ({
          salDocuments: state.salDocuments.filter((sal) => sal.id !== salId),
          activeSalId: state.activeSalId === salId ? "" : state.activeSalId,
        })),
      projects: [],
      salDocuments: [],
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
      tariffVoices: [],
      updateLineQuantity: (salId, lineId, quantity) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId && sal.status !== "closed"
              ? {
                  ...sal,
                  lines: sal.lines.map((line) =>
                    line.id === lineId ? { ...line, quantity: Math.max(0, quantity) } : line,
                  ),
                }
              : sal,
          ),
        })),
      updateLineSurcharge: (salId, lineId, surcharge) =>
        set((state) => ({
          salDocuments: state.salDocuments.map((sal) =>
            sal.id === salId && sal.status !== "closed"
              ? {
                  ...sal,
                  lines: sal.lines.map((line) =>
                    line.id === lineId ? { ...line, surcharge } : line,
                  ),
                }
              : sal,
          ),
        })),
    }),
    {
      name: "quantara-sal-workflow",
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        activeSalId: state.activeSalId,
        projects: state.projects,
        salDocuments: state.salDocuments,
        tariffVoices: state.tariffVoices,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
