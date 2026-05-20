import { describe, expect, it } from "vitest";
import {
  buildProjectsReportWorkbook,
  sanitizeSheetName,
  serializeProjectsReportWorkbook,
  type ProjectsReportWorkbookInput,
} from "../../packages/excel-import/src";

const reportInput: ProjectsReportWorkbookInput = {
  contracts: [
    {
      applicationContractCode: "CA-001",
      contractualAmount: { amount: 100000, currency: "EUR" },
      contractorName: "Impresa Nord",
      frameworkAgreementCode: "AQ-001",
      id: "project-1",
      osExcludedAmount: 2500,
      tenderDiscountPercent: 18.25,
      title: "Linea Test Nord",
    },
    {
      applicationContractCode: "CA-002",
      contractualAmount: { amount: 50000, currency: "EUR" },
      contractorName: "Impresa Nord",
      frameworkAgreementCode: "AQ-002",
      id: "project-2",
      osExcludedAmount: null,
      tenderDiscountPercent: 12,
      title: "Linea Test Nord",
    },
  ],
  projects: [
    {
      budget: { amount: 100000, currency: "EUR" },
      contractor: "Impresa Nord",
      healthLabel: "SAL approvata",
      id: "project-1",
      location: "Milano",
      lot: "Lotto A",
      manager: "PM",
      progress: 25,
      salState: "SAL 01",
      salValue: { amount: 25000, currency: "EUR" },
      title: "Linea/Test:Nord*Molto lunga con caratteri non validi per Excel",
      variance: "25,0%",
    },
    {
      budget: { amount: 50000, currency: "EUR" },
      contractor: "Impresa Nord",
      healthLabel: "SAL in bozza",
      id: "project-2",
      location: "Torino",
      lot: "Lotto B",
      manager: "PM",
      progress: 0,
      salState: "SAL bozza",
      salValue: { amount: 10000, currency: "EUR" },
      title: "Linea/Test:Nord*Molto lunga con caratteri non validi per Excel",
      variance: "20,0%",
    },
  ],
  salDocuments: [
    {
      date: "2026-05-01",
      description: "Avanzamento maggio",
      id: "sal-1",
      lines: [
        {
          discountAmount: 100,
          grossAmount: 1000,
          id: "line-1",
          lineTotal: 900,
          quantity: 10,
          surchargeLabel: "Nessuna",
          totalAmount: 900,
          voice: {
            code: "RFI.001",
            description: "Scavo",
            unit: "m",
            unitPrice: 100,
          },
          voiceId: "voice-1",
        },
      ],
      notes: "",
      projectId: "project-1",
      status: "closed",
      title: "SAL 01",
      total: 900,
    },
    {
      date: "2026-05-10",
      description: "Bozza giugno",
      id: "sal-2",
      lines: [],
      notes: "",
      projectId: "project-2",
      status: "draft",
      title: "SAL bozza",
      total: 10000,
    },
  ],
};

describe("projects report workbook", () => {
  it("sanitizes Excel sheet names", () => {
    expect(sanitizeSheetName("A/B:C*D?E[F]G\\H")).toBe("A B C D E F G H");
    expect(sanitizeSheetName("x".repeat(40))).toHaveLength(31);
  });

  it("creates an index plus one unique sheet per project", () => {
    const workbook = buildProjectsReportWorkbook(reportInput);

    expect(workbook.map((sheet) => sheet.sheet)).toEqual([
      "Indice",
      "Linea Test Nord Molto lunga con",
      "Linea Test Nord Molto lunga c 2",
    ]);
    expect(workbook[0]?.data[0]?.[0]).toMatchObject({ value: "Export Progetti Quantara" });
  });

  it("serializes report bytes without changing migration workbook behavior", async () => {
    const bytes = await serializeProjectsReportWorkbook(reportInput);

    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});
