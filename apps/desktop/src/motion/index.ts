export { shouldReduceMotion, prefersReducedMotion } from "./policies";
export { MotionSurface } from "./primitives";
export { motionDuration, motionEase, motionSpring } from "./tokens";
export { MOTION_VARIANTS, motionVariants } from "./variants";

export const SPRING_EASE = [0.22, 1, 0.36, 1] as const;
export const MOTION_DURATION = {
  base: 0.3,
  fast: 0.18,
  reveal: 0.52,
  slow: 0.42,
} as const;
