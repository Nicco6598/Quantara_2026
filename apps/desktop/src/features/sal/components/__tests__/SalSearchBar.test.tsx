import { describe, expect, it } from "vitest";
import type { SalVoiceDraft } from "../../types";
import { tariffTokenMatchesQuery } from "../../utils/search-utils";
import {
  buildIndexedVoiceOptions,
  buildTariffSearchTokens,
  filterIndexedVoiceOptions,
} from "../SalSearchBar";

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

  it("narrows progressively when typing a dotted voice code path", () => {
    const voices = [
      voice({ code: "AC.IR.001.A", id: "ac-ir-1", category: "Impianti IR" }),
      voice({ code: "AC.IR.002.B", id: "ac-ir-2", category: "Impianti IR" }),
      voice({ code: "AC.FA.001.A", id: "ac-fa-1", category: "Impianti FA" }),
      voice({ code: "BA.001.010", id: "ba-1" }),
    ];

    expect(
      search(voices, "AC")
        .map((item) => item.value)
        .sort(),
    ).toEqual(["AC.FA.001.A", "AC.IR.001.A", "AC.IR.002.B"]);
    expect(
      search(voices, "AC.IR")
        .map((item) => item.value)
        .sort(),
    ).toEqual(["AC.IR.001.A", "AC.IR.002.B"]);
    expect(search(voices, "AC.IR.001").map((item) => item.value)).toEqual(["AC.IR.001.A"]);
  });

  it("finds SS.AC.A.2 02.A with spaced structured query", () => {
    const voices = [
      voice({
        code: "SS.AC.A.2 02.A",
        description: "Voce strutturata",
        id: "ss-1",
        tariffBookName: "Tariffario SS",
      }),
      voice({
        code: "BA.001.010",
        description: "Contiene 2 e 02 nella descrizione",
        id: "ba-1",
      }),
    ];

    expect(search(voices, "SS AC A 2 02").map((item) => item.value)).toEqual(["SS.AC.A.2 02.A"]);
    expect(search(voices, "2 02").map((item) => item.value)).toEqual(["SS.AC.A.2 02.A"]);
  });

  it("does not match SS AC on unrelated voice prefixes", () => {
    const result = search(
      [
        voice({ code: "SS.AC.A.2 02.A", id: "ss-target" }),
        voice({ code: "SS.AC.A.2102.A", id: "ss-2102" }),
        voice({ code: "AS.SI.A.2101.C", id: "as-si" }),
        voice({ code: "BA.002.010", description: "Contiene SS e AC nel testo", id: "ba-noise" }),
      ],
      "SS AC",
    );

    expect(result.map((item) => item.value).sort()).toEqual(["SS.AC.A.2 02.A", "SS.AC.A.2102.A"]);
  });

  it("narrows SS AC with numeric tail without matching unrelated catalog rows", () => {
    const voices = [
      voice({ code: "SS.AC.A.2 02.A", id: "ss-target" }),
      voice({ code: "SS.AC.A.2102.A", id: "ss-2102" }),
      voice({ code: "BA.002.010", description: "Contiene 2 in testo", id: "ba-2" }),
      voice({ code: "NP.12.002", id: "np" }),
    ];

    expect(
      search(voices, "SS AC")
        .map((item) => item.value)
        .sort(),
    ).toEqual(["SS.AC.A.2 02.A", "SS.AC.A.2102.A"]);
    expect(
      search(voices, "SS AC 2")
        .map((item) => item.value)
        .sort(),
    ).toEqual(["SS.AC.A.2 02.A", "SS.AC.A.2102.A"]);
    expect(search(voices, "SS AC 2").map((item) => item.value)).not.toContain("BA.002.010");
  });

  it("finds SS.AC.A.2102.A with dotted compact tail", () => {
    const voices = [
      voice({ code: "SS.AC.A.2102.A", id: "ss-2102" }),
      voice({ code: "SS.AC.A.2 02.B", id: "ss-other" }),
    ];

    expect(search(voices, "SS.AC.A.2102").map((item) => item.value)).toEqual(["SS.AC.A.2102.A"]);
  });

  it("finds FA.AU.A.3001.A when typing FA 3001", () => {
    const result = search(
      [
        voice({ code: "FA.AU.A.3001.A", description: "Voce AU", id: "fa-au" }),
        voice({ code: "FA.AU.A.3002.A", description: "Altra voce", id: "fa-au-2" }),
        voice({ code: "BA.001.010", id: "ba" }),
      ],
      "FA 3001",
    );

    expect(result.map((item) => item.value)).toEqual(["FA.AU.A.3001.A"]);
  });

  it("finds MG in any code segment and in description without tariff-title noise", () => {
    const result = search(
      [
        voice({ code: "SS.MG.001.A", description: "Voce strutturata", id: "ss-mg" }),
        voice({ code: "SS.AC.A.2 02.A", description: "Voce strutturata", id: "ss-other" }),
        voice({
          code: "BA.001.010",
          description: "Lavori MG generali",
          id: "ba-mg-desc",
          tariffBookName: "Tariffario con MG nel titolo",
        }),
        voice({
          code: "BA.002.010",
          description: "Conglomerato",
          id: "ba-plain",
          tariffBookName: "Tariffario con MG nel titolo",
        }),
      ],
      "MG",
    );

    expect(result.map((item) => item.value).sort()).toEqual(["BA.001.010", "SS.MG.001.A"]);
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
