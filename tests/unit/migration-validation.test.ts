import { describe, expect, it } from "vitest";
import {
  parseQuantaraMigrationWorkbook,
  type QuantaraMigrationWorkbook,
  serializeQuantaraMigrationWorkbook,
  validateQuantaraMigrationWorkbook,
} from "../../packages/excel-import/src";

const validWorkbook: QuantaraMigrationWorkbook = {
  materials: [
    {
      category: "Armamento",
      code: "BIN-60E1",
      description: "Binario",
      quantity: 10,
      supplier: "Magazzino",
      unit: "m",
      unitCost: 12.5,
    },
  ],
  projects: [
    {
      applicationContractCode: "CA-001",
      client: "RFI",
      contractualAmount: 100000,
      description: "Lotto test",
      frameworkAgreementCode: "AQ-001",
      tariffBookId: "tariff-1",
      title: "Progetto A",
      year: 2026,
    },
  ],
  sal: [
    {
      date: "2026-04-30",
      description: "Avanzamento",
      notes: "",
      projectTitle: "Progetto A",
      quantity: 3,
      surcharge: "10%",
      title: "SAL 01",
      unitPrice: 100,
      voiceCode: "OP-001",
    },
  ],
};
const validMaterial = validWorkbook.materials[0] as QuantaraMigrationWorkbook["materials"][number];
const validProject = validWorkbook.projects[0] as QuantaraMigrationWorkbook["projects"][number];
const validSal = validWorkbook.sal[0] as QuantaraMigrationWorkbook["sal"][number];

describe("migration workbook validation", () => {
  it("accepts a complete workbook without issues", () => {
    const result = validateQuantaraMigrationWorkbook(validWorkbook);

    expect(result).toMatchObject({
      importableRows: 3,
      rowCount: 3,
      valid: true,
    });
    expect(result.issues).toHaveLength(0);
  });

  it("reports errors for missing required fields and invalid numbers", () => {
    const result = validateQuantaraMigrationWorkbook({
      materials: [{ ...validMaterial, code: "", quantity: Number.NaN }],
      projects: [{ ...validProject, title: "", year: 2026.5 }],
      sal: [{ ...validSal, unitPrice: Number.NaN, voiceCode: "" }],
    });

    expect(result.valid).toBe(false);
    expect(result.importableRows).toBe(0);
    expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(6);
  });

  it("warns when a SAL row points to an unknown project but remains importable", () => {
    const result = validateQuantaraMigrationWorkbook({
      ...validWorkbook,
      sal: [{ ...validSal, projectTitle: "Progetto mancante" }],
    });

    expect(result.valid).toBe(true);
    expect(result.importableRows).toBe(3);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: "projectTitle",
        severity: "warning",
        sheet: "sal",
      }),
    );
  });

  it("round-trips serialized workbook rows through parser normalization", async () => {
    const bytes = await serializeQuantaraMigrationWorkbook({
      ...validWorkbook,
      materials: [{ ...validMaterial, quantity: 7.5 }],
    });
    const parsed = await parseQuantaraMigrationWorkbook(bytes);

    expect(parsed.projects[0]?.title).toBe("Progetto A");
    expect(parsed.sal[0]?.quantity).toBe(3);
    expect(parsed.materials[0]?.quantity).toBe(7.5);
  });
});
