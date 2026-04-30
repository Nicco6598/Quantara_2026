export type SalWorkflowPhase = "context" | "voices" | "review" | "confirm" | "completed";

export type SalWorkflowStatus = "completed" | "current" | "blocked" | "ready";

export type SalWorkflowStage = {
  description: string;
  id: SalWorkflowPhase;
  label: string;
  status: SalWorkflowStatus;
};

const orderedPhases: SalWorkflowPhase[] = ["context", "voices", "review", "confirm", "completed"];

const stageMeta: Record<SalWorkflowPhase, { description: string; label: string }> = {
  completed: {
    description: "Documento registrato e pronto per export.",
    label: "Chiusura",
  },
  confirm: {
    description: "Anteprima e conferma SAL.",
    label: "Conferma",
  },
  context: {
    description: "Configura contesto e tariffari.",
    label: "Impostazione",
  },
  review: {
    description: "Controlla importi e coerenze.",
    label: "Verifica",
  },
  voices: {
    description: "Seleziona e inserisci le voci.",
    label: "Voci e quantita",
  },
};

export function getNextPhase(phase: SalWorkflowPhase): SalWorkflowPhase {
  const index = orderedPhases.indexOf(phase);
  return orderedPhases[Math.min(orderedPhases.length - 1, index + 1)] ?? phase;
}

export function getPreviousPhase(phase: SalWorkflowPhase): SalWorkflowPhase {
  const index = orderedPhases.indexOf(phase);
  return orderedPhases[Math.max(0, index - 1)] ?? phase;
}

export function buildWorkflowStages(
  currentPhase: SalWorkflowPhase,
  blockedPhases: ReadonlySet<SalWorkflowPhase>,
): SalWorkflowStage[] {
  const currentIndex = orderedPhases.indexOf(currentPhase);

  return orderedPhases.map((id, index) => {
    let status: SalWorkflowStatus = "ready";

    if (index < currentIndex) {
      status = "completed";
    } else if (index === currentIndex) {
      status = "current";
    }

    if (blockedPhases.has(id)) {
      status = "blocked";
    }

    return {
      description: stageMeta[id].description,
      id,
      label: stageMeta[id].label,
      status,
    };
  });
}
