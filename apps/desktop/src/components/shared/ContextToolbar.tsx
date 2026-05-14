import { AnimatePresence, m } from "framer-motion";
import { Download, Trash2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import { useSelectionStore } from "@/store/selection-store";

type BulkAction = {
  icon: ReactNode;
  label: string;
  run: () => void;
  tone?: "default" | "danger";
};

type ContextToolbarProps = {
  actions: BulkAction[];
  entityLabel?: string;
};

export function ContextToolbar({ actions, entityLabel = "elementi" }: ContextToolbarProps) {
  const count = useSelectionStore((state) => state.ids.size);

  return (
    <AnimatePresence>
      {count > 0 && (
        <m.div
          animate={MOTION_VARIANTS.popover.animate}
          className="mb-4 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)]/70 bg-[var(--surface-base)] px-4 py-3 shadow-soft"
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          initial={MOTION_VARIANTS.popover.initial}
          transition={MOTION_VARIANTS.popover.transition}
        >
          <span className="inline-flex items-center gap-2 text-13px font-semibold text-[var(--text-primary)]">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-12px font-bold text-[var(--text-inverse)] shadow-sm">
              {count}
            </span>
            <span>
              {count} {entityLabel} selezionat
              {count === 1 ? (entityLabel.endsWith("a") ? "a" : "o") : "i"}
            </span>
          </span>

          <span className="h-7 w-px bg-[var(--border-subtle)]" />

          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <button
                className={
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-12px font-bold ring-1 transition-all focus-visible:outline-2 focus-visible:outline-[var(--ring-focus)] focus-visible:outline-offset-2 " +
                  (action.tone === "danger"
                    ? "bg-[var(--danger-soft)] text-[var(--danger-base)] ring-[color-mix(in_srgb,var(--danger-base)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger-soft)_80%,var(--danger-base)_20%)]"
                    : "bg-[var(--bg-muted)] text-[var(--text-primary)] ring-[var(--border-subtle)] hover:bg-[var(--bg-muted-strong)]")
                }
                key={action.label}
                onClick={action.run}
                type="button"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>

          <m.button
            className="ml-auto flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            onClick={() => useSelectionStore.getState().clear()}
            title="Deseleziona tutto"
            type="button"
          >
            <XCircle className="size-4" />
          </m.button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

ContextToolbar.actions = {
  export: { icon: <Download className="size-4" />, label: "Esporta" } as BulkAction,
  delete: {
    icon: <Trash2 className="size-4" />,
    label: "Elimina",
    tone: "danger" as const,
  } as BulkAction,
};
