export type SalWorkflowPhase = "context" | "voices" | "review" | "confirm" | "completed";

const orderedPhases: SalWorkflowPhase[] = ["context", "voices", "review", "confirm", "completed"];

export function getNextPhase(phase: SalWorkflowPhase): SalWorkflowPhase {
  const index = orderedPhases.indexOf(phase);
  return orderedPhases[Math.min(orderedPhases.length - 1, index + 1)] ?? phase;
}
