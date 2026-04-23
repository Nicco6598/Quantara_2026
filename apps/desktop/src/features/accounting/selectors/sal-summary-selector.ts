import { summarizeSal } from "@quantara/domain-utils";
import type { SalEconomicSummary, SalRecord } from "@quantara/shared-types";

export function selectSalEconomicSummary(sal: SalRecord): SalEconomicSummary {
  return summarizeSal(sal);
}
