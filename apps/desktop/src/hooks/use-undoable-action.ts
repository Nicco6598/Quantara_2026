import { useCallback } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import { useUndoStore } from "@/store/undo-store";

type UseUndoableActionInput = {
  label: string;
  execute: () => void;
  undo: () => void;
};

export function useUndoableAction({ label, execute, undo }: UseUndoableActionInput) {
  const { notify } = useToast();

  return useCallback(() => {
    execute();
    useUndoStore.getState().push({
      label,
      execute,
      undo,
    });
    notify({
      actionLabel: "Annulla",
      message: label,
      onAction: () => {
        undo();
        notify({
          message: "Azione annullata",
          title: "Annullato",
          tone: "info",
        });
      },
      title: "Completato",
      tone: "success",
    });
  }, [execute, undo, label, notify]);
}
