import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "quantara-button inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-fast motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-50",
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
        toolbar: "h-9 px-3",
      },
      variant: {
        default: "quantara-button-primary text-white",
        ghost:
          "quantara-button-ghost text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        outline: "quantara-button-neutral text-[var(--text-primary)]",
        secondary: "quantara-button-neutral text-[var(--text-primary)]",
        soft: "quantara-button-soft text-[var(--accent-primary)]",
        toolbar: "quantara-button-neutral text-[var(--text-primary)]",
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
