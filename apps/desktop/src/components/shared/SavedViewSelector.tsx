import { Bookmark, BookmarkCheck, X } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";

/* ── Simple reactive store (no Zustand) ── */

type SavedView = {
  createdAt: string;
  filters: Record<string, string>;
  id: string;
  name: string;
  route: string;
};

let viewsCache: SavedView[] = [];
const viewListeners = new Set<() => void>();

function subscribeViews(cb: () => void) {
  viewListeners.add(cb);
  return () => viewListeners.delete(cb);
}

function getViews() {
  return viewsCache;
}

function emitChange() {
  viewListeners.forEach((l) => {
    l();
  });
}

function saveViewFn(name: string, route: string, filters: Record<string, string>) {
  const id = `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  viewsCache = [
    { createdAt: new Date().toISOString(), filters, id, name, route },
    ...viewsCache,
  ].slice(0, 30);
  emitChange();
}

function deleteViewFn(id: string) {
  viewsCache = viewsCache.filter((v) => v.id !== id);
  emitChange();
}

/* ── Component ── */

type SavedViewSelectorProps = {
  currentFilters: Record<string, string>;
  onApplyFilters: (filters: Record<string, string>) => void;
  route: string;
};

export function SavedViewSelector({
  currentFilters,
  onApplyFilters,
  route,
}: SavedViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState("");

  const allViews = useSyncExternalStore(subscribeViews, getViews);
  const views = allViews.filter((v) => v.route === route);

  const handleSave = useCallback(() => {
    const trimmed = viewName.trim();
    if (trimmed.length < 2) return;
    saveViewFn(trimmed, route, currentFilters);
    setViewName("");
    setIsSaving(false);
  }, [viewName, route, currentFilters]);

  return (
    <div className="relative">
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--info-soft)] px-4 text-12px font-semibold text-[var(--info-base)] ring-1 ring-[var(--info-base)]/25 transition-colors hover:bg-[var(--info-soft)]/80 hover:ring-[var(--info-base)]/40"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <Bookmark className="size-4" />
        Viste salvate ({views.length})
      </button>

      {isOpen && (
        <>
          <button
            aria-label="Chiudi"
            className="fixed inset-0 z-[var(--z-dropdown-menu)] cursor-default"
            onClick={() => {
              setIsOpen(false);
              setIsSaving(false);
            }}
            type="button"
          />
          <div className="absolute right-0 top-full z-[var(--z-dropdown-menu)] mt-2 w-72 overflow-hidden rounded-18px bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-12px font-semibold text-[var(--text-primary)]">
                Viste salvate
              </span>
              <button
                aria-label="Chiudi"
                className="flex size-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                onClick={() => {
                  setIsOpen(false);
                  setIsSaving(false);
                }}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {isSaving ? (
              <div className="px-3 pb-3">
                <input
                  className="mt-1 h-9 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)]/50 px-3 text-13px font-medium outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  placeholder="Nome vista"
                  value={viewName}
                />
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    className="inline-flex h-8 items-center rounded-full bg-[var(--bg-muted)] px-3 text-11px font-semibold text-[var(--text-secondary)]"
                    onClick={() => setIsSaving(false)}
                    type="button"
                  >
                    Annulla
                  </button>
                  <button
                    className="inline-flex h-8 items-center rounded-full bg-[var(--accent-primary)] px-3 text-11px font-bold text-[var(--text-inverse)] disabled:opacity-50"
                    disabled={viewName.trim().length < 2}
                    onClick={handleSave}
                    type="button"
                  >
                    <BookmarkCheck className="size-3.5" />
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-[260px] overflow-y-auto">
                  {views.length === 0 ? (
                    <div className="px-3 py-6 text-center text-12px text-[var(--text-secondary)]">
                      Nessuna vista salvata.
                    </div>
                  ) : (
                    views.map((view) => (
                      <div
                        className="group flex items-center gap-2 rounded-14px px-3 py-2.5 transition-colors hover:bg-[var(--bg-muted)]"
                        key={view.id}
                      >
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            onApplyFilters(view.filters);
                            setIsOpen(false);
                          }}
                          type="button"
                        >
                          <div className="truncate text-13px font-semibold text-[var(--text-primary)]">
                            {view.name}
                          </div>
                          <div className="mt-0.5 truncate text-11px text-[var(--text-secondary)]">
                            {Object.entries(view.filters)
                              .flatMap(([k, v]) =>
                                v && v !== "all" && v !== "Tutti" ? [`${k}: ${v}`] : [],
                              )
                              .join(" · ") || "nessun filtro"}
                          </div>
                        </button>
                        <button
                          aria-label={`Elimina ${view.name}`}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
                          onClick={() => deleteViewFn(view.id)}
                          type="button"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-[var(--border-subtle)]/50 px-3 py-2">
                  <button
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-12px font-semibold text-[var(--info-base)] transition-colors hover:bg-[var(--info-soft)]/30"
                    onClick={() => setIsSaving(true)}
                    type="button"
                  >
                    <Bookmark className="size-3.5" />
                    Salva vista corrente
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
