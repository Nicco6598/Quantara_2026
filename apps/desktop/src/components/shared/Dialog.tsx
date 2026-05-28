import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { motionVariants } from "@/motion";

type DialogProps = {
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
  className?: string;
  closeOnOverlay?: boolean;
  contentClassName?: string;
  isOpen: boolean;
  onClose: () => void;
  role?: "alertdialog" | "dialog";
  title?: string;
  zIndex?: number | string;
};

export function Dialog({
  ariaDescribedBy,
  ariaLabelledBy,
  children,
  className,
  closeOnOverlay = true,
  contentClassName,
  isOpen,
  onClose,
  role = "dialog",
  title,
  zIndex = "var(--z-dialog)",
}: DialogProps) {
  const titleId = useId();
  const labelledBy = ariaLabelledBy ?? (title ? titleId : undefined);

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <m.div
          aria-describedby={ariaDescribedBy}
          aria-labelledby={labelledBy}
          aria-modal="true"
          animate={motionVariants.dialogBackdrop.animate}
          className="fixed inset-0 flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm"
          exit={motionVariants.dialogBackdrop.exit}
          initial={motionVariants.dialogBackdrop.initial}
          onClick={closeOnOverlay ? onClose : undefined}
          role={role}
          style={{ zIndex }}
          transition={motionVariants.dialogBackdrop.transition}
        >
          <m.div
            animate={motionVariants.dialogPanel.animate}
            className={cn(
              "w-full max-w-sm rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]",
              className,
            )}
            exit={motionVariants.dialogPanel.exit}
            initial={motionVariants.dialogPanel.initial}
            onClick={(e) => e.stopPropagation()}
            transition={motionVariants.dialogPanel.transition}
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
        </m.div>
      ) : null}
    </AnimatePresence>,
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
