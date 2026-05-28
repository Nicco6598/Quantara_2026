import { describe, expect, it } from "vitest";
import type { SalDocument } from "../../apps/desktop/src/features/sal/types";
import { toSalDocumentPayload } from "../../apps/desktop/src/lib/sal-data";

describe("SAL Tauri payload serialization", () => {
  it("adds explicit derived counts and cents without mutating the source document", () => {
    const doc: SalDocument = {
      date: "2026-05-21",
      description: "SAL test",
      id: "sal-1",
      lines: [
        {
          id: "line-1",
          measurementRows: [
            {
              date: "2026-05-21",
              description: "Misura A",
              factor1: 2,
              factor2: 3,
              factor3: 1,
              id: "mr-1",
              notes: "",
              order: 1,
              partialQuantity: 6,
              unit: "m",
              voiceId: "voice-1",
            },
            {
              date: "2026-05-21",
              description: "Misura B",
              factor1: 1,
              factor2: 1,
              factor3: 1,
              id: "mr-2",
              order: 2,
              partialQuantity: 1,
              unit: "m",
              voiceId: "voice-1",
            },
          ],
          quantity: 7,
          surcharge: "none",
          voiceId: "voice-1",
        },
        {
          id: "line-2",
          quantity: 3,
          surcharge: "day",
          voiceId: "voice-2",
        },
      ],
      notes: "",
      projectId: "project-1",
      status: "draft",
      title: "SAL 1",
      total: 123.456,
    };

    const payload = toSalDocumentPayload(doc);

    expect(payload).toMatchObject({
      lineCount: 2,
      measurementRowCount: 2,
      totalCents: 12346,
    });
    expect(doc.lineCount).toBeUndefined();
    expect(doc.measurementRowCount).toBeUndefined();
    expect(doc.totalCents).toBeUndefined();
  });
});
