import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

export function EmptyState({
  action,
  className,
  description,
  icon: Icon,
  title,
}: {
  action?: {
    icon?: LucideIcon;
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  className?: string;
  description: string;
  icon?: LucideIcon;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-muted)]/35 p-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info-base)]">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className={cn("text-15px font-bold text-[var(--text-primary)]", Icon ? "mt-4" : "")}>
        {title}
      </div>
      <p className="mx-auto mt-2 max-w-[360px] text-13px font-medium leading-5 text-[var(--text-secondary)]">
        {description}
      </p>
      {action ? (
        <Button
          className="mt-5"
          {...(action.icon ? { icon: action.icon } : {})}
          onClick={action.onClick}
          variant={action.variant ?? "primary"}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
