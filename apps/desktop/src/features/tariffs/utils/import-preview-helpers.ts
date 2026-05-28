import { useEffect, useMemo, useRef, useState } from "react";
import type { DesktopTariffVoice, TariffPdfMetadata } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";
import type { VoiceGroup } from "./tariff-grouping";
import {
  ensureImportPreviewSessionGroups,
  getImportPreviewSessionCache,
  prewarmImportPreviewSession,
} from "./import-preview-session-cache";
import { isMaggiorazioneVoice, splitRegularAndMaggiorazioni } from "./import-preview-voice-split";
import {
  enrichValidationRows,
  getBlockingIssueCount,
  getImportValidation,
  type ImportCrossFileErrorRow,
  type ImportValidationRow,
} from "./tariffs-validation";

export { isMaggiorazioneVoice, splitRegularAndMaggiorazioni };

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

export type ImportFileStatus = "draft" | "empty" | "error" | "ready" | "reviewed";

export type ImportPreviewFileItem = {
  blockingCount: number;
  index: number;
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

/** Background prewarm: phase 1 = active file ready, phase 2 = all error rows materialized. */
export function useImportPreviewSessionPrewarm(metadatas: readonly TariffPdfMetadata[]) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (metadatas.length === 0) return;
    let cancelled = false;

    void prewarmImportPreviewSession(metadatas, {
      activeFileIndex: 0,
      onPhaseReady: () => {
        if (!cancelled) setRevision((value) => value + 1);
      },
    });

    return () => {
      cancelled = true;
    };
  }, [metadatas]);

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

/** Recompute derived data; uses session prewarm cache when available. Groups only for active file (+ cached). */
function usePerFileVoiceDerivation(
  editableVoicesList: DesktopTariffVoice[][],
  activeFileIndex: number,
  sessionRevision: number,
) {
  const regularRef = useRef<DesktopTariffVoice[][]>([]);
  const groupsRef = useRef<VoiceGroup[][]>([]);
  const validationRef = useRef<ImportValidation[]>([]);
  const invalidRowsRef = useRef<ImportValidationRow[][]>([]);
  const sourceRef = useRef<DesktopTariffVoice[][]>([]);

  return useMemo(() => {
    void sessionRevision;
    const sessionCache = getImportPreviewSessionCache();
    const prevSource = sourceRef.current;
    const regularByFile: DesktopTariffVoice[][] = [];
    const groupsByFile: VoiceGroup[][] = [];
    const gridValidationByFile: ImportValidation[] = [];
    const invalidRowsByFile: ImportValidationRow[][] = [];
    let isActiveFileReady = false;

    for (let index = 0; index < editableVoicesList.length; index++) {
      const voices = editableVoicesList[index] ?? [];
      const cached = sessionCache?.get(index);
      const sourceUnchanged = prevSource[index] === voices && regularRef.current[index];

      if (!cached) {
        const { regular } = splitRegularAndMaggiorazioni(voices);
        regularByFile[index] = regular;
        groupsByFile[index] = groupsRef.current[index] ?? [];
        gridValidationByFile[index] = emptyGridValidation;
        invalidRowsByFile[index] = [];
        continue;
      }

      if (cached && prevSource[index] === voices) {
        regularByFile[index] = cached.regular;
        gridValidationByFile[index] = cached.gridValidation;
        invalidRowsByFile[index] = cached.invalidRows ?? [];
        if (index === activeFileIndex) {
          const activeGroups = ensureImportPreviewSessionGroups(index);
          groupsByFile[index] = activeGroups;
          isActiveFileReady = activeGroups.length > 0 || cached.regular.length === 0;
        } else {
          groupsByFile[index] = cached.groups ?? groupsRef.current[index] ?? [];
        }
        continue;
      }

      const cachedRegular = regularRef.current[index];
      if (sourceUnchanged && cachedRegular) {
        regularByFile[index] = cachedRegular;
        groupsByFile[index] = groupsRef.current[index] ?? [];
        gridValidationByFile[index] = validationRef.current[index] ?? emptyGridValidation;
        invalidRowsByFile[index] = invalidRowsRef.current[index] ?? [];
        if (index === activeFileIndex) {
          const activeGroups = groupsByFile[index] ?? [];
          const activeRegular = regularByFile[index] ?? [];
          isActiveFileReady = activeGroups.length > 0 || activeRegular.length === 0;
        }
        continue;
      }

      const { regular } = splitRegularAndMaggiorazioni(voices);
      regularByFile[index] = regular;
      const gridValidation = getImportValidation(regular);
      gridValidationByFile[index] = gridValidation;
      invalidRowsByFile[index] = buildInvalidRowsForGrid(gridValidation, regular);

      if (index === activeFileIndex) {
        const sessionGroups = cached?.groups ?? ensureImportPreviewSessionGroups(index);
        groupsByFile[index] = sessionGroups;
        isActiveFileReady = sessionGroups.length > 0 || regular.length === 0;
      } else {
        groupsByFile[index] = groupsRef.current[index] ?? [];
      }
    }

    sourceRef.current = editableVoicesList;
    regularRef.current = regularByFile;
    groupsRef.current = groupsByFile;
    validationRef.current = gridValidationByFile;
    invalidRowsRef.current = invalidRowsByFile;

    return {
      regularByFile,
      groupsByFile,
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

export function buildRegularIndexMap(activeVoices: readonly DesktopTariffVoice[]) {
  const map = new Map<number, number>();
  let displayIndex = 0;
  activeVoices.forEach((voice, index) => {
    if (!isMaggiorazioneVoice(voice)) {
      map.set(displayIndex, index);
      displayIndex++;
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
