import { X } from "lucide-react";
import { useEffect, useReducer } from "react";
import { Button } from "@/components/shared/Button";
import { type DesktopMaterial, updateDesktopMaterial } from "@/lib/desktopData";
import { dispatchDataChanged } from "@/lib/sync-events";
import { useToast } from "@/components/shared/ToastProvider";
import { CATEGORIES, type FormField, formReducer } from "../materials-screen-state";

export function AddMaterialModal({
  isOpen,
  material,
  onClose,
  onCreated,
  onSaved,
}: {
  isOpen: boolean;
  material?: DesktopMaterial | null;
  onClose: () => void;
  onCreated: () => void;
  onSaved?: (updated: DesktopMaterial) => void;
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
        onSaved?.(payload);
      } else {
        const { createDesktopMaterial } = await import("@/lib/desktopData");
        await createDesktopMaterial(payload);
        onSaved?.(payload);
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
  const set =
    (field: FormField) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      formDispatch({ type: "SET_FIELD", field, value: event.target.value });

  return (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
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
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
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
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
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

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="block">
      <div className="mb-1.5 text-12px font-semibold text-[var(--text-secondary)]">{label}</div>
      {children}
    </div>
  );
}
