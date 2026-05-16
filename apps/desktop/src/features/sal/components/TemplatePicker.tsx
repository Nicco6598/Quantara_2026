import { m } from "framer-motion";
import { BookOpen, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { SPRING_EASE } from "@/motion";
import { type SalTemplate, useTemplateStore } from "@/store/template-store";

type TemplatePickerProps = {
  onApply: (template: SalTemplate) => void;
  tariffBookId: string;
};

export function TemplatePicker({ onApply, tariffBookId }: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const templates = useTemplateStore((state) => state.templates);
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);

  const filtered = useMemo(
    () => templates.filter((t) => t.tariffBookId === tariffBookId),
    [templates, tariffBookId],
  );

  const handleApply = useCallback(
    (template: SalTemplate) => {
      onApply(template);
      setIsOpen(false);
    },
    [onApply],
  );

  if (filtered.length === 0) return null;

  return (
    <div className="relative">
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 text-11px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <BookOpen className="size-3.5" />
        Template ({filtered.length})
      </button>

      {isOpen && (
        <>
          <button
            aria-label="Chiudi"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <m.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-18px bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]"
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: SPRING_EASE }}
          >
            {filtered.map((template) => (
              <div
                className="group flex items-center gap-2 rounded-14px px-3 py-2.5 transition-colors hover:bg-[var(--bg-muted)]"
                key={template.id}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleApply(template)}
                  type="button"
                >
                  <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                    {template.name}
                  </div>
                  <div className="mt-0.5 text-11px text-[var(--text-secondary)]">
                    {template.voiceEntries.length} voci · ribasso dal contratto
                  </div>
                </button>
                <button
                  aria-label={`Elimina template ${template.name}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(template.id);
                  }}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </m.div>
        </>
      )}
    </div>
  );
}
