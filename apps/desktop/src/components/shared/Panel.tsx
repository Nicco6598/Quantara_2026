import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "sal" | "premium";
};

const variantStyles: Record<string, string> = {
  default:
    "rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)] bg-[var(--surface-base)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_20%,transparent),0_18px_42px_color-mix(in_srgb,var(--text-primary)_5%,transparent)]",
  sal: "rounded-3xl border border-[color-mix(in_srgb,var(--border-subtle)_58%,transparent)] bg-[radial-gradient(circle_at_90%_0%,color-mix(in_srgb,var(--accent-primary)_4%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--surface-base)_94%,var(--bg-muted)_6%),var(--surface-base))] shadow-[inset_0_1px_0_color-mix(in_srgb,white_20%,transparent),0_18px_42px_color-mix(in_srgb,var(--text-primary)_5%,transparent)]",
  premium:
    "rounded-3xl border border-[color-mix(in_srgb,var(--border-subtle)_62%,transparent)] bg-[radial-gradient(circle_at_86%_0%,color-mix(in_srgb,var(--accent-primary)_6%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--surface-base)_92%,var(--bg-muted)_8%),var(--surface-base))] shadow-[inset_0_1px_0_color-mix(in_srgb,white_24%,transparent),0_18px_48px_color-mix(in_srgb,var(--text-primary)_7%,transparent)]",
};

export function Panel({ children, className, variant = "default" }: PanelProps) {
  return <section className={cn(variantStyles[variant], className)}>{children}</section>;
}
