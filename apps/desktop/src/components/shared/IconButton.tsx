import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "quantara-icon-button inline-flex cursor-pointer items-center justify-center rounded-full transition-all duration-fast motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "md",
      variant: "ghost",
    },
    variants: {
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-12",
      },
      variant: {
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
        outline:
          "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
        primary: "bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:brightness-110",
        secondary:
          "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      },
    },
  },
);

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    active?: boolean;
    icon: LucideIcon;
    label: string;
    tooltip?: string;
  };

export function IconButton({
  active,
  className,
  disabled,
  icon: Icon,
  label,
  size,
  tooltip,
  variant,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        iconButtonVariants({ className, size, variant }),
        active && variant === "ghost" && "bg-[var(--bg-muted)] text-[var(--accent-primary)]",
        active &&
          variant === "outline" &&
          "border-[var(--accent-primary)] text-[var(--accent-primary)]",
      )}
      disabled={disabled}
      title={tooltip}
      type="button"
      {...props}
    >
      <Icon
        className={cn(
          "shrink-0",
          size === "sm" ? "size-4" : size === "lg" ? "size-5" : "size-[18px]",
        )}
        strokeWidth={1.8}
      />
    </button>
  );
}
