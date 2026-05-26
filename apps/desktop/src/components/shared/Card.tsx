import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
};

const paddingMap = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  children,
  className,
  innerClassName,
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-[var(--shadow-soft)]",
        hover &&
          "transition-[background,border-color,box-shadow] duration-base ease-standard hover:border-[color-mix(in_srgb,var(--accent-primary)_24%,var(--border-subtle))] hover:bg-[color-mix(in_srgb,var(--surface-base)_88%,var(--bg-muted)_12%)] hover:shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-[15px] bg-transparent", paddingMap[padding], innerClassName)}
      >
        {children}
      </div>
    </section>
  );
}
