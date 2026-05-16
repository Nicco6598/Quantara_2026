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
        "min-w-0 rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[var(--surface-base)] shadow-[var(--shadow-soft)]",
        hover && "transition-shadow duration-slow ease-standard hover:shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-22px bg-[var(--surface-base)]",
          paddingMap[padding],
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
