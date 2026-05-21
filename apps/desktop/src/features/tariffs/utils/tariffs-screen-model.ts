import type { DesktopContract, DesktopTariffBook, TariffPdfMetadata } from "@/lib/desktopData";
import type { TariffMetrics } from "../tariffs-types";

export function getMetadataKey(meta: TariffPdfMetadata) {
  return `${normalizeMetadataPart(meta.name)}||${normalizeMetadataPart(meta.sourceName)}||${meta.year}`;
}

function normalizeMetadataPart(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}

export function buildTariffMetrics(tariffBooks: readonly DesktopTariffBook[]): TariffMetrics {
  const sourceNames = new Set<string>();
  const years = new Set<number>();
  let activeCount = 0;

  for (const book of tariffBooks) {
    sourceNames.add(book.sourceName);
    years.add(book.year);
    if (book.status === "active" || book.status === "validated") {
      activeCount += 1;
    }
  }

  return {
    activeCount,
    sourceCount: sourceNames.size,
    tariffCount: tariffBooks.length,
    years: [...years].toSorted((a, b) => b - a),
  };
}

export function buildLinkedProjectCountByTariffBookId(
  contracts: readonly DesktopContract[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const contract of contracts) {
    const linkedBookIds = new Set(
      contract.tariffPriorities.map((priority) => priority.tariffBookId),
    );

    for (const tariffBookId of linkedBookIds) {
      counts.set(tariffBookId, (counts.get(tariffBookId) ?? 0) + 1);
    }
  }

  return counts;
}

export function getProjectTariffBookIds(
  projectFilter: string,
  contracts: readonly DesktopContract[],
): Set<string> | null {
  if (projectFilter === "all") {
    return null;
  }

  const contract = contracts.find((item) => item.id === projectFilter);
  return new Set(contract?.tariffPriorities.map((priority) => priority.tariffBookId) ?? []);
}

export function filterTariffBooks({
  projectTariffBookIds,
  query,
  statusFilter,
  tariffBooks,
  yearFilter,
}: {
  projectTariffBookIds: ReadonlySet<string> | null;
  query: string;
  statusFilter: string;
  tariffBooks: readonly DesktopTariffBook[];
  yearFilter: string;
}): DesktopTariffBook[] {
  const normalizedQuery = query.trim().toLowerCase();
  const selectedYear = Number(yearFilter);

  return tariffBooks.filter((book) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      `${book.name} ${book.sourceName} ${book.year} ${book.id}`
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesYear = yearFilter === "all" || book.year === selectedYear;
    const matchesStatus = statusFilter === "all" || book.status === statusFilter;
    const matchesProject = projectTariffBookIds == null || projectTariffBookIds.has(book.id);

    return matchesQuery && matchesYear && matchesStatus && matchesProject;
  });
}

export function buildImportPreviewToolbarSummary(
  importPreviews: readonly TariffPdfMetadata[],
  reviewedFiles: ReadonlySet<number>,
) {
  let reviewedVoiceCount = 0;
  let totalVoices = 0;
  const fileLabels: string[] = [];

  for (const [index, metadata] of importPreviews.entries()) {
    fileLabels.push(metadata.name);
    totalVoices += metadata.voices.length;
    if (reviewedFiles.has(index)) {
      reviewedVoiceCount += metadata.voices.length;
    }
  }

  return { fileLabels, reviewedVoiceCount, totalVoices };
}
