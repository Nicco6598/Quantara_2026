export type SalWorkflowPhase = "project" | "measure" | "verify" | "confirm" | "completed";

const orderedPhases: SalWorkflowPhase[] = ["project", "measure", "verify", "confirm", "completed"];

export function getNextPhase(phase: SalWorkflowPhase): SalWorkflowPhase {
  const index = orderedPhases.indexOf(phase);
  return orderedPhases[Math.min(orderedPhases.length - 1, index + 1)] ?? phase;
}

export function getPhaseIndex(phase: SalWorkflowPhase): number {
  return orderedPhases.indexOf(phase);
}
