import { calculateAccountingRowFinalPrice, eur } from "@quantara/domain-utils";
import type { AccountingRow, ContractRecord, SalRecord, TariffVoice } from "@quantara/shared-types";

export const activeContract: ContractRecord = {
  applicationContractCode: "CA-2025-AVAC-018",
  contractualAmount: eur(24850000),
  frameworkAgreementCode: "AQ-RFI-2025-LN",
  id: "contract_avac_milano_verona",
  safetyCostsNotSubjectToDiscount: eur(250000),
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

export type AlertPriority = "critical" | "warning" | "info";

export type DashboardAlert = {
  dueLabel: string;
  id: string;
  priority: AlertPriority;
  title: string;
  trace: string;
};

export const dashboardAlerts: readonly DashboardAlert[] = [
  {
    dueLabel: "Critico",
    id: "alert_budget",
    priority: "critical",
    title: "Sforamento budget previsto",
    trace: "Previsione a fine superiore al budget del 5,3%",
  },
  {
    dueLabel: "Attenzione",
    id: "alert_delay",
    priority: "warning",
    title: "Ritardo attivita critiche",
    trace: "Armamento - ritardo di 5 giorni",
  },
  {
    dueLabel: "Attenzione",
    id: "alert_materials",
    priority: "warning",
    title: "Materiali critici in esaurimento",
    trace: "Binari 60E1 - disponibilita tra 6 giorni",
  },
  {
    dueLabel: "Info",
    id: "alert_sal",
    priority: "info",
    title: "SAL 8 in ritardo",
    trace: "Prevista emissione tra 7 giorni",
  },
];

export type BudgetCategory = {
  amount: number;
  label: string;
  percent: number;
  token: string;
};

export const budgetCategories: readonly BudgetCategory[] = [
  { amount: 980000, label: "Opere civili", percent: 39.6, token: "var(--chart-2)" },
  { amount: 625000, label: "Armamento", percent: 25.2, token: "var(--chart-3)" },
  { amount: 427000, label: "Elettroferroviario", percent: 17.2, token: "var(--chart-4)" },
  { amount: 278000, label: "Segnalamento", percent: 11.2, token: "var(--chart-1)" },
  { amount: 168000, label: "Altre lavorazioni", percent: 6.8, token: "var(--chart-5)" },
];

export type SiteWaypoint = {
  id: string;
  km: string;
  label: string;
  status: "complete" | "active" | "late" | "planned";
};

export const siteWaypoints: readonly SiteWaypoint[] = [
  { id: "km18", km: "Km 18", label: "Cantiere armamento", status: "complete" },
  { id: "km24", km: "Km 24", label: "Nodo tecnico", status: "active" },
  { id: "km29", km: "Km 29", label: "Interferenza", status: "late" },
  { id: "km30", km: "Km 30", label: "Collaudo", status: "planned" },
];

export type TimelineLane = {
  endPercent: number;
  id: string;
  label: string;
  startPercent: number;
  status: "complete" | "active" | "planned";
};

export const timelineLanes: readonly TimelineLane[] = [
  {
    endPercent: 33,
    id: "exec",
    label: "Progettazione esecutiva",
    startPercent: 4,
    status: "complete",
  },
  { endPercent: 62, id: "civil", label: "Opere civili", startPercent: 18, status: "active" },
  { endPercent: 78, id: "arm", label: "Armamento", startPercent: 31, status: "active" },
  {
    endPercent: 88,
    id: "electrical",
    label: "Elettroferroviario",
    startPercent: 44,
    status: "planned",
  },
];

export type OperationsMetric = {
  delta: string;
  label: string;
  tone: "success" | "warning" | "danger" | "info";
  value: string;
};

export const operationsMetrics: readonly OperationsMetric[] = [
  { delta: "+2 oggi", label: "Operai in cantiere", tone: "info", value: "128" },
  { delta: "+2 oggi", label: "Mezzi operativi", tone: "success", value: "26" },
  { delta: "4 vs ieri", label: "Task completati", tone: "success", value: "18" },
  { delta: "Nei prossimi 7 giorni", label: "Materiali in arrivo", tone: "warning", value: "12" },
  { delta: "Per un totale di 5 giorni", label: "Ritardi attivi", tone: "danger", value: "3" },
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
