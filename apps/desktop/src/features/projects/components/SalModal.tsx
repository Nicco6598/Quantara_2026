import { Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FilterSearch } from "@/components/filters";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { cn } from "@/lib/utils";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import type { RecentSalItem } from "../types";

type SalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (salId: string, lineId: string, quantity: number) => void;
  onUpdateSurcharge: (salId: string, lineId: string, surcharge: "day" | "night" | "none") => void;
  projectIndex: Map<string, { name: string; year: number; client: string }>;
  sals: RecentSalItem[];
};

export function SalModal({
  isOpen,
  onClose,
  onUpdateQuantity,
  onUpdateSurcharge,
  projectIndex,
  sals,
}: SalModalProps) {
  const deleteSal = useSalWorkflowStore((state) => state.deleteSal);
  const tariffVoices = useSalWorkflowStore((state) => state.tariffVoices);
  const { notify } = useToast();
  const [filter, setFilter] = useState<"all" | "draft" | "closed">("all");
  const [query, setQuery] = useState("");
  const [editingSal, setEditingSal] = useState<string | null>(null);
  const [deletingSal, setDeletingSal] = useState<string | null>(null);

  const filteredSals = useMemo(() => {
    return sals
      .filter((sal) => {
        if (filter !== "all" && sal.status !== filter) return false;
        if (query) {
          const project = projectIndex.get(sal.projectId);
          const searchText = `${sal.title} ${sal.description} ${project?.name ?? ""}`.toLowerCase();
          if (!searchText.includes(query.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.closedAt || a.date;
        const dateB = b.closedAt || b.date;
        return dateB.localeCompare(dateA);
      });
  }, [filter, query, projectIndex, sals]);

  const voiceIndex = useMemo(
    () => new Map(tariffVoices.map((voice) => [voice.id, voice])),
    [tariffVoices],
  );

  function handleDelete(salId: string) {
    deleteSal(salId);
    setDeletingSal(null);
    notify({
      message: "SAL eliminata",
      title: "Eliminazione completata",
      tone: "success",
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
      <button
        aria-label="Chiudi modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]">
        <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Registro SAL
              </div>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                Tutte le SAL
              </h3>
            </div>
            <button
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-3">
            <div className="flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-muted)]/45 p-1">
              {(["all", "draft", "closed"] as const).map((f) => (
                <button
                  key={f}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                  onClick={() => setFilter(f)}
                  type="button"
                >
                  {f === "all" ? "Tutte" : f === "draft" ? "Bozze" : "Chiuse"}
                </button>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <FilterSearch onChange={setQuery} placeholder="Cerca SAL..." value={query} />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-5">
            {filteredSals.length === 0 ? (
              <div className="py-8 text-center text-sm text-secondary">Nessuna SAL trovata</div>
            ) : (
              <div className="space-y-2">
                {filteredSals.map((sal) => {
                  const project = projectIndex.get(sal.projectId);
                  const isDeleting = deletingSal === sal.id;
                  const isEditing = editingSal === sal.id;

                  return (
                    <div
                      key={sal.id}
                      className={cn(
                        "rounded-[18px] border p-4 transition-colors",
                        isDeleting
                          ? "border-danger/25 bg-danger/10"
                          : "border-subtle bg-muted/35 hover:bg-muted",
                      )}
                    >
                      {isDeleting ? (
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-danger">
                              Eliminare questa SAL?
                            </div>
                            <div className="mt-1 text-xs text-secondary">
                              L&apos;azione e irreversibile.
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setDeletingSal(null)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Annulla
                            </Button>
                            <Button
                              className="border-danger/25 bg-danger text-white hover:bg-danger/90"
                              onClick={() => handleDelete(sal.id)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <Trash2 className="size-4" />
                              Elimina
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={sal.status === "closed" ? "success" : "warning"}>
                                  {sal.status === "closed" ? "Chiusa" : "Bozza"}
                                </Badge>
                                <span className="text-xs text-secondary">{sal.date}</span>
                              </div>
                              <div className="mt-2 text-sm font-semibold text-foreground">
                                {sal.title}
                              </div>
                              <div className="mt-1 text-xs text-secondary">
                                {project
                                  ? `${project.name} (${project.year}) · ${project.client || "N/A"}`
                                  : "Progetto non trovato"}
                              </div>
                              {sal.description && (
                                <div className="mt-2 text-xs text-secondary/80 line-clamp-2">
                                  {sal.description}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                className="flex size-8 items-center justify-center rounded-[12px] text-secondary hover:bg-muted hover:text-foreground"
                                onClick={() => setEditingSal(sal.id)}
                                title="Modifica"
                                type="button"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                className="flex size-8 items-center justify-center rounded-[12px] text-secondary hover:bg-muted hover:text-danger"
                                onClick={() => setDeletingSal(sal.id)}
                                title="Elimina"
                                type="button"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                          {isEditing || sal.status === "draft" ? (
                            <div className="mt-4 overflow-hidden rounded-[14px] border border-subtle bg-card">
                              {sal.lines.length > 0 ? (
                                sal.lines.map((line) => {
                                  const voice = voiceIndex.get(line.voiceId);

                                  return (
                                    <div
                                      className="grid gap-3 border-b border-subtle p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_150px]"
                                      key={line.id}
                                    >
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-foreground">
                                          {voice?.code ?? "Voce"}
                                        </div>
                                        <div className="mt-1 line-clamp-2 text-xs text-secondary">
                                          {voice?.description ?? "Voce tariffaria non trovata"}
                                        </div>
                                      </div>
                                      <input
                                        className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                                        min={0}
                                        onChange={(event) =>
                                          onUpdateQuantity(
                                            sal.id,
                                            line.id,
                                            Number(event.target.value),
                                          )
                                        }
                                        type="number"
                                        value={line.quantity}
                                      />
                                      <select
                                        className="h-10 rounded-[12px] border border-subtle bg-card px-3 text-sm"
                                        onChange={(event) =>
                                          onUpdateSurcharge(
                                            sal.id,
                                            line.id,
                                            event.target.value as "day" | "night" | "none",
                                          )
                                        }
                                        value={line.surcharge}
                                      >
                                        <option value="none">Nessuna</option>
                                        <option value="day">Diurna</option>
                                        <option value="night">Notturna</option>
                                      </select>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="p-3 text-xs text-secondary">
                                  Nessuna voce agganciata alla bozza.
                                </div>
                              )}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-subtle px-5 py-4">
            <div className="text-sm text-secondary">{filteredSals.length} SAL</div>
            <Button onClick={onClose} size="sm" type="button" variant="outline">
              Chiudi
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
