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

export type SalLine = {
  id: string;
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
  notes: string;
  projectId: string;
  status: SalDocumentStatus;
  title: string;
  total?: number;
};
