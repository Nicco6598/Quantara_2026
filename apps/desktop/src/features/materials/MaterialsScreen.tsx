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
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch } from "@/components/filters";
import { SPRING_EASE } from "@/components/shared/easings";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { StatusPill } from "@/components/shared/StatusPill";
import { SeverityBar } from "@/components/shared/SeverityBar";
import { useToast } from "@/components/shared/ToastProvider";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ContextToolbar } from "@/components/shared/ContextToolbar";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/shared/DropdownMenu";
import { FilterChip } from "@/components/shared/FilterChip";
import { MetricCard } from "@/components/shared/MetricCard";
import { QuickAction } from "@/components/shared/QuickAction";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { SelectionCheckbox } from "@/components/shared/SelectionCheckbox";
import { BezelSurface } from "@/components/shared/ui-primitives";
import { useSelectionStore } from "@/store/selection-store";
import {
  type DesktopMaterial,
  deleteDesktopMaterial,
  listDesktopMaterials,
  updateDesktopMaterial,
} from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { cn } from "@/lib/utils";

type StockTone = "danger" | "success" | "warning";
type CategoryTone = "blue" | "green" | "orange" | "purple";

const categoryColorMap: Record<string, CategoryTone> = {
  Armamento: "blue",
  Sottofondo: "orange",
  "Opere civili": "purple",
  Impianti: "green",
};

const categoryToneLabel: Record<CategoryTone, string> = {
  blue: "bg-[var(--info-soft)] text-[var(--info-base)]",
  green: "bg-[var(--success-soft)] text-[var(--success-base)]",
  orange: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
  purple: "bg-[var(--bg-muted-strong)] text-[var(--accent-secondary)]",
};

const CATEGORIES = ["Armamento", "Sottofondo", "Opere civili", "Impianti"];

function toneForQuantity(quantity: number, minQuantity: number): StockTone {
  if (quantity === 0) return "danger";
  if (quantity < minQuantity) return "warning";
  return "success";
}

function formatQuantity(value: number, unit: string): string {
  const n = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return `${n} ${unit}`;
}

/* ── State reducers ── */

type ScreenState = {
  searchQuery: string;
  selectedCategory: string | null;
  selectedMaterialId: string | null;
  isCreateModalOpen: boolean;
  deleteConfirmId: string | null;
};

type ScreenAction =
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_CATEGORY"; payload: string | null }
  | { type: "SET_SELECTED_MATERIAL_ID"; payload: string | null }
  | { type: "SET_CREATE_MODAL"; payload: boolean }
  | { type: "SET_DELETE_CONFIRM_ID"; payload: string | null };

function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SET_SELECTED_CATEGORY":
      return { ...state, selectedCategory: action.payload };
    case "SET_SELECTED_MATERIAL_ID":
      return { ...state, selectedMaterialId: action.payload };
    case "SET_CREATE_MODAL":
      return { ...state, isCreateModalOpen: action.payload };
    case "SET_DELETE_CONFIRM_ID":
      return { ...state, deleteConfirmId: action.payload };
  }
}

type FormField = "code" | "description" | "category" | "unit" | "quantity" | "minQuantity";

type FormAction =
  | { type: "SET_FIELD"; field: FormField; value: string }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "RESET"; payload?: DesktopMaterial | null };

function formReducer(
  state: {
    code: string;
    description: string;
    category: string;
    unit: string;
    quantity: string;
    minQuantity: string;
    saving: boolean;
  },
  action: FormAction,
): {
  code: string;
  description: string;
  category: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  saving: boolean;
} {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SAVING":
      return { ...state, saving: action.payload };
    case "RESET":
      return {
        code: action.payload?.code ?? "",
        description: action.payload?.description ?? "",
        category: action.payload?.category ?? "Armamento",
        unit: action.payload?.unit ?? "m",
        quantity: String(action.payload?.quantity ?? 0),
        minQuantity: String(action.payload?.minQuantity ?? 0),
        saving: false,
      };
  }
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

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  useEffect(() => {
    const handleChange = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadMaterials, 150);
    };
    window.addEventListener("quantara:data-changed", handleChange);
    return () => {
      window.removeEventListener("quantara:data-changed", handleChange);
      clearTimeout(debounceRef.current);
    };
  }, [loadMaterials]);

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
    return { totalStock, critical, zero, avgCoverage };
  }, [materials]);

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

  const selectedMaterialIds = useSelectionStore((s) => s.ids);
  const toggleMaterialSelection = useCallback((id: string) => {
    useSelectionStore.getState().toggle(id);
  }, []);

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

          <MaterialListSection
            filteredMaterials={filteredMaterials}
            totalMaterials={materials.length}
            selectedIds={selectedMaterialIds}
            onToggleSelection={toggleMaterialSelection}
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

function MaterialCard({
  checked,
  material,
  onDelete,
  onEdit,
  onToggleSelection,
}: {
  checked: boolean;
  material: DesktopMaterial;
  onDelete: () => void;
  onEdit: () => void;
  onToggleSelection: (id: string) => void;
}) {
  const tone = toneForQuantity(material.quantity, material.minQuantity);
  const coverage =
    material.minQuantity > 0
      ? Math.min(100, Math.round((material.quantity / material.minQuantity) * 100))
      : 100;
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
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.42, ease: SPRING_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <button
            className="flex min-w-0 flex-1 items-start gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(material.id);
            }}
            type="button"
          >
            <span
              className={cn(
                "mt-0.5 transition-opacity duration-200",
                checked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <SelectionCheckbox checked={checked} id={material.id} onToggle={onToggleSelection} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success"
                  }
                >
                  {tone === "danger" ? "Critico" : tone === "warning" ? "Attenzione" : "OK"}
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
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-12px font-medium text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-10px uppercase tracking-wider text-[var(--text-tertiary)]">
                    Stock
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      tone === "danger"
                        ? "text-[var(--danger-base)]"
                        : tone === "warning"
                          ? "text-[var(--warning-base)]"
                          : "text-[var(--text-primary)]",
                    )}
                  >
                    {formatQuantity(material.quantity, material.unit)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-10px uppercase tracking-wider text-[var(--text-tertiary)]">
                    Soglia
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatQuantity(material.minQuantity, material.unit)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        tone === "danger"
                          ? "bg-[var(--danger-base)]"
                          : tone === "warning"
                            ? "bg-[var(--warning-base)]"
                            : "bg-[var(--success-base)]",
                      )}
                      style={{ width: `${coverage}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-11px font-bold tabular-nums",
                      tone === "danger"
                        ? "text-[var(--danger-base)]"
                        : tone === "warning"
                          ? "text-[var(--warning-base)]"
                          : "text-[var(--success-base)]",
                    )}
                  >
                    {coverage}%
                  </span>
                </span>
              </div>
            </div>
          </button>

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
  const tone = toneForQuantity(material.quantity, material.minQuantity);
  const coverage =
    material.minQuantity > 0
      ? Math.min(100, Math.round((material.quantity / material.minQuantity) * 100))
      : 100;
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
          <StatusPill tone={tone}>
            {tone === "danger" ? "Critico" : tone === "warning" ? "Attenzione" : "OK"}
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
          <div className="flex items-center justify-between text-13px">
            <span className="font-medium text-[var(--text-secondary)]">Copertura</span>
            <span className="text-13px font-bold text-[var(--text-primary)]">{coverage}%</span>
          </div>
          <CoverageBar coverage={coverage} tone={tone} />
        </div>
      </div>
    </Panel>
  );
}

function AddMaterialModal({
  isOpen,
  material,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  material?: DesktopMaterial | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const isEditing = !!material;

  const [form, formDispatch] = useReducer(formReducer, {
    code: "",
    description: "",
    category: "Armamento",
    unit: "m",
    quantity: "0",
    minQuantity: "0",
    saving: false,
  });

  useEffect(() => {
    formDispatch({ type: "RESET", payload: material ?? null });
  }, [material]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const qty = Number.parseFloat(form.quantity);
    const minQty = Number.parseFloat(form.minQuantity);
    if (!form.code.trim() || !form.description.trim() || Number.isNaN(qty)) return;

    formDispatch({ type: "SET_SAVING", payload: true });
    try {
      const payload = {
        id: material?.id ?? `mat_${Date.now()}`,
        code: form.code.trim(),
        description: form.description.trim(),
        category: form.category,
        unit: form.unit,
        quantity: qty,
        minQuantity: minQty,
        notes: "",
      };

      if (material) {
        await updateDesktopMaterial(material.id, payload);
      } else {
        const { createDesktopMaterial } = await import("@/lib/desktopData");
        await createDesktopMaterial(payload);
      }

      dispatchDataChanged();
      onClose();
      formDispatch({ type: "RESET" });
      onCreated();
      notify({
        message: `${form.description.trim()} ${material ? "modificato" : "creato"}.`,
        title: material ? "Materiale modificato" : "Materiale aggiunto",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: material ? "Modifica non riuscita" : "Creazione non riuscita",
        tone: "danger",
      });
    } finally {
      formDispatch({ type: "SET_SAVING", payload: false });
    }
  };

  const units = ["m", "m2", "m3", "cad", "t", "kg", "set", "lt"];
  const set = (field: FormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    formDispatch({ type: "SET_FIELD", field, value: e.target.value });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]">
        <div className="rounded-22px bg-[var(--surface-base)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between">
            <h3 className="text-16px font-semibold text-[var(--text-primary)]">
              {isEditing ? "Modifica materiale" : "Nuovo materiale"}
            </h3>
            <button
              className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Codice">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={set("code")}
                  placeholder="Es. BIN-60E1"
                  type="text"
                  value={form.code}
                />
              </Field>
              <Field label="Unità">
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    onChange={set("unit")}
                    value={form.unit}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden={true}
                    className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </Field>
            </div>

            <Field label="Descrizione">
              <input
                className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={set("description")}
                placeholder="Descrizione del materiale"
                type="text"
                value={form.description}
              />
            </Field>

            <Field label="Categoria">
              <div className="relative">
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={set("category")}
                  value={form.category}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden={true}
                  className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantità">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  min="0"
                  onChange={set("quantity")}
                  step="any"
                  type="number"
                  value={form.quantity}
                />
              </Field>
              <Field label="Soglia minima">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  min="0"
                  onChange={set("minQuantity")}
                  step="any"
                  type="number"
                  value={form.minQuantity}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button onClick={onClose} variant="outline">
              Annulla
            </Button>
            <Button
              disabled={form.saving || !form.code.trim() || !form.description.trim()}
              onClick={handleSave}
              variant="primary"
            >
              {form.saving ? "Salvataggio..." : isEditing ? "Salva modifiche" : "Crea materiale"}
            </Button>
          </div>
        </div>
      </div>
    </div>
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
  metrics: { totalStock: number; critical: number; zero: number; avgCoverage: number };
}) {
  return (
    <div className="grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        caption="Quantità totale in magazzino"
        icon={Warehouse}
        label="Valore stock"
        tone="blue"
        value={`${Math.round(metrics.totalStock)}`}
      />
      <MetricCard
        caption="Sotto la soglia minima"
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
      <MetricCard
        caption="Copertura media vs soglia minima"
        icon={ShieldCheck}
        label="Copertura media"
        tone="success"
        value={`${metrics.avgCoverage}%`}
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
  selectedIds,
  onToggleSelection,
  onDeleteMaterial,
  onEditMaterial,
  onCreateMaterial,
}: {
  filteredMaterials: DesktopMaterial[];
  totalMaterials: number;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onDeleteMaterial: (id: string) => void;
  onEditMaterial: (id: string) => void;
  onCreateMaterial: () => void;
}) {
  const { notify } = useToast();

  const allIds = useMemo(() => filteredMaterials.map((m) => m.id), [filteredMaterials]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <>
      <ContextToolbar
        actions={[
          {
            icon: <Download className="size-4" />,
            label: "Esporta",
            run: () =>
              notify({
                message: "Export materiali disponibile in un prossimo aggiornamento.",
                title: "In arrivo",
                tone: "info",
              }),
          },
          {
            icon: <Trash2 className="size-4" />,
            label: "Elimina",
            run: () => {
              useSelectionStore.getState().clear();
              dispatchDataChanged();
              notify({ message: "Materiali eliminati.", title: "Eliminati", tone: "success" });
            },
            tone: "danger",
          },
        ]}
        entityLabel="materiali"
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
        <div className="col-span-full flex items-center justify-start pb-1">
          <button
            className="text-12px font-semibold text-[var(--accent-primary)] hover:underline"
            onClick={() => {
              if (allSelected) {
                useSelectionStore.getState().clear();
              } else {
                useSelectionStore.getState().selectAll(allIds);
              }
            }}
            type="button"
          >
            {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
          </button>
        </div>
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((mat) => (
            <MaterialCard
              key={mat.id}
              checked={selectedIds.has(mat.id)}
              material={mat}
              onDelete={() => onDeleteMaterial(mat.id)}
              onEdit={() => onEditMaterial(mat.id)}
              onToggleSelection={onToggleSelection}
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

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-13px font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-right text-13px font-bold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="block">
      <div className="mb-1.5 text-12px font-semibold text-[var(--text-secondary)]">{label}</div>
      {children}
    </div>
  );
}
