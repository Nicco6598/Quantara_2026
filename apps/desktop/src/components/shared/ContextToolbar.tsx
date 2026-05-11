import { AnimatePresence, motion } from "framer-motion";
import { Download, Trash2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { SOFT_EASE } from "@/components/shared/easings";
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
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex items-center gap-3 rounded-2xl bg-[var(--surface-base)] px-3.5 py-2.5 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.12)] ring-1 ring-[var(--border-subtle)]"
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: SOFT_EASE }}
        >
          <span className="inline-flex items-center gap-1.5 text-13px font-semibold text-[var(--text-primary)]">
            <span className="flex size-6 items-center justify-center rounded-md bg-[var(--accent-primary)] text-11px font-bold text-white">
              {count}
            </span>
            {entityLabel} selezionat{count === 1 ? (entityLabel.endsWith("a") ? "a" : "o") : "i"}
          </span>

          <div className="mx-1.5 h-[26px] w-px bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--border-strong)_74%,transparent),transparent)]" />

          <div className="flex items-center gap-1.5">
            {actions.map((action) => (
              <motion.button
                className={
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-12px font-bold ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring-focus)] focus-visible:outline-offset-2 " +
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
              </motion.button>
            ))}
          </div>

          <motion.button
            className="ml-auto flex size-9 items-center justify-center rounded-full text-[var(--text-secondary)] ring-1 ring-transparent transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] hover:ring-[var(--border-subtle)]"
            onClick={() => useSelectionStore.getState().clear()}
            title="Deseleziona tutto"
            type="button"
          >
            <XCircle className="size-4" />
          </motion.button>
        </motion.div>
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
