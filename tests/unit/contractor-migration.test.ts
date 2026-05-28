import { describe, expect, it } from "vitest";
import { preferLegacyContractorNameForRepair } from "../../apps/desktop/src/lib/contractorMigration";

describe("preferLegacyContractorNameForRepair", () => {
  it("prefers a longer legacy label when SQLite was over-shortened", () => {
    expect(preferLegacyContractorNameForRepair("RFI", "RFI TEST 5.0.1")).toBe(true);
  });

  it("does not overwrite when names already match", () => {
    expect(preferLegacyContractorNameForRepair("RFI TEST 5.0.1", "RFI TEST 5.0.1")).toBe(false);
  });

  it("fills missing database names from legacy", () => {
    expect(preferLegacyContractorNameForRepair(null, "Impresa Rossi")).toBe(true);
    expect(preferLegacyContractorNameForRepair("", "Impresa Rossi")).toBe(true);
  });

  it("ignores placeholder legacy values", () => {
    expect(preferLegacyContractorNameForRepair("RFI", "Senza appaltatore")).toBe(false);
    expect(preferLegacyContractorNameForRepair("RFI", "Appaltatore da assegnare")).toBe(false);
  });

  it("does not replace unrelated names", () => {
    expect(preferLegacyContractorNameForRepair("ANAS", "RFI TEST 5.0.1")).toBe(false);
  });
});
