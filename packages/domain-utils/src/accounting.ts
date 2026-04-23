import type {
  ContractRecord,
  SalEconomicSummary,
  SalRecord,
  TariffBookId,
  TariffResolution,
  TariffVoice,
} from "@quantara/shared-types";
import { addMoney, eur, multiplyMoney } from "./money";

export function resolveTariffVoice(
  contract: ContractRecord,
  voices: readonly TariffVoice[],
  officialCode: string,
): TariffResolution | null {
  const voiceByBookAndCode = new Map<string, TariffVoice>();

  for (const voice of voices) {
    voiceByBookAndCode.set(composeTariffLookupKey(voice.tariffBookId, voice.officialCode), voice);
  }

  const orderedPriorities = [...contract.tariffPriorities].sort(
    (left, right) => left.priority - right.priority,
  );
  const trace: string[] = [];

  for (const priority of orderedPriorities) {
    const key = composeTariffLookupKey(priority.tariffBookId, officialCode);
    const voice = voiceByBookAndCode.get(key);
    trace.push(`Checked ${priority.tariffBookId} for ${officialCode}: ${voice ? "hit" : "miss"}`);

    if (voice) {
      return {
        source: priority.priority === 1 ? "priority" : "fallback",
        tariffBookId: priority.tariffBookId,
        trace,
        voice,
      };
    }
  }

  return null;
}

export function calculateAccountingRowFinalPrice(
  unitPrice: number,
  f1: number,
  f2: number,
  f3: number,
  quantityReference: number,
): number {
  return unitPrice * f1 * f2 * f3 * quantityReference;
}

export function summarizeSal(sal: SalRecord): SalEconomicSummary {
  let discountableGross = eur(0);
  let safetyCosts = eur(0);

  for (const row of sal.rows) {
    if (row.isSafetyCost) {
      safetyCosts = addMoney(safetyCosts, row.finalPrice);
    } else {
      discountableGross = addMoney(discountableGross, row.finalPrice);
    }
  }

  const afterTenderAdjustment = multiplyMoney(
    discountableGross,
    adjustmentMultiplier(sal.tenderAdjustmentPercent),
  );
  const afterSubcontractAdjustment = multiplyMoney(
    afterTenderAdjustment,
    adjustmentMultiplier(sal.subcontractAdjustmentPercent),
  );
  const finalTotal = addMoney(afterSubcontractAdjustment, safetyCosts);

  return {
    afterSubcontractAdjustment,
    afterTenderAdjustment,
    finalTotal,
    grossDiscountable: discountableGross,
    safetyCosts,
  };
}

function adjustmentMultiplier(percent: number): number {
  return 1 + percent / 100;
}

function composeTariffLookupKey(tariffBookId: TariffBookId, officialCode: string): string {
  return `${tariffBookId}:${officialCode.toUpperCase()}`;
}
