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
    const quantity = normalizeQuantity(line.factor1 * line.factor2 * line.factor3);
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
  economicRules: SalEconomicRules,
): SalVerificationCheck[] {
  const completeLines = lineViews.filter((line) => line.status === "complete").length;
  const safetyLines = lineViews.filter((line) => line.voice.isSafetyCost).length;
  const linkedLines = lineViews.filter((line) => line.linkedCharges.length > 0).length;
  const hasBudgetOverflow = summary.budgetResidual < 0;
  const zeroQtyLines = lineViews.filter((line) => line.quantity <= 0);
  const zeroPriceLines = lineViews.filter((line) => line.voice.unitPrice <= 0);
  const highSurchargeLines = lineViews.filter((line) => line.surchargePercent > 25);
  const highDiscount = economicRules.discountEnabled && economicRules.discountPercent > 30;

  const checks: SalVerificationCheck[] = [];

  // Total SAL check
  checks.push({
    detail:
      summary.total > 0
        ? `Il totale della SAL è di ${summary.total.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}.`
        : "Nessun importo calcolato. Aggiungi voci con quantità per generare un totale.",
    id: "total",
    label: "Totale SAL calcolato",
    result: summary.total > 0 ? "OK" : "Zero",
    tone: summary.total > 0 ? "success" : "warning",
  });

  // Voice count
  if (lineViews.length > 0) {
    checks.push({
      detail: `${lineViews.length} voci inserite nella bozza.`,
      id: "count",
      label: "Voci inserite",
      result: `${lineViews.length} voci`,
      tone: "success",
    });
  }

  // Complete measurements
  checks.push({
    detail:
      completeLines === lineViews.length
        ? "Tutte le voci hanno una quantità valida maggiore di zero."
        : `${lineViews.length - completeLines} voci hanno quantità zero. Assegna una misura per completarle.`,
    id: "measurements",
    label: "Voci con quantità valida",
    result: `${completeLines}/${lineViews.length} ok`,
    tone: completeLines === lineViews.length ? "success" : "warning",
  });

  // Zero quantity lines
  if (zeroQtyLines.length > 0) {
    checks.push({
      detail: `Le voci ${zeroQtyLines.map((l) => l.voice.code).join(", ")} hanno quantità pari a zero.`,
      id: "zero-qty",
      label: "Voci con quantità zero",
      result: `${zeroQtyLines.length} voci`,
      tone: "warning",
    });
  }

  // Zero price lines
  if (zeroPriceLines.length > 0) {
    checks.push({
      detail: `Le voci ${zeroPriceLines.map((l) => l.voice.code).join(", ")} hanno prezzo unitario zero. Verifica il tariffario.`,
      id: "zero-price",
      label: "Voci con prezzo zero",
      result: `${zeroPriceLines.length} voci`,
      tone: "warning",
    });
  }

  // High surcharge
  if (highSurchargeLines.length > 0) {
    checks.push({
      detail: `Le voci ${highSurchargeLines.map((l) => l.voice.code).join(", ")} hanno maggiorazione superiore al 25%. Verifica la congruità.`,
      id: "high-surcharge",
      label: "Maggiorazioni elevate",
      result: `${highSurchargeLines.length} voci`,
      tone: "warning",
    });
  }

  // Linked charges
  if (lineViews.length > 0) {
    checks.push({
      detail:
        linkedLines > 0
          ? `${linkedLines} voci hanno maggiorazioni collegate.`
          : "Nessuna maggiorazione attiva sulle righe.",
      id: "linked",
      label: "Maggiorazioni collegate",
      result: `${linkedLines} collegate`,
      tone: "success",
    });
  }

  // OS safety costs
  if (safetyLines > 0) {
    checks.push({
      detail: `${safetyLines} voci OS (oneri sicurezza) presenti. Sono escluse dal calcolo del ribasso.`,
      id: "safety",
      label: "Voci OS escluse dal ribasso",
      result: `${safetyLines} OS`,
      tone: "success",
    });
  }

  // Budget check
  if (hasBudgetOverflow) {
    checks.push({
      detail: `Il documento supera il residuo disponibile di ${Math.abs(summary.budgetResidual).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}. Il budget contrattuale non è sufficiente.`,
      id: "budget-overflow",
      label: "Sforamento budget",
      result: `Fuori di ${Math.abs(summary.budgetResidual).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}`,
      tone: "danger",
    });
  } else {
    checks.push({
      detail: `Residuo contrattuale di ${summary.budgetResidual.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} dopo questa SAL.`,
      id: "budget",
      label: "Budget residuo",
      result: summary.budgetResidual >= 0 ? "OK" : "Fuori budget",
      tone: summary.budgetResidual >= 0 ? "success" : "danger",
    });
  }

  // High discount warning
  if (highDiscount) {
    checks.push({
      detail: `Il ribasso del ${economicRules.discountPercent.toLocaleString("it-IT")}% è superiore al 30%. Verifica che sia corretto.`,
      id: "high-discount",
      label: "Ribasso elevato",
      result: `${economicRules.discountPercent.toLocaleString("it-IT")}%`,
      tone: "warning",
    });
  }

  // Format discount amount
  if (summary.discountAmount > 0) {
    checks.push({
      detail: `Ribasso applicato: ${summary.discountAmount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}.`,
      id: "discount",
      label: "Sconto applicato",
      result: summary.discountAmount.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
      }),
      tone: "success",
    });
  }

  return checks;
}

function buildMeasurementRows(line: SalLineDraft, index: number): SalMeasurementRow[] {
  const quantity = normalizeQuantity(line.factor1 * line.factor2 * line.factor3);
  if (quantity <= 0) {
    return [];
  }

  return [
    {
      description: "Misura corrente",
      factor1: line.factor1,
      factor2: line.factor2,
      factor3: line.factor3,
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
