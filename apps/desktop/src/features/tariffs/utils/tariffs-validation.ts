import type { DesktopTariffVoice } from "@/lib/desktopData";
import type { ImportValidation } from "../tariffs-types";

export function getImportValidation(voices: DesktopTariffVoice[]): ImportValidation {
  const codeCounts = new Map<string, number>();
  const invalidExamples: string[] = [];
  const invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }> = [];
  let invalidCount = 0;

  for (const [index, voice] of voices.entries()) {
    const code = voice.officialCode.trim();
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);

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

  const duplicateExamples = [...codeCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([code]) => code)
    .slice(0, 4);
  const duplicateCount = [...codeCounts.values()].reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );
  const duplicateRows = voices
    .map((voice, index) => ({ code: voice.officialCode.trim(), index }))
    .filter((row) => row.code.length > 0 && (codeCounts.get(row.code) ?? 0) > 1)
    .map((row) => ({
      field: "officialCode" as const,
      index: row.index,
      label: "codice duplicato",
    }));

  return {
    duplicateCount,
    duplicateExamples,
    duplicateRows,
    invalidCount,
    invalidExamples,
    invalidRows,
    validCount: Math.max(0, voices.length - invalidCount),
    warningCount: duplicateCount + invalidCount,
  };
}

export function formatPercent(value: null | number | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value)}%`;
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
