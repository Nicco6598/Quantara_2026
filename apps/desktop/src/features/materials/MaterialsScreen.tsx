import { m } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Download,
  MoreVertical,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch, FilterTemplatePicker } from "@/components/filters";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { MOTION_VARIANTS } from "@/motion";
import { FilterChip } from "@/components/shared/FilterChip";
import { MetricCard } from "@/components/shared/MetricCard";
import { MultiSelectBulkBar, MultiSelectToggle } from "@/components/shared/MultiSelectControls";
import { QuickAction } from "@/components/shared/QuickAction";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { SeverityBar } from "@/components/shared/SeverityBar";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import { useMultiSelect } from "@/hooks/use-multi-select";
import { StatusPill } from "@/components/shared/StatusPill";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface } from "@/components/shared/ui-primitives";
import {
  type DesktopMaterial,
  createDesktopMaterial,
  deleteDesktopMaterial,
  listDesktopMaterials,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { useUndoStore } from "@/store/undo-store";
import { AddMaterialModal } from "./components/AddMaterialModal";
import {
  CATEGORIES,
  type CategoryTone,
  type StockTone,
  categoryColorMap,
  categoryToneLabel,
  formatQuantity,
  screenReducer,
  toneForQuantity,
} from "./materials-screen-state";

export function MaterialsScreen() {
  const { notify } = useToast();
  const [materials, setMaterials] = useState<DesktopMaterial[]>([]);
  const [state, dispatch] = useReducer(screenReducer, {
    searchQuery: "",
    selectedCategory: null,
    selectedMaterialId: null,
    isCreateModalOpen: false,
    deleteConfirmId: null,
  });

  const loadMaterials = useCallback(() => {
    let active = true;
    const fbPromise: Promise<DesktopMaterial[]> = import.meta.env.DEV
      ? import("@/features/materials/materials-data").then((m) => m.fallbackMaterials)
      : Promise.resolve([]);
    fbPromise.then((fb) => {
      if (!active) return;
      listDesktopMaterials(fb).then((result) => {
        if (!active) return;
        setMaterials(result.data);
      });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadMaterials();
    return cleanup;
  }, [loadMaterials]);

  useDataChangedListener(loadMaterials);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === state.selectedMaterialId) ?? null,
    [materials, state.selectedMaterialId],
  );

  const categories = useMemo(() => {
    const categoryCounts = new Map<string, number>();

    for (const material of materials) {
      categoryCounts.set(material.category, (categoryCounts.get(material.category) ?? 0) + 1);
    }

    return {
      counts: categoryCounts,
      names: ["Tutti", ...categoryCounts.keys()],
    };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const q = state.searchQuery.toLowerCase().trim();
    return materials.filter((m) => {
      const matchesSearch =
        !q ||
        m.code.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      const matchesCategory = !state.selectedCategory || m.category === state.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, state.searchQuery, state.selectedCategory]);

  const metrics = useMemo(() => {
    const totalStock = materials.reduce((s, m) => s + m.quantity, 0);
    const critical = materials.filter((m) => m.quantity < m.minQuantity).length;
    const zero = materials.filter((m) => m.quantity === 0).length;
    const committed = materials.reduce((s, m) => {
      const info = getMaterialUsageInfo(m.id);
      return s + info.inDraft + info.inConfirmed;
    }, 0);
    const avgCoverage =
      materials.length > 0
        ? Math.round(
            materials.reduce(
              (s, m) =>
                s + (m.minQuantity > 0 ? Math.min(100, (m.quantity / m.minQuantity) * 100) : 100),
              0,
            ) / materials.length,
          )
        : 0;
    return { totalStock, critical, zero, committed, avgCoverage };
  }, [materials]);

  const applyTemplateFilters = useCallback(
    (filters: Record<string, unknown>) => {
      if (typeof filters.selectedCategory === "string" || filters.selectedCategory === null) {
        dispatch({ type: "SET_SELECTED_CATEGORY", payload: filters.selectedCategory as string | null });
      }
      if (typeof filters.searchQuery === "string") {
        dispatch({ type: "SET_SEARCH_QUERY", payload: filters.searchQuery });
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (materialId: string) => {
      try {
        const mat = materials.find((m) => m.id === materialId);
        await deleteDesktopMaterial(materialId);
        dispatchDataChanged();
        if (state.selectedMaterialId === materialId) {
          dispatch({ type: "SET_SELECTED_MATERIAL_ID", payload: null });
        }
        notify({
          message: `${mat?.description ?? "Materiale"} eliminato.`,
          title: "Eliminato",
          tone: "success",
        });
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Eliminazione non riuscita",
          tone: "danger",
        });
      } finally {
        dispatch({ type: "SET_DELETE_CONFIRM_ID", payload: null });
      }
    },
    [materials, notify, state.selectedMaterialId],
  );

  const multiSelect = useMultiSelect(filteredMaterials);

  const handleCardClick = useCallback(
    (id: string) => {
      if (multiSelect.isEnabled) {
        multiSelect.toggle(id);
      } else {
        dispatch({ type: "SET_SELECTED_MATERIAL_ID", payload: id });
      }
    },
    [multiSelect.isEnabled, multiSelect.toggle],
  );

  return (
    <ScreenLayout gradient="success-info">
      <ScreenHero
        badge="Supply control"
        title="Materiali e coperture"
        description={`${materials.length} materiali registrati. Gestisci stock, impegni e soglie minime.`}
        sidePanel={
          <SidebarCategories
            categories={categories}
            materialsCount={materials.length}
            selectedCategory={state.selectedCategory}
            onSelectCategory={(cat) => dispatch({ type: "SET_SELECTED_CATEGORY", payload: cat })}
          />
        }
      >
        <MetricsGrid metrics={metrics} />
      </ScreenHero>

      <section className="mt-8 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Panel>
            <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
              Azioni rapide
            </span>
            <div className="mt-4 space-y-3">
              <QuickAction
                detail="Aggiungi un nuovo materiale al catalogo"
                icon={PackagePlus}
                label="Carica materiale"
                onClick={() => dispatch({ type: "SET_CREATE_MODAL", payload: true })}
                tone="info"
              />
              <QuickAction
                detail="Crea un ordine per i materiali selezionati"
                icon={ShoppingCart}
                label="Crea ordine"
                onClick={() =>
                  notify({
                    message: "La creazione ordini sarà disponibile in un prossimo aggiornamento.",
                    title: "In arrivo",
                    tone: "info",
                  })
                }
                tone="success"
              />
              <QuickAction
                detail={`${String(metrics.critical)} materiali sotto soglia minima`}
                icon={AlertTriangle}
                label="Revisiona critici"
                onClick={() => dispatch({ type: "SET_SELECTED_CATEGORY", payload: null })}
                tone="warning"
              />
            </div>
          </Panel>

          {selectedMaterial ? (
            <MaterialDetail material={selectedMaterial} />
          ) : (
            <Panel>
              <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
                Dettaglio materiale
              </span>
              <div className="mt-6 text-center text-13px font-medium text-[var(--text-secondary)]">
                Seleziona un materiale per vedere dettagli e movimenti
              </div>
            </Panel>
          )}
        </aside>

        <Panel className="min-w-0 overflow-visible p-0">
          <CategoryFilterBar
            categoryNames={CATEGORIES}
            categoryCounts={categories.counts}
            materialsCount={materials.length}
            selectedCategory={state.selectedCategory}
            searchQuery={state.searchQuery}
            onSelectCategory={(cat) => dispatch({ type: "SET_SELECTED_CATEGORY", payload: cat })}
            onSearchChange={(q) => dispatch({ type: "SET_SEARCH_QUERY", payload: q })}
            onCreateMaterial={() => dispatch({ type: "SET_CREATE_MODAL", payload: true })}
          />

          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2 lg:px-4">
            <FilterTemplatePicker
              scope="materials"
              currentFilters={{
                selectedCategory: state.selectedCategory,
                searchQuery: state.searchQuery,
              }}
              onApplyFilters={applyTemplateFilters}
            />
            <MultiSelectToggle
              isEnabled={multiSelect.isEnabled}
              onToggle={multiSelect.toggleEnable}
              count={multiSelect.count}
            />
          </div>

          {multiSelect.count > 0 && (
            <div className="px-3 pt-3 lg:px-4">
              <MultiSelectBulkBar
                count={multiSelect.count}
                entityLabel="materiali"
                allSelected={multiSelect.allSelected}
                someSelected={multiSelect.someSelected}
                onSelectAll={() => multiSelect.selectAll(filteredMaterials.map((m) => m.id))}
                onClear={multiSelect.clear}
                onClose={multiSelect.disable}
              >
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3.5 text-12px font-bold text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]"
                  onClick={() =>
                    notify({
                      message: "Export materiali disponibile in un prossimo aggiornamento.",
                      title: "In arrivo",
                      tone: "info",
                    })
                  }
                  type="button"
                >
                  <Download className="size-4" />
                  Esporta
                </button>
                <button
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3.5 text-12px font-bold text-[var(--danger-base)] ring-1 ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger-soft)_80%,var(--danger-base)_20%)]"
                  onClick={() => {
                    const ids = [...multiSelect.selectedIds];
                    const deletedMaterials = filteredMaterials.filter((m) => ids.includes(m.id));
                    for (const id of ids) {
                      void deleteDesktopMaterial(id).catch(() => {});
                    }
                    dispatchDataChanged();

                    const execute = () => {
                      for (const mat of deletedMaterials) {
                        void deleteDesktopMaterial(mat.id).catch(() => {});
                      }
                      dispatchDataChanged();
                    };
                    const undo = async () => {
                      for (const mat of deletedMaterials) {
                        try {
                          await createDesktopMaterial({
                            id: mat.id,
                            code: mat.code,
                            description: mat.description,
                            category: mat.category,
                            unit: mat.unit,
                            quantity: mat.quantity,
                            minQuantity: mat.minQuantity,
                            notes: mat.notes,
                          });
                        } catch {
                          // skip failed restores
                        }
                      }
                      dispatchDataChanged();
                    };

                    useUndoStore.getState().push({
                      label: `${ids.length} materiali eliminati`,
                      execute,
                      undo,
                    });
                    notify({
                      actionLabel: "Annulla",
                      message: `${ids.length} materiali eliminati.`,
                      onAction: async () => {
                        await undo();
                        notify({
                          message: "Azione annullata",
                          title: "Annullato",
                          tone: "info",
                        });
                      },
                      title: "Eliminati",
                      tone: "success",
                    });
                    multiSelect.disable();
                  }}
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Elimina
                </button>
              </MultiSelectBulkBar>
            </div>
          )}

          <MaterialListSection
            filteredMaterials={filteredMaterials}
            totalMaterials={materials.length}
            isMultiSelectEnabled={multiSelect.isEnabled}
            selectedIds={multiSelect.selectedIds}
            onCardClick={handleCardClick}
            onDeleteMaterial={(id) => dispatch({ type: "SET_DELETE_CONFIRM_ID", payload: id })}
            onEditMaterial={(id) => {
              const mat = materials.find((m) => m.id === id);
              if (mat) {
                dispatch({ type: "SET_SELECTED_MATERIAL_ID", payload: id });
                dispatch({ type: "SET_CREATE_MODAL", payload: true });
              }
            }}
            onCreateMaterial={() => dispatch({ type: "SET_CREATE_MODAL", payload: true })}
          />
        </Panel>
      </section>

      <AddMaterialModal
        isOpen={state.isCreateModalOpen}
        material={selectedMaterial}
        onClose={() => {
          dispatch({ type: "SET_CREATE_MODAL", payload: false });
          dispatch({ type: "SET_SELECTED_MATERIAL_ID", payload: null });
        }}
        onCreated={loadMaterials}
        onSaved={(updated) => {
          if (state.selectedMaterialId) {
            setMaterials((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
            );
          } else {
            setMaterials((prev) => [updated, ...prev]);
          }
        }}
      />

      <ConfirmDialog
        confirmLabel="Elimina"
        isOpen={state.deleteConfirmId !== null}
        onCancel={() => dispatch({ type: "SET_DELETE_CONFIRM_ID", payload: null })}
        onConfirm={() => state.deleteConfirmId && handleDelete(state.deleteConfirmId)}
        title="Eliminare questo materiale?"
        tone="danger"
      >
        Questa azione è irreversibile. Il materiale verrà rimosso dal catalogo e non sarà più
        disponibile per nuovi utilizzi.
      </ConfirmDialog>
    </ScreenLayout>
  );
}

/* ── Material usage helpers ── */

type SalUsageEntry = {
  salId: string;
  salTitle: string;
  projectName: string;
  contractor: string;
  quantity: number;
  status: string;
};

type MaterialUsageInfo = {
  inDraft: number;
  inConfirmed: number;
  usedCount: number;
  entries: SalUsageEntry[];
};

function getMaterialUsageInfo(materialId: string): MaterialUsageInfo {
  const docs = useSalWorkflowStore.getState().salDocuments;
  const projects = useSalWorkflowStore.getState().projects;
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  let inDraft = 0;
  let inConfirmed = 0;
  let usedCount = 0;
  const entries: SalUsageEntry[] = [];
  for (const doc of docs) {
    if (!doc.materialUsage) continue;
    for (const mu of doc.materialUsage) {
      if (mu.materialId === materialId) {
        usedCount++;
        if (doc.status === "draft") inDraft += mu.quantity;
        else inConfirmed += mu.quantity;
        const proj = projectMap.get(doc.projectId);
        entries.push({
          salId: doc.id,
          salTitle: doc.title,
          projectName: proj?.name ?? proj?.client ?? doc.projectId,
          contractor: proj?.client ?? "—",
          quantity: mu.quantity,
          status: doc.status === "draft" ? "Bozza" : "Confermata",
        });
      }
    }
  }
  entries.sort((a) => (a.status === "Bozza" ? -1 : 1));
  return { inDraft, inConfirmed, usedCount, entries };
}

function MaterialCard({
  checked,
  showCheckbox,
  material,
  onDelete,
  onEdit,
  onCardClick,
}: {
  checked: boolean;
  showCheckbox: boolean;
  material: DesktopMaterial;
  onDelete: () => void;
  onEdit: () => void;
  onCardClick: (id: string) => void;
}) {
  const usageInfo = getMaterialUsageInfo(material.id);
  const committed = usageInfo.inDraft + usageInfo.inConfirmed;
  const effectiveStock = Math.max(0, material.quantity - committed);
  const effTone = toneForQuantity(effectiveStock, material.minQuantity);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <m.article
      className={cn(
        "group relative min-h-[116px] rounded-14px border p-4 text-left transition-colors duration-200",
        checked
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_18px_40px_-28px_var(--accent-primary)]"
          : "border-[var(--border-subtle)]/70 bg-[var(--surface-base)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]/40",
      )}
      initial={MOTION_VARIANTS.row.initial}
      transition={MOTION_VARIANTS.row.transition}
      viewport={MOTION_VARIANTS.row.viewport}
      whileInView={MOTION_VARIANTS.row.whileInView}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {showCheckbox && (
              <span className="mt-0.5">
                <SelectionCheckbox
                  checked={checked}
                  id={material.id}
                  onToggle={() => onCardClick(material.id)}
                />
              </span>
            )}
            <button
              className="min-w-0 flex-1 rounded-lg pt-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(material.id);
              }}
              type="button"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    effTone === "danger" ? "danger" : effTone === "warning" ? "warning" : "success"
                  }
                >
                  {effTone === "danger" ? "Critico" : effTone === "warning" ? "Attenzione" : "OK"}
                </Badge>
                <span className="rounded-sm bg-[var(--bg-muted)] px-1.5 py-0.5 text-10px font-bold text-[var(--text-secondary)]">
                  {material.category}
                </span>
              </div>
              <h3 className="mt-3 truncate text-16px font-semibold leading-tight text-[var(--text-primary)]">
                {material.code}
              </h3>
              <p className="mt-2 truncate text-13px font-medium text-[var(--text-secondary)]">
                {material.description}
              </p>
              {/* Stock overview row */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="inline-flex items-center gap-1.5 text-12px font-medium text-[var(--text-secondary)]">
                  <span className="text-10px uppercase tracking-wider text-[var(--text-tertiary)]">
                    Stock
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      effTone === "danger"
                        ? "text-[var(--danger-base)]"
                        : effTone === "warning"
                          ? "text-[var(--warning-base)]"
                          : "text-[var(--text-primary)]",
                    )}
                  >
                    {formatQuantity(material.quantity, material.unit)}
                  </span>
                </div>
                {material.minQuantity > 0 && (
                  <div className="inline-flex items-center gap-1.5 text-12px font-medium text-[var(--text-secondary)]">
                    <span className="text-10px uppercase tracking-wider text-[var(--text-tertiary)]">
                      Soglia
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {formatQuantity(material.minQuantity, material.unit)}
                    </span>
                  </div>
                )}
              </div>

              {/* Coverage bar */}
              {(() => {
                const effective = Math.max(0, material.quantity - committed);
                const barCoverage =
                  material.quantity > 0
                    ? Math.min(100, Math.round((effective / material.quantity) * 100))
                    : 0;
                const tone = toneForQuantity(effective, material.minQuantity);
                return (
                  <div className="mt-3">
                    <div className="flex h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          tone === "danger" && "bg-[var(--danger-base)]",
                          tone === "warning" && "bg-[var(--warning-base)]",
                          tone === "success" && "bg-[var(--success-base)]",
                        )}
                        style={{ width: `${barCoverage}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-10px">
                      <span className="text-[var(--text-tertiary)]">
                        {barCoverage}%{" "}
                        {committed > 0
                          ? `· -${committed.toLocaleString("it-IT")} in SAL`
                          : "disponibile"}
                      </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          tone === "danger" && "text-[var(--danger-base)]",
                          tone === "warning" && "text-[var(--warning-base)]",
                          tone === "success" && "text-[var(--text-primary)]",
                        )}
                      >
                        {formatQuantity(effective, material.unit)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Committed SAL details inline */}
              {usageInfo.usedCount > 0 && (
                <div className="mt-2 divide-y divide-[var(--border-subtle)]/40 rounded-lg bg-[var(--bg-muted)]/30 px-2.5 py-1 text-11px">
                  {usageInfo.entries.map((e) => (
                    <div className="flex items-center justify-between gap-2 py-1.5" key={e.salId}>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-[var(--text-primary)]">{e.salTitle}</span>
                        <span className="ml-1.5 text-[var(--text-tertiary)]">
                          {e.projectName} · {e.contractor}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-bold tabular-nums text-[var(--text-primary)]">
                          {e.quantity.toLocaleString("it-IT")}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 font-semibold",
                            e.status === "Bozza"
                              ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                              : "bg-[var(--info-soft)] text-[var(--info-base)]",
                          )}
                        >
                          {e.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>

          <div ref={menuRef}>
            <Button
              aria-label="Azioni materiale"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((v) => !v);
              }}
              variant="icon"
            >
              <MoreVertical className="size-4" />
            </Button>
            <DropdownMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              triggerRef={menuRef}
            >
              <DropdownItem
                icon={Pencil}
                label="Modifica"
                onClick={() => {
                  onEdit();
                  setIsMenuOpen(false);
                }}
              />
              <DropdownDivider />
              <DropdownItem
                icon={Trash2}
                label="Elimina materiale"
                onClick={() => {
                  onDelete();
                  setIsMenuOpen(false);
                }}
                tone="danger"
              />
            </DropdownMenu>
          </div>
        </div>
      </div>
    </m.article>
  );
}

function MaterialDetail({ material }: { material: DesktopMaterial }) {
  const usageInfo = getMaterialUsageInfo(material.id);
  const committed = usageInfo.inDraft + usageInfo.inConfirmed;
  const effectiveStock = Math.max(0, material.quantity - committed);
  const effectiveTone = toneForQuantity(effectiveStock, material.minQuantity);
  const catTone = categoryColorMap[material.category] ?? "blue";

  return (
    <Panel>
      <span className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
        Focus materiale
      </span>

      <div className="mt-4 rounded-14px border-[0.5px] border-[var(--border-subtle)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MaterialIcon tone={catTone} />
            <div className="min-w-0">
              <div className="truncate text-16px font-bold text-[var(--text-primary)]">
                {material.code}
              </div>
              <div className="mt-1 truncate text-12px font-medium text-[var(--text-secondary)]">
                {material.description}
              </div>
            </div>
          </div>
          <StatusPill tone={effectiveTone}>
            {effectiveTone === "danger"
              ? "Critico"
              : effectiveTone === "warning"
                ? "Attenzione"
                : "OK"}
          </StatusPill>
        </div>

        <dl className="mt-5 divide-y divide-[var(--border-subtle)]">
          <DetailLine label="Categoria" value={material.category} />
          <DetailLine label="Unità di misura" value={material.unit} />
          <DetailLine
            label="Stock attuale"
            value={formatQuantity(material.quantity, material.unit)}
          />
          <DetailLine
            label="Soglia minima"
            value={formatQuantity(material.minQuantity, material.unit)}
          />
        </dl>

        <div className="mt-3">
          <div className="flex items-center justify-between text-12px text-[var(--text-secondary)]">
            <span className="font-medium">Stock disponibile</span>
            <span className="font-bold text-[var(--text-primary)]">
              {formatQuantity(material.quantity, material.unit)}
            </span>
          </div>
          <CoverageBar
            coverage={
              material.quantity > 0
                ? Math.min(100, Math.round((material.quantity / material.quantity) * 100))
                : 0
            }
            tone={toneForQuantity(material.quantity, material.minQuantity)}
          />
          {committed > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-12px text-[var(--text-secondary)]">
                <span className="font-medium">Effettivo (impegni dedotti)</span>
                <span
                  className={cn(
                    "font-bold",
                    effectiveTone === "danger"
                      ? "text-[var(--danger-base)]"
                      : effectiveTone === "warning"
                        ? "text-[var(--warning-base)]"
                        : "text-[var(--text-primary)]",
                  )}
                >
                  {formatQuantity(effectiveStock, material.unit)}
                </span>
              </div>
              <CoverageBar
                coverage={
                  effectiveStock > 0 && material.quantity > 0
                    ? Math.min(100, Math.round((effectiveStock / material.quantity) * 100))
                    : 0
                }
                tone={effectiveTone}
              />
              <div className="mt-0.5 text-right text-10px text-[var(--text-tertiary)]">
                -{committed.toLocaleString("it-IT")} in SAL
              </div>
            </div>
          )}
        </div>

        {/* Usage in SAL documents */}
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <div className="text-11px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            Utilizzo nei SAL
          </div>
          {usageInfo.usedCount > 0 ? (
            <div className="mt-2 space-y-1.5">
              {usageInfo.entries.map((e) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-muted)]/50 px-2.5 py-2 text-11px"
                  key={e.salId}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[var(--text-primary)]">
                      {e.salTitle}
                    </div>
                    <div className="truncate text-10px text-[var(--text-tertiary)]">
                      {e.projectName} · {e.contractor}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      {e.quantity.toLocaleString("it-IT")}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-9px font-semibold",
                        e.status === "Bozza"
                          ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
                          : "bg-[var(--info-soft)] text-[var(--info-base)]",
                      )}
                    >
                      {e.status}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-[var(--border-subtle)]/40 pt-2">
                <DetailLine
                  label="Disponibile (lordo)"
                  value={formatQuantity(material.quantity, material.unit)}
                />
                <DetailLine
                  label="Impegnato"
                  value={`- ${formatQuantity(committed, material.unit)}`}
                  className="text-[var(--warning-base)]"
                />
                <DetailLine
                  label="Effettivo disponibile"
                  value={formatQuantity(effectiveStock, material.unit)}
                  className={cn(
                    effectiveStock < material.minQuantity && "text-[var(--danger-base)]",
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-12px text-[var(--text-tertiary)]">
              Nessuna SAL utilizza questo materiale
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ── Shared sub-components ── */

function SidebarCategories({
  categories,
  materialsCount,
  selectedCategory,
  onSelectCategory,
}: {
  categories: { counts: Map<string, number>; names: string[] };
  materialsCount: number;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
          Categorie
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {categories.names.map((cat) => {
          const count = cat === "Tutti" ? materialsCount : (categories.counts.get(cat) ?? 0);
          return (
            <m.button
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-13px font-semibold transition-colors",
                selectedCategory === cat || (!selectedCategory && cat === "Tutti")
                  ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
              )}
              key={cat}
              onClick={() => onSelectCategory(cat === "Tutti" ? null : cat)}
              type="button"
              whileTap={{ scale: 0.98 }}
            >
              <span>{cat}</span>
              <span className="text-11px font-medium text-[var(--text-secondary)]">{count}</span>
            </m.button>
          );
        })}
      </div>
    </div>
  );
}

function MetricsGrid({
  metrics,
}: {
  metrics: {
    totalStock: number;
    critical: number;
    zero: number;
    committed: number;
    avgCoverage: number;
  };
}) {
  return (
    <div className="grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        caption="Quantità totale in magazzino"
        icon={Warehouse}
        label="Stock totale"
        tone="blue"
        value={`${Math.round(metrics.totalStock)}`}
      />
      <MetricCard
        caption="Quantità impegnata in SAL (bozze + conferme)"
        icon={ShoppingCart}
        label="Impegnato"
        tone="info"
        value={`${Math.round(metrics.committed)}`}
      />
      <MetricCard
        caption="Sotto la soglia minima di scorta"
        icon={AlertTriangle}
        label="Critici"
        tone="danger"
        value={String(metrics.critical)}
      />
      <MetricCard
        caption="Stock a zero"
        icon={Bell}
        label="Esauriti"
        tone="warning"
        value={String(metrics.zero)}
      />
    </div>
  );
}

function CategoryFilterBar({
  categoryNames,
  categoryCounts,
  materialsCount,
  selectedCategory,
  searchQuery,
  onSelectCategory,
  onSearchChange,
  onCreateMaterial,
}: {
  categoryNames: string[];
  categoryCounts: Map<string, number>;
  materialsCount: number;
  selectedCategory: string | null;
  searchQuery: string;
  onSelectCategory: (cat: string | null) => void;
  onSearchChange: (q: string) => void;
  onCreateMaterial: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={!selectedCategory}
          count={materialsCount}
          onClick={() => onSelectCategory(null)}
        >
          Tutti i materiali
        </FilterChip>
        {categoryNames.map((cat) => {
          const count = categoryCounts.get(cat) ?? 0;
          if (count === 0) return null;
          return (
            <FilterChip
              key={cat}
              active={selectedCategory === cat}
              count={count}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </FilterChip>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSearch
          onChange={onSearchChange}
          placeholder="Cerca materiale..."
          value={searchQuery}
        />
        {searchQuery || selectedCategory ? (
          <ClearFiltersButton
            onClick={() => {
              onSearchChange("");
              onSelectCategory(null);
            }}
          />
        ) : null}
        <Button icon={Plus} onClick={onCreateMaterial} variant="primary">
          Nuovo materiale
        </Button>
      </div>
    </div>
  );
}

function MaterialListSection({
  filteredMaterials,
  totalMaterials,
  isMultiSelectEnabled,
  selectedIds,
  onCardClick,
  onDeleteMaterial,
  onEditMaterial,
  onCreateMaterial,
}: {
  filteredMaterials: DesktopMaterial[];
  totalMaterials: number;
  isMultiSelectEnabled: boolean;
  selectedIds: Set<string>;
  onCardClick: (id: string) => void;
  onDeleteMaterial: (id: string) => void;
  onEditMaterial: (id: string) => void;
  onCreateMaterial: () => void;
}) {
  const allIds = useMemo(() => filteredMaterials.map((m) => m.id), [filteredMaterials]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <>
      {!isMultiSelectEnabled && (
        <div className="flex items-center justify-start border-b border-[var(--border-subtle)] px-3 py-2 lg:px-4">
          <button
            className="text-12px font-semibold text-[var(--accent-primary)] hover:underline"
            onClick={onCreateMaterial}
            type="button"
          >
            + Nuovo materiale
          </button>
        </div>
      )}
      <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((mat) => (
            <MaterialCard
              key={mat.id}
              checked={selectedIds.has(mat.id)}
              showCheckbox={isMultiSelectEnabled}
              material={mat}
              onDelete={() => onDeleteMaterial(mat.id)}
              onEdit={() => onEditMaterial(mat.id)}
              onCardClick={onCardClick}
            />
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)]/35 p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
              <Package className="size-4" />
            </div>
            <div className="mt-3 text-14px font-bold text-[var(--text-primary)]">
              Nessun materiale trovato
            </div>
            <p className="mx-auto mt-1 max-w-[320px] text-12px font-medium text-[var(--text-secondary)]">
              Modifica i filtri o{" "}
              <button
                className="font-semibold text-[var(--accent-primary)] underline underline-offset-2 hover:no-underline"
                onClick={onCreateMaterial}
                type="button"
              >
                crea un nuovo materiale
              </button>
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3">
        <span className="text-11px font-medium text-[var(--text-secondary)]">
          {filteredMaterials.length} di {totalMaterials} materiali
        </span>
        {isMultiSelectEnabled && (
          <button
            className="text-12px font-semibold text-[var(--accent-primary)] hover:underline"
            onClick={() => {
              if (allSelected) {
                // clear all
                for (const id of allIds) {
                  if (selectedIds.has(id)) onCardClick(id);
                }
              } else {
                for (const id of allIds) {
                  if (!selectedIds.has(id)) onCardClick(id);
                }
              }
            }}
            type="button"
          >
            {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
          </button>
        )}
      </div>
    </>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function MaterialIcon({ tone }: { tone: CategoryTone }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        categoryToneLabel[tone],
      )}
    >
      <Package className="size-5" />
    </span>
  );
}

function CoverageBar({ coverage, tone }: { coverage: number; tone: StockTone }) {
  return <SeverityBar percentage={coverage} tone={tone} />;
}

function DetailLine({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-13px font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className={cn("text-right text-13px font-bold text-[var(--text-primary)]", className)}>
        {value}
      </dd>
    </div>
  );
}
