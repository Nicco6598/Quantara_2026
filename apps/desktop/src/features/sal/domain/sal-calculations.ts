import type {
  SalEconomicRules,
  SalEconomicSummary,
  SalLineDraft,
  SalLineView,
  SalLinkedCharge,
  SalMeasurementRow,
  SalVerificationCheck,
} from "../types";

export const defaultSalEconomicRules: SalEconomicRules = {
  applyDiscountToSafetyCosts: false,
  discountEnabled: true,
  discountPercent: 18.25,
  rounding: "cent",
};

export function buildLineViews(
  lines: readonly SalLineDraft[],
  rules: SalEconomicRules,
): SalLineView[] {
  return lines.map((line, index) => {
    const quantity = normalizeQuantity(line.quantity);
    const grossAmount = roundCurrency(quantity * line.voice.unitPrice);
    const linkedCharges = buildLinkedCharges(line, grossAmount);
    const linkedTotal = linkedCharges.reduce((sum, charge) => sum + charge.total, 0);
    const discountable =
      line.voice.isSafetyCost && !rules.applyDiscountToSafetyCosts ? 0 : grossAmount;
    const discountAmount = rules.discountEnabled
      ? roundCurrency(discountable * (rules.discountPercent / 100))
      : 0;
    const netAmount = roundCurrency(grossAmount - discountAmount);
    const totalAmount = roundCurrency(netAmount + linkedTotal);

    return {
      ...line,
      discountAmount,
      grossAmount,
      linkedCharges,
      measurementRows: buildMeasurementRows(line, index),
      netAmount,
      quantity,
      status: quantity > 0 ? "complete" : "incomplete",
      totalAmount,
    };
  });
}

export function summarizeSalLines(
  lineViews: readonly SalLineView[],
  contractAmount: number,
  previousProgressiveAmount: number,
): SalEconomicSummary {
  const summary = lineViews.reduce(
    (current, line) => {
      const linkedChargeAmount = line.linkedCharges.reduce((sum, charge) => sum + charge.total, 0);
      return {
        discountAmount: current.discountAmount + line.discountAmount,
        discountableAmount:
          current.discountableAmount + (line.voice.isSafetyCost ? 0 : line.grossAmount),
        grossAmount: current.grossAmount + line.grossAmount,
        linkedChargeAmount: current.linkedChargeAmount + linkedChargeAmount,
        safetyAmount: current.safetyAmount + (line.voice.isSafetyCost ? line.grossAmount : 0),
        total: current.total + line.totalAmount,
      };
    },
    {
      discountAmount: 0,
      discountableAmount: 0,
      grossAmount: 0,
      linkedChargeAmount: 0,
      safetyAmount: 0,
      total: 0,
    },
  );

  const total = roundCurrency(summary.total);
  return {
    budgetResidual: roundCurrency(contractAmount - previousProgressiveAmount - total),
    discountAmount: roundCurrency(summary.discountAmount),
    discountableAmount: roundCurrency(summary.discountableAmount),
    grossAmount: roundCurrency(summary.grossAmount),
    linkedChargeAmount: roundCurrency(summary.linkedChargeAmount),
    netDiscountableAmount: roundCurrency(summary.discountableAmount - summary.discountAmount),
    previousProgressiveAmount,
    safetyAmount: roundCurrency(summary.safetyAmount),
    total,
  };
}

export function buildVerificationChecks(
  lineViews: readonly SalLineView[],
  summary: SalEconomicSummary,
): SalVerificationCheck[] {
  const completeLines = lineViews.filter((line) => line.status === "complete").length;
  const safetyLines = lineViews.filter((line) => line.voice.isSafetyCost).length;
  const linkedLines = lineViews.filter((line) => line.linkedCharges.length > 0).length;
  const hasBudgetOverflow = summary.budgetResidual < 0;

  return [
    {
      detail:
        completeLines === lineViews.length
          ? "Tutte le voci selezionate hanno una quantita misurata."
          : "Inserisci le quantita mancanti prima della conferma.",
      id: "measurements",
      label: "Voci con dettaglio misure completo",
      result: `${completeLines}/${lineViews.length} ok`,
      tone: completeLines === lineViews.length ? "success" : "warning",
    },
    {
      detail: "Il sommario e calcolato dalle righe SAL correnti.",
      id: "summary",
      label: "Voci con sommario generato",
      result: `${lineViews.length}/${lineViews.length} ok`,
      tone: "success",
    },
    {
      detail:
        linkedLines > 0
          ? "Le maggiorazioni attive sono collegate alla voce padre."
          : "Nessuna maggiorazione attiva sulle righe selezionate.",
      id: "linked",
      label: "Maggiorazioni collegate",
      result: `${linkedLines} collegate`,
      tone: "success",
    },
    {
      detail:
        safetyLines > 0
          ? "Le voci OS sono escluse dal ribasso secondo le regole correnti."
          : "Nessuna voce OS presente nel documento.",
      id: "safety",
      label: "Voci OS escluse dal ribasso",
      result: `${safetyLines} OS escluse`,
      tone: "success",
    },
    {
      detail: hasBudgetOverflow
        ? "Il documento supera il residuo contrattuale disponibile."
        : "Il totale SAL resta dentro il residuo contrattuale disponibile.",
      id: "budget",
      label: "Budget residuo dopo SAL",
      result: hasBudgetOverflow ? "Fuori budget" : "OK",
      tone: hasBudgetOverflow ? "danger" : "success",
    },
  ];
}

function buildMeasurementRows(line: SalLineDraft, index: number): SalMeasurementRow[] {
  const quantity = normalizeQuantity(line.quantity);
  if (quantity <= 0) {
    return [];
  }

  return [
    {
      description: "Misura corrente",
      factor1: quantity,
      factor2: 1,
      factor3: 1,
      id: `${line.id}-measurement-current`,
      notes: line.notes.trim() || `Riga ${index + 1} da tariffario reale`,
      partialQuantity: quantity,
      unit: line.voice.unit,
    },
  ];
}

function buildLinkedCharges(line: SalLineDraft, grossAmount: number): SalLinkedCharge[] {
  if (line.surchargePercent <= 0 || grossAmount <= 0) {
    return [];
  }

  const total = roundCurrency(grossAmount * (line.surchargePercent / 100));
  return [
    {
      baseAmount: grossAmount,
      code: `${line.voice.code}.MAG`,
      description: "Maggiorazione applicata da regola economica",
      id: `${line.id}-surcharge`,
      percent: line.surchargePercent,
      total,
    },
  ];
}

function normalizeQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}
