import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type CheckboxCellProps = {
  checked: boolean;
  onToggle: () => void;
  ariaLabel?: string;
};

export function CheckboxCell({ checked, onToggle, ariaLabel }: CheckboxCellProps) {
  return (
    <motion.button
      aria-checked={checked}
      aria-label={ariaLabel ?? "Seleziona riga"}
      className={cn(
        "flex size-[22px] items-center justify-center rounded-[6px] border transition-colors",
        checked
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-base)] hover:border-[var(--accent-primary)]/50",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      role="checkbox"
      type="button"
    >
      {checked && (
        <svg aria-label="Selezionato" className="size-3 text-white" fill="none" viewBox="0 0 12 12">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      )}
    </motion.button>
  );
}
