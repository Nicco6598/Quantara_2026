import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "quantara-button inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-fast motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "h-10 px-4",
        icon: "size-10",
        sm: "h-9 px-3",
        toolbar: "h-9 px-3",
      },
      variant: {
        primary: "quantara-button-primary text-white",
        secondary: "quantara-button-soft text-[var(--accent-primary)]",
        destructive: "quantara-button-destructive text-white",
        ghost:
          "quantara-button-ghost text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        outline: "quantara-button-neutral text-[var(--text-primary)]",
        icon: "quantara-button-neutral text-[var(--text-secondary)]",
      },
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    icon?: LucideIcon;
  };

export function Button({
  asChild,
  className,
  icon: Icon,
  size,
  variant,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ className, size, variant }))} {...props}>
      {Icon ? <Icon className="size-4" strokeWidth={1.8} /> : null}
      {children}
    </Comp>
  );
}
