import { describe, expect, it } from "vitest";
import { buildIndexedVoiceOptions, buildTariffSearchTokens } from "../../components/SalSearchBar";
import type { SalVoiceDraft } from "../../types";
import { tariffTokenMatchesQuery } from "../../utils/search-utils";
import {
  parseSalVoiceSearchQuery,
  prepareSalVoiceSearch,
  rankSalVoiceMatches,
  rankSalVoiceMatchesPrepared,
} from "../sal-voice-search";

function voice(overrides: Partial<SalVoiceDraft>): SalVoiceDraft {
  return {
    category: "Opere",
    code: "FA.001",
    description: "Scavo",
    id: "v1",
    isSafetyCost: false,
    laborPercentage: 0,
    source: {} as SalVoiceDraft["source"],
    tariffBookId: "book-1",
    tariffBookName: "Tariffario",
    tariffYear: 2026,
    unit: "m3",
    unitPrice: 10,
    ...overrides,
  };
}

function searchVoices(voices: SalVoiceDraft[], query: string) {
  const index = buildIndexedVoiceOptions(voices);
  const tokens = new Map<string, Set<string>>();
  for (const item of voices) {
    if (!tokens.has(item.tariffBookId)) {
      tokens.set(item.tariffBookId, buildTariffSearchTokens(item));
    }
  }
  return rankSalVoiceMatches(index, query, tokens, tariffTokenMatchesQuery, 80).map(
    (item) => item.option.value,
  );
}

describe("sal-voice-search", () => {
  it("parses structured, numeric and text queries", () => {
    expect(parseSalVoiceSearchQuery("SS AC 2").isStructuredCode).toBe(true);
    expect(parseSalVoiceSearchQuery("2 02").isNumericOnly).toBe(true);
    expect(parseSalVoiceSearchQuery("lazio scavo").isStructuredCode).toBe(false);
  });

  it("scores code tokens in any segment and text tokens in description", () => {
    const index = buildIndexedVoiceOptions([
      voice({ code: "SS.MG.001.A", id: "mg-code" }),
      voice({ code: "BA.001", description: "Lavori MG", id: "mg-text" }),
    ]);
    const prepared = prepareSalVoiceSearch("MG", new Map(), tariffTokenMatchesQuery);
    if (prepared === null) {
      throw new Error("expected prepared search");
    }
    const first = index[0];
    const second = index[1];
    if (!first || !second) {
      throw new Error("expected two indexed voices");
    }
    expect(rankSalVoiceMatchesPrepared(index, prepared, 80).length).toBe(2);
    expect(searchVoices([first.voice, second.voice], "MG").sort()).toEqual([
      "BA.001",
      "SS.MG.001.A",
    ]);
  });

  it("uses the same ranker for prefix, structured and tariff+text queries", () => {
    const voices = [
      voice({ code: "FA.001.010", id: "fa", tariffBookName: "Ferrovia" }),
      voice({
        code: "BA.001",
        id: "ba",
        tariffBookName: "Tariffario con FA nel titolo",
      }),
      voice({
        code: "LA.001",
        description: "Scavo in trincea",
        id: "lazio",
        tariffBookId: "lazio",
        tariffBookName: "Tariffario Lazio 2026",
      }),
      voice({
        code: "TO.001",
        description: "Scavo in trincea",
        id: "torino",
        tariffBookId: "torino",
        tariffBookName: "Tariffario Torino",
      }),
    ];

    expect(searchVoices(voices, "FA")).toEqual(["FA.001.010"]);
    expect(searchVoices(voices, "lazio scavo")).toEqual(["LA.001"]);
    expect(
      searchVoices(
        [
          voice({ code: "SS.AC.A.2 02.A", id: "ss" }),
          voice({ code: "BA.002.010", description: "testo 2", id: "ba" }),
        ],
        "SS AC 2",
      ).sort(),
    ).toEqual(["SS.AC.A.2 02.A"]);
  });
});
