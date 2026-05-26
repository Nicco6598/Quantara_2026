import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelVariant = "default" | "sal" | "premium" | "muted" | "danger" | "success" | "inspector";

type PanelProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  padding?: "none" | "sm" | "md" | "lg";
  title?: string;
  variant?: PanelVariant;
};

const variantStyles: Record<PanelVariant, string> = {
  default:
    "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-[var(--shadow-soft)]",
  sal: "rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%)] shadow-[var(--shadow-soft)]",
  premium:
    "rounded-2xl border border-[color-mix(in_srgb,var(--accent-primary)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%)] shadow-[var(--shadow-panel)]",
  muted: "rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] shadow-none",
  danger:
    "rounded-2xl border border-[color-mix(in_srgb,var(--danger-base)_18%,var(--danger-soft))] bg-[var(--danger-soft)]/40 shadow-none",
  success:
    "rounded-2xl border border-[color-mix(in_srgb,var(--success-base)_16%,var(--success-soft))] bg-[var(--success-soft)]/40 shadow-none",
  inspector:
    "rounded-2xl border border-[color-mix(in_srgb,var(--accent-primary)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-base)_96%,var(--accent-primary)_4%)] shadow-[var(--shadow-soft)]",
};

const paddingStyles: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function PanelHeader({
  action,
  eyebrow,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  title?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-11px font-semibold text-[var(--text-tertiary)]">{eyebrow}</p>
        ) : null}
        {title ? (
          <div className={cn("flex items-center gap-2", eyebrow && "mt-0.5")}>
            {Icon ? <Icon className="size-4 shrink-0 text-[var(--accent-primary)]" /> : null}
            <h3 className="truncate text-15px font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Panel({
  action,
  children,
  className,
  eyebrow,
  icon,
  padding = "md",
  title,
  variant = "default",
}: PanelProps) {
  const showHeader = !!(title || eyebrow);

  return (
    <section className={cn(variantStyles[variant], paddingStyles[padding], className)}>
      {showHeader ? (
        <PanelHeader
          action={action}
          {...(eyebrow !== undefined ? { eyebrow } : {})}
          {...(icon !== undefined ? { icon } : {})}
          {...(title !== undefined ? { title } : {})}
        />
      ) : null}
      {children}
    </section>
  );
}
