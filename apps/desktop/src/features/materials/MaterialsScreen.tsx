import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  type LucideIcon,
  Package,
  PackagePlus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch } from "@/components/filters";
import { BUTTER_EASE } from "@/components/shared/easings";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { StatusPill } from "@/components/shared/StatusPill";
import { SeverityBar } from "@/components/shared/SeverityBar";
import { useToast } from "@/components/shared/ToastProvider";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BezelSurface, ProjectControlButton } from "@/components/shared/ui-primitives";
import {
  type DesktopMaterial,
  deleteDesktopMaterial,
  listDesktopMaterials,
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

export function MaterialsScreen() {
  const { notify } = useToast();
  const [materials, setMaterials] = useState<DesktopMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    () => materials.find((m) => m.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId],
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
    const q = searchQuery.toLowerCase().trim();
    return materials.filter((m) => {
      const matchesSearch =
        !q ||
        m.code.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

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
        setSelectedMaterialId((current) => (current === materialId ? null : current));
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
        setDeleteConfirmId(null);
      }
    },
    [materials, notify],
  );

  return (
    <main className="relative w-full max-w-full overflow-x-hidden px-4 pb-10 pt-4 md:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--success-base)_13%,transparent),transparent_34%),radial-gradient(circle_at_90%_18%,color-mix(in_srgb,var(--info-base)_15%,transparent),transparent_32%)]" />

      <ScreenHero
        badge="Supply control"
        title="Materiali e coperture"
        description={`${materials.length} materiali registrati. Gestisci stock, impegni e soglie minime.`}
        sidePanel={
          <div>
            <div className="flex items-center justify-between">
              <span className="text-11px font-semibold uppercase tracking-0_2em text-[var(--text-secondary)]">
                Categorie
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {categories.names.map((cat) => {
                const count =
                  cat === "Tutti" ? materials.length : (categories.counts.get(cat) ?? 0);
                return (
                  <motion.button
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-13px font-semibold transition-colors",
                      selectedCategory === cat || (!selectedCategory && cat === "Tutti")
                        ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
                    )}
                    key={cat}
                    onClick={() => setSelectedCategory(cat === "Tutti" ? null : cat)}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{cat}</span>
                    <span className="text-11px font-medium text-[var(--text-secondary)]">
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        }
      >
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
                onClick={() => setIsCreateModalOpen(true)}
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
                onClick={() => setSelectedCategory(null)}
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
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={cn(
                  "h-9 rounded-full px-4 text-12px font-semibold transition-colors 2xl:h-10 2xl:text-13px",
                  !selectedCategory
                    ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                    : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
                onClick={() => setSelectedCategory(null)}
                type="button"
              >
                Tutti i materiali
                <span
                  className={cn(
                    "ml-2 rounded-full px-2 py-0.5 text-11px font-bold",
                    !selectedCategory
                      ? "bg-white/20"
                      : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
                  )}
                >
                  {materials.length}
                </span>
              </button>
              {CATEGORIES.map((cat) => {
                const count = categories.counts.get(cat) ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    className={cn(
                      "h-9 rounded-full px-4 text-12px font-semibold transition-colors 2xl:h-10 2xl:text-13px",
                      selectedCategory === cat
                        ? "bg-[var(--accent-primary)] text-[var(--text-inverse)]"
                        : "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    type="button"
                  >
                    {cat}
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-11px font-bold",
                        selectedCategory === cat
                          ? "bg-white/20"
                          : "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterSearch
                onChange={setSearchQuery}
                placeholder="Cerca materiale..."
                value={searchQuery}
              />
              {searchQuery || selectedCategory ? (
                <ClearFiltersButton
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                  }}
                />
              ) : null}
              <ProjectControlButton
                icon={Plus}
                onClick={() => setIsCreateModalOpen(true)}
                variant="primary"
              >
                Nuovo materiale
              </ProjectControlButton>
            </div>
          </div>

          {/* Compact list */}
          <div className="space-y-3 p-4">
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map((mat) => (
                <MaterialCard
                  key={mat.id}
                  isSelected={mat.id === selectedMaterialId}
                  material={mat}
                  onDelete={() => setDeleteConfirmId(mat.id)}
                  onSelect={() =>
                    setSelectedMaterialId(mat.id === selectedMaterialId ? null : mat.id)
                  }
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)]/35 p-8 text-center">
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
                    onClick={() => setIsCreateModalOpen(true)}
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
              {filteredMaterials.length} di {materials.length} materiali
            </span>
          </div>
        </Panel>
      </section>

      <AddMaterialModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadMaterials}
      />

      <ConfirmDialog
        confirmLabel="Elimina"
        isOpen={deleteConfirmId !== null}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Eliminare questo materiale?"
        tone="danger"
      >
        Questa azione è irreversibile. Il materiale verrà rimosso dal catalogo e non sarà più
        disponibile per nuovi utilizzi.
      </ConfirmDialog>
    </main>
  );
}

function MaterialCard({
  isSelected,
  material,
  onDelete,
  onSelect,
}: {
  isSelected: boolean;
  material: DesktopMaterial;
  onDelete: (id: string) => void;
  onSelect: () => void;
}) {
  const tone = toneForQuantity(material.quantity, material.minQuantity);
  const coverage =
    material.minQuantity > 0
      ? Math.min(100, Math.round((material.quantity / material.minQuantity) * 100))
      : 100;
  const catTone = categoryColorMap[material.category] ?? "blue";

  return (
    <motion.article
      className={cn(
        "relative rounded-10px border px-3 py-2.5 text-left transition-colors duration-200",
        isSelected
          ? "border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base)_92%)] shadow-[0_8px_24px_-20px_var(--accent-primary)]"
          : "border-[var(--border-subtle)]/60 bg-[var(--surface-base)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]/40",
      )}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.32, ease: BUTTER_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <button
        className="flex w-full items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
        onClick={onSelect}
        type="button"
      >
        <MaterialIcon tone={catTone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-13px font-bold text-[var(--text-primary)]">
              {material.code}
            </span>
            <span className="shrink-0 text-11px font-medium text-[var(--text-secondary)]">
              {material.description}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-11px font-medium text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <span className="text-10px text-[var(--text-tertiary)]">Stock</span>
              <span
                className={cn(
                  "font-semibold",
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
            <span className="text-[var(--border-subtle)]">|</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-10px text-[var(--text-tertiary)]">Soglia</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatQuantity(material.minQuantity, material.unit)}
              </span>
            </span>
            <span className="text-[var(--border-subtle)]">|</span>
            <span className="rounded-sm bg-[var(--bg-muted)] px-1.5 py-0.5 text-10px font-bold text-[var(--text-secondary)]">
              {material.category}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-10 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
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
                  "text-10px font-bold tabular-nums",
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
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusPill tone={tone}>
            {tone === "danger" ? "Critico" : tone === "warning" ? "Attenzione" : "OK"}
          </StatusPill>
          <button
            aria-label={`Elimina ${material.code}`}
            className="flex size-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-all hover:bg-[var(--danger-soft)] hover:text-[var(--danger-base)]"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(material.id);
            }}
            type="button"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </button>
      {isSelected ? (
        <span className="absolute bottom-2 right-3 flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-[var(--accent-primary)] text-white">
          <svg
            aria-hidden={true}
            className="size-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={4}
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      ) : null}
    </motion.article>
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
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Armamento");
  const [unit, setUnit] = useState("m");
  const [quantity, setQuantity] = useState("0");
  const [minQuantity, setMinQuantity] = useState("0");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const qty = Number.parseFloat(quantity);
    const minQty = Number.parseFloat(minQuantity);
    if (!code.trim() || !description.trim() || Number.isNaN(qty)) return;

    setSaving(true);
    try {
      const { createDesktopMaterial } = await import("@/lib/desktopData");
      await createDesktopMaterial({
        id: `mat_${Date.now()}`,
        code: code.trim(),
        description: description.trim(),
        category,
        unit,
        quantity: qty,
        minQuantity: minQty,
        notes: "",
      });
      dispatchDataChanged();
      onClose();
      setCode("");
      setDescription("");
      setQuantity("0");
      setMinQuantity("0");
      onCreated();
      notify({
        message: `${description.trim()} creato.`,
        title: "Materiale aggiunto",
        tone: "success",
      });
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Creazione non riuscita",
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const units = ["m", "m2", "m3", "cad", "t", "kg", "set", "lt"];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]">
        <div className="rounded-22px bg-[var(--surface-base)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between">
            <h3 className="text-16px font-bold text-[var(--text-primary)]">Nuovo materiale</h3>
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
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Es. BIN-60E1"
                  type="text"
                  value={code}
                />
              </Field>
              <Field label="Unità">
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                    onChange={(e) => setUnit(e.target.value)}
                    value={unit}
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
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrizione del materiale"
                type="text"
                value={description}
              />
            </Field>

            <Field label="Categoria">
              <div className="relative">
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(e) => setCategory(e.target.value)}
                  value={category}
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
              <Field label="Quantità iniziale">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  min="0"
                  onChange={(e) => setQuantity(e.target.value)}
                  step="any"
                  type="number"
                  value={quantity}
                />
              </Field>
              <Field label="Soglia minima">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-13px font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  min="0"
                  onChange={(e) => setMinQuantity(e.target.value)}
                  step="any"
                  type="number"
                  value={minQuantity}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <ProjectControlButton onClick={onClose} variant="ghost">
              Annulla
            </ProjectControlButton>
            <ProjectControlButton
              disabled={saving || !code.trim() || !description.trim()}
              onClick={handleSave}
              variant="primary"
            >
              {saving ? "Salvataggio..." : "Crea materiale"}
            </ProjectControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: LucideIcon;
  label: string;
  tone: "blue" | StockTone;
  value: string;
}) {
  return (
    <BezelSurface innerClassName="group flex min-h-[112px] items-center gap-3 p-4 2xl:min-h-[128px] 2xl:gap-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full 2xl:size-12",
          tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
          tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
          tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        )}
      >
        <Icon className="size-5 2xl:size-6" />
      </div>
      <div className="min-w-0">
        <div className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-20px font-bold leading-none 2xl:text-22px",
            tone === "blue" && "text-[var(--info-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "success" && "text-[var(--success-base)]",
          )}
        >
          {value}
        </div>
      </div>
    </BezelSurface>
  );
}

function QuickAction({
  detail,
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: "info" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success-base)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning-base)]"
        : "bg-[var(--info-soft)] text-[var(--info-base)]";

  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--bg-muted)]"
      onClick={onClick}
      type="button"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-13px font-bold text-[var(--text-primary)]">
          {label}
        </span>
        <span className="block truncate text-11px font-medium text-[var(--text-secondary)]">
          {detail}
        </span>
      </span>
    </button>
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
