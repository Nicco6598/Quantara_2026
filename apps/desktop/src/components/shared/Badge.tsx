import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold", {
  defaultVariants: {
    variant: "neutral",
  },
  variants: {
    variant: {
      danger: "bg-danger-soft text-danger",
      info: "bg-info-soft text-info",
      neutral: "bg-muted text-secondary",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
    },
  },
});

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ className, variant }))} {...props} />;
}
