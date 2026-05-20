import { describe, it, expect } from "vitest";
import { tariffTokenMatchesQuery } from "../../utils/search-utils";

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
