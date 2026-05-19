import { useMemo } from "react";
import {
  buildLineViews,
  buildVerificationChecks,
  defaultSalEconomicRules,
  summarizeSalLines,
} from "../domain/sal-calculations";
import { buildSalDocumentView } from "../domain/sal-workflow";
import type {
  SalEconomicRules,
  SalDocument,
  SalLineDraft,
  SalLineView,
  SalProjectContext,
  SalTariffVoice,
  SalVoiceDraft,
} from "../types";

export function useSalDerivedViews({
  closedProjectSals,
  economicRules,
  lines,
  project,
  tariffVoices,
  voices,
}: {
  closedProjectSals: SalDocument[];
  economicRules: SalEconomicRules;
  lines: SalLineDraft[];
  project: SalProjectContext | null;
  tariffVoices: SalTariffVoice[];
  voices: SalVoiceDraft[];
}) {
  const voicesMap = useMemo(() => new Map(voices.map((voice) => [voice.id, voice])), [voices]);

  const previousProgressiveAmount = useMemo(
    () =>
      closedProjectSals.reduce(
        (sum, sal) => sum + buildSalDocumentView(sal, tariffVoices).total,
        0,
      ),
    [closedProjectSals, tariffVoices],
  );

  const lineViews = useMemo(() => buildLineViews(lines, economicRules), [lines, economicRules]);

  const summary = useMemo(
    () => summarizeSalLines(lineViews, project?.contractAmount ?? 0, previousProgressiveAmount),
    [lineViews, project?.contractAmount, previousProgressiveAmount],
  );

  const checks = useMemo(
    () => buildVerificationChecks(lineViews, summary, economicRules),
    [lineViews, summary, economicRules],
  );

  const previousSalLines = useMemo<SalLineView[]>(() => {
    const latest = closedProjectSals[0];
    if (!latest || voicesMap.size === 0) return [];
    const result: SalLineDraft[] = [];
    for (const line of latest.lines) {
      const voice = voicesMap.get(line.voiceId);
      if (!voice) continue;
      result.push({
        id: line.id,
        measurementRows: [
          {
            date: latest.date,
            description: "Misura corrente",
            factor1: line.quantity,
            factor2: 1,
            factor3: 1,
            id: `${line.id}-prev`,
            notes: "",
            order: 0,
            partialQuantity: line.quantity,
            unit: voice.unit,
          },
        ],
        notes: "",
        sourceType: "voice",
        surchargePercent: line.surcharge === "night" ? 25 : line.surcharge === "day" ? 10 : 0,
        voice,
      });
    }
    return buildLineViews(result, defaultSalEconomicRules);
  }, [closedProjectSals, voicesMap]);

  return {
    checks,
    lineViews,
    previousProgressiveAmount,
    previousSalLines,
    summary,
    voicesMap,
  };
}
