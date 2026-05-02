import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "saving" | "dirty";

type SaveIndicatorProps = {
  status: SaveStatus;
  lastSavedAt: Date | null;
  className?: string;
};

const STATUS_META: Record<
  SaveStatus,
  { bg: string; shadow: string; label: string; pulse: boolean }
> = {
  dirty: {
    bg: "bg-[var(--warning-base)]",
    shadow: "shadow-[0_0_0_4px_color-mix(in_srgb,var(--warning-base)_13%,transparent)]",
    label: "Modifiche non salvate",
    pulse: true,
  },
  saving: {
    bg: "bg-[var(--info-base)]",
    shadow: "shadow-[0_0_0_4px_color-mix(in_srgb,var(--info-base)_13%,transparent)]",
    label: "Salvataggio in corso...",
    pulse: true,
  },
  saved: {
    bg: "bg-[var(--success-base)]",
    shadow: "shadow-[0_0_0_4px_color-mix(in_srgb,var(--success-base)_13%,transparent)]",
    label: "Salvato",
    pulse: false,
  },
};

export function SaveIndicator({ status, lastSavedAt, className }: SaveIndicatorProps) {
  const meta = STATUS_META[status];

  const timeLabel = useMemo(() => {
    if (!lastSavedAt) return null;
    return lastSavedAt.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSavedAt]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex items-center gap-2", className)}
        exit={{ opacity: 0, y: -4 }}
        initial={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <span
          className={cn(
            "size-[7px] rounded-full transition-all",
            meta.bg,
            meta.shadow,
            meta.pulse && "animate-pulse",
          )}
        />
        <span
          className={cn(
            "text-[11px] font-bold transition-colors",
            status === "saved" && "text-[var(--success-base)]",
            status === "saving" && "text-[var(--info-base)]",
            status === "dirty" && "text-[var(--warning-base)]",
          )}
        >
          {meta.label}
        </span>
        {status === "saved" && timeLabel && (
          <span className="text-[10px] text-[var(--text-secondary)]">alle {timeLabel}</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
