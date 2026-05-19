import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveSalCreationDraft } from "../domain/sal-creation-draft";
import type { SalEconomicRules, SalLineDraft, SalTariffBookOption } from "../types";
import type { SalWorkflowPhase } from "../state/workflow";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

type UseSalDraftAutosaveArgs = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  materialUsage: Record<string, number>;
  phase: SalWorkflowPhase;
  projectId: string;
  salDate: string;
  salTitle: string;
  selectedTariffBooks: SalTariffBookOption[];
};

export function useSalDraftAutosave({
  economicRules,
  lines,
  materialUsage,
  phase,
  projectId,
  salDate,
  salTitle,
  selectedTariffBooks,
}: UseSalDraftAutosaveArgs) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasChangesRef = useRef(false);
  const didMountRef = useRef(false);

  const selectedTariffBookIds = useMemo(
    () => selectedTariffBooks.map((book) => book.id),
    [selectedTariffBooks],
  );

  const draftDataRef = useRef({
    economicRules,
    lines,
    materialUsage,
    phase,
    projectId,
    salDate,
    salTitle,
    selectedTariffBookIds,
  });

  useEffect(() => {
    draftDataRef.current = {
      economicRules,
      lines,
      materialUsage,
      phase,
      projectId,
      salDate,
      salTitle,
      selectedTariffBookIds,
    };
  }, [
    economicRules,
    lines,
    materialUsage,
    phase,
    projectId,
    salDate,
    salTitle,
    selectedTariffBookIds,
  ]);

  const persistDraftSilent = useCallback(() => {
    const draft = draftDataRef.current;
    if (!draft.projectId) return;
    setStatus("saving");
    try {
      saveSalCreationDraft(draft.projectId, {
        economicRules: draft.economicRules,
        lines: draft.lines,
        materialUsage: draft.materialUsage,
        phase: draft.phase,
        salDate: draft.salDate,
        salTitle: draft.salTitle,
        selectedTariffBookIds: draft.selectedTariffBookIds,
      });
      hasChangesRef.current = false;
      setLastSaved(new Date().toISOString());
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  const markChanged = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("unsaved");
    hasChangesRef.current = true;
    debounceRef.current = setTimeout(persistDraftSilent, 800);
  }, [persistDraftSilent]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: props trigger re-render, needed for change detection
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    markChanged();
  }, [
    economicRules,
    lines,
    materialUsage,
    phase,
    salDate,
    salTitle,
    selectedTariffBookIds,
    markChanged,
  ]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (hasChangesRef.current) persistDraftSilent();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [persistDraftSilent]);

  return {
    lastSaved,
    markChanged,
    persistDraftSilent,
    status,
  };
}
