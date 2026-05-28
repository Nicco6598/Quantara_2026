import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Download,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ClearFiltersButton,
  FilterSearch,
  FilterSelect,
  FilterTemplatePicker,
} from "@/components/filters";
import { AppContextMenu } from "@/components/shared/AppContextMenu";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DetailList, DetailRow } from "@/components/shared/DetailList";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { MultiSelectBulkDeleteBar } from "@/components/shared/MultiSelectBulkDeleteBar";
import { MultiSelectToggle } from "@/components/shared/MultiSelectControls";
import { Panel } from "@/components/shared/Panel";
import { QuickAction } from "@/components/shared/QuickAction";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { SeverityBar } from "@/components/shared/SeverityBar";
import { StatusPill } from "@/components/shared/StatusPill";
import { useToast } from "@/components/shared/ToastProvider";
import { useMultiSelectDelete } from "@/hooks/use-multi-select-delete";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useDataChangedListener } from "@/hooks/useDataChangedListener";
import { buildMaterialContextMenuEntries, copyTextToClipboard } from "@/lib/context-menu-presets";
import {
  createDesktopMaterial,
  type DesktopMaterial,
  deleteDesktopMaterial,
  listDesktopMaterials,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { reportUserActionError } from "@/lib/user-action-error";
import { cn } from "@/lib/utils";
import { MOTION_VARIANTS } from "@/motion";
import { useSalWorkflowStore } from "@/store/sal-workflow-store";
import { useUndoStore } from "@/store/undo-store";
import { AddMaterialModal } from "./components/AddMaterialModal";
import {
  CATEGORIES,
  type CategoryTone,
  categoryColorMap,
  categoryToneLabel,
  formatQuantity,
  type StockTone,
  screenReducer,
  toneForQuantity,
} from "./materials-screen-state";

function MaterialHeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-11px font-medium text-[var(--text-secondary)]">{label}</span>
        <Icon className="size-3.5 shrink-0 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-1 truncate text-17px font-semibold leading-none tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

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

  const applyTemplateFilters = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.selectedCategory === "string" || filters.selectedCategory === null) {
      dispatch({
        type: "SET_SELECTED_CATEGORY",
        payload: filters.selectedCategory as string | null,
      });
    }
    if (typeof filters.searchQuery === "string") {
      dispatch({ type: "SET_SEARCH_QUERY", payload: filters.searchQuery });
    }
  }, []);

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
        reportUserActionError(error, {
          action: "delete",
          area: "materials",
          notify,
          title: "Eliminazione non riuscita",
          userMessage: "Non sono riuscito a eliminare il materiale.",
        });
      } finally {
        dispatch({ type: "SET_DELETE_CONFIRM_ID", payload: null });
      }
    },
    [materials, notify, state.selectedMaterialId],
  );

  const multiSelect = useMultiSelectDelete(filteredMaterials);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...multiSelect.selectedIds];
    const deletedMaterials = filteredMaterials.filter((material) => ids.includes(material.id));
    if (deletedMaterials.length === 0) return;

    const results = await Promise.allSettled(
      deletedMaterials.map((material) => deleteDesktopMaterial(material.id)),
    );
    const successfullyDeleted = deletedMaterials.filter(
      (_material, index) => results[index]?.status === "fulfilled",
    );
    const failedResults = results.filter((result) => result.status === "rejected");

    dispatchDataChanged();
    loadMaterials();

    const firstFailure = failedResults[0];
    if (firstFailure) {
      reportUserActionError(firstFailure.reason, {
        action: "bulk-delete",
        area: "materials",
        notify,
        title: "Eliminazione parziale",
        userMessage:
          failedResults.length === deletedMaterials.length
            ? "Non sono riuscito a eliminare i materiali selezionati."
            : `${failedResults.length} materiali non sono stati eliminati.`,
      });
    }

    if (successfullyDeleted.length === 0) return;

    const execute = async () => {
      const redoResults = await Promise.allSettled(
        successfullyDeleted.map((material) => deleteDesktopMaterial(material.id)),
      );
      dispatchDataChanged();
      loadMaterials();
      const failedRedo = redoResults.find((result) => result.status === "rejected");
      if (failedRedo?.status === "rejected") {
        reportUserActionError(failedRedo.reason, {
          action: "bulk-delete-redo",
          area: "materials",
          notify,
          title: "Ripetizione non riuscita",
          userMessage: "Non sono riuscito a ripetere l'eliminazione dei materiali.",
        });
      }
    };
    const undo = async () => {
      const restoreResults = await Promise.allSettled(
        successfullyDeleted.map((material) =>
          createDesktopMaterial({
            id: material.id,
            code: material.code,
            description: material.description,
            category: material.category,
            unit: material.unit,
            quantity: material.quantity,
            minQuantity: material.minQuantity,
            notes: material.notes,
          }),
        ),
      );
      dispatchDataChanged();
      loadMaterials();
      const failedRestore = restoreResults.find((result) => result.status === "rejected");
      if (failedRestore?.status === "rejected") {
        reportUserActionError(failedRestore.reason, {
          action: "bulk-delete-undo",
          area: "materials",
          notify,
          title: "Annullamento incompleto",
          userMessage: "Non sono riuscito a ripristinare tutti i materiali eliminati.",
        });
      }
    };

    useUndoStore.getState().push({
      label: `${successfullyDeleted.length} materiali eliminati`,
      execute,
      undo,
    });
    notify({
      actionLabel: "Annulla",
      message:
        failedResults.length > 0
          ? `${successfullyDeleted.length} materiali eliminati, ${failedResults.length} non eliminati.`
          : `${successfullyDeleted.length} materiali eliminati.`,
      onAction: async () => {
        await undo();
        notify({
          message: "Azione annullata",
          title: "Annullato",
          tone: "info",
        });
      },
      title: "Eliminati",
      tone: failedResults.length > 0 ? "warning" : "success",
    });
    multiSelect.onDeleted();
  }, [filteredMaterials, loadMaterials, multiSelect, notify]);

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
      <section className="border-b border-[var(--border-subtle)] pb-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] xl:items-end">
          <div className="min-w-0">
            <p className="text-12px font-medium text-[var(--text-tertiary)]">Supply control</p>
            <h2 className="mt-1 text-28px font-semibold leading-tight text-[var(--text-primary)] md:text-32px">
              Materiali e coperture
            </h2>
            <p className="mt-2 max-w-2xl text-14px leading-6 text-[var(--text-secondary)]">
              {materials.length} materiali registrati. Stock, impegni e soglie minime.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <MaterialHeaderStat
              icon={Package}
              label="Stock"
              value={metrics.totalStock.toLocaleString("it-IT")}
            />
            <MaterialHeaderStat
              icon={AlertTriangle}
              label="Sotto soglia"
              value={metrics.critical}
            />
            <MaterialHeaderStat icon={Package} label="Esauriti" value={metrics.zero} />
            <MaterialHeaderStat icon={Warehouse} label="Categorie" value={CATEGORIES.length} />
          </div>
        </div>
      </section>

      <div className="mt-5">
        <MetricsGrid metrics={metrics} />
      </div>

      <section className="operational-panel-grid mt-6 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:self-start">
          <Panel eyebrow="Azioni rapide">
            <div className="space-y-3">
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
            <Panel eyebrow="Dettaglio materiale">
              <div className="text-center text-13px font-medium text-[var(--text-secondary)]">
                Seleziona un materiale per vedere dettagli e movimenti
              </div>
            </Panel>
          )}
        </aside>

        <Panel className="min-w-0 overflow-visible" padding="none">
          <div className="border-b border-[var(--border-subtle)] p-3 lg:p-4">
            <div className="operational-toolbar">
              <div className="operational-toolbar-group">
                <FilterSelect
                  label="Categoria"
                  onChange={(cat) =>
                    dispatch({
                      type: "SET_SELECTED_CATEGORY",
                      payload: cat === "all" ? null : cat,
                    })
                  }
                  options={["all", ...CATEGORIES]}
                  value={state.selectedCategory ?? "all"}
                  displayMap={
                    new Map([
                      ["all", "Tutte le categorie"],
                      ...CATEGORIES.map((c) => [c, c] as const),
                    ])
                  }
                />
                <FilterSearch
                  onChange={(q) => dispatch({ type: "SET_SEARCH_QUERY", payload: q })}
                  placeholder="Cerca materiale..."
                  value={state.searchQuery}
                />
                {state.searchQuery || state.selectedCategory ? (
                  <ClearFiltersButton
                    onClick={() => {
                      dispatch({ type: "SET_SEARCH_QUERY", payload: "" });
                      dispatch({ type: "SET_SELECTED_CATEGORY", payload: null });
                    }}
                  />
                ) : null}
              </div>
              <div className="operational-toolbar-actions">
                <FilterTemplatePicker
                  scope="materials"
                  currentFilters={{
                    selectedCategory: state.selectedCategory,
                    searchQuery: state.searchQuery,
                  }}
                  onApplyFilters={applyTemplateFilters}
                />
                <Button
                  icon={Plus}
                  onClick={() => dispatch({ type: "SET_CREATE_MODAL", payload: true })}
                  variant="primary"
                >
                  Nuovo materiale
                </Button>
                <MultiSelectToggle
                  isEnabled={multiSelect.isEnabled}
                  onToggle={multiSelect.toggleEnable}
                  count={multiSelect.count}
                />
              </div>
            </div>
          </div>

          {multiSelect.count > 0 && (
            <div className="px-3 pt-3 lg:px-4">
              <MultiSelectBulkDeleteBar
                allSelected={multiSelect.allSelected}
                count={multiSelect.count}
                entityLabel="materiali"
                entityLabelSingular="materiale"
                isDeleteConfirmOpen={multiSelect.isConfirmOpen}
                onClear={multiSelect.clear}
                onClose={multiSelect.disable}
                onDeleteConfirm={handleBulkDelete}
                onDeleteConfirmDismiss={multiSelect.dismissDelete}
                onDeleteRequest={multiSelect.requestDelete}
                onSelectAll={() => multiSelect.selectAll(filteredMaterials.map((m) => m.id))}
                selectedItemNames={multiSelect.selectedItems.map((m) => m.description)}
                someSelected={multiSelect.someSelected}
              >
                <Button
                  icon={Download}
                  onClick={() =>
                    notify({
                      message: "Export materiali disponibile in un prossimo aggiornamento.",
                      title: "In arrivo",
                      tone: "info",
                    })
                  }
                  variant="outline"
                  size="sm"
                >
                  Esporta
                </Button>
              </MultiSelectBulkDeleteBar>
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
        onConfirm={() => {
          if (state.deleteConfirmId) {
            void handleDelete(state.deleteConfirmId);
          }
        }}
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
  const contextMenu = useContextMenu<void>();

  return (
    <m.article
      className={cn(
        "operational-card-hover relative rounded-lg border px-3 py-2 text-left",
        checked
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_7%,var(--surface-base)_93%)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-base)]",
      )}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenu.open(event, undefined);
      }}
      initial={MOTION_VARIANTS.row.initial}
      transition={MOTION_VARIANTS.row.transition}
      viewport={MOTION_VARIANTS.row.viewport}
      whileInView={MOTION_VARIANTS.row.whileInView}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showCheckbox && (
              <span>
                <SelectionCheckbox
                  checked={checked}
                  id={material.id}
                  onToggle={() => onCardClick(material.id)}
                />
              </span>
            )}
            <button
              className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] md:grid-cols-[minmax(0,1fr)_110px_120px_120px]"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(material.id);
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-tertiary)]">
                  <Package className="size-4" />
                  <span
                    className={cn(
                      "absolute -right-1 -top-1 size-3 rounded-full border-2 border-[var(--surface-base)]",
                      effTone === "danger"
                        ? "bg-[var(--danger-base)]"
                        : effTone === "warning"
                          ? "bg-[var(--warning-base)]"
                          : "bg-[var(--success-base)]",
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-13px font-semibold leading-tight text-[var(--text-primary)]">
                    {material.code}
                  </h3>
                  <p className="mt-0.5 truncate text-12px font-medium text-[var(--text-secondary)]">
                    {material.description}
                  </p>
                </div>
              </div>

              <div className="hidden min-w-0 md:block">
                <Badge
                  variant={
                    effTone === "danger" ? "danger" : effTone === "warning" ? "warning" : "success"
                  }
                >
                  {effTone === "danger" ? "Critico" : effTone === "warning" ? "Attenzione" : "OK"}
                </Badge>
                <div className="mt-0.5 truncate text-10px font-medium text-[var(--text-secondary)]">
                  {material.category}
                </div>
              </div>

              <div>
                <div className="text-10px font-medium text-[var(--text-secondary)]">Stock</div>
                <div
                  className={cn(
                    "mt-0.5 truncate text-12px font-semibold tabular-nums",
                    effTone === "danger"
                      ? "text-[var(--danger-base)]"
                      : effTone === "warning"
                        ? "text-[var(--warning-base)]"
                        : "text-[var(--text-primary)]",
                  )}
                >
                  {formatQuantity(material.quantity, material.unit)}
                </div>
              </div>

              <div className="hidden md:block">
                <div className="text-10px font-medium text-[var(--text-secondary)]">Soglia</div>
                <div className="mt-0.5 truncate text-12px font-semibold tabular-nums text-[var(--text-primary)]">
                  {material.minQuantity > 0
                    ? formatQuantity(material.minQuantity, material.unit)
                    : "—"}
                </div>
              </div>

              <div className="hidden md:block">
                <div className="text-10px font-medium text-[var(--text-secondary)]">Impegnato</div>
                <div className="mt-0.5 truncate text-12px font-semibold tabular-nums text-[var(--text-primary)]">
                  {committed > 0 ? committed.toLocaleString("it-IT") : "—"}
                </div>
              </div>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
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
      </div>

      {contextMenu.state ? (
        <AppContextMenu
          entries={buildMaterialContextMenuEntries({
            onEdit,
            onDelete,
            onCopyCode: () => void copyTextToClipboard(material.code),
          })}
          header={{ title: material.code, subtitle: material.description }}
          onClose={contextMenu.close}
          position={{ x: contextMenu.state.x, y: contextMenu.state.y }}
        />
      ) : null}
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

        <DetailList className="mt-5">
          <DetailRow label="Categoria" value={material.category} />
          <DetailRow label="Unità di misura" value={material.unit} />
          <DetailRow
            label="Stock attuale"
            value={formatQuantity(material.quantity, material.unit)}
          />
          <DetailRow
            label="Soglia minima"
            value={formatQuantity(material.minQuantity, material.unit)}
          />
        </DetailList>

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
                <DetailRow
                  label="Disponibile (lordo)"
                  value={formatQuantity(material.quantity, material.unit)}
                />
                <DetailRow
                  label="Impegnato"
                  value={`- ${formatQuantity(committed, material.unit)}`}
                  className="text-[var(--warning-base)]"
                />
                <DetailRow
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
    <div className="animate-entry grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      <div className="space-y-2 p-3">
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
          <div>
            <EmptyState
              icon={Package}
              title="Nessun materiale trovato"
              description="Modifica i filtri o crea un nuovo materiale."
              action={{
                label: "Crea nuovo materiale",
                onClick: onCreateMaterial,
                variant: "secondary",
              }}
            />
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
