import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const toolbarButtonVariants = cva(
  "quantara-toolbar-button inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-fast motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "md",
      variant: "default",
    },
    variants: {
      size: {
        sm: "h-8 px-3 text-12px",
        md: "h-9 px-4 text-13px",
      },
      variant: {
        default:
          "bg-[var(--bg-muted-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        primary: "bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:brightness-110",
        danger:
          "bg-[var(--danger-soft)] text-[var(--danger-base)] hover:bg-[var(--danger-soft)]/80",
      },
    },
  },
);

export type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof toolbarButtonVariants> & {
    active?: boolean;
    icon?: LucideIcon;
    label: string;
  };

export function ToolbarButton({
  active,
  className,
  disabled,
  icon: Icon,
  label,
  size,
  variant = "default",
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        toolbarButtonVariants({ className, size, variant }),
        active && variant === "default" && "bg-[var(--accent-primary)] text-[var(--text-inverse)]",
      )}
      disabled={disabled}
      type="button"
      {...props}
    >
      {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.8} /> : null}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
