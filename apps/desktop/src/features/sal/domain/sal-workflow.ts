export type SalProject = {
  client: string;
  description: string;
  id: string;
  name: string;
  year: number;
};

export type SalTariffVoice = {
  category: string;
  code: string;
  description: string;
  id: string;
  projectYear: number;
  unit: string;
  unitPrice: number;
};

export type SalSurchargeKind = "none" | "day" | "night";

export type SalLine = {
  id: string;
  quantity: number;
  surcharge: SalSurchargeKind;
  voiceId: string;
};

export type SalDocumentStatus = "draft" | "closed";

export type SalDocument = {
  closedAt?: string;
  date: string;
  description: string;
  id: string;
  lines: SalLine[];
  notes: string;
  projectId: string;
  status: SalDocumentStatus;
  title: string;
  total?: number;
};

export type SalLineView = SalLine & {
  lineTotal: number;
  surchargeLabel: string;
  surchargeMultiplier: number;
  voice: SalTariffVoice;
};

export type SalDocumentView = Omit<SalDocument, "lines"> & {
  lines: SalLineView[];
  total: number;
};

export const surchargeOptions: { kind: SalSurchargeKind; label: string; multiplier: number }[] = [
  { kind: "none", label: "Nessuna", multiplier: 1 },
  { kind: "day", label: "Diurna (+10%)", multiplier: 1.1 },
  { kind: "night", label: "Notturna (+20%)", multiplier: 1.2 },
];

export function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomPart}`;
}

export function buildSalDocumentView(
  document: SalDocument,
  voices: readonly SalTariffVoice[],
): SalDocumentView {
  const voiceById = new Map(voices.map((voice) => [voice.id, voice]));
  const lines = document.lines.flatMap((line) => {
    const voice = voiceById.get(line.voiceId);

    if (!voice) {
      return [];
    }

    const surcharge = getSurcharge(line.surcharge);
    const lineTotal = calculateSalLineTotal(line.quantity, voice.unitPrice, surcharge.multiplier);

    return [
      {
        ...line,
        lineTotal,
        surchargeLabel: surcharge.label,
        surchargeMultiplier: surcharge.multiplier,
        voice,
      },
    ];
  });

  return {
    ...document,
    lines,
    total:
      typeof document.total === "number" && Number.isFinite(document.total)
        ? document.total
        : lines.reduce((sum, line) => sum + line.lineTotal, 0),
  };
}

export function calculateSalLineTotal(
  quantity: number,
  unitPrice: number,
  surchargeMultiplier: number,
): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 0;
  }

  return Math.max(0, quantity) * Math.max(0, unitPrice) * surchargeMultiplier;
}

export function getSurcharge(kind: SalSurchargeKind) {
  return (
    surchargeOptions.find((option) => option.kind === kind) ?? {
      kind: "none",
      label: "Nessuna",
      multiplier: 1,
    }
  );
}

export function normalizeDecimal(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : Number.NaN;
}
