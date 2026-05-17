import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

export function EmptyState({
  action,
  className,
  description,
  icon: Icon,
  secondaryAction,
  title,
}: {
  action?: EmptyStateAction;
  className?: string;
  description: string;
  icon?: LucideIcon;
  secondaryAction?: EmptyStateAction;
  title: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-22px border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-muted)_72%,var(--surface-base)_28%)] p-8 text-center shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--surface-highlight)_48%,transparent)] sm:p-10",
        className,
      )}
    >
      {Icon ? (
        <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-22px bg-[var(--info-soft)] text-[var(--info-base)]">
          <Icon className="size-5" strokeWidth={1.8} />
        </div>
      ) : null}
      <div
        className={cn("min-w-0 text-15px font-bold text-[var(--text-primary)]", Icon ? "mt-4" : "")}
      >
        {title}
      </div>
      <p className="mx-auto mt-2 max-w-[360px] text-13px font-medium leading-5 text-[var(--text-secondary)]">
        {description}
      </p>
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button
              className="max-w-full"
              {...(action.icon ? { icon: action.icon } : {})}
              onClick={action.onClick}
              variant={action.variant ?? "primary"}
            >
              <span className="min-w-0 truncate">{action.label}</span>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              className="max-w-full"
              {...(secondaryAction.icon ? { icon: secondaryAction.icon } : {})}
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant ?? "secondary"}
            >
              <span className="min-w-0 truncate">{secondaryAction.label}</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
