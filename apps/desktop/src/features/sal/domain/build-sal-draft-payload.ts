import type { SalDraftUpsertInput } from "@/repositories/sal-repository";
import { surchargeKindFromPercent } from "../state/sal-form-state";
import type { SalEconomicRules, SalLineDraft, SalLineView, SalMaterialUsage } from "../types";
import { buildLineViews } from "./sal-calculations";
import { prepareEconomicRulesForDraftPersist } from "./sal-creation-draft";

type BuildSalDraftPayloadArgs = {
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  materialUsageEntries: SalMaterialUsage[];
  projectId: string;
  salDate: string;
  salTitle: string;
  suggestedSalTitle: string;
  total: number;
  lineViews?: SalLineView[];
};

export function buildSalDraftPayload(args: BuildSalDraftPayloadArgs): SalDraftUpsertInput {
  const rulesForSave = prepareEconomicRulesForDraftPersist(args.economicRules, args.lines);
  const lineViews = args.lineViews ?? buildLineViews(args.lines, rulesForSave);
  const title = args.salTitle.trim() || args.suggestedSalTitle;

  return {
    date: args.salDate,
    description: title,
    economicRules: rulesForSave,
    lines: lineViews.map((line) => ({
      id: line.id,
      measurementRows: line.measurementRows.map((row) => ({
        id: row.id,
        voiceId: line.voice.id,
        date: row.date,
        station: row.station,
        section: row.section,
        description: row.description,
        factor1: row.factor1,
        factor2: row.factor2,
        factor3: row.factor3,
        partialQuantity: row.partialQuantity,
        unit: row.unit,
        notes: row.notes,
        order: row.order,
      })),
      quantity: line.quantity,
      surcharge: surchargeKindFromPercent(line.surchargePercent),
      voiceId: line.voice.id,
    })),
    materialUsage: args.materialUsageEntries.length > 0 ? args.materialUsageEntries : undefined,
    notes: "",
    projectId: args.projectId,
    status: "draft",
    title,
    total: args.total,
    voices: lineViews.map((line) => ({
      category: line.voice.category,
      code: line.voice.code,
      description: line.voice.description,
      id: line.voice.id,
      laborPercentage: line.voice.laborPercentage,
      projectYear: line.voice.tariffYear,
      unit: line.voice.unit,
      unitPrice: line.voice.unitPrice,
    })),
  };
}
