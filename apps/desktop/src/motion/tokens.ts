export const motionEase = {
  entrance: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  emphasized: [0.22, 1, 0.36, 1],
  standard: [0.22, 1, 0.36, 1],
} as const;

export const motionDuration = {
  instant: 0.08,
  fast: 0.2,
  base: 0.34,
  deliberate: 0.48,
  slow: 0.58,
} as const;

export const motionSpring = {
  buttery: { damping: 30, mass: 0.92, stiffness: 260 },
  panel: { damping: 32, mass: 0.9, stiffness: 300 },
  press: { damping: 26, mass: 0.75, stiffness: 420 },
  shell: { damping: 36, mass: 0.85, stiffness: 340 },
} as const;
