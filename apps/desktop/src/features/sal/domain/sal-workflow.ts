import type {
  SalDocument,
  SalLine,
  SalLineDraft,
  SalMeasurementRowDraft,
  SalSurchargeKind,
  SalTariffVoice,
} from "../types";

// Re-export for backward compatibility with existing imports
export type {
  SalDocument,
  SalProject,
  SalSurchargeKind,
  SalTariffVoice,
} from "../types";

import type { SalVoiceDraft } from "../types";
import { buildLineViews, defaultSalEconomicRules, summarizeSalLines } from "./sal-calculations";
import { isSafetyVoice } from "./sal-safety";
import { extractSnapshotVoicesFromSal, resolveVoiceForSalLine } from "./sal-voice-resolve";

type SalLineView = SalLine & {
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

const surchargeOptions: { kind: SalSurchargeKind; label: string; multiplier: number }[] = [
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

function tariffVoiceToDraft(voice: SalTariffVoice): SalVoiceDraft {
  return {
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
  };
}

function buildVoiceCatalogForDocument(
  document: SalDocument,
  voices: readonly SalTariffVoice[],
): SalVoiceDraft[] {
  const merged = new Map<string, SalVoiceDraft>();
  for (const voice of voices) {
    merged.set(voice.id, tariffVoiceToDraft(voice));
  }
  for (const snapshotVoice of extractSnapshotVoicesFromSal(document)) {
    if (!merged.has(snapshotVoice.id)) {
      merged.set(snapshotVoice.id, snapshotVoice);
    }
  }
  return [...merged.values()];
}

export function buildSalDocumentView(
  document: SalDocument,
  voices: readonly SalTariffVoice[],
): SalDocumentView {
  const catalog = buildVoiceCatalogForDocument(document, voices);
  return buildSalDocumentViewWithVoiceMap(document, catalog);
}

export function buildSalDocumentViews(
  documents: readonly SalDocument[],
  voices: readonly SalTariffVoice[],
): SalDocumentView[] {
  return documents.map((document) => buildSalDocumentView(document, voices));
}

function buildSalDocumentViewWithVoiceMap(
  document: SalDocument,
  voiceCatalog: readonly SalVoiceDraft[],
): SalDocumentView {
  const hasEconomicRules = Boolean(document.economicRules);

  if (hasEconomicRules) {
    const draftLines = document.lines.flatMap((line) => {
      const voice = resolveVoiceForSalLine(line.voiceId, voiceCatalog);
      if (!voice) return [];

      // Build measurement rows from persisted data or synthesize from quantity
      let measurementRows: SalMeasurementRowDraft[];
      if (line.measurementRows && line.measurementRows.length > 0) {
        measurementRows = line.measurementRows.map((r, idx) => ({
          date: r.date,
          day: r.day,
          description: r.description,
          factor1: r.factor1,
          factor2: r.factor2,
          factor3: r.factor3,
          flag: r.flag,
          from: r.from,
          id: r.id,
          notes: r.notes ?? "",
          order: r.order ?? idx,
          partialQuantity: r.partialQuantity,
          station: r.station,
          section: r.section,
          unit: r.unit,
        }));
      } else {
        measurementRows = [
          {
            date: document.date,
            description: "Misura corrente",
            factor1: line.quantity,
            factor2: 1,
            factor3: 1,
            id: `${line.id}-legacy`,
            notes: "",
            order: 0,
            partialQuantity: line.quantity,
            unit: voice.unit,
          },
        ];
      }

      const draftLine: SalLineDraft = {
        id: line.id,
        measurementRows,
        notes: line.notes ?? "",
        sourceType: "voice",
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
          tariffYear: voice.tariffYear,
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
    const resolved = resolveVoiceForSalLine(line.voiceId, voiceCatalog);
    if (!resolved) return [];

    const voice: SalTariffVoice = {
      category: resolved.category,
      code: resolved.code,
      description: resolved.description,
      id: resolved.id,
      isSafetyCost: resolved.isSafetyCost,
      laborPercentage: resolved.laborPercentage,
      projectYear: resolved.tariffYear,
      unit: resolved.unit,
      unitPrice: resolved.unitPrice,
    };

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

function calculateSalLineTotal(
  quantity: number,
  unitPrice: number,
  surchargeMultiplier: number,
): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 0;
  }

  return Math.max(0, quantity) * Math.max(0, unitPrice) * surchargeMultiplier;
}

function getSurcharge(kind: SalSurchargeKind) {
  return (
    surchargeOptions.find((option) => option.kind === kind) ?? {
      kind: "none",
      label: "Nessuna",
      multiplier: 1,
    }
  );
}

function getSurchargePercent(kind: SalSurchargeKind): number {
  return kind === "night" ? 20 : kind === "day" ? 10 : 0;
}

function surchargeKindFromPercent(percent: number): SalSurchargeKind {
  return percent >= 20 ? "night" : percent > 0 ? "day" : "none";
}
