import { roundCurrency } from "@quantara/domain-utils";

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

/* ── MG (maggiorazione percentuale) helpers ── */
const MG_SEGMENT = "MG";

function isMgCode(code: string): boolean {
  return code.split(".")[1]?.toUpperCase() === MG_SEGMENT;
}

function extractMgTariffPrefix(code: string): string | null {
  const first = code.split(".")[0];
  return first && first.toUpperCase() !== MG_SEGMENT ? first : null;
}

export function buildLineViews(
  lines: readonly SalLineDraft[],
  rules: SalEconomicRules,
): SalLineView[] {
  // Phase 1 — build every line; MG lines get zero gross
  const mgIndexes: number[] = [];
  const views: SalLineView[] = lines.map((line, index) => {
    const rawQty = line.factor1 * line.factor2 * line.factor3;
    const isMg = isMgCode(line.voice.code);

    if (isMg) mgIndexes.push(index);

    const quantity = normalizeQuantity(isMg ? 0 : rawQty);
    const grossAmount = roundCurrency(isMg ? 0 : quantity * line.voice.unitPrice);
    const linkedCharges = buildLinkedCharges(line, grossAmount);
    const linkedTotal = linkedCharges.reduce((sum, charge) => sum + charge.total, 0);
    const netAmount = roundCurrency(grossAmount + linkedTotal);
    const discountable =
      line.voice.isSafetyCost && !rules.applyDiscountToSafetyCosts ? 0 : netAmount;
    const discountAmount = rules.discountEnabled
      ? roundCurrency(discountable * (rules.discountPercent / 100))
      : 0;
    const totalAmount = roundCurrency(netAmount - discountAmount);

    return {
      ...line,
      discountAmount,
      discountableAmount: discountable,
      grossAmount,
      linkedCharges,
      measurementRows: buildMeasurementRows(line, quantity, index),
      netAmount,
      quantity,
      status: isMg || quantity > 0 ? "complete" : "incomplete",
      totalAmount,
    };
  });

  // Phase 2 — compute MG surcharges and re-apply discount on (gross + MG)
  for (const idx of mgIndexes) {
    const mgView = views[idx];
    if (!mgView) continue;
    const mgPercent = mgView.voice.unitPrice;
    if (!mgPercent || mgPercent <= 0) continue;

    const tariffPrefix = extractMgTariffPrefix(mgView.voice.code);
    const mgRate = mgPercent / 100;
    const eligibleGross = views.reduce((sum, v, vi) => {
      if (mgIndexes.includes(vi)) return sum;
      if (tariffPrefix && !v.voice.code.startsWith(`${tariffPrefix}.`)) return sum;
      return sum + v.grossAmount;
    }, 0);
    if (eligibleGross <= 0) continue;
    let totalDistributedMg = 0;

    // Distribute MG to each eligible voice and re-compute discount on gross + MG
    for (let vi = 0; vi < views.length; vi++) {
      if (mgIndexes.includes(vi)) continue;
      const ev = views[vi];
      if (!ev) continue;
      if (tariffPrefix && !ev.voice.code.startsWith(`${tariffPrefix}.`)) continue;
      if (ev.grossAmount <= 0) continue;

      const mgShare = roundCurrency(ev.grossAmount * mgRate);
      if (mgShare <= 0) continue;
      totalDistributedMg += mgShare;

      // Recompute: (gross + surchargeLinked + mgShare) → discount
      const surchargeLinkedTotal = ev.linkedCharges.reduce((s, c) => s + c.total, 0);
      const newNet = roundCurrency(ev.grossAmount + surchargeLinkedTotal + mgShare);
      const discountable = ev.voice.isSafetyCost && !rules.applyDiscountToSafetyCosts ? 0 : newNet;
      const newDiscount = rules.discountEnabled
        ? roundCurrency(discountable * (rules.discountPercent / 100))
        : 0;
      ev.netAmount = newNet;
      ev.discountableAmount = discountable;
      ev.discountAmount = newDiscount;
      ev.totalAmount = roundCurrency(newNet - newDiscount);
    }

    // MG line shows the total surcharge
    const totalMg = roundCurrency(totalDistributedMg);
    mgView.linkedCharges.push({
      baseAmount: eligibleGross,
      code: `MG.${tariffPrefix ?? "ALL"}`,
      description: tariffPrefix
        ? `Maggiorazione MG ${mgPercent}% su voci ${tariffPrefix}`
        : `Maggiorazione MG ${mgPercent}% su tutte le voci`,
      id: `${mgView.id}-mg`,
      percent: mgPercent,
      total: totalMg,
    });
    mgView.netAmount = totalMg;
    mgView.totalAmount = totalMg;
    mgView.discountableAmount = 0;
    mgView.discountAmount = 0;
  }

  return views;
}

export function summarizeSalLines(
  lineViews: readonly SalLineView[],
  contractAmount: number,
  previousProgressiveAmount: number,
): SalEconomicSummary {
  const summary = lineViews.reduce(
    (current, line) => {
      // Skip MG lines — their amounts are already distributed to eligible voices
      if (isMgCode(line.voice.code)) return current;

      const linkedChargeAmount = line.linkedCharges.reduce((sum, charge) => sum + charge.total, 0);
      const hasDiscountableAmount = line.discountableAmount > 0;
      return {
        discountAmount: current.discountAmount + line.discountAmount,
        discountableAmount: current.discountableAmount + line.discountableAmount,
        discountedVoiceCount: current.discountedVoiceCount + (line.discountAmount > 0 ? 1 : 0),
        excludedSafetyVoiceCount:
          current.excludedSafetyVoiceCount +
          (line.voice.isSafetyCost && line.discountAmount === 0 ? 1 : 0),
        grossAmount: current.grossAmount + line.grossAmount,
        linkedChargeAmount: current.linkedChargeAmount + linkedChargeAmount,
        safetyAmount: current.safetyAmount + (line.voice.isSafetyCost ? line.grossAmount : 0),
        total: current.total + line.totalAmount,
        zeroDiscountableVoiceCount:
          current.zeroDiscountableVoiceCount +
          (hasDiscountableAmount && line.discountAmount === 0 ? 1 : 0),
      };
    },
    {
      discountAmount: 0,
      discountableAmount: 0,
      discountedVoiceCount: 0,
      excludedSafetyVoiceCount: 0,
      grossAmount: 0,
      linkedChargeAmount: 0,
      safetyAmount: 0,
      total: 0,
      zeroDiscountableVoiceCount: 0,
    },
  );

  const total = roundCurrency(summary.total);
  return {
    budgetResidual: roundCurrency(contractAmount - previousProgressiveAmount - total),
    discountAmount: roundCurrency(summary.discountAmount),
    discountableAmount: roundCurrency(summary.discountableAmount),
    discountedVoiceCount: summary.discountedVoiceCount,
    excludedSafetyVoiceCount: summary.excludedSafetyVoiceCount,
    grossAmount: roundCurrency(summary.grossAmount),
    linkedChargeAmount: roundCurrency(summary.linkedChargeAmount),
    netDiscountableAmount: roundCurrency(summary.discountableAmount - summary.discountAmount),
    previousProgressiveAmount,
    safetyAmount: roundCurrency(summary.safetyAmount),
    total,
    voiceCount: lineViews.length,
    zeroDiscountableVoiceCount: summary.zeroDiscountableVoiceCount,
  };
}

export function buildVerificationChecks(
  lineViews: readonly SalLineView[],
  summary: SalEconomicSummary,
  economicRules: SalEconomicRules,
): SalVerificationCheck[] {
  let completeLines = 0;
  let safetyLines = 0;
  let linkedLines = 0;
  const hasBudgetOverflow = summary.budgetResidual < 0;
  const zeroQtyLines: SalLineView[] = [];
  const zeroPriceLines: SalLineView[] = [];
  const highSurchargeLines: SalLineView[] = [];
  const highDiscount = economicRules.discountEnabled && economicRules.discountPercent > 30;
  const shouldCheckMissingDiscount =
    economicRules.discountEnabled && economicRules.discountPercent > 0;
  const discountableWithoutDiscount: SalLineView[] = [];

  for (const line of lineViews) {
    if (line.status === "complete") completeLines += 1;
    if (line.voice.isSafetyCost) safetyLines += 1;
    if (line.linkedCharges.length > 0) linkedLines += 1;
    if (line.quantity <= 0) zeroQtyLines.push(line);
    if (line.voice.unitPrice <= 0) zeroPriceLines.push(line);
    if (line.surchargePercent > 25) highSurchargeLines.push(line);
    if (
      shouldCheckMissingDiscount &&
      !line.voice.isSafetyCost &&
      line.discountableAmount > 0 &&
      line.discountAmount <= 0
    ) {
      discountableWithoutDiscount.push(line);
    }
  }

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

  if (discountableWithoutDiscount.length > 0) {
    checks.push({
      detail: `Le voci ${discountableWithoutDiscount.map((line) => line.voice.code).join(", ")} sono ribassabili ma non hanno sconto calcolato.`,
      id: "discount-missing",
      label: "Ribasso non applicato",
      result: `${discountableWithoutDiscount.length} voci`,
      tone: "warning",
    });
  }

  return checks;
}

function buildMeasurementRows(
  line: SalLineDraft,
  quantity: number,
  index: number,
): SalMeasurementRow[] {
  if (quantity <= 0 && isMgCode(line.voice.code)) return [];
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

  const laborPct = (line.voice.laborPercentage ?? 0) / 100;
  const surchargePct = line.surchargePercent / 100;
  const effectiveRate = surchargePct * laborPct;
  const total = roundCurrency(grossAmount * effectiveRate);
  return [
    {
      baseAmount: grossAmount,
      code: `${line.voice.code}.MAG`,
      description: `Maggiorazione ${line.surchargePercent}% × Manodopera ${line.voice.laborPercentage ?? 0}%`,
      id: `${line.id}-surcharge`,
      percent: line.surchargePercent,
      total,
    },
  ];
}

function normalizeQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
