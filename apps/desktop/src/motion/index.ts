export { shouldReduceMotion, prefersReducedMotion } from "./policies";
export { MotionSurface } from "./primitives";
export { motionDuration, motionEase, motionSpring } from "./tokens";
export { MOTION_VARIANTS, motionVariants } from "./variants";

import { motionEase, motionDuration } from "./tokens";

export const SPRING_EASE = motionEase.standard as typeof motionEase.standard;
export const MOTION_DURATION = motionDuration;
