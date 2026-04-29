import type { DesktopContract, DesktopTariffBook, DesktopTariffVoice } from "@/lib/desktopData";
import { createDesktopVoiceKey } from "@/features/projects/utils/projects-helpers";
import type { SalProjectContext, SalTariffBookOption, SalVoiceDraft } from "../types";

export function mapContractToSalProject(contract: DesktopContract): SalProjectContext {
  const title = contract.title || "Progetto senza titolo";
  return {
    applicationContractCode: contract.applicationContractCode || "Contratto non impostato",
    contract,
    contractAmount: contract.contractualAmount.amount,
    contractor: inferContractor(contract),
    frameworkAgreementCode: contract.frameworkAgreementCode || "AQ non impostato",
    id: contract.id,
    location: "Lotto corrente",
    manager: "Marco Bianchi",
    periodEnd: "2026-05-31",
    periodStart: "2026-05-01",
    salTitle: "SAL 01 - Periodo corrente",
    title,
  };
}

export function mapTariffBooksForContract(
  books: readonly DesktopTariffBook[],
  contract: DesktopContract | null,
): SalTariffBookOption[] {
  const priorityByBook = new Map(
    (contract?.tariffPriorities ?? []).map((priority) => [
      priority.tariffBookId,
      priority.priority,
    ]),
  );

  return books
    .map((book) => ({
      ...book,
      isPriority: priorityByBook.has(book.id),
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
    isSafetyCost: isSafetyVoice(voice),
    laborPercentage: voice.laborPercentage ?? 0,
    source: voice,
    tariffBookId: voice.tariffBookId,
    tariffBookName: tariffBook.name,
    tariffYear: tariffBook.year,
    unit: voice.unitOfMeasure,
    unitPrice: voice.unitPrice,
  };
}

function inferContractor(contract: DesktopContract) {
  const combined = `${contract.title} ${contract.applicationContractCode} ${contract.frameworkAgreementCode}`;
  if (combined.toLowerCase().includes("rfi")) {
    return "RFI - Direzione Milano";
  }
  return "Impresa da contratto";
}

function isSafetyVoice(voice: DesktopTariffVoice) {
  const searchable = `${voice.category} ${voice.officialCode} ${voice.description}`.toLowerCase();
  return (
    searchable.includes("sicurezza") ||
    searchable.includes("oneri") ||
    searchable.includes(" os ") ||
    searchable.startsWith("os") ||
    voice.category.toLowerCase().includes("safety")
  );
}

