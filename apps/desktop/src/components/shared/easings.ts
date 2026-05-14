export const SPRING_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_DURATION = {
  fast: 0.18,
  base: 0.28,
  slow: 0.42,
  reveal: 0.58,
} as const;

export const MOTION_VARIANTS = {
  card: {
    initial: { opacity: 0, scale: 0.994, y: 14 },
    transition: { duration: MOTION_DURATION.reveal, ease: SPRING_EASE },
    viewport: { amount: 0.16, once: true },
    whileInView: { opacity: 1, scale: 1, y: 0 },
  },
  dialog: {
    animate: { opacity: 1, scale: 1, y: 0 },
    initial: { opacity: 0, scale: 0.96, y: 16 },
    transition: { duration: MOTION_DURATION.slow, ease: SPRING_EASE },
  },
  listItem: {
    animate: { opacity: 1, x: 0 },
    initial: { opacity: 0, x: -8 },
    transition: { duration: MOTION_DURATION.base, ease: SPRING_EASE },
  },
  popover: {
    animate: { opacity: 1, scale: 1, y: 0 },
    initial: { opacity: 0, scale: 0.98, y: -6 },
    transition: { duration: MOTION_DURATION.fast, ease: SPRING_EASE },
  },
  press: {
    whileTap: { scale: 0.98 },
  },
} as const;
