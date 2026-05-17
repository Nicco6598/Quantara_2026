import { useEffect } from "react";
import { useUndoStore } from "@/store/undo-store";

export function useUndoKeyboardShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isTyping) return;

      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "z") {
        event.preventDefault();
        useUndoStore.getState().undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "z") {
        event.preventDefault();
        useUndoStore.getState().redo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
