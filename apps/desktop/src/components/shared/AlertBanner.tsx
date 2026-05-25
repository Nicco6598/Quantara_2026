import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

type AlertBannerAction = {
  label: string;
  onClick: () => void;
};

export type AlertBannerProps = {
  action?: AlertBannerAction;
  className?: string;
  closable?: boolean;
  description?: string;
  icon?: LucideIcon;
  title: string;
  tone: "danger" | "info" | "success" | "warning";
};

const toneStyles: Record<string, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
  info: "bg-[var(--info-soft)] text-[var(--info-base)]",
  success: "bg-[var(--success-soft)] text-[var(--success-base)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
};

export function AlertBanner({
  action,
  className,
  closable = false,
  description,
  icon: Icon,
  title,
  tone,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn("flex items-start gap-3 rounded-22px p-4", toneStyles[tone], className)}
      role="alert"
    >
      {Icon ? <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-14px font-bold">{title}</p>
        {description ? (
          <p className="mt-1 text-13px font-medium opacity-80">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action ? (
          <Button onClick={action.onClick} size="sm" variant="secondary">
            {action.label}
          </Button>
        ) : null}
        {closable ? (
          <button
            aria-label="Dismiss"
            className="flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
            onClick={() => setDismissed(true)}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
