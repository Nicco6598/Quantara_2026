import { useCallback, useRef } from "react";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import { persistSalCreationLocalDraft, type StoredSalDraft } from "../domain/sal-creation-draft";
import type { SalWorkflowPhase } from "../state/workflow";
import type { SalEconomicRules, SalLineDraft } from "../types";

export type SalDraftAutosaveSnapshot = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  materialUsage: Record<string, number>;
  phase: SalWorkflowPhase;
  projectId: string;
  salDate: string;
  salDraftId: string | null;
  salTitle: string;
  selectedTariffBookIds: string[];
};

type UseSalDraftAutosaveArgs = {
  enabled?: boolean;
  getSnapshot: () => SalDraftAutosaveSnapshot;
  onBackendAutosave?: () => Promise<void>;
};

export function useSalDraftAutosave({
  enabled = true,
  getSnapshot,
  onBackendAutosave,
}: UseSalDraftAutosaveArgs) {
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  const draftSnapshot = getSnapshotRef.current();

  const toStoredDraft = useCallback((snapshot: SalDraftAutosaveSnapshot): StoredSalDraft => {
    return {
      economicRules: snapshot.economicRules,
      lines: snapshot.lines,
      materialUsage: snapshot.materialUsage,
      phase: snapshot.phase,
      salDate: snapshot.salDate,
      salTitle: snapshot.salTitle,
      selectedTariffBookIds: snapshot.selectedTariffBookIds,
    };
  }, []);

  const persistLocalDraft = useCallback(
    (snapshot?: SalDraftAutosaveSnapshot) => {
      const current = snapshot ?? getSnapshotRef.current();
      if (!current.projectId) return;
      persistSalCreationLocalDraft({
        draft: toStoredDraft(current),
        projectId: current.projectId,
        salId: current.salDraftId,
      });
    },
    [toStoredDraft],
  );

  const onPersist = useCallback(async () => {
    const current = getSnapshotRef.current();
    if (!current.projectId) return;

    persistLocalDraft(current);

    if (current.salDraftId && onBackendAutosave) {
      await onBackendAutosave();
    }
  }, [onBackendAutosave, persistLocalDraft]);

  const { lastSaved, persistNow, status } = useDraftAutosave({
    data: draftSnapshot,
    debounceMs: 800,
    enabled: enabled && Boolean(draftSnapshot.projectId),
    flushOnUnmount: true,
    intervalMs: 30000,
    onPersist,
  });

  const flushDraft = useCallback(async () => {
    await persistNow({ force: true });
  }, [persistNow]);

  /** Persist immediately with an explicit snapshot (avoids React state timing). */
  const flushDraftSnapshot = useCallback(
    async (snapshot: SalDraftAutosaveSnapshot) => {
      persistLocalDraft(snapshot);
      if (snapshot.salDraftId && onBackendAutosave) {
        await onBackendAutosave();
      }
    },
    [onBackendAutosave, persistLocalDraft],
  );

  return {
    flushDraft,
    flushDraftSnapshot,
    lastSaved,
    markChanged: persistNow,
    persistDraftSilent: persistNow,
    persistLocalDraft,
    status,
  };
}
