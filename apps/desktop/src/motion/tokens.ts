export const motionEase = {
  standard: [0.22, 1, 0.36, 1] as const,
  entrance: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  emphasized: [0.22, 1, 0.36, 1] as const,
} as const;

export const motionDuration = {
  fast: 0.2,
  base: 0.34,
  slow: 0.42,
  reveal: 0.58,
} as const;

export const motionSpring = {
  buttery: { damping: 30, mass: 0.92, stiffness: 260 },
  panel: { damping: 32, mass: 0.9, stiffness: 300 },
  press: { damping: 26, mass: 0.75, stiffness: 420 },
  shell: { damping: 36, mass: 0.85, stiffness: 340 },
} as const;
