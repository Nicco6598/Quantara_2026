import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MOTION_DURATION, MOTION_VARIANTS, SPRING_EASE } from "@/components/shared/easings";
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
    <m.button
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
      transition={{ duration: MOTION_DURATION.base, ease: SPRING_EASE }}
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
    </m.button>
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
        className="fixed inset-0 z-[var(--z-dropdown-portal)] cursor-default"
        onClick={onClose}
        type="button"
      />
      <m.div
        className="fixed z-[var(--z-dropdown-portal)] w-56 overflow-hidden rounded-xl bg-[var(--surface-base)] p-1.5 shadow-soft ring-1 ring-[var(--border-subtle)]"
        initial={MOTION_VARIANTS.popover.initial}
        animate={MOTION_VARIANTS.popover.animate}
        style={{ left: position.left, top: position.top }}
        transition={MOTION_VARIANTS.popover.transition}
      >
        {children}
      </m.div>
    </>,
    document.body,
  );
}
