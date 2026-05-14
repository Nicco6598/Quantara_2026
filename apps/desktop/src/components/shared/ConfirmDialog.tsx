import { m } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { MOTION_VARIANTS } from "@/components/shared/easings";
import { ProjectControlButton } from "@/components/shared/ui-primitives";

type ConfirmDialogProps = {
  children: ReactNode;
  confirmLabel?: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "danger" | "info";
};

export function ConfirmDialog({
  children,
  confirmLabel = "Conferma",
  isOpen,
  onCancel,
  onConfirm,
  title,
  tone = "info",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm">
      <m.div
        className="w-full max-w-sm rounded-4xl bg-[color-mix(in_srgb,var(--bg-muted-strong)_66%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_84%,transparent)]"
        initial={MOTION_VARIANTS.dialog.initial}
        animate={MOTION_VARIANTS.dialog.animate}
        transition={MOTION_VARIANTS.dialog.transition}
      >
        <div className="rounded-22px bg-[var(--surface-base)] p-5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--surface-highlight)_72%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)]">
          <div className="flex items-center justify-between">
            <h3 className="text-16px font-semibold text-[var(--text-primary)]">{title}</h3>
            <button
              className="flex size-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              onClick={onCancel}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 text-13px leading-6 text-[var(--text-secondary)]">{children}</div>
          <div className="mt-5 flex justify-end gap-3">
            <ProjectControlButton onClick={onCancel} variant="ghost">
              Annulla
            </ProjectControlButton>
            <ProjectControlButton
              className={
                tone === "danger"
                  ? "!bg-[var(--danger-base)] !text-white hover:!bg-[var(--danger-soft)] hover:!text-[var(--danger-base)]"
                  : ""
              }
              onClick={onConfirm}
              variant="primary"
            >
              {confirmLabel}
            </ProjectControlButton>
          </div>
        </div>
      </m.div>
    </div>
  );
}
