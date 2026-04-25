import * as XLSX from "xlsx";

export type ExcelImportStage = "queued" | "parsed" | "validated" | "committed";

export type ExcelImportPlan = {
  sourceName: string;
  stage: ExcelImportStage;
  rowCount: number;
};

export type ProjectMigrationRow = {
  applicationContractCode: string;
  client: string;
  contractualAmount: number;
  description: string;
  frameworkAgreementCode: string;
  tariffBookId: string;
  title: string;
  year: number;
};

export type SalMigrationRow = {
  date: string;
  description: string;
  notes: string;
  projectTitle: string;
  quantity: number;
  surcharge: string;
  title: string;
  unitPrice: number;
  voiceCode: string;
};

export type MaterialMigrationRow = {
  category: string;
  code: string;
  description: string;
  quantity: number;
  supplier: string;
  unit: string;
  unitCost: number;
};

export type QuantaraMigrationWorkbook = {
  materials: MaterialMigrationRow[];
  projects: ProjectMigrationRow[];
  sal: SalMigrationRow[];
};

export type MigrationSheetName = keyof QuantaraMigrationWorkbook;

export type MigrationValidationSeverity = "error" | "warning";

export type MigrationValidationIssue = {
  field: string;
  message: string;
  rowIndex: number;
  severity: MigrationValidationSeverity;
  sheet: MigrationSheetName;
};

export type MigrationValidationResult = {
  importableRows: number;
  issues: MigrationValidationIssue[];
  rowCount: number;
  valid: boolean;
};

const sheetNames: Record<MigrationSheetName, string> = {
  materials: "Materiali",
  projects: "Progetti",
  sal: "SAL",
};

const projectColumns = [
  "title",
  "frameworkAgreementCode",
  "applicationContractCode",
  "contractualAmount",
  "tariffBookId",
  "client",
  "year",
  "description",
] as const;

const salColumns = [
  "title",
  "projectTitle",
  "date",
  "description",
  "notes",
  "voiceCode",
  "quantity",
  "surcharge",
  "unitPrice",
] as const;

const materialColumns = [
  "code",
  "description",
  "category",
  "unit",
  "quantity",
  "unitCost",
  "supplier",
] as const;

export function createQuantaraMigrationTemplate(): XLSX.WorkBook {
  return buildQuantaraMigrationWorkbook({
    materials: [],
    projects: [],
    sal: [],
  });
}

export function buildQuantaraMigrationWorkbook(data: QuantaraMigrationWorkbook): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.projects, { header: [...projectColumns] }),
    sheetNames.projects,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.sal, { header: [...salColumns] }),
    sheetNames.sal,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(data.materials, { header: [...materialColumns] }),
    sheetNames.materials,
  );

  return workbook;
}

export function serializeQuantaraMigrationWorkbook(data: QuantaraMigrationWorkbook): Uint8Array {
  const workbook = buildQuantaraMigrationWorkbook(data);

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export function parseQuantaraMigrationWorkbook(
  input: ArrayBuffer | Uint8Array,
): QuantaraMigrationWorkbook {
  const workbook = XLSX.read(input, { type: "array" });

  return {
    materials: readSheet<MaterialMigrationRow>(workbook, sheetNames.materials, materialColumns).map(
      normalizeMaterialRow,
    ),
    projects: readSheet<ProjectMigrationRow>(workbook, sheetNames.projects, projectColumns).map(
      normalizeProjectRow,
    ),
    sal: readSheet<SalMigrationRow>(workbook, sheetNames.sal, salColumns).map(normalizeSalRow),
  };
}

export function validateQuantaraMigrationWorkbook(
  data: QuantaraMigrationWorkbook,
): MigrationValidationResult {
  const issues: MigrationValidationIssue[] = [
    ...validateProjects(data.projects),
    ...validateSal(data.sal, data.projects),
    ...validateMaterials(data.materials),
  ];
  const rowCount = data.projects.length + data.sal.length + data.materials.length;
  const errorRows = new Set(
    issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.sheet}:${issue.rowIndex}`),
  );

  return {
    importableRows: rowCount - errorRows.size,
    issues,
    rowCount,
    valid: !issues.some((issue) => issue.severity === "error"),
  };
}

function readSheet<T extends Record<string, unknown>>(
  workbook: XLSX.WorkBook,
  sheetName: string,
  header: readonly string[],
): T[] {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<T>(sheet, {
    defval: "",
    header: [...header],
    range: 1,
  });
}

function normalizeProjectRow(row: ProjectMigrationRow): ProjectMigrationRow {
  return {
    applicationContractCode: toText(row.applicationContractCode),
    client: toText(row.client),
    contractualAmount: toNumber(row.contractualAmount),
    description: toText(row.description),
    frameworkAgreementCode: toText(row.frameworkAgreementCode),
    tariffBookId: toText(row.tariffBookId),
    title: toText(row.title),
    year: toNumber(row.year),
  };
}

function normalizeSalRow(row: SalMigrationRow): SalMigrationRow {
  return {
    date: toText(row.date),
    description: toText(row.description),
    notes: toText(row.notes),
    projectTitle: toText(row.projectTitle),
    quantity: toNumber(row.quantity),
    surcharge: toText(row.surcharge),
    title: toText(row.title),
    unitPrice: toNumber(row.unitPrice),
    voiceCode: toText(row.voiceCode),
  };
}

function normalizeMaterialRow(row: MaterialMigrationRow): MaterialMigrationRow {
  return {
    category: toText(row.category),
    code: toText(row.code),
    description: toText(row.description),
    quantity: toNumber(row.quantity),
    supplier: toText(row.supplier),
    unit: toText(row.unit),
    unitCost: toNumber(row.unitCost),
  };
}

function validateProjects(rows: ProjectMigrationRow[]): MigrationValidationIssue[] {
  return rows.flatMap((row, index) => [
    ...requireText("projects", index, "title", row.title),
    ...requireText("projects", index, "frameworkAgreementCode", row.frameworkAgreementCode),
    ...requireText("projects", index, "applicationContractCode", row.applicationContractCode),
    ...requirePositiveNumber("projects", index, "contractualAmount", row.contractualAmount),
    ...requireInteger("projects", index, "year", row.year),
  ]);
}

function validateSal(
  rows: SalMigrationRow[],
  projects: ProjectMigrationRow[],
): MigrationValidationIssue[] {
  const projectTitles = new Set(projects.map((project) => project.title.toLowerCase()));

  return rows.flatMap((row, index) => [
    ...requireText("sal", index, "title", row.title),
    ...requireText("sal", index, "projectTitle", row.projectTitle),
    ...requireText("sal", index, "date", row.date),
    ...requireText("sal", index, "voiceCode", row.voiceCode),
    ...requirePositiveNumber("sal", index, "quantity", row.quantity),
    ...requirePositiveNumber("sal", index, "unitPrice", row.unitPrice),
    ...(row.projectTitle && !projectTitles.has(row.projectTitle.toLowerCase())
      ? [
          {
            field: "projectTitle",
            message: "Il progetto non e presente nel foglio Progetti.",
            rowIndex: index,
            severity: "warning" as const,
            sheet: "sal" as const,
          },
        ]
      : []),
  ]);
}

function validateMaterials(rows: MaterialMigrationRow[]): MigrationValidationIssue[] {
  return rows.flatMap((row, index) => [
    ...requireText("materials", index, "code", row.code),
    ...requireText("materials", index, "description", row.description),
    ...requireText("materials", index, "unit", row.unit),
    ...requirePositiveNumber("materials", index, "quantity", row.quantity),
    ...requirePositiveNumber("materials", index, "unitCost", row.unitCost),
  ]);
}

function requireText(
  sheet: MigrationSheetName,
  rowIndex: number,
  field: string,
  value: string,
): MigrationValidationIssue[] {
  return value.trim()
    ? []
    : [
        {
          field,
          message: "Campo obbligatorio mancante.",
          rowIndex,
          severity: "error",
          sheet,
        },
      ];
}

function requirePositiveNumber(
  sheet: MigrationSheetName,
  rowIndex: number,
  field: string,
  value: number,
): MigrationValidationIssue[] {
  return Number.isFinite(value) && value >= 0
    ? []
    : [
        {
          field,
          message: "Valore numerico non valido.",
          rowIndex,
          severity: "error",
          sheet,
        },
      ];
}

function requireInteger(
  sheet: MigrationSheetName,
  rowIndex: number,
  field: string,
  value: number,
): MigrationValidationIssue[] {
  return Number.isInteger(value)
    ? []
    : [
        {
          field,
          message: "Valore intero non valido.",
          rowIndex,
          severity: "error",
          sheet,
        },
      ];
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  const normalized = toText(value).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");

  return Number(normalized);
}
