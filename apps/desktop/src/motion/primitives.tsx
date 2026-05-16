import { m } from "framer-motion";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { motionVariants } from "./variants";

type MotionSurfaceProps = ComponentPropsWithoutRef<typeof m.section> & {
  reveal?: boolean;
};

export function MotionSurface({ className, reveal = false, ...props }: MotionSurfaceProps) {
  return (
    <m.section
      className={cn(className)}
      {...(reveal
        ? {
            animate: motionVariants.subtleReveal.animate,
            initial: motionVariants.subtleReveal.initial,
            transition: motionVariants.subtleReveal.transition,
          }
        : {})}
      {...props}
    />
  );
}
