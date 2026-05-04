import {
  createDesktopVoiceKey,
  normalizeContractorName,
} from "@/features/projects/utils/projects-helpers";
import type { DesktopContract, DesktopTariffBook, DesktopTariffVoice } from "@/lib/desktopData";
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
    description: truncateVoiceDescription(voice.description),
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

function truncateVoiceDescription(description: string, maxLength = 100): string {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentenceMatches = [...normalized.matchAll(/[.!?;:]/g)].map((match) => match.index ?? -1);
  const after = sentenceMatches.find((index) => index >= maxLength && index <= maxLength + 40);
  if (after != null && after > 0) {
    return `${normalized.slice(0, after + 1).trim()}...`;
  }

  const beforeCandidates = sentenceMatches.filter(
    (index) => index >= maxLength - 40 && index < maxLength,
  );
  if (beforeCandidates.length > 0) {
    const before = beforeCandidates[beforeCandidates.length - 1];
    if (before != null) {
      return `${normalized.slice(0, before + 1).trim()}...`;
    }
  }

  const fallbackSplit = normalized.lastIndexOf(" ", maxLength);
  if (fallbackSplit > 0) {
    return `${normalized.slice(0, fallbackSplit).trim()}...`;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}
