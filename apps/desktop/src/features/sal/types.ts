import type { DesktopContract, DesktopTariffBook, DesktopTariffVoice } from "@/lib/desktopData";

export type {
  SalDocument,
  SalDocumentStatus,
  SalEconomicRules,
  SalLine,
  SalMaterialUsage,
  SalMeasurementRowPersist,
  SalProject,
  SalSurchargeKind,
  SalTariffVoice,
} from "@quantara/shared-types";

export type SalProjectContext = {
  applicationContractCode: string;
  contractor: string;
  contract: DesktopContract;
  contractAmount: number;
  frameworkAgreementCode: string;
  id: string;
  location: string;
  manager: string;
  periodEnd: string;
  periodStart: string;
  salTitle: string;
  tenderDiscountPercent: number;
  title: string;
};

export type SalTariffBookOption = DesktopTariffBook & {
  isPriority: boolean;
  priority: number;
};

export type SalVoiceDraft = {
  applicabilityRules?: {
    conditions?: string[];
    mentionsMaggiorazione?: boolean;
    quotaManodoperaOnly?: boolean;
  };
  category: string;
  code: string;
  description: string;
  id: string;
  isSafetyCost: boolean;
  laborPercentage: number;
  linkedMaggiorazioni?: string[];
  source: DesktopTariffVoice;
  tariffBookId: string;
  tariffBookName: string;
  tariffYear: number;
  unit: string;
  unitPrice: number;
};

export type SalLineDraft = {
  id: string;
  measurementRows: SalMeasurementRowDraft[];
  notes: string;
  sourceType: "voice" | "material";
  surchargePercent: number;
  voice: SalVoiceDraft;
};

export type SalMeasurementRowDraft = {
  date: string;
  day?: string | undefined;
  description: string;
  factor1: number;
  factor2: number;
  factor3: number;
  flag?: string | undefined;
  from?: string | undefined;
  id: string;
  notes: string;
  order: number;
  partialQuantity: number;
  station?: string | undefined;
  section?: string | undefined;
  unit: string;
};

export type SalMaterialDraft = {
  id: string;
  materialId: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  notes: string;
};

export type SalMeasurementRow = {
  date: string;
  day?: string | undefined;
  description: string;
  factor1: number;
  factor2: number;
  factor3: number;
  flag?: string | undefined;
  from?: string | undefined;
  id: string;
  notes: string;
  order: number;
  partialQuantity: number;
  station?: string | undefined;
  section?: string | undefined;
  unit: string;
};

export type SalLinkedCharge = {
  baseAmount: number;
  code: string;
  description: string;
  id: string;
  percent: number;
  total: number;
};

export type SalLineView = SalLineDraft & {
  discountAmount: number;
  discountableAmount: number;
  grossAmount: number;
  linkedCharges: SalLinkedCharge[];
  netAmount: number;
  quantity: number;
  status: "complete" | "incomplete";
  totalAmount: number;
};

export type SalEconomicSummary = {
  budgetResidual: number;
  discountAmount: number;
  discountableAmount: number;
  discountedVoiceCount: number;
  excludedSafetyVoiceCount: number;
  grossAmount: number;
  linkedChargeAmount: number;
  netDiscountableAmount: number;
  previousProgressiveAmount: number;
  safetyAmount: number;
  total: number;
  voiceCount: number;
  zeroDiscountableVoiceCount: number;
};

export type SalVerificationCheck = {
  detail: string;
  id: string;
  label: string;
  result: string;
  tone: "success" | "warning" | "danger";
};

let _idCounter = 0;

export function createMeasurementId(): string {
  return `mr_${Date.now()}_${++_idCounter}`;
}

export function createEmptyMeasurementRow(unit: string, order: number): SalMeasurementRowDraft {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: "",
    factor1: 0,
    factor2: 1,
    factor3: 1,
    id: createMeasurementId(),
    notes: "",
    order,
    partialQuantity: 0,
    unit,
  };
}

/** Nuova riga misura: data odierna, campi vuoti, solo stazione copiata dalla sorgente. */
export function cloneMeasurementRowForDuplicate(
  source: SalMeasurementRowDraft,
  unit: string,
  order: number,
): SalMeasurementRowDraft {
  const row = createEmptyMeasurementRow(unit, order);
  const station = source.station?.trim();
  if (station) {
    row.station = station;
  }
  return row;
}

export function computeLineQuantity(rows: SalMeasurementRowDraft[]): number {
  return rows.reduce((sum, r) => sum + r.partialQuantity, 0);
}

export function recalcPartialQuantity(row: SalMeasurementRowDraft): number {
  const f1 = Number.isFinite(row.factor1) && row.factor1 >= 0 ? row.factor1 : 0;
  const f2 = Number.isFinite(row.factor2) && row.factor2 >= 0 ? row.factor2 : 0;
  const f3 = Number.isFinite(row.factor3) && row.factor3 >= 0 ? row.factor3 : 0;
  return f1 * f2 * f3;
}
