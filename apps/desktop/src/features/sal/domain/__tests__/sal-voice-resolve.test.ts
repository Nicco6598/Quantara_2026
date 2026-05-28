import { describe, expect, it } from "vitest";
import { createDesktopVoiceKey } from "@/lib/shared-utils";
import type { SalVoiceDraft } from "../../types";
import { extractSnapshotVoicesFromSal, resolveVoiceForSalLine } from "../sal-voice-resolve";
import type { SalDocument } from "../sal-workflow";

function voice(id: string, bookId = "book-1"): SalVoiceDraft {
  return {
    category: "FA",
    code: "01.01",
    description: "Voce",
    id,
    isSafetyCost: false,
    laborPercentage: 0,
    source: {} as never,
    tariffBookId: bookId,
    tariffBookName: "Tariffario",
    tariffYear: 2026,
    unit: "m",
    unitPrice: 10,
  };
}

describe("sal-voice-resolve", () => {
  it("resolves legacy raw voice id against composite catalog keys", () => {
    const compositeId = createDesktopVoiceKey("book-1", "voice-raw");
    const catalog = [voice(compositeId)];
    const resolved = resolveVoiceForSalLine("voice-raw", catalog);
    expect(resolved?.id).toBe(compositeId);
  });

  it("extracts voices array from SQLite snapshot payload", () => {
    const extracted = extractSnapshotVoicesFromSal({
      date: "2026-05-01",
      description: "",
      id: "sal-1",
      lines: [],
      notes: "",
      projectId: "p1",
      status: "draft",
      title: "SAL 02",
      voices: [
        {
          category: "FA",
          code: "01.01",
          description: "Voce snapshot",
          id: "book-1::v1",
          projectYear: 2026,
          unit: "m",
          unitPrice: 12,
        },
      ],
    } as SalDocument & {
      voices: Array<{
        category: string;
        code: string;
        description: string;
        id: string;
        projectYear: number;
        unit: string;
        unitPrice: number;
      }>;
    });
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.description).toBe("Voce snapshot");
  });
});
