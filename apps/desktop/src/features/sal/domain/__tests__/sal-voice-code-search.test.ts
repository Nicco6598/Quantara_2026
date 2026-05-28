import { describe, expect, it } from "vitest";
import {
  compactCodeContainsQueryInOrder,
  expandVoiceCodeSegments,
  isAmbiguousNumericCodeQuery,
  matchesAnyCodeSegment,
  matchesCodePathSegments,
  matchesConsecutiveCodeSegments,
  matchesFlexibleCodePath,
  parseCodePathQuery,
  shouldUseCodePathSearch,
  voiceCodeMatchesStructuredQuery,
} from "../sal-voice-code-search";

describe("sal-voice-code-search", () => {
  it("expands dotted segments with internal spaces", () => {
    expect(expandVoiceCodeSegments("SS.AC.A.2 02.A")).toEqual(["ss", "ac", "a", "2", "02", "a"]);
  });

  it("matches SS.AC.A.2 02.A with spaced query", () => {
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2 02.A", "SS AC A 2 02")).toBe(true);
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2 02.A", "SS.AC.A.2 02")).toBe(true);
  });

  it("matches compact numeric tail SS.AC.A.2102.A", () => {
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2102.A", "SS.AC.A.2102")).toBe(true);
  });

  it("rejects unrelated voices for numeric-only query 2 02", () => {
    expect(voiceCodeMatchesStructuredQuery("BA.001.010", "2 02")).toBe(false);
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2 02.A", "2 02")).toBe(true);
  });

  it("matches SS AC 2 via compact prefix without substring false positives", () => {
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2 02.A", "SS AC 2")).toBe(true);
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2102.A", "SS AC 2")).toBe(true);
    expect(voiceCodeMatchesStructuredQuery("BA.002.010", "SS AC 2")).toBe(false);
  });

  it("flags ambiguous numeric queries", () => {
    expect(isAmbiguousNumericCodeQuery(parseCodePathQuery("2 02"))).toBe(true);
    expect(isAmbiguousNumericCodeQuery(parseCodePathQuery("SS AC"))).toBe(false);
  });

  it("uses structured code path for SS prefix without dots", () => {
    expect(shouldUseCodePathSearch("SS AC A 2", parseCodePathQuery("SS AC A 2"))).toBe(true);
  });

  it("does not treat long description words as code path queries", () => {
    expect(shouldUseCodePathSearch("lazio scavo", parseCodePathQuery("lazio scavo"))).toBe(false);
  });

  it("matches progressive path segments with prefix on last part", () => {
    const voiceSegments = expandVoiceCodeSegments("AC.IR.001.A");
    const querySegments = parseCodePathQuery("AC IR 001");
    expect(matchesCodePathSegments(voiceSegments, querySegments)).toBe(true);
  });

  it("matches numeric subsequence inside a longer code path", () => {
    const voiceSegments = expandVoiceCodeSegments("SS.AC.A.2 02.A");
    const querySegments = parseCodePathQuery("2 02");
    expect(matchesConsecutiveCodeSegments(voiceSegments, querySegments)).toBe(true);
  });

  it("matches embedded segment tokens such as MG", () => {
    expect(matchesAnyCodeSegment("SS.MG.001.A", "MG")).toBe(true);
    expect(matchesAnyCodeSegment("SS.AC.A.2 02.A", "MG")).toBe(false);
    expect(voiceCodeMatchesStructuredQuery("SS.MG.001.A", "MG")).toBe(true);
    expect(voiceCodeMatchesStructuredQuery("MG.010.001", "MG")).toBe(true);
  });

  it("matches FA 3001 across bridge segments in FA.AU.A.3001.A", () => {
    expect(matchesFlexibleCodePath("FA.AU.A.3001.A", "FA 3001")).toBe(true);
    expect(compactCodeContainsQueryInOrder("FA.AU.A.3001.A", "FA 3001")).toBe(true);
    expect(voiceCodeMatchesStructuredQuery("FA.AU.A.3001.A", "FA 3001")).toBe(true);
    expect(voiceCodeMatchesStructuredQuery("BA.001.010", "FA 3001")).toBe(false);
  });

  it("does not match SS AC on unrelated prefixes such as AS.SI", () => {
    expect(compactCodeContainsQueryInOrder("AS.SI.A.2101.C", "SS AC")).toBe(false);
    expect(matchesFlexibleCodePath("AS.SI.A.2101.C", "SS AC")).toBe(false);
    expect(voiceCodeMatchesStructuredQuery("AS.SI.A.2101.C", "SS AC")).toBe(false);
    expect(voiceCodeMatchesStructuredQuery("SS.AC.A.2 02.A", "SS AC")).toBe(true);
  });
});
