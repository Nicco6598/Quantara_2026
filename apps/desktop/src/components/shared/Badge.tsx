import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold", {
  defaultVariants: {
    variant: "neutral",
  },
  variants: {
    variant: {
      danger: "bg-[var(--danger-soft)] text-[var(--danger-base)]",
      info: "bg-[var(--info-soft)] text-[var(--info-base)]",
      neutral: "bg-[var(--bg-muted)] text-[var(--text-secondary)]",
      success: "bg-[var(--success-soft)] text-[var(--success-base)]",
      warning: "bg-[var(--warning-soft)] text-[var(--warning-base)]",
    },
  },
});

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ className, variant }))} {...props} />;
}
