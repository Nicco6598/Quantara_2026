import {
  clearSalCreationDraft,
  clearSalCreationDraftBySalId,
  persistSalCreationLocalDraft,
  prepareEconomicRulesForDraftPersist,
} from "@/features/sal/domain/sal-creation-draft";
import type { SalWorkflowPhase } from "@/features/sal/state/workflow";
import type { SalDocument, SalLineDraft, SalProject, SalTariffVoice } from "@/features/sal/types";
import {
  deleteSalDocument,
  saveSalDocument,
  saveSalProject,
  toSalDocumentPayload,
  updateSalDocument,
} from "@/lib/sal-data";
import { syncSalWorkflowFromBackend } from "@/lib/sal-workflow-sync";
import { dispatchDataChanged } from "@/lib/sync-events";
import { type CreateSalInput, useSalWorkflowStore } from "@/store/sal-workflow-store";

export type SalDraftUpsertInput = {
  date: string;
  description: string;
  economicRules?: SalDocument["economicRules"];
  lines?: SalDocument["lines"];
  materialUsage?: SalDocument["materialUsage"];
  notes: string;
  projectId: string;
  status?: SalDocument["status"];
  title: string;
  total?: number;
  voices?: SalTariffVoice[];
};

type SalStoreCreateInput = {
  projectId: string;
  date: string;
  description: string;
  notes: string;
  title: string;
  closedAt?: string;
  economicRules?: SalDocument["economicRules"];
  lines?: SalDocument["lines"];
  materialUsage?: SalDocument["materialUsage"];
  status?: SalDocument["status"];
  total?: number;
  voices?: SalTariffVoice[];
};

function toSalStoreInput(input: SalDraftUpsertInput): SalStoreCreateInput {
  const payload: SalStoreCreateInput = {
    date: input.date,
    description: input.description,
    notes: input.notes,
    projectId: input.projectId,
    title: input.title,
  };
  if (input.economicRules !== undefined) payload.economicRules = input.economicRules;
  if (input.lines !== undefined) payload.lines = input.lines;
  if (input.materialUsage !== undefined) payload.materialUsage = input.materialUsage;
  if (input.status !== undefined) payload.status = input.status;
  if (input.total !== undefined) payload.total = input.total;
  if (input.voices !== undefined) payload.voices = input.voices;
  return payload;
}

export type ClearSalLocalDraftsMode = "project-only" | "all";

export function clearSalCreationLocalDrafts(
  projectId: string,
  salId?: string,
  mode: ClearSalLocalDraftsMode = "all",
): void {
  clearSalCreationDraft(projectId);
  if (salId && mode === "all") {
    clearSalCreationDraftBySalId(salId);
  }
}

export async function persistSalProjectMetadata(project: SalProject): Promise<void> {
  useSalWorkflowStore.getState().createProject(project);
  await saveSalProject(project);
}

export type UpsertSalDraftOptions = {
  /** Autosave keeps sal:{id} local backup; explicit save clears all local keys. */
  clearLocalDrafts?: ClearSalLocalDraftsMode;
  /** Full in-memory lines for sal:{id} backup (MG rows + rules). */
  localDraftLines?: SalLineDraft[];
  localDraftPhase?: SalWorkflowPhase;
  localDraftSalDate?: string;
  localDraftSalTitle?: string;
  selectedTariffBookIds?: string[];
};

/** SQLite + in-memory cache; optionally clears local draft keys after a successful write. */
export async function upsertSalDraftDocument(
  projectId: string,
  existingSalId: string | null,
  input: SalDraftUpsertInput,
  options?: UpsertSalDraftOptions,
): Promise<SalDocument> {
  const store = useSalWorkflowStore.getState();
  const storeInput = toSalStoreInput(input);
  const doc = existingSalId
    ? store.updateSalDraft(existingSalId, storeInput as Partial<CreateSalInput>)
    : store.createSal({
        ...storeInput,
        status: storeInput.status ?? "draft",
      } as CreateSalInput);

  if (!doc) {
    throw new Error(existingSalId ? "SAL draft not found" : "Unable to create SAL draft");
  }

  const snapshot = toSalDocumentPayload(doc, input.voices);
  if (existingSalId) {
    await updateSalDocument(doc.id, snapshot);
  } else {
    await saveSalDocument(projectId, snapshot);
  }

  clearSalCreationLocalDrafts(projectId, doc.id, options?.clearLocalDrafts ?? "project-only");

  if (
    options?.localDraftLines &&
    options.localDraftLines.length > 0 &&
    input.economicRules &&
    options.clearLocalDrafts !== "all"
  ) {
    persistSalCreationLocalDraft({
      projectId,
      salId: doc.id,
      draft: {
        economicRules: prepareEconomicRulesForDraftPersist(
          input.economicRules,
          options.localDraftLines,
        ),
        lines: options.localDraftLines,
        materialUsage: Object.fromEntries(
          (input.materialUsage ?? []).map((entry) => [entry.materialId, entry.quantity]),
        ),
        phase: options.localDraftPhase ?? "measure",
        salDate: options.localDraftSalDate ?? input.date,
        salTitle: options.localDraftSalTitle ?? input.title,
        selectedTariffBookIds: options.selectedTariffBookIds ?? [],
      },
    });
  }

  await syncSalWorkflowFromBackend(projectId);
  dispatchDataChanged();
  return doc;
}

export async function restoreSalDocument(doc: SalDocument): Promise<void> {
  useSalWorkflowStore.setState((state) => {
    const exists = state.salDocuments.some((item) => item.id === doc.id);
    return {
      salDocuments: exists
        ? state.salDocuments.map((item) => (item.id === doc.id ? doc : item))
        : [doc, ...state.salDocuments],
    };
  });
  await saveSalDocument(doc.projectId, doc);
  await syncSalWorkflowFromBackend(doc.projectId);
  dispatchDataChanged();
}

export async function removeSalDocument(salId: string, projectId: string): Promise<void> {
  useSalWorkflowStore.getState().deleteSal(salId);
  await deleteSalDocument(salId);
  clearSalCreationLocalDrafts(projectId, salId);
  await syncSalWorkflowFromBackend(projectId);
  dispatchDataChanged();
}
