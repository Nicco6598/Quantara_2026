import type { SalDocument } from "../types";
import type { SalTariffVoice } from "./sal-workflow";
import { buildSalDocumentView } from "./sal-workflow";

export type SalDocumentDisplaySummary = {
  lineCount: number;
  total: number;
};

/** Totali e conteggio voci per liste (dettaglio progetto, dashboard) con fallback ai valori persistiti. */
export function getSalDocumentDisplaySummary(
  document: SalDocument,
  tariffVoices: readonly SalTariffVoice[],
): SalDocumentDisplaySummary {
  const view = buildSalDocumentView(document, tariffVoices);
  const computedLineCount = view.lines.length;
  const computedTotal = view.total;

  const persistedLineCount =
    typeof document.lineCount === "number" ? document.lineCount : document.lines.length;
  const persistedTotal =
    typeof document.total === "number"
      ? document.total
      : typeof document.totalCents === "number"
        ? document.totalCents / 100
        : null;

  if (computedLineCount > 0) {
    return { lineCount: computedLineCount, total: computedTotal };
  }

  return {
    lineCount: persistedLineCount,
    total: persistedTotal ?? computedTotal,
  };
}
