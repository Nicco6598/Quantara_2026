import { motionDuration, motionEase, motionSpring } from "./tokens";

const butteryTransition = { type: "spring", ...motionSpring.buttery } as const;

export const motionVariants = {
  activeIndicator: {
    transition: butteryTransition,
  },
  dialogBackdrop: {
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    initial: { opacity: 0 },
    transition: { duration: motionDuration.base, ease: motionEase.standard },
  },
  dialogPanel: {
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.99, y: 8 },
    initial: { opacity: 0, scale: 0.982, y: 18 },
    transition: butteryTransition,
  },
  listItem: {
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -4, y: 0 },
    initial: { opacity: 0, x: -6, y: 0 },
    transition: butteryTransition,
  },
  popover: {
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.99, y: -4 },
    initial: { opacity: 0, scale: 0.99, y: -8 },
    transition: butteryTransition,
  },
  progress: {
    initial: { scaleX: 0 },
    transition: { duration: motionDuration.slow, ease: motionEase.emphasized },
    viewport: { once: true },
  },
  route: {
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    initial: { opacity: 0, y: 14 },
    transition: butteryTransition,
  },
  subtleReveal: {
    animate: { opacity: 1, scale: 1, y: 0 },
    initial: { opacity: 0, scale: 0.995, y: 10 },
    transition: butteryTransition,
  },
  toast: {
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 8 },
    initial: { opacity: 0, scale: 0.985, y: 14 },
    transition: butteryTransition,
  },
} as const;

export const MOTION_VARIANTS = {
  card: {
    initial: motionVariants.subtleReveal.initial,
    transition: motionVariants.subtleReveal.transition,
    viewport: { amount: 0.16, once: true },
    whileInView: motionVariants.subtleReveal.animate,
  },
  dialog: motionVariants.dialogPanel,
  listItem: motionVariants.listItem,
  popover: motionVariants.popover,
  progress: motionVariants.progress,
  press: {
    transition: { type: "spring", ...motionSpring.press },
    whileTap: { scale: 0.985, y: 1 },
  },
  row: {
    initial: { opacity: 0, y: 8 },
    transition: motionVariants.subtleReveal.transition,
    viewport: { amount: 0.18, once: true },
    whileInView: { opacity: 1, y: 0 },
  },
  viewSwap: motionVariants.route,
} as const;
