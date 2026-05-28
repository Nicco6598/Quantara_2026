import { AlertTriangle, Info, type LucideIcon, Trash2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Dialog, DialogActions } from "@/components/shared/Dialog";
import { cn } from "@/lib/utils";

export type ConfirmDialogTone = "danger" | "info" | "warning";

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  closeOnConfirm?: boolean;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  icon?: LucideIcon;
  isConfirming?: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  tone?: ConfirmDialogTone;
  zIndex?: number | string;
};

const toneConfig: Record<
  ConfirmDialogTone,
  {
    defaultIcon: LucideIcon;
    iconClassName: string;
    shellClassName: string;
    confirmVariant: "destructive" | "primary";
  }
> = {
  danger: {
    confirmVariant: "destructive",
    defaultIcon: Trash2,
    iconClassName: "text-[var(--danger-base)]",
    shellClassName:
      "bg-[var(--danger-soft)] ring-[color-mix(in_srgb,var(--danger-base)_18%,transparent)]",
  },
  info: {
    confirmVariant: "primary",
    defaultIcon: Info,
    iconClassName: "text-[var(--info-base)]",
    shellClassName:
      "bg-[var(--info-soft)] ring-[color-mix(in_srgb,var(--info-base)_16%,transparent)]",
  },
  warning: {
    confirmVariant: "primary",
    defaultIcon: AlertTriangle,
    iconClassName: "text-[var(--warning-base)]",
    shellClassName:
      "bg-[var(--warning-soft)] ring-[color-mix(in_srgb,var(--warning-base)_18%,transparent)]",
  },
};

export function ConfirmDialog({
  cancelLabel = "Annulla",
  children,
  closeOnConfirm = true,
  confirmDisabled = false,
  confirmLabel = "Conferma",
  icon,
  isConfirming = false,
  isOpen,
  onCancel,
  onConfirm,
  title,
  tone = "info",
  zIndex,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const palette = toneConfig[tone];
  const Icon = icon ?? palette.defaultIcon;
  const isBusy = isConfirming || isSubmitting;

  const handleCancel = useCallback(() => {
    if (isBusy) {
      return;
    }
    onCancel();
  }, [isBusy, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (isBusy || confirmDisabled) {
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.resolve(onConfirm());
      if (closeOnConfirm) {
        onCancel();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [closeOnConfirm, confirmDisabled, isBusy, onCancel, onConfirm]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isBusy) {
        return;
      }
      event.preventDefault();
      handleCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCancel, isBusy, isOpen]);

  return (
    <Dialog
      {...(children ? { ariaDescribedBy: descriptionId } : {})}
      ariaLabelledBy={titleId}
      closeOnOverlay={!isBusy}
      contentClassName="p-5"
      isOpen={isOpen}
      onClose={handleCancel}
      role={tone === "danger" ? "alertdialog" : "dialog"}
      {...(zIndex !== undefined ? { zIndex } : {})}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full ring-1",
            palette.shellClassName,
          )}
        >
          <Icon className={cn("size-5", palette.iconClassName)} strokeWidth={1.8} />
        </span>

        <div className="min-w-0 flex-1">
          <h3
            className="text-15px font-semibold leading-snug text-[var(--text-primary)]"
            id={titleId}
          >
            {title}
          </h3>
          {children ? (
            <div
              className="mt-2 text-13px leading-6 text-[var(--text-secondary)] [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-4"
              id={descriptionId}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>

      <DialogActions>
        <Button
          autoFocus={tone === "danger"}
          disabled={isBusy}
          onClick={handleCancel}
          type="button"
          variant="ghost"
        >
          {cancelLabel}
        </Button>
        <Button
          autoFocus={tone !== "danger"}
          disabled={isBusy || confirmDisabled}
          {...(tone === "danger" ? { icon: Trash2 } : {})}
          onClick={() => void handleConfirm()}
          type="button"
          variant={palette.confirmVariant}
        >
          {isBusy ? "Attendere..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
