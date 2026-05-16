export const motionEase = {
  entrance: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  emphasized: [0.18, 0.9, 0.22, 1],
  standard: [0.2, 0, 0.2, 1],
} as const;

export const motionDuration = {
  instant: 0.08,
  fast: 0.18,
  base: 0.3,
  deliberate: 0.42,
  slow: 0.52,
} as const;

export const motionSpring = {
  panel: { damping: 32, mass: 0.9, stiffness: 300 },
  shell: { damping: 36, mass: 0.85, stiffness: 340 },
} as const;
