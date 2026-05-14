import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import type { TemplateVoiceEntry } from "@/store/template-store";

import { useTemplateStore } from "@/store/template-store";

import type { SalEconomicRules } from "../types";

type SaveAsTemplateDialogProps = {
  onClose: () => void;
  voiceEntries: TemplateVoiceEntry[];
  economicRules: SalEconomicRules;
  tariffBookId: string;
};

export function SaveAsTemplateDialog({
  onClose,
  voiceEntries,
  economicRules,
  tariffBookId,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const saveTemplate = useTemplateStore((state) => state.saveTemplate);

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    saveTemplate(trimmed, voiceEntries, economicRules, tariffBookId);
    setSaved(true);
    setTimeout(onClose, 800);
  }

  return (
    <Dialog isOpen onClose={onClose} zIndex={75}>
      {saved ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-base)]">
            <Save className="size-6" />
          </span>
          <p className="text-15px font-semibold text-[var(--text-primary)]">Template salvato</p>
        </div>
      ) : (
        <>
          <h3 className="text-15px font-semibold text-[var(--text-primary)]">
            Salva come template
          </h3>
          <p className="mt-2 text-13px text-[var(--text-secondary)]">
            Salva le voci e le regole economiche correnti come template per utilizzarle in futuro.
          </p>
          <div className="mt-4">
            <label
              className="text-11px font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
              htmlFor="template-name"
            >
              Nome template
            </label>
            <input
              className="mt-1 h-10 w-full rounded-10px border border-[var(--border-subtle)] bg-[var(--bg-muted)]/50 px-3 text-14px font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
              id="template-name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="es. SAL standard ponte"
              value={name}
            />
          </div>
          <div className="mt-2 text-12px text-[var(--text-secondary)]">
            {voiceEntries.length} voci · fattori e maggiorazioni
          </div>
          <DialogActions>
            <Button onClick={onClose} variant="outline">
              Annulla
            </Button>
            <Button
              disabled={name.trim().length < 2}
              icon={Save}
              onClick={handleSave}
              variant="primary"
            >
              Salva
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
