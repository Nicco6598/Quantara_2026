import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "@/persistence/storage-keys";
import {
  applyLockedContractorToProjectDraft,
  createContractorId,
  mergeContractorRegistry,
  readStringList,
} from "../projects-helpers";

describe("projects-helpers contractor registry", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("deduplicates contractors when reading localStorage list", () => {
    window.localStorage.setItem(
      STORAGE_KEYS.contractorRegistry,
      JSON.stringify(["RFI", "rfi", "  RFI  ", "Ferrovie Nord"]),
    );

    const list = readStringList(STORAGE_KEYS.contractorRegistry);
    expect(list).toHaveLength(2);
    expect(list).toContain("RFI");
    expect(list).toContain("Ferrovie Nord");
  });

  it("mergeContractorRegistry avoids duplicate ids", () => {
    const merged = mergeContractorRegistry(["RFI"], "rfi");
    expect(merged).toEqual(["RFI"]);
    expect(createContractorId("RFI")).toBe(createContractorId("rfi"));
  });

  it("createContractorId matches SQLite contractor primary keys", () => {
    expect(createContractorId("RFI")).toBe("contractor_rfi");
    expect(createContractorId("RFI TEST 5.0.1")).toBe("contractor_rfi-test-5-0-1");
  });
});

describe("applyLockedContractorToProjectDraft", () => {
  it("overrides contractor when opening create from a contractor folder", () => {
    const restored = applyLockedContractorToProjectDraft(
      {
        applicationContractCode: "CA-1",
        contractorName: "Altro Appaltatore",
        contractualAmount: "1000",
        frameworkAgreementCode: "AQ-1",
        tenderDiscountPercent: "0",
        tariffBookIds: [],
        title: "Bozza tunnel",
        osExcludedAmount: "",
        budgetIvaPercent: "",
        osIvaPercent: "",
      },
      "RFI TEST 5.0.1",
    );

    expect(restored.contractorName).toBe("RFI TEST 5.0.1");
    expect(restored.title).toBe("Bozza tunnel");
  });

  it("leaves draft unchanged when no locked contractor", () => {
    const draft = { contractorName: "ANAS", title: "X" };
    expect(applyLockedContractorToProjectDraft(draft, "")).toEqual(draft);
  });
});
