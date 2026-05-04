import {
  AlertTriangle,
  Bell,
  type LucideIcon,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClearFiltersButton, FilterSearch } from "@/components/filters";
import { ScreenHero } from "@/components/shared/ScreenHero";
import { useToast } from "@/components/shared/ToastProvider";
import { BezelSurface, ProjectControlButton } from "@/features/projects/components/workspace-ui";
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
        await deleteDesktopMaterial(materialId);
        dispatchDataChanged();
        setSelectedMaterialId((current) => (current === materialId ? null : current));
        notify({ message: "Materiale eliminato.", title: "Eliminato", tone: "success" });
      } catch (error) {
        notify({
          message: error instanceof Error ? error.message : String(error),
          title: "Eliminazione non riuscita",
          tone: "danger",
        });
      }
    },
    [notify],
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
              <PanelTitle>Categorie</PanelTitle>
            </div>
            <div className="mt-3 space-y-1.5">
              {categories.names.map((cat) => {
                const count =
                  cat === "Tutti" ? materials.length : (categories.counts.get(cat) ?? 0);
                return (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold transition-colors",
                      selectedCategory === cat || (!selectedCategory && cat === "Tutti")
                        ? "bg-[var(--info-soft)] text-[var(--info-base)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
                    )}
                    key={cat}
                    onClick={() => setSelectedCategory(cat === "Tutti" ? null : cat)}
                    type="button"
                  >
                    <span>{cat}</span>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      >
        <div className="grid grid-flow-dense gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            caption="Quantità totale in magazzino"
            delta={`${materials.length} materiali`}
            icon={Warehouse}
            label="Valore stock"
            tone="blue"
            value={`${Math.round(metrics.totalStock)}`}
          />
          <MetricCard
            caption="Sotto la soglia minima"
            delta={`${metrics.zero} esauriti`}
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

      <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="min-w-0 p-0">
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-3 lg:p-4 xl:flex-row xl:items-center xl:justify-between">
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
            </div>

            <ProjectControlButton
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
            >
              Nuovo materiale
            </ProjectControlButton>
          </div>

          {/* --- Desktop table view --- */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2 text-[10px]">Materiale</th>
                  <th className="px-3 py-2 text-[10px]">Categoria</th>
                  <th className="px-3 py-2 text-[10px]">Stock</th>
                  <th className="px-3 py-2 text-[10px]">Soglia min</th>
                  <th className="px-3 py-2 text-[10px]">Cop.</th>
                  <th className="px-3 py-2 text-[10px]">Stato</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((mat) => (
                  <MaterialTableRow
                    isSelected={mat.id === selectedMaterialId}
                    key={mat.id}
                    material={mat}
                    onDelete={handleDelete}
                    onSelect={() =>
                      setSelectedMaterialId(mat.id === selectedMaterialId ? null : mat.id)
                    }
                  />
                ))}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-[13px] text-[var(--text-secondary)]"
                      colSpan={7}
                    >
                      Nessun materiale trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- Mobile card view --- */}
          <div className="divide-y divide-[var(--border-subtle)] sm:hidden">
            {filteredMaterials.map((mat) => (
              <MobileMaterialCard
                key={mat.id}
                material={mat}
                onDelete={handleDelete}
                onSelect={() =>
                  setSelectedMaterialId(mat.id === selectedMaterialId ? null : mat.id)
                }
                isSelected={mat.id === selectedMaterialId}
              />
            ))}
            {filteredMaterials.length === 0 && (
              <div className="px-3 py-8 text-center text-[13px] text-[var(--text-secondary)]">
                Nessun materiale trovato
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              {filteredMaterials.length} di {materials.length} materiali
            </span>
          </div>
        </Panel>

        <aside className="space-y-4">
          {selectedMaterial ? (
            <MaterialDetail material={selectedMaterial} />
          ) : (
            <Panel>
              <PanelTitle>Dettaglio materiale</PanelTitle>
              <div className="mt-6 text-center text-[13px] text-[var(--text-secondary)]">
                Seleziona un materiale per vedere dettagli e movimenti
              </div>
            </Panel>
          )}

          <Panel>
            <PanelTitle>Azioni rapide</PanelTitle>
            <div className="mt-4 grid gap-2">
              <ProjectControlButton
                icon={Plus}
                onClick={() => setIsCreateModalOpen(true)}
                variant="neutral"
              >
                Carica nuovo materiale
              </ProjectControlButton>
              <ProjectControlButton icon={ShoppingCart} variant="primary">
                Crea ordine materiale
              </ProjectControlButton>
            </div>
          </Panel>
        </aside>
      </section>

      <AddMaterialModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadMaterials}
      />
    </main>
  );
}

function MaterialTableRow({
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

  return (
    <tr
      className={cn(
        "border-b border-[var(--border-subtle)] text-[13px] transition-colors hover:bg-[var(--bg-muted)] cursor-pointer",
        isSelected && "bg-[var(--info-soft)]/45",
      )}
      onClick={onSelect}
    >
      <td className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <MaterialIcon tone={categoryColorMap[material.category] ?? "blue"} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
              {material.code}
            </div>
            <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
              {material.description}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <CategoryPill category={material.category} />
      </td>
      <td className="px-3 py-2">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">
          {formatQuantity(material.quantity, material.unit)}
        </div>
        <div
          className={cn(
            "mt-1 text-[11px] font-bold",
            tone === "danger" ? "text-[var(--danger-base)]" : "text-[var(--success-base)]",
          )}
        >
          {material.quantity === 0
            ? "Esaurito"
            : material.quantity < material.minQuantity
              ? "Sotto soglia"
              : "Disponibile"}
        </div>
      </td>
      <td className="px-3 py-2 text-[12px] font-medium text-[var(--text-primary)]">
        {formatQuantity(material.minQuantity, material.unit)}
      </td>
      <td className="px-3 py-2">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{coverage}%</div>
        <CoverageBar coverage={coverage} tone={tone} />
      </td>
      <td className="px-3 py-2">
        <StatusPill tone={tone}>
          {tone === "danger" ? "Critico" : tone === "warning" ? "Attenzione" : "OK"}
        </StatusPill>
      </td>
      <td className="px-2 py-2 text-right text-[var(--text-secondary)]">
        <button
          className="rounded-full p-1.5 transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--danger-base)]"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(material.id);
          }}
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}

function MobileMaterialCard({
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

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
        isSelected && "bg-[var(--info-soft)]/45",
      )}
      onClick={onSelect}
    >
      <MaterialIcon tone={categoryColorMap[material.category] ?? "blue"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
            {material.code}
          </span>
          <StatusPill tone={tone}>
            {tone === "danger" ? "Critico" : tone === "warning" ? "Attenzione" : "OK"}
          </StatusPill>
        </div>
        <div className="mt-0.5 truncate text-[12px] font-medium text-[var(--text-secondary)]">
          {material.description}
        </div>
        <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--text-secondary)]">
          <span>{formatQuantity(material.quantity, material.unit)}</span>
          <span>Soglia {formatQuantity(material.minQuantity, material.unit)}</span>
          <span>{coverage}% cop.</span>
        </div>
        <div className="mt-1.5">
          <CoverageBar coverage={coverage} tone={tone} />
        </div>
      </div>
      <button
        className="shrink-0 rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted-strong)] hover:text-[var(--danger-base)]"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(material.id);
        }}
        type="button"
      >
        <Trash2 className="size-4" />
      </button>
    </button>
  );
}

function MaterialDetail({ material }: { material: DesktopMaterial }) {
  const tone = toneForQuantity(material.quantity, material.minQuantity);
  const coverage =
    material.minQuantity > 0
      ? Math.min(100, Math.round((material.quantity / material.minQuantity) * 100))
      : 100;

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <PanelTitle>Focus materiale</PanelTitle>
      </div>

      <div className="mt-4 rounded-[14px] border-[0.5px] border-[var(--border-subtle)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MaterialIcon tone={categoryColorMap[material.category] ?? "blue"} />
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold text-[var(--text-primary)]">
                {material.code}
              </div>
              <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-secondary)]">
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
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-[var(--text-secondary)]">Copertura</span>
            <span className="text-[13px] font-bold text-[var(--text-primary)]">{coverage}%</span>
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

  const categories = ["Armamento", "Sottofondo", "Opere civili", "Impianti"];
  const units = ["m", "m2", "m3", "cad", "t", "kg", "set", "lt"];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]">
        <div className="rounded-[22px] bg-[var(--surface-base)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Nuovo materiale</h3>
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
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Es. BIN-60E1"
                  type="text"
                  value={code}
                />
              </Field>
              <Field label="Unità">
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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
                className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrizione del materiale"
                type="text"
                value={description}
              />
            </Field>

            <Field label="Categoria">
              <div className="relative">
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 pr-8 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  onChange={(e) => setCategory(e.target.value)}
                  value={category}
                >
                  {categories.map((c) => (
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
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
                  min="0"
                  onChange={(e) => setQuantity(e.target.value)}
                  step="any"
                  type="number"
                  value={quantity}
                />
              </Field>
              <Field label="Soglia minima">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[13px] font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
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

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <BezelSurface innerClassName={cn("p-4", className)}>{children}</BezelSurface>;
}

function PanelTitle({ children }: { children: string }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

function MetricCard({
  delta,
  icon: Icon,
  label,
  tone,
  value,
}: {
  caption: string;
  delta?: string;
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
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-[20px] font-bold leading-none 2xl:text-[22px]",
            tone === "blue" && "text-[var(--info-base)]",
            tone === "danger" && "text-[var(--danger-base)]",
            tone === "warning" && "text-[var(--warning-base)]",
            tone === "success" && "text-[var(--success-base)]",
          )}
        >
          {value}
        </div>
        {delta ? (
          <div
            className={cn(
              "mt-3 text-[11px] font-bold",
              tone === "danger" ? "text-[var(--danger-base)]" : "text-[var(--success-base)]",
            )}
          >
            {delta}
          </div>
        ) : null}
      </div>
    </BezelSurface>
  );
}

function CategoryPill({ category }: { category: string }) {
  const color = categoryColorMap[category] ?? "blue";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 text-[11px] font-bold",
        color === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
        color === "green" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        color === "orange" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        color === "purple" && "bg-[var(--bg-muted-strong)] text-[var(--accent-secondary)]",
      )}
    >
      {category}
    </span>
  );
}

function MaterialIcon({ tone }: { tone: CategoryTone }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        tone === "blue" && "bg-[var(--info-soft)] text-[var(--info-base)]",
        tone === "green" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "orange" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "purple" && "bg-[var(--bg-muted-strong)] text-[var(--accent-secondary)]",
      )}
    >
      <Package className="size-5" />
    </span>
  );
}

function CoverageBar({ coverage, tone }: { coverage: number; tone: StockTone }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-muted-strong)]">
      <div
        className={cn(
          "h-full rounded-full",
          tone === "success" && "bg-[var(--success-base)]",
          tone === "warning" && "bg-[var(--warning-base)]",
          tone === "danger" && "bg-[var(--danger-base)]",
        )}
        style={{ width: `${Math.min(coverage, 100)}%` }}
      />
    </div>
  );
}

function StatusPill({ children, tone }: { children: string; tone: StockTone }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold",
        tone === "success" && "bg-[var(--success-soft)] text-[var(--success-base)]",
        tone === "warning" && "bg-[var(--warning-soft)] text-[var(--warning-base)]",
        tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger-base)]",
      )}
    >
      {children}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-right text-[13px] font-bold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="block">
      <div className="mb-1.5 text-[12px] font-semibold text-[var(--text-secondary)]">{label}</div>
      {children}
    </div>
  );
}
