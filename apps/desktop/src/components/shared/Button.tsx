import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-fast motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4",
        icon: "size-10",
        sm: "h-9 px-3",
      },
      variant: {
        default:
          "bg-[var(--accent-primary)] text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--accent-primary)_18%,transparent)] hover:bg-[var(--accent-primary-hover)]",
        ghost:
          "hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        outline:
          "border border-[color-mix(in_srgb,var(--border-subtle)_72%,transparent)] bg-[var(--surface-base)] text-[var(--text-primary)] shadow-[0_1px_2px_rgb(16_24_40_/_4%)] hover:bg-[var(--bg-muted)]",
        secondary:
          "bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--bg-muted-strong)]",
      },
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ className, size, variant }))} {...props} />;
}
