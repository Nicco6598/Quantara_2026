import type { AccountingRow, ContractRecord, SalRecord, TariffVoice } from "@quantara/shared-types";
import { calculateAccountingRowFinalPrice, eur } from "@quantara/domain-utils";

export const activeContract: ContractRecord = {
  applicationContractCode: "CA-2025-AVAC-018",
  contractualAmount: eur(24850000),
  frameworkAgreementCode: "AQ-RFI-2025-LN",
  id: "contract_avac_milano_verona",
  tariffPriorities: [
    { priority: 1, reason: "Contratto applicativo", tariffBookId: "tariff_lombardia_2025" },
    { priority: 2, reason: "Accordo quadro", tariffBookId: "tariff_rfi_2024" },
  ],
  title: "Linea AV/AC Milano-Verona",
};

export const tariffVoices: readonly TariffVoice[] = [
  {
    category: "civil-works",
    description: "Scavo di sbancamento in trincea",
    id: "voice_op_cv_001",
    isSafetyCost: false,
    laborSharePercent: 42.5,
    officialCode: "OP-CV-001",
    tariffBookId: "tariff_lombardia_2025",
    unitOfMeasure: "m3",
    unitPrice: eur(18.5),
  },
  {
    category: "armament",
    description: "Fornitura posa binario tipo 60E1",
    id: "voice_arm_001",
    isSafetyCost: false,
    laborSharePercent: 66.9,
    officialCode: "ARM-001",
    tariffBookId: "tariff_lombardia_2025",
    unitOfMeasure: "m",
    unitPrice: eur(1250),
  },
  {
    category: "safety-os",
    description: "Oneri sicurezza interferenze cantiere ferroviario",
    id: "voice_os_001",
    isSafetyCost: true,
    laborSharePercent: 0,
    officialCode: "OS-001",
    tariffBookId: "tariff_rfi_2024",
    unitOfMeasure: "cad",
    unitPrice: eur(5000),
  },
];

export const salRows: readonly AccountingRow[] = [
  createAccountingRow(
    "row_001",
    "voice_op_cv_001",
    "Scavo in trincea",
    "Scavo armamento km 18",
    18.5,
    45,
    18.5,
  ),
  createAccountingRow(
    "row_002",
    "voice_arm_001",
    "Fornitura posa binario tipo 60E1",
    "Tratta Verona Est",
    1250,
    75,
    1,
  ),
  {
    ...createAccountingRow(
      "row_003",
      "voice_os_001",
      "Oneri sicurezza interferenze cantiere ferroviario",
      "Presidio sicurezza SAL 8",
      5000,
      1,
      1,
    ),
    isSafetyCost: true,
  },
];

export const currentSal: SalRecord = {
  contractId: activeContract.id,
  id: "sal_8",
  number: 8,
  periodEnd: "2024-04-30",
  periodStart: "2024-04-01",
  rows: salRows,
  status: "approved",
  subcontractAdjustmentPercent: -3,
  tenderAdjustmentPercent: -12.4,
};

export const projectRows = [
  {
    budget: eur(26150000),
    forecastEnd: "12 Set 2025",
    health: "Buono",
    progress: 43,
    sal: "8 / 12",
    title: "Linea AV/AC Milano-Verona",
  },
  {
    budget: eur(18400000),
    forecastEnd: "18 Nov 2025",
    health: "Attenzione",
    progress: 68,
    sal: "6 / 10",
    title: "Nodo di Firenze AV",
  },
  {
    budget: eur(32780000),
    forecastEnd: "07 Ott 2025",
    health: "Critico",
    progress: 72,
    sal: "7 / 11",
    title: "Linea AV Napoli-Bari",
  },
];

function createAccountingRow(
  id: string,
  voiceId: AccountingRow["voiceId"],
  voiceDescription: string,
  activityDescription: string,
  unitPrice: number,
  f1: number,
  quantityReference: number,
): AccountingRow {
  return {
    activityDescription,
    factors: { f1, f2: 1, f3: 1, quantityReference },
    finalPrice: eur(calculateAccountingRowFinalPrice(unitPrice, f1, 1, 1, quantityReference)),
    id,
    isSafetyCost: false,
    salId: "sal_8",
    unitOfMeasure: "m",
    unitPrice: eur(unitPrice),
    voiceDescription,
    voiceId,
  };
}
