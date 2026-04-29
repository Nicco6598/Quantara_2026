import type {
  DesktopContract,
  DesktopTariffBook,
  DesktopTariffVoice,
} from "@/lib/desktopData";

export type SalCreationStep = 1 | 2 | 3 | 4 | 5;

export type SalDataSource = "desktop" | "local";

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
  title: string;
};

export type SalTariffBookOption = DesktopTariffBook & {
  isPriority: boolean;
  priority: number;
};

export type SalVoiceDraft = {
  category: string;
  code: string;
  description: string;
  id: string;
  isSafetyCost: boolean;
  laborPercentage: number;
  source: DesktopTariffVoice;
  tariffBookId: string;
  tariffBookName: string;
  tariffYear: number;
  unit: string;
  unitPrice: number;
};

export type SalLineDraft = {
  id: string;
  notes: string;
  quantity: number;
  surchargePercent: number;
  voice: SalVoiceDraft;
};

export type SalMeasurementRow = {
  description: string;
  factor1: number;
  factor2: number;
  factor3: number;
  id: string;
  notes: string;
  partialQuantity: number;
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
  grossAmount: number;
  linkedCharges: SalLinkedCharge[];
  measurementRows: SalMeasurementRow[];
  netAmount: number;
  status: "complete" | "incomplete";
  totalAmount: number;
};

export type SalEconomicRules = {
  applyDiscountToSafetyCosts: boolean;
  discountEnabled: boolean;
  discountPercent: number;
  rounding: "cent";
};

export type SalEconomicSummary = {
  budgetResidual: number;
  discountAmount: number;
  discountableAmount: number;
  grossAmount: number;
  linkedChargeAmount: number;
  netDiscountableAmount: number;
  previousProgressiveAmount: number;
  safetyAmount: number;
  total: number;
};

export type SalVerificationCheck = {
  detail: string;
  id: string;
  label: string;
  result: string;
  tone: "success" | "warning" | "danger";
};
