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
    "rounded-[18px] border border-[color-mix(in_srgb,var(--border-subtle)_64%,transparent)] bg-[var(--surface-base)] shadow-[0_1px_2px_color-mix(in_srgb,var(--text-primary)_4%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--surface-highlight)_24%,transparent)]",
  sal: "rounded-[18px] border border-[color-mix(in_srgb,var(--border-subtle)_64%,transparent)] bg-[radial-gradient(circle_at_90%_0%,color-mix(in_srgb,var(--accent-primary)_4%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%),var(--surface-base))] shadow-[0_1px_2px_color-mix(in_srgb,var(--text-primary)_4%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--surface-highlight)_24%,transparent)]",
  premium:
    "rounded-[18px] border border-[color-mix(in_srgb,var(--border-subtle)_66%,transparent)] bg-[radial-gradient(circle_at_86%_0%,color-mix(in_srgb,var(--accent-primary)_6%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%),var(--surface-base))] shadow-[0_4px_14px_color-mix(in_srgb,var(--text-primary)_5%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--surface-highlight)_28%,transparent)]",
  muted:
    "rounded-[18px] border border-[color-mix(in_srgb,var(--border-subtle)_56%,transparent)] bg-[var(--bg-muted)] shadow-none",
  danger:
    "rounded-[18px] border border-[var(--danger-soft)] bg-[var(--danger-soft)]/40 shadow-none",
  success:
    "rounded-[18px] border border-[var(--success-soft)] bg-[var(--success-soft)]/40 shadow-none",
  inspector:
    "rounded-[18px] border border-[color-mix(in_srgb,var(--border-subtle)_64%,transparent)] bg-[color-mix(in_srgb,var(--surface-base)_96%,var(--accent-primary)_4%)] shadow-[0_1px_2px_color-mix(in_srgb,var(--text-primary)_4%,transparent)]",
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
          <p className="text-10px font-semibold uppercase tracking-0_14em text-[var(--text-secondary)]">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="size-4 shrink-0 text-[var(--info-base)]" /> : null}
            <h3 className="truncate text-15px font-bold text-[var(--text-primary)]">{title}</h3>
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
