export { shouldReduceMotion, prefersReducedMotion } from "./policies";
export { MotionSurface } from "./primitives";
export { motionDuration, motionEase, motionSpring } from "./tokens";
export { MOTION_VARIANTS, motionVariants } from "./variants";

export const SPRING_EASE = [0.22, 1, 0.36, 1] as const;
export const MOTION_DURATION = {
  base: 0.34,
  fast: 0.2,
  reveal: 0.58,
  slow: 0.48,
} as const;
