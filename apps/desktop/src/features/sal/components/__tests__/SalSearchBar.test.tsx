import { describe, it, expect } from "vitest";
import {
  buildIndexedVoiceOptions,
  buildTariffSearchTokens,
  filterIndexedVoiceOptions,
} from "../SalSearchBar";
import type { SalVoiceDraft } from "../../types";
import { tariffTokenMatchesQuery } from "../../utils/search-utils";

function voice(overrides: Partial<SalVoiceDraft>): SalVoiceDraft {
  const base: SalVoiceDraft = {
    category: "Opere civili",
    code: "FA.001",
    description: "Scavo in trincea",
    id: "voice-1",
    isSafetyCost: false,
    laborPercentage: 0,
    source: {} as SalVoiceDraft["source"],
    tariffBookId: "book-fa",
    tariffBookName: "Tariffario FA",
    tariffYear: 2026,
    unit: "m3",
    unitPrice: 10,
  };
  return Object.assign(base, overrides);
}

function search(voices: SalVoiceDraft[], query: string) {
  const index = buildIndexedVoiceOptions(voices);
  const tokens = new Map<string, Set<string>>();
  for (const item of voices) {
    if (!tokens.has(item.tariffBookId)) {
      tokens.set(item.tariffBookId, buildTariffSearchTokens(item));
    }
  }
  return filterIndexedVoiceOptions({ index, query, tariffTokensByBookId: tokens });
}

describe("tariffTokenMatchesQuery", () => {
  it("matches exact short code FA", () => {
    expect(tariffTokenMatchesQuery("FA", "FA")).toBe(true);
  });

  it("matches FA with subcode FA.01", () => {
    expect(tariffTokenMatchesQuery("FA.01", "FA")).toBe(true);
  });

  it("matches FA.01 with full code", () => {
    expect(tariffTokenMatchesQuery("FA.01", "FA.01")).toBe(true);
  });

  it("matches partial code NP", () => {
    expect(tariffTokenMatchesQuery("NP.02.001", "NP")).toBe(true);
  });

  it("rejects non-matching code", () => {
    expect(tariffTokenMatchesQuery("FA.01", "NP")).toBe(false);
  });

  it("matches multi-word query spaces", () => {
    expect(tariffTokenMatchesQuery("Scavo in trincea", "scavo")).toBe(true);
  });

  it("matches multi-word query with all parts", () => {
    expect(tariffTokenMatchesQuery("Scavo in trincea", "scavo trincea")).toBe(true);
  });

  it("rejects multi-word query with partial match only", () => {
    expect(tariffTokenMatchesQuery("Scavo in trincea", "scavo cemento")).toBe(false);
  });

  it("handles empty query", () => {
    expect(tariffTokenMatchesQuery("FA.01", "")).toBe(true);
  });

  it("handles empty token", () => {
    expect(tariffTokenMatchesQuery("", "FA")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(tariffTokenMatchesQuery("fa.01", "FA")).toBe(true);
    expect(tariffTokenMatchesQuery("FA.01", "fa")).toBe(true);
  });
});

describe("filterIndexedVoiceOptions", () => {
  it("treats FA as a voice code prefix, not as a generic catalog word", () => {
    const result = search(
      [
        voice({ code: "FA.001.010", id: "fa-1", tariffBookName: "Ferrovia Abruzzo" }),
        voice({ code: "BA.001.010", id: "ba-1", tariffBookName: "Tariffario con parola FA" }),
        voice({ code: "NP.001.010", id: "np-1", tariffBookName: "Ferrovia Abruzzo" }),
      ],
      "FA",
    );

    expect(result.map((item) => item.value)).toEqual(["FA.001.010"]);
  });

  it("works with any voice prefix, not only FA", () => {
    const result = search(
      [
        voice({ code: "NP.001.010", id: "np-1", tariffBookName: "Nuovi prezzi" }),
        voice({ code: "BA.001.010", id: "ba-1", tariffBookName: "Base appalto" }),
      ],
      "NP",
    );

    expect(result.map((item) => item.value)).toEqual(["NP.001.010"]);
  });

  it("can combine tariff token and description terms", () => {
    const result = search(
      [
        voice({
          code: "LA.001",
          description: "Scavo in trincea",
          id: "lazio-scavo",
          tariffBookId: "book-lazio",
          tariffBookName: "Tariffario Lazio 2026",
        }),
        voice({
          code: "LA.002",
          description: "Conglomerato cementizio",
          id: "lazio-cemento",
          tariffBookId: "book-lazio",
          tariffBookName: "Tariffario Lazio 2026",
        }),
        voice({
          code: "TO.001",
          description: "Scavo in trincea",
          id: "torino-scavo",
          tariffBookId: "book-torino",
          tariffBookName: "Tariffario Torino",
        }),
      ],
      "lazio scavo",
    );

    expect(result.map((item) => item.value)).toEqual(["LA.001"]);
  });

  it("caps large result sets before passing them to the autocomplete", () => {
    const voices = Array.from({ length: 120 }, (_, index) =>
      voice({
        code: `FA.${String(index + 1).padStart(3, "0")}`,
        id: `fa-${index + 1}`,
      }),
    );

    expect(search(voices, "FA")).toHaveLength(80);
  });
});
