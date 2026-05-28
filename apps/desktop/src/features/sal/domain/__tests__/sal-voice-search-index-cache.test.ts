import { describe, expect, it } from "vitest";
import type { SalVoiceDraft } from "../../types";
import { getSalVoiceSearchIndexCacheKey } from "../sal-voice-search-index-cache";

function voice(id: string): SalVoiceDraft {
  return {
    category: "Opere",
    code: "FA.01",
    description: "Test",
    id,
    isSafetyCost: false,
    laborPercentage: 0,
    source: {} as never,
    tariffBookId: "tb1",
    tariffBookName: "Tariffario",
    tariffYear: 2026,
    unit: "m",
    unitPrice: 1,
  };
}

describe("getSalVoiceSearchIndexCacheKey", () => {
  it("changes when middle voice ids change with same length and endpoints", () => {
    const books = ["tb1"];
    const left = Array.from({ length: 10 }, (_, i) => voice(`v-${i}`));
    const right = [...left];
    right[5] = voice("v-changed");

    const keyLeft = getSalVoiceSearchIndexCacheKey(left, books);
    const keyRight = getSalVoiceSearchIndexCacheKey(right, books);
    expect(keyLeft).not.toBe(keyRight);
  });
});
