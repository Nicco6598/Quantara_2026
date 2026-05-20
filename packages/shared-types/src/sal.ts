export type SalSurchargeKind = "none" | "day" | "night";

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
  isSafetyCost?: boolean;
  laborPercentage?: number;
  projectYear: number;
  unit: string;
  unitPrice: number;
};

export type SalMaterialUsage = {
  materialId: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
};

export type SalMeasurementRowPersist = {
  date: string;
  day?: string | undefined;
  description: string;
  factor1: number;
  factor2: number;
  factor3: number;
  flag?: string | undefined;
  from?: string | undefined;
  id: string;
  notes?: string | undefined;
  order: number;
  partialQuantity: number;
  station?: string | undefined;
  section?: string | undefined;
  unit: string;
  voiceId: string;
};

export type SalLine = {
  id: string;
  measurementRows?: SalMeasurementRowPersist[];
  notes?: string;
  quantity: number;
  surcharge: SalSurchargeKind;
  surchargePercent?: number;
  voiceId: string;
};

export type SalDocumentStatus = "draft" | "in-review" | "approved" | "closed";

export type SalEconomicRules = {
  applyDiscountToSafetyCosts: boolean;
  discountEnabled: boolean;
  discountPercent: number;
  rounding: "cent";
};

export type SalDocument = {
  closedAt?: string;
  date: string;
  description: string;
  id: string;
  economicRules?: SalEconomicRules;
  lines: SalLine[];
  materialUsage?: SalMaterialUsage[];
  notes: string;
  projectId: string;
  status: SalDocumentStatus;
  title: string;
  total?: number;

  /** Persisted derived fields from backend (P1.9) */
  totalCents?: number;
  grossAmountCents?: number;
  discountAmountCents?: number;
  lineCount?: number;
  measurementRowCount?: number;
};
