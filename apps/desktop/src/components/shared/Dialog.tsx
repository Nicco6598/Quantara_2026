import { m } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { createPortal } from "react-dom";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import { cn } from "@/lib/utils";

type DialogProps = {
  children: ReactNode;
  className?: string;
  closeOnOverlay?: boolean;
  contentClassName?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  zIndex?: number;
};

export function Dialog({
  children,
  className,
  closeOnOverlay = true,
  contentClassName,
  isOpen,
  onClose,
  title,
  zIndex = 80,
}: DialogProps) {
  const titleId = useId();

  if (!isOpen) return null;

  return createPortal(
    <div
      aria-labelledby={title ? titleId : undefined}
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm"
      role="dialog"
      style={{ zIndex }}
    >
      <button
        aria-label="Chiudi"
        className="absolute inset-0 cursor-default"
        disabled={!closeOnOverlay}
        onClick={closeOnOverlay ? onClose : undefined}
        type="button"
      />
      <m.div
        className={cn(
          "w-full max-w-sm rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]",
          className,
        )}
        initial={MOTION_VARIANTS.dialog.initial}
        animate={MOTION_VARIANTS.dialog.animate}
        transition={MOTION_VARIANTS.dialog.transition}
      >
        <div
          className={cn(
            "rounded-22px bg-[var(--surface-base)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]",
            contentClassName,
          )}
        >
          {title ? (
            <div className="flex items-center justify-between">
              <h3 className="text-16px font-semibold text-[var(--text-primary)]" id={titleId}>
                {title}
              </h3>
              <button
                className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                onClick={onClose}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </m.div>
    </div>,
    document.body,
  );
}

export function DialogActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-5 flex justify-end gap-3", className)}>{children}</div>;
}
