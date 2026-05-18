import type { DesktopContract, DesktopTariffBook, DesktopTariffVoice } from "@/lib/desktopData";
import { createDesktopVoiceKey, normalizeContractorName } from "@/lib/shared-utils";
import { isSafetyVoice } from "../domain/sal-safety";
import type { SalProjectContext, SalTariffBookOption, SalVoiceDraft } from "../types";

export function mapContractToSalProject(
  contract: DesktopContract,
  contractorName?: string,
): SalProjectContext {
  const title = contract.title || "Progetto senza titolo";
  const contractor = contractorName ? normalizeContractorName(contractorName) : "Senza appaltatore";

  return {
    applicationContractCode: contract.applicationContractCode || "Contratto non impostato",
    contract,
    contractAmount: contract.contractualAmount.amount,
    contractor,
    frameworkAgreementCode: contract.frameworkAgreementCode || "AQ non impostato",
    id: contract.id,
    location: "Lotto corrente",
    manager: "Marco Bianchi",
    periodEnd: "2026-05-31",
    periodStart: "2026-05-01",
    salTitle: "SAL 01 - Periodo corrente",
    tenderDiscountPercent: contract.tenderDiscountPercent ?? 0,
    title,
  };
}

export function mapTariffBooksForContract(
  books: readonly DesktopTariffBook[],
  contract: DesktopContract | null,
): SalTariffBookOption[] {
  const priorities = contract?.tariffPriorities ?? [];
  if (priorities.length === 0) return [];

  const priorityByBook = new Map(
    priorities.map((priority) => [priority.tariffBookId, priority.priority]),
  );

  return books
    .filter((book) => priorityByBook.has(book.id))
    .map((book) => ({
      ...book,
      isPriority: true,
      priority: priorityByBook.get(book.id) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return right.year - left.year || left.name.localeCompare(right.name);
    });
}

export function mapVoiceToDraft(
  voice: DesktopTariffVoice,
  tariffBook: DesktopTariffBook,
): SalVoiceDraft {
  return {
    category: voice.category,
    code: voice.officialCode,
    description: voice.description,
    id: createDesktopVoiceKey(voice.tariffBookId, voice.id),
    isSafetyCost: isSafetyVoice({
      category: voice.category,
      code: voice.officialCode,
      description: voice.description,
    }),
    laborPercentage: voice.laborPercentage ?? 0,
    source: voice,
    tariffBookId: voice.tariffBookId,
    tariffBookName: tariffBook.name,
    tariffYear: tariffBook.year,
    unit: voice.unitOfMeasure,
    unitPrice: voice.unitPrice,
  };
}
