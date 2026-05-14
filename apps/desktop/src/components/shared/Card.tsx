import { m } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION_DURATION, SPRING_EASE } from "@/components/shared/easings";
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
    <m.section
      className={cn(
        "min-w-0 rounded-22px border border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)] bg-[var(--surface-base)] shadow-[var(--shadow-soft)]",
        hover && "transition-shadow duration-slow ease-standard hover:shadow-[var(--shadow-panel)]",
        className,
      )}
      initial={{ opacity: 0, y: 18, scale: 0.992 }}
      transition={{ duration: MOTION_DURATION.reveal, ease: SPRING_EASE }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
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
    </m.section>
  );
}
