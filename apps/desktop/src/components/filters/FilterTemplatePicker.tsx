import { m } from "framer-motion";
import { BookmarkPlus, ChevronDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MOTION_VARIANTS } from "@/motion";
import { cn } from "@/lib/utils";
import {
  type FilterTemplateScope,
  useFilterTemplatesStore,
} from "@/store/filter-templates-store";

type QuickTemplate = {
  label: string;
  filters: Record<string, unknown>;
};

const QUICK_TEMPLATES: Record<FilterTemplateScope, QuickTemplate[]> = {
  accounting: [
    { label: "SAL in bozza", filters: { filterStatus: "Bozza" } },
    {
      label: "Ultimi 30 giorni",
      filters: {
        dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
      },
    },
    { label: "Per progetto corrente", filters: { filterProject: "all" } },
  ],
  materials: [
    { label: "Materiali critici", filters: {} },
    { label: "Senza scorte", filters: {} },
    { label: "Categoria corrente", filters: {} },
  ],
  sal: [],
};

type FilterTemplatePickerProps = {
  scope: FilterTemplateScope;
  currentFilters: Record<string, unknown>;
  onApplyFilters: (filters: Record<string, unknown>) => void;
  onQuickApply?: (quickFilters: Record<string, unknown>) => void;
};

export function FilterTemplatePicker({
  scope,
  currentFilters,
  onApplyFilters,
  onQuickApply,
}: FilterTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const allTemplates = useFilterTemplatesStore((s) => s.templates);
  const templates = useMemo(() => allTemplates.filter((t) => t.scope === scope), [allTemplates, scope]);
  const saveTemplate = useFilterTemplatesStore((s) => s.saveTemplate);
  const deleteTemplate = useFilterTemplatesStore((s) => s.deleteTemplate);
  const applyTemplate = useFilterTemplatesStore((s) => s.applyTemplate);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSaving(false);
        setDeleteConfirmId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = templateName.trim();
    if (trimmed.length < 2) return;
    saveTemplate(trimmed, scope, currentFilters);
    setTemplateName("");
    setIsSaving(false);
  }, [templateName, scope, currentFilters, saveTemplate]);

  const handleApply = useCallback(
    (id: string) => {
      const tpl = applyTemplate(id);
      if (tpl) {
        onApplyFilters(tpl.filters);
        setIsOpen(false);
      }
    },
    [applyTemplate, onApplyFilters],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (deleteConfirmId === id) {
        deleteTemplate(id);
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(id);
      }
    },
    [deleteConfirmId, deleteTemplate],
  );

  const handleQuickApply = useCallback(
    (filters: Record<string, unknown>) => {
      if (onQuickApply) {
        onQuickApply(filters);
      } else {
        onApplyFilters(filters);
      }
      setIsOpen(false);
    },
    [onQuickApply, onApplyFilters],
  );

  const quickTemplates = QUICK_TEMPLATES[scope] ?? [];
  const hasTemplates = templates.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--info-soft)] px-4 text-12px font-semibold text-[var(--info-base)] ring-1 ring-[var(--info-base)]/25 transition-colors hover:bg-[var(--info-soft)]/80 hover:ring-[var(--info-base)]/40"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsSaving(false);
          setDeleteConfirmId(null);
        }}
        type="button"
      >
        <BookmarkPlus className="size-4" />
        <span>Template</span>
        {templates.length > 0 && (
          <span className="text-11px font-medium opacity-70">({templates.length})</span>
        )}
        <ChevronDown
          className={cn("size-3 shrink-0 opacity-60 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <>
          <button
            aria-label="Chiudi"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => {
              setIsOpen(false);
              setIsSaving(false);
              setDeleteConfirmId(null);
            }}
            type="button"
          />
          <m.div
            className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-18px bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]"
            initial={MOTION_VARIANTS.popover.initial}
            animate={MOTION_VARIANTS.popover.animate}
            exit={MOTION_VARIANTS.popover.exit}
            transition={MOTION_VARIANTS.popover.transition}
          >
            {isSaving ? (
              <div className="px-3 pb-3 pt-2">
                <span className="text-12px font-semibold text-[var(--text-primary)]">
                  Salva template
                </span>
                <input
                  className="mt-2 h-9 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)]/50 px-3 text-13px font-medium outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  placeholder="Nome template"
                  value={templateName}
                  autoFocus
                />
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    className="inline-flex h-8 items-center rounded-full bg-[var(--bg-muted)] px-3 text-11px font-semibold text-[var(--text-secondary)]"
                    onClick={() => {
                      setIsSaving(false);
                      setTemplateName("");
                    }}
                    type="button"
                  >
                    Annulla
                  </button>
                  <button
                    className="inline-flex h-8 items-center rounded-full bg-[var(--accent-primary)] px-3 text-11px font-bold text-[var(--text-inverse)] disabled:opacity-50"
                    disabled={templateName.trim().length < 2}
                    onClick={handleSave}
                    type="button"
                  >
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!hasTemplates && quickTemplates.length > 0 && (
                  <div className="px-3 pb-2 pt-2">
                    <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                      Template rapidi
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {quickTemplates.map((qt) => (
                        <button
                          key={qt.label}
                          className="rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-11px font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
                          onClick={() => handleQuickApply(qt.filters)}
                          type="button"
                        >
                          {qt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-[var(--border-subtle)]/50 pt-2">
                      <button
                        className="flex w-full items-center gap-2 rounded-lg p-2 text-12px font-semibold text-[var(--info-base)] transition-colors hover:bg-[var(--info-soft)]/30"
                        onClick={() => setIsSaving(true)}
                        type="button"
                      >
                        <BookmarkPlus className="size-3.5" />
                        Salva filtro corrente
                      </button>
                    </div>
                  </div>
                )}

                {hasTemplates && (
                  <>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-12px font-semibold text-[var(--text-primary)]">
                        Template salvati
                      </span>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      {templates.map((tpl) => {
                        const isPendingDelete = deleteConfirmId === tpl.id;
                        return (
                          <div
                            key={tpl.id}
                            className={cn(
                              "group flex items-center gap-2 rounded-14px px-3 py-2.5 transition-colors",
                              isPendingDelete
                                ? "bg-[var(--danger-soft)]"
                                : "hover:bg-[var(--bg-muted)]",
                            )}
                          >
                            <button
                              className="min-w-0 flex-1 text-left"
                              onClick={() => handleApply(tpl.id)}
                              type="button"
                            >
                              <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                                {tpl.name}
                              </div>
                              <div className="mt-0.5 truncate text-11px text-[var(--text-secondary)]">
                                {Object.entries(tpl.filters)
                                  .flatMap(([k, v]) =>
                                    v && v !== "all" && v !== "Tutti" && v !== ""
                                      ? [`${k}: ${String(v)}`]
                                      : [],
                                  )
                                  .join(" · ") || "nessun filtro"}
                              </div>
                            </button>
                            <button
                              aria-label={
                                isPendingDelete
                                  ? "Conferma eliminazione"
                                  : `Elimina ${tpl.name}`
                              }
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                                isPendingDelete
                                  ? "bg-[var(--danger-base)] text-[var(--text-inverse)]"
                                  : "text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]",
                              )}
                              onClick={() => handleDelete(tpl.id)}
                              type="button"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-[var(--border-subtle)]/50 px-3 py-2">
                      <button
                        className="flex w-full items-center gap-2 rounded-lg p-2 text-12px font-semibold text-[var(--info-base)] transition-colors hover:bg-[var(--info-soft)]/30"
                        onClick={() => setIsSaving(true)}
                        type="button"
                      >
                        <BookmarkPlus className="size-3.5" />
                        Salva filtro corrente
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </m.div>
        </>
      )}
    </div>
  );
}
