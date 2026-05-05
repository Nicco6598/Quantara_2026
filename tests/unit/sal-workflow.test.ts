import { describe, expect, it } from "vitest";
import { defaultSalEconomicRules } from "../../apps/desktop/src/features/sal/domain/sal-calculations";
import {
  buildSalDocumentView,
  type SalDocument,
  type SalTariffVoice,
} from "../../apps/desktop/src/features/sal/domain/sal-workflow";

const voices: SalTariffVoice[] = [
  {
    category: "01 - Opere civili",
    code: "01.A01",
    description: "Scavo ordinario",
    id: "voice-1",
    isSafetyCost: false,
    projectYear: 2026,
    unit: "m",
    unitPrice: 100,
  },
  {
    category: "01 - Opere civili",
    code: "01.A02",
    description: "Calcestruzzo",
    id: "voice-2",
    isSafetyCost: false,
    projectYear: 2026,
    unit: "m3",
    unitPrice: 200,
  },
];

describe("buildSalDocumentView", () => {
  it("rebuilds persisted SAL totals with economic rules applied to every line", () => {
    const document: SalDocument = {
      date: "2026-05-31",
      description: "Periodo corrente",
      economicRules: {
        ...defaultSalEconomicRules,
        discountPercent: 10,
      },
      id: "sal-1",
      lines: [
        { id: "line-1", quantity: 1, surcharge: "none", surchargePercent: 0, voiceId: "voice-1" },
        { id: "line-2", quantity: 2, surcharge: "none", surchargePercent: 0, voiceId: "voice-2" },
      ],
      notes: "",
      projectId: "project-1",
      status: "closed",
      title: "SAL 01",
    };

    const view = buildSalDocumentView(document, voices);

    expect(view.lines.map((line) => line.discountAmount)).toEqual([10, 40]);
    expect(view.total).toBe(450);
  });

  it("keeps legacy persisted totals when economic rules are missing", () => {
    const document: SalDocument = {
      date: "2026-05-31",
      description: "Legacy",
      id: "sal-legacy",
      lines: [{ id: "line-1", quantity: 1, surcharge: "none", voiceId: "voice-1" }],
      notes: "",
      projectId: "project-1",
      status: "closed",
      title: "SAL legacy",
      total: 81.75,
    };

    expect(buildSalDocumentView(document, voices).total).toBe(81.75);
  });
});
