export { prefersReducedMotion, shouldReduceMotion } from "./policies";
export { MotionSurface } from "./primitives";
export { motionDuration, motionEase, motionSpring } from "./tokens";
export { MOTION_VARIANTS, motionVariants } from "./variants";

import { motionDuration, motionEase } from "./tokens";

export const SPRING_EASE = motionEase.standard as typeof motionEase.standard;
export const MOTION_DURATION = motionDuration;
