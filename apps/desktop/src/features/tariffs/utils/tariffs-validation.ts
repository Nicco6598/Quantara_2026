import type { DesktopTariffVoice } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";

export type ImportValidationRow = ImportValidation["invalidRows"][number] & {
  code: string;
};

export type ImportCrossFileErrorRow = ImportValidationRow & {
  fileIndex: number;
  fileName: string;
  isActiveFile: boolean;
};

export function enrichValidationRows(
  rows: ImportValidation["invalidRows"],
  voices: readonly DesktopTariffVoice[],
): ImportValidationRow[] {
  return rows.map((row) => ({
    ...row,
    code: voices[row.index]?.officialCode.trim() || `Riga ${row.index + 1}`,
  }));
}

function collectMissingFields(voice: DesktopTariffVoice, code: string) {
  const missingFields: Array<{ field: keyof DesktopTariffVoice; label: string }> = [];
  if (code.length === 0) {
    missingFields.push({ field: "officialCode", label: "codice" });
  }
  if (voice.description.trim().length === 0) {
    missingFields.push({ field: "description", label: "descrizione" });
  }
  if (voice.unitOfMeasure.trim().length === 0) {
    missingFields.push({ field: "unitOfMeasure", label: "U.M." });
  }
  if (!Number.isFinite(voice.unitPrice)) {
    missingFields.push({ field: "unitPrice", label: "prezzo" });
  }
  return missingFields;
}

/** Fast path: counts and examples only — no per-row arrays (used during multi-file prewarm). */
export function getImportValidationSummary(
  voices: readonly DesktopTariffVoice[],
): ImportValidation {
  const codeCounts = new Map<string, number>();
  const invalidExamples: string[] = [];
  let invalidCount = 0;

  for (let index = 0; index < voices.length; index++) {
    const voice = voices[index];
    if (!voice) continue;
    const code = voice.officialCode.trim();
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);

    if (collectMissingFields(voice, code).length > 0) {
      invalidCount += 1;
      if (invalidExamples.length < 4) {
        invalidExamples.push(code || voice.id);
      }
    }
  }

  const duplicateExamples: string[] = [];
  let duplicateCount = 0;
  for (const [code, count] of codeCounts) {
    if (count > 1) {
      duplicateCount += count - 1;
      if (duplicateExamples.length < 4) {
        duplicateExamples.push(code);
      }
    }
  }

  return {
    duplicateCount,
    duplicateExamples,
    duplicateRows: [],
    invalidCount,
    invalidExamples,
    invalidRows: [],
    validCount: Math.max(0, voices.length - invalidCount),
    warningCount: 0,
  };
}

/** Full validation with row-level detail for grids and error navigation. */
export function getImportValidation(voices: readonly DesktopTariffVoice[]): ImportValidation {
  const codeCounts = new Map<string, number>();
  const invalidExamples: string[] = [];
  const invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }> = [];
  let invalidCount = 0;

  for (let index = 0; index < voices.length; index++) {
    const voice = voices[index];
    if (!voice) continue;
    const code = voice.officialCode.trim();
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);

    const missingFields = collectMissingFields(voice, code);
    if (missingFields.length > 0) {
      invalidCount += 1;
      if (invalidExamples.length < 4) {
        invalidExamples.push(code || voice.id);
      }
      for (const field of missingFields) {
        invalidRows.push({ index, ...field });
      }
    }
  }

  const duplicateExamples: string[] = [];
  let duplicateCount = 0;
  const duplicateCodes = new Set<string>();
  for (const [code, count] of codeCounts) {
    if (count > 1) {
      duplicateCount += count - 1;
      duplicateCodes.add(code);
      if (duplicateExamples.length < 4) {
        duplicateExamples.push(code);
      }
    }
  }

  const duplicateRows: Array<{ field: "officialCode"; index: number; label: string }> = [];
  if (duplicateCodes.size > 0) {
    for (let index = 0; index < voices.length; index++) {
      const voice = voices[index];
      if (!voice) continue;
      const code = voice.officialCode.trim();
      if (code.length > 0 && duplicateCodes.has(code)) {
        duplicateRows.push({ field: "officialCode", index, label: "codice duplicato" });
      }
    }
  }

  return {
    duplicateCount,
    duplicateExamples,
    duplicateRows,
    invalidCount,
    invalidExamples,
    invalidRows,
    validCount: Math.max(0, voices.length - invalidCount),
    warningCount: 0,
  };
}

/** Rows that block import confirmation — missing/invalid fields and duplicate codes. */
export function getBlockingIssueCount(validation: ImportValidation): number {
  return validation.invalidCount + validation.duplicateCount;
}

const percentFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

export function formatPercent(value: null | number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  return `${percentFormatter.format(value)}%`;
}

export function formatEditablePercent(value: null | number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }

  return String(value).replace(".", ",");
}

export function parseOptionalPercent(value: string): null | number {
  const normalized = value.trim().replace("%", "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function createTariffBookId(metadata: { name: string; year: number }): string {
  const base = sanitizeIdentifier(`${metadata.name}_${metadata.year}`) || "import";
  return `tariff_${base}_${Date.now().toString(36)}`;
}

export function sanitizeIdentifier(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
