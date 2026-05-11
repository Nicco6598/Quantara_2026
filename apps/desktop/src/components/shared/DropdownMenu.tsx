import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BUTTER_EASE } from "@/components/shared/easings";
import { cn } from "@/lib/utils";

const MENU_WIDTH = 224;

export function DropdownItem({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "danger" | "neutral";
}) {
  return (
    <motion.button
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-13px font-semibold transition-colors",
        tone === "danger"
          ? "text-[var(--danger-base)] hover:bg-[var(--danger-soft)]/55"
          : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      type="button"
      transition={{ duration: 0.32, ease: BUTTER_EASE }}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-10px",
          tone === "danger"
            ? "bg-[var(--danger-soft)] text-[var(--danger-base)]"
            : "bg-[var(--info-soft)] text-[var(--info-base)]",
        )}
      >
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-[var(--border-subtle)]/70" />;
}

export function DropdownMenu({
  isOpen,
  onClose,
  triggerRef,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const [position, setPosition] = useState({ left: 16, top: 16 });

  useEffect(() => {
    if (!isOpen) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect && typeof window !== "undefined") {
      setPosition({
        left: Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
        top: Math.min(rect.bottom + 6, window.innerHeight - 260),
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        aria-label="Chiudi menu"
        className="fixed inset-0 z-[139] cursor-default"
        onClick={onClose}
        type="button"
      />
      <motion.div
        className="fixed z-[140] w-56 overflow-hidden rounded-xl bg-[var(--surface-base)] p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.2)] ring-1 ring-[var(--border-subtle)]"
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{ left: position.left, top: position.top }}
        transition={{ duration: 0.22, ease: BUTTER_EASE }}
      >
        {children}
      </motion.div>
    </>,
    document.body,
  );
}
