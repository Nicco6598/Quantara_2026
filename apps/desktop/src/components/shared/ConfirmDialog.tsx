import type { ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";

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
  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="mt-3 text-13px leading-6 text-[var(--text-secondary)]">{children}</div>
      <DialogActions>
        <Button onClick={onCancel} variant="ghost">
          Annulla
        </Button>
        <Button onClick={onConfirm} variant={tone === "danger" ? "destructive" : "primary"}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
