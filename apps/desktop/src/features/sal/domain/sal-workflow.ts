import type {
  SalDocument,
  SalLine,
  SalLineDraft,
  SalSurchargeKind,
  SalTariffVoice,
} from "../types";

// Re-export for backward compatibility with existing imports
export type {
  SalDocument,
  SalDocumentStatus,
  SalLine,
  SalProject,
  SalSurchargeKind,
  SalTariffVoice,
} from "../types";

import { buildLineViews, defaultSalEconomicRules, summarizeSalLines } from "./sal-calculations";
import { isSafetyVoice } from "./sal-safety";

export type SalLineView = SalLine & {
  discountAmount: number;
  discountableAmount: number;
  grossAmount: number;
  lineTotal: number;
  netAmount: number;
  surchargeLabel: string;
  surchargeMultiplier: number;
  totalAmount: number;
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
  return buildSalDocumentViewWithVoiceMap(document, voiceById);
}

export function buildSalDocumentViews(
  documents: readonly SalDocument[],
  voices: readonly SalTariffVoice[],
): SalDocumentView[] {
  const voiceById = new Map(voices.map((voice) => [voice.id, voice]));
  return documents.map((document) => buildSalDocumentViewWithVoiceMap(document, voiceById));
}

function buildSalDocumentViewWithVoiceMap(
  document: SalDocument,
  voiceById: ReadonlyMap<string, SalTariffVoice>,
): SalDocumentView {
  const hasEconomicRules = Boolean(document.economicRules);

  if (hasEconomicRules) {
    const draftLines = document.lines.flatMap((line) => {
      const voice = voiceById.get(line.voiceId);
      if (!voice) return [];

      const draftLine: SalLineDraft = {
        id: line.id,
        factor1: line.quantity,
        factor2: 1,
        factor3: 1,
        notes: "",
        quantity: line.quantity,
        surchargePercent: line.surchargePercent ?? getSurchargePercent(line.surcharge),
        voice: {
          category: voice.category,
          code: voice.code,
          description: voice.description,
          id: voice.id,
          isSafetyCost:
            voice.isSafetyCost ??
            isSafetyVoice({
              category: voice.category,
              code: voice.code,
              description: voice.description,
            }),
          laborPercentage: voice.laborPercentage ?? 0,
          source: voice as never,
          tariffBookId: "",
          tariffBookName: "",
          tariffYear: voice.projectYear,
          unit: voice.unit,
          unitPrice: voice.unitPrice,
        },
      };

      return [draftLine];
    });

    const economicRules = document.economicRules ?? defaultSalEconomicRules;
    const economicLines = buildLineViews(draftLines, economicRules);
    const total = summarizeSalLines(economicLines, Number.POSITIVE_INFINITY, 0).total;

    return {
      ...document,
      lines: economicLines.map((line) => {
        const surcharge = getSurcharge(surchargeKindFromPercent(line.surchargePercent));
        return {
          id: line.id,
          quantity: line.quantity,
          surcharge: surcharge.kind,
          surchargePercent: line.surchargePercent,
          voiceId: line.voice.id,
          discountAmount: line.discountAmount,
          discountableAmount: line.discountableAmount,
          grossAmount: line.grossAmount,
          lineTotal: line.totalAmount,
          netAmount: line.netAmount,
          surchargeLabel: surcharge.label,
          surchargeMultiplier: surcharge.multiplier,
          totalAmount: line.totalAmount,
          voice: {
            category: line.voice.category,
            code: line.voice.code,
            description: line.voice.description,
            id: line.voice.id,
            isSafetyCost: line.voice.isSafetyCost,
            laborPercentage: line.voice.laborPercentage,
            projectYear: line.voice.tariffYear,
            unit: line.voice.unit,
            unitPrice: line.voice.unitPrice,
          },
        };
      }),
      total,
    };
  }

  const lines = document.lines.flatMap((line) => {
    const voice = voiceById.get(line.voiceId);

    if (!voice) {
      return [];
    }

    const surcharge = getSurcharge(line.surcharge);
    const lineTotal = calculateSalLineTotal(line.quantity, voice.unitPrice, surcharge.multiplier);
    const grossAmount = calculateSalLineTotal(line.quantity, voice.unitPrice, 1);

    return [
      {
        ...line,
        discountAmount: 0,
        discountableAmount: 0,
        grossAmount,
        lineTotal,
        netAmount: grossAmount,
        surchargeLabel: surcharge.label,
        surchargeMultiplier: surcharge.multiplier,
        totalAmount: lineTotal,
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

export function getSurchargePercent(kind: SalSurchargeKind): number {
  return kind === "night" ? 20 : kind === "day" ? 10 : 0;
}

export function surchargeKindFromPercent(percent: number): SalSurchargeKind {
  return percent >= 20 ? "night" : percent > 0 ? "day" : "none";
}

export function normalizeDecimal(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : Number.NaN;
}
