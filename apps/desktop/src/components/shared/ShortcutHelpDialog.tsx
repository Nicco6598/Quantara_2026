import { Keyboard, X } from "lucide-react";
import { useEffect } from "react";
import { Dialog } from "@/components/shared/Dialog";

const shortcuts = [
  { keys: "Ctrl K", label: "Apri command palette" },
  { keys: "Ctrl N", label: "Crea un nuovo elemento nel contesto corrente" },
  { keys: "Ctrl /", label: "Mostra questa guida" },
  { keys: "Alt Sinistra", label: "Naviga indietro" },
  { keys: "Alt Destra", label: "Naviga avanti" },
  { keys: "Esc", label: "Chiudi palette, menu e modali" },
];

export function ShortcutHelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Dialog className="max-w-lg" contentClassName="p-5" isOpen onClose={onClose} zIndex={85}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
            <Keyboard className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Scorciatoie</h2>
            <p className="text-sm text-secondary">Comandi rapidi disponibili in Quantara.</p>
          </div>
        </div>
        <button
          aria-label="Chiudi"
          className="flex size-9 items-center justify-center rounded-xl text-secondary hover:bg-muted hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-5 space-y-2">
        {shortcuts.map((shortcut) => (
          <div
            className="flex items-center justify-between gap-4 rounded-xl border border-subtle bg-muted/35 px-3 py-2.5"
            key={shortcut.keys}
          >
            <span className="text-sm text-foreground">{shortcut.label}</span>
            <kbd className="shrink-0 rounded-10px border border-subtle bg-card px-2.5 py-1 text-xs font-semibold text-secondary">
              {shortcut.keys}
            </kbd>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
