export type ISODate = `${number}-${number}-${number}`;

export type CurrencyCode = "EUR";

export type Money = {
  amount: number;
  currency: CurrencyCode;
};

export type ContractId = `contract_${string}`;
export type TariffBookId = `tariff_${string}`;
export type TariffVoiceId = `voice_${string}`;
export type SalId = `sal_${string}`;

export type TariffPriority = {
  tariffBookId: TariffBookId;
  priority: number;
  reason: string;
};

export type ContractRecord = {
  id: ContractId;
  title: string;
  applicationContractCode: string;
  frameworkAgreementCode: string;
  contractualAmount: Money;
  tenderDiscountPercent: number;
  tariffPriorities: readonly TariffPriority[];
};

export type DesktopTariffPriorityRecord = {
  priority: number;
  reason: string;
  tariffBookId: string;
};

export type DesktopContractRecord = {
  applicationContractCode: string;
  contractualAmount: Money;
  contractorId?: string | null;
  contractorName?: string | null;
  frameworkAgreementCode: string;
  id: string;
  tenderDiscountPercent: number;
  tariffPriorities: DesktopTariffPriorityRecord[];
  title: string;
  osExcludedAmount?: number | null;
};

export type CreateDesktopContractRecordRequest = {
  applicationContractCode: string;
  contractualAmount: number;
  contractorName?: string | null;
  frameworkAgreementCode: string;
  id: string;
  tenderDiscountPercent: number;
  tariffPriorities: DesktopTariffPriorityRecord[];
  title: string;
  osExcludedAmount?: number | null;
};

export type DesktopTariffBookRecord = {
  id: string;
  name: string;
  sourceName: string;
  status: string;
  year: number;
};

export type DesktopTariffVoiceRecord = {
  category: string;
  description: string;
  id: string;
  laborPercentage?: number | null;
  officialCode: string;
  tariffBookId: string;
  unitOfMeasure: string;
  unitPrice: number;
  categoriaDesc?: string;
  gruppoDesc?: string;
  voce?: string;
  voceDesc?: string;
  warnings?: TariffWarning[];
  isMaggiorazione?: boolean;
  source?: TariffSourceRef;
  confidence?: number;
  issues?: string[];
  reviewFlags?: string[];
  warningIds?: string[];
  linkedMaggiorazioni?: string[];
  applicabilityRules?: TariffApplicabilityRules;
};

export type DesktopTariffVoiceCountRecord = {
  count: number;
  tariffBookId: string;
};

export type TariffWarning = {
  id: string;
  scope?: string;
  refCode?: string;
  title: string;
  body: string;
  type?: string;
  confidence?: number;
  issues?: string[];
  maggiorazioneRefs?: string[];
  appliesToRefs?: string[];
};

export type TariffSourceRef = {
  file?: string;
  page?: number | null;
  line?: number | null;
  normalized?: boolean;
};

export type TariffApplicabilityRules = {
  mentionsMaggiorazione?: boolean;
  quotaManodoperaOnly?: boolean;
  conditions?: string[];
};

export type TariffMaggiorazioneRule = {
  id: string;
  warningId?: string;
  sourceRef?: string;
  sourceScope?: string;
  appliesToRefs?: string[];
  targetMaggiorazioni?: string[];
  base?: string;
  percentage?: number | null;
  conditions?: string[];
  confidence?: string;
  requiresHumanValidation?: boolean;
  title?: string;
};

export type TariffValidationReport = {
  schemaVersion?: string;
  extractor?: string;
  pagesTotal?: number;
  counts?: Record<string, number>;
  confidence?: Record<string, number>;
  issuesByType?: Record<string, number>;
  reviewFlagsByType?: Record<string, number>;
  warningsByScope?: Record<string, number>;
  warningsByType?: Record<string, number>;
  warningIssuesByType?: Record<string, number>;
  duplicateCodeSample?: string[];
  unresolvedLocalMaggiorazioneRefs?: string[];
  reviewQueue?: Array<{
    codice?: string;
    confidence?: number;
    issues?: string[];
    source?: TariffSourceRef;
  }>;
};

export type CreateDesktopTariffBookRecordRequest = DesktopTariffBookRecord & {
  voices?: DesktopTariffVoiceRecord[];
};

export type UpdateDesktopTariffBookRecordRequest = Omit<DesktopTariffBookRecord, "id">;

export type TariffPdfMetadataRecord = {
  name: string;
  sourceName: string;
  voices: DesktopTariffVoiceRecord[];
  year: number;
  pagesTotal?: number;
  pagesParsed?: number;
  warnings?: TariffWarning[];
  maggiorazioneRules?: TariffMaggiorazioneRule[];
  validationReport?: TariffValidationReport;
};

export type TariffVoiceCategory =
  | "civil-works"
  | "armament"
  | "electrical"
  | "signaling"
  | "safety-os"
  | "labor-economy";

export type TariffVoice = {
  id: TariffVoiceId;
  tariffBookId: TariffBookId;
  officialCode: string;
  description: string;
  category: TariffVoiceCategory;
  unitOfMeasure: string;
  unitPrice: Money;
  laborSharePercent: number;
  isSafetyCost: boolean;
};

export type TariffResolutionSource = "priority" | "fallback" | "manual";

export type TariffResolution = {
  voice: TariffVoice;
  source: TariffResolutionSource;
  tariffBookId: TariffBookId;
  trace: readonly string[];
};

export type WorkInterruptionKind = "none" | "day" | "night" | "holiday";

export type LaborSurchargeRule = {
  interruptionKind: WorkInterruptionKind;
  surchargePercent: number;
  source: "tariff-index" | "application-rule" | "manual";
  trace: string;
};

export type AccountingRowFactors = {
  f1: number;
  f2: number;
  f3: number;
  quantityReference: number;
};

export type AccountingRow = {
  id: string;
  salId: SalId;
  voiceId: TariffVoiceId;
  voiceDescription: string;
  activityDescription: string;
  unitOfMeasure: string;
  factors: AccountingRowFactors;
  unitPrice: Money;
  finalPrice: Money;
  isSafetyCost: boolean;
  laborSurcharge?: LaborSurchargeRule;
};

export type SalStatus = "draft" | "in-review" | "in-approval" | "approved" | "issued";

export type SalRecord = {
  id: SalId;
  contractId: ContractId;
  number: number;
  status: SalStatus;
  periodStart: ISODate;
  periodEnd: ISODate;
  rows: readonly AccountingRow[];
  tenderAdjustmentPercent: number;
  subcontractAdjustmentPercent: number;
};

export type SalEconomicSummary = {
  grossDiscountable: Money;
  safetyCosts: Money;
  afterTenderAdjustment: Money;
  afterSubcontractAdjustment: Money;
  finalTotal: Money;
};
