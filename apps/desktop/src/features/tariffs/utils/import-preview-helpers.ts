import { startTransition, useEffect, useMemo, useState } from "react";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import type { VoiceGroup } from "./tariff-grouping";
import type { ImportPreviewGridLayout } from "./import-preview-grid-layout";
import {
  getImportPreviewSessionCache,
  isImportPreviewFileReady,
  prewarmImportPreviewFile,
} from "./import-preview-session-cache";
import {
  formatMaggiorazioneDisplayCells,
  isMaggiorazioneVoice,
  getImportVoiceBreakdown,
  splitRegularAndMaggiorazioni,
  type ImportVoiceBreakdown,
} from "./import-preview-voice-split";

export type { ImportVoiceBreakdown };
export { getImportVoiceBreakdown };
import {
  enrichValidationRows,
  getBlockingIssueCount,
  getImportValidationSummary,
  type ImportCrossFileErrorRow,
  type ImportValidationRow,
} from "./tariffs-validation";

export { formatMaggiorazioneDisplayCells, isMaggiorazioneVoice, splitRegularAndMaggiorazioni };

export {
  prewarmImportPreviewSession,
  prewarmImportPreviewVoices,
} from "./import-preview-session-cache";

export type { ImportCrossFileErrorRow, ImportValidationRow };

export function buildAllImportErrorRows(input: {
  activeFileIndex: number;
  invalidRowsByFile: readonly ImportValidationRow[][];
  metadatas: readonly TariffPdfMetadata[];
}): ImportCrossFileErrorRow[] {
  const rows: ImportCrossFileErrorRow[] = [];
  input.metadatas.forEach((metadata, fileIndex) => {
    const fileRows = input.invalidRowsByFile[fileIndex] ?? [];
    for (const row of fileRows) {
      rows.push({
        ...row,
        fileIndex,
        fileName: metadata.name,
        isActiveFile: fileIndex === input.activeFileIndex,
      });
    }
  });
  return rows;
}

export type ImportFileStatus = "draft" | "empty" | "error" | "pending" | "ready" | "reviewed";

export type ImportPreviewFileItem = {
  blockingCount: number;
  index: number;
  isDrafted: boolean;
  /** Ledger (gruppi/indice) già costruito per questo file. */
  isGridReady: boolean;
  isReviewed: boolean;
  metadata: TariffPdfMetadata;
  status: ImportFileStatus;
  voiceCount: number;
};

export function getImportFileStatus(input: {
  blockingCount: number;
  hasVoices: boolean;
  isDrafted: boolean;
  isReviewed: boolean;
}): ImportFileStatus {
  if (input.isDrafted) return "draft";
  if (!input.hasVoices) return "empty";
  if (input.blockingCount > 0) return "error";
  if (input.isReviewed) return "reviewed";
  return "ready";
}

/**
 * Conteggi rail da voci parse (O(n), nessun grouping).
 * Stessi blocchi di getImportValidation; sul file attivo con ledger aperto usa la validazione live.
 */
export function buildImportPreviewFileItems(input: {
  activeFileIndex: number;
  draftedFiles: ReadonlySet<number>;
  isFileReady: (fileIndex: number) => boolean;
  mergedGridValidationByFile: readonly ImportValidation[];
  metadatas: readonly TariffPdfMetadata[];
  voiceBreakdownByFile: ReadonlyArray<ImportVoiceBreakdown>;
  reviewedFiles: ReadonlySet<number>;
}): ImportPreviewFileItem[] {
  return input.metadatas.map((metadata, index) => {
    const isDrafted = input.draftedFiles.has(index);
    const isReviewed = input.reviewedFiles.has(index);
    const isGridReady = input.isFileReady(index);
    const breakdown = input.voiceBreakdownByFile[index] ?? getImportVoiceBreakdown([]);
    const regular = breakdown.regular;
    const voiceCount = breakdown.regularCount;

    const useLiveValidation = index === input.activeFileIndex && isGridReady;
    const gridValidation = useLiveValidation
      ? (input.mergedGridValidationByFile[index] ?? getImportValidationSummary(regular))
      : getImportValidationSummary(regular);
    const blockingCount = getGridBlockingCount(gridValidation, metadata, voiceCount > 0);
    const hasVoices = voiceCount > 0;

    return {
      blockingCount,
      index,
      isDrafted,
      isGridReady,
      isReviewed,
      metadata,
      status: getImportFileStatus({
        blockingCount,
        hasVoices,
        isDrafted,
        isReviewed,
      }),
      voiceCount,
    };
  });
}

const emptyGridValidation: ImportValidation = {
  duplicateCount: 0,
  duplicateExamples: [],
  duplicateRows: [],
  invalidCount: 0,
  invalidExamples: [],
  invalidRows: [],
  validCount: 0,
  warningCount: 0,
};

/** Background prewarm: phase initial = groups ready; validation = full row-level checks. */
export function useImportPreviewSessionPrewarm(
  metadatas: readonly TariffPdfMetadata[],
  activeFileIndex = 0,
) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (metadatas.length === 0) return;
    let cancelled = false;

    const bump = () => {
      if (!cancelled) {
        startTransition(() => {
          setRevision((value) => value + 1);
        });
      }
    };

    if (isImportPreviewFileReady(activeFileIndex)) {
      bump();
      return;
    }

    void prewarmImportPreviewFile(metadatas, activeFileIndex, {
      onPhaseReady: bump,
    });

    return () => {
      cancelled = true;
    };
  }, [activeFileIndex, metadatas]);

  return revision;
}

export function estimateImportBlockingIssues(input: {
  activeFileIndex: number;
  gridValidationByFile: readonly ImportValidation[];
  metadatas: readonly TariffPdfMetadata[];
  regularByFile: readonly DesktopTariffVoice[][];
}) {
  let total = 0;
  let otherFiles = 0;

  input.metadatas.forEach((metadata, fileIndex) => {
    const regular = input.regularByFile[fileIndex] ?? [];
    const blocking = getGridBlockingCount(
      input.gridValidationByFile[fileIndex] ?? emptyGridValidation,
      metadata,
      regular.length > 0,
    );
    total += blocking;
    if (fileIndex !== input.activeFileIndex) {
      otherFiles += blocking;
    }
  });

  return { otherFiles, total };
}

/** Recompute derived data from session cache only — never blocks on grouping during render. */
function usePerFileVoiceDerivation(
  editableVoicesList: DesktopTariffVoice[][],
  activeFileIndex: number,
  sessionRevision: number,
) {
  return useMemo(() => {
    void sessionRevision;
    const sessionCache = getImportPreviewSessionCache();
    const regularByFile: DesktopTariffVoice[][] = [];
    const groupsByFile: VoiceGroup[][] = [];
    const gridValidationByFile: ImportValidation[] = [];
    const invalidRowsByFile: ImportValidationRow[][] = [];
    const gridLayoutByFile: Array<ImportPreviewGridLayout | null> = [];
    let isActiveFileReady = false;

    for (let index = 0; index < editableVoicesList.length; index++) {
      const cached = sessionCache?.get(index);
      const fallbackRegular = splitRegularAndMaggiorazioni(editableVoicesList[index] ?? []).regular;
      const regular = cached?.regular?.length ? cached.regular : fallbackRegular;
      regularByFile[index] = regular;

      const gridValidation = cached?.gridValidation ?? emptyGridValidation;
      gridValidationByFile[index] = gridValidation;
      invalidRowsByFile[index] =
        gridValidation.invalidRows.length > 0 || gridValidation.duplicateRows.length > 0
          ? buildInvalidRowsForGrid(gridValidation, regular)
          : [];

      const ready = isImportPreviewFileReady(index);
      if (ready && cached?.groups) {
        groupsByFile[index] = cached.groups;
        gridLayoutByFile[index] = cached.gridLayout;
      } else {
        groupsByFile[index] = [];
        gridLayoutByFile[index] = null;
      }

      if (index === activeFileIndex) {
        isActiveFileReady = ready;
      }
    }

    return {
      regularByFile,
      groupsByFile,
      gridLayoutByFile,
      gridValidationByFile,
      invalidRowsByFile,
      isActiveFileReady,
    };
  }, [activeFileIndex, editableVoicesList, sessionRevision]);
}

export function useImportPreviewDerivations(
  editableVoicesList: DesktopTariffVoice[][],
  activeFileIndex: number,
  sessionRevision = 0,
) {
  return usePerFileVoiceDerivation(editableVoicesList, activeFileIndex, sessionRevision);
}

export type { ImportPreviewGridLayout };

/** Grid row index (regular-only) → index in the full editable voice list (incl. MG). */
export function buildRegularIndexMap(activeVoices: readonly DesktopTariffVoice[]) {
  const map = new Map<number, number>();
  let regularIndex = 0;
  activeVoices.forEach((voice, fullIndex) => {
    if (!isMaggiorazioneVoice(voice)) {
      map.set(regularIndex, fullIndex);
      regularIndex++;
    }
  });
  return map;
}

export function buildInvalidRowsForGrid(
  gridValidation: ImportValidation,
  regularVoices: readonly DesktopTariffVoice[],
): ImportValidationRow[] {
  return enrichValidationRows(
    [
      ...gridValidation.invalidRows,
      ...gridValidation.duplicateRows.map((row) => ({
        ...row,
        field: row.field as keyof DesktopTariffVoice,
      })),
    ],
    regularVoices,
  );
}

export function getGridBlockingCount(
  gridValidation: ImportValidation,
  metadata?: { sourceName?: string; year?: number },
  hasVoices = true,
) {
  let count = getBlockingIssueCount(gridValidation);
  if (!hasVoices) count += 1;
  if (metadata?.sourceName === "Ente da confermare") count += 1;
  const year = metadata?.year;
  if (year != null && (year < 1900 || year > 2200)) count += 1;
  return count;
}
