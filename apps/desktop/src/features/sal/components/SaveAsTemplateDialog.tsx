import { motion } from "framer-motion";
import { SOFT_EASE } from "@/components/shared/easings";
import { Save, X } from "lucide-react";
import { useState } from "react";
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
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-sm overflow-hidden rounded-[24px] bg-[var(--surface-base)] p-5 shadow-[0_18px_48px_-12px_rgba(0,0,0,0.2)] ring-1 ring-[var(--border-subtle)]"
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ duration: 0.35, ease: SOFT_EASE }}
      >
        {saved ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-base)]">
              <Save className="size-6" />
            </span>
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">Template salvato</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Salva come template
              </h3>
              <button
                aria-label="Chiudi"
                className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                onClick={onClose}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              Salva le voci e le regole economiche correnti come template per utilizzarle in futuro.
            </p>
            <div className="mt-4">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
                htmlFor="template-name"
              >
                Nome template
              </label>
              <input
                className="mt-1 h-10 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-muted)]/50 px-3 text-[14px] font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                id="template-name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder="es. SAL standard ponte"
                value={name}
              />
            </div>
            <div className="mt-2 text-[12px] text-[var(--text-secondary)]">
              {voiceEntries.length} voci · fattori e maggiorazioni
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)]"
                onClick={onClose}
                type="button"
              >
                Annulla
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-primary)]/90 disabled:opacity-50"
                disabled={name.trim().length < 2}
                onClick={handleSave}
                type="button"
              >
                <Save className="size-4" />
                Salva
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
