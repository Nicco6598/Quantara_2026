import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background,border-color,color,box-shadow,transform] duration-fast motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "h-9 px-3.5",
        icon: "size-9",
        sm: "h-8 px-3 text-12px",
        toolbar: "h-8 px-3 text-12px",
      },
      variant: {
        primary:
          "border border-[var(--button-primary-border)] bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-[0_1px_2px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)] hover:bg-[var(--accent-primary-hover)]",
        secondary:
          "border border-[color-mix(in_srgb,var(--accent-primary)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--surface-base))] text-[var(--accent-primary)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_12%,var(--surface-base))]",
        destructive:
          "border border-[color-mix(in_srgb,var(--danger-base)_32%,var(--border-subtle))] bg-[var(--danger-base)] text-[var(--text-inverse)] shadow-[0_1px_2px_color-mix(in_srgb,var(--danger-base)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger-base)_90%,black_10%)]",
        ghost:
          "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
        outline:
          "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] shadow-[0_1px_1px_color-mix(in_srgb,var(--text-primary)_4%,transparent)] hover:bg-[var(--bg-muted)]",
        icon: "border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
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
