import { describe, expect, it } from "vitest";
import { normalizeSelectedImportPaths } from "./desktopData";

describe("normalizeSelectedImportPaths", () => {
  it("keeps multiple dialog selections", () => {
    expect(normalizeSelectedImportPaths(["C:\\tmp\\a.pdf", "C:\\tmp\\b.json"])).toEqual([
      "C:\\tmp\\a.pdf",
      "C:\\tmp\\b.json",
    ]);
  });

  it("accepts a single string defensively", () => {
    expect(normalizeSelectedImportPaths("C:\\tmp\\a.pdf")).toEqual(["C:\\tmp\\a.pdf"]);
  });

  it("drops cancelled or malformed selections", () => {
    expect(normalizeSelectedImportPaths(null)).toEqual([]);
    expect(normalizeSelectedImportPaths(["C:\\tmp\\a.pdf", 12, undefined])).toEqual([
      "C:\\tmp\\a.pdf",
    ]);
  });
});
