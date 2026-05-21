import readXlsxFile, { type Sheet as ReadSheet } from "read-excel-file/universal";
import writeXlsxFile, { type Sheet } from "write-excel-file/browser";

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

export type QuantaraMigrationWorkbookFile = Sheet<Blob>[];

type WorkbookCell = Sheet<Blob>["data"][number][number];

export type ProjectsReportContract = {
  applicationContractCode: string;
  contractualAmount: { amount: number; currency: string };
  contractorName?: string | null;
  frameworkAgreementCode: string;
  id: string;
  osExcludedAmount?: number | null;
  tenderDiscountPercent: number;
  title: string;
};

export type ProjectsReportProject = {
  budget: { amount: number; currency: string };
  contractor: string;
  healthLabel: string;
  id: string;
  location: string;
  lot: string;
  manager: string;
  progress: number;
  salState: string;
  salValue: { amount: number; currency: string };
  title: string;
  variance: string;
};

export type ProjectsReportSalLine = {
  discountAmount?: number;
  grossAmount?: number;
  id: string;
  lineTotal?: number;
  netAmount?: number;
  quantity: number;
  surcharge?: string;
  surchargeLabel?: string;
  surchargePercent?: number;
  totalAmount?: number;
  voice?: {
    code: string;
    description: string;
    unit: string;
    unitPrice: number;
  };
  voiceId: string;
};

export type ProjectsReportSalDocument = {
  closedAt?: string;
  date: string;
  description: string;
  id: string;
  lineCount?: number;
  lines: ProjectsReportSalLine[];
  notes: string;
  projectId: string;
  status: string;
  title: string;
  total?: number;
};

export type ProjectsReportWorkbookInput = {
  contracts: ProjectsReportContract[];
  projects: ProjectsReportProject[];
  salDocuments: ProjectsReportSalDocument[];
};

export type SalDetailReportLine = {
  discountAmount: number;
  discountableAmount: number;
  grossAmount: number;
  id: string;
  linkedCharges?: { code: string; description: string; percent: number; total: number }[];
  notes?: string;
  measurementRows?: {
    date: string;
    description: string;
    factor1: number;
    factor2: number;
    factor3: number;
    notes?: string;
    partialQuantity: number;
    station?: string;
    unit: string;
  }[];
  netAmount: number;
  quantity: number;
  surchargePercent: number;
  totalAmount: number;
  voice: {
    category: string;
    code: string;
    description: string;
    isSafetyCost?: boolean;
    unit: string;
    unitPrice: number;
  };
};

export type SalDetailReportSummary = {
  budgetResidual: number;
  discountAmount: number;
  discountableAmount: number;
  grossAmount: number;
  linkedChargeAmount: number;
  netDiscountableAmount: number;
  previousProgressiveAmount: number;
  safetyAmount: number;
  total: number;
  voiceCount: number;
};

export type SalDetailReportWorkbookInput = {
  date: string;
  economicRules: {
    applyDiscountToSafetyCosts: boolean;
    discountEnabled: boolean;
    discountPercent: number;
  };
  lines: SalDetailReportLine[];
  project: {
    applicationContractCode: string;
    contractor: string;
    contractAmount: number;
    frameworkAgreementCode: string;
    title: string;
  };
  summary: SalDetailReportSummary;
  title: string;
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

export function createQuantaraMigrationTemplate(): QuantaraMigrationWorkbookFile {
  return buildQuantaraMigrationWorkbook({
    materials: [],
    projects: [],
    sal: [],
  });
}

export function buildQuantaraMigrationWorkbook(
  data: QuantaraMigrationWorkbook,
): QuantaraMigrationWorkbookFile {
  return [
    buildJsonSheet(sheetNames.projects, projectColumns, data.projects),
    buildJsonSheet(sheetNames.sal, salColumns, data.sal),
    buildJsonSheet(sheetNames.materials, materialColumns, data.materials),
  ];
}

export async function serializeQuantaraMigrationWorkbook(
  data: QuantaraMigrationWorkbook,
): Promise<Uint8Array> {
  const workbook = buildQuantaraMigrationWorkbook(data);
  const blob = await writeXlsxFile(workbook).toBlob();
  const buffer = await blob.arrayBuffer();

  return new Uint8Array(buffer);
}

export async function serializeProjectsReportWorkbook(
  input: ProjectsReportWorkbookInput,
): Promise<Uint8Array> {
  const workbook = buildProjectsReportWorkbook(input);
  const blob = await writeXlsxFile(workbook).toBlob();
  const buffer = await blob.arrayBuffer();

  return new Uint8Array(buffer);
}

export async function serializeSalDetailReportWorkbook(
  input: SalDetailReportWorkbookInput,
): Promise<Uint8Array> {
  const blob = await writeXlsxFile(buildSalDetailReportWorkbook(input)).toBlob();
  const buffer = await blob.arrayBuffer();

  return new Uint8Array(buffer);
}

export function buildSalDetailReportWorkbook(input: SalDetailReportWorkbookInput): Sheet<Blob>[] {
  return [
    {
      columns: [
        { width: 30 },
        { width: 18 },
        { width: 18 },
        { width: 42 },
        { width: 12 },
        { width: 10 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
      ],
      data: [
        titleRow(input.title, 11),
        mutedRow(`${input.project.title} - ${input.date}`, 11),
        blankRow(11),
        sectionRow("Riepilogo SAL", 11),
        metricRow("Progetto", input.project.title),
        metricRow("Appaltatore", input.project.contractor),
        metricRow("Contratto applicativo", input.project.applicationContractCode),
        metricRow("Accordo quadro", input.project.frameworkAgreementCode),
        metricRow("Budget contratto", input.project.contractAmount, "currency"),
        metricRow("Progressivo precedente", input.summary.previousProgressiveAmount, "currency"),
        metricRow("Lordo", input.summary.grossAmount, "currency"),
        metricRow("Ribasso", input.summary.discountAmount, "currency"),
        metricRow("Totale SAL", input.summary.total, "currency"),
        metricRow("Residuo budget", input.summary.budgetResidual, "currency"),
        metricRow(
          "Ribasso applicato",
          input.economicRules.discountEnabled ? input.economicRules.discountPercent / 100 : 0,
          "percent",
        ),
        blankRow(11),
        sectionRow("Righe SAL", 11),
        headerRow([
          "Codice voce",
          "Categoria",
          "Quantita",
          "UM",
          "Descrizione",
          "Prezzo unitario",
          "Maggiorazione",
          "Lordo",
          "Ribassabile",
          "Ribasso",
          "Totale",
        ]),
        ...input.lines.map((line) => [
          textCell(line.voice.code),
          textCell(line.voice.category),
          numberCell(line.quantity),
          textCell(line.voice.unit),
          textCell(line.notes || line.voice.description),
          moneyCell(line.voice.unitPrice),
          percentCell(line.surchargePercent / 100),
          moneyCell(line.grossAmount),
          moneyCell(line.discountableAmount),
          moneyCell(line.discountAmount),
          moneyCell(line.totalAmount),
        ]),
      ],
      sheet: "SAL",
      stickyRowsCount: 18,
    },
    {
      columns: [
        { width: 18 },
        { width: 14 },
        { width: 20 },
        { width: 34 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 10 },
        { width: 28 },
      ],
      data: [
        titleRow("Libretto misure", 10),
        mutedRow(`${input.title} - ${input.project.title}`, 10),
        blankRow(10),
        headerRow([
          "Codice voce",
          "Data",
          "Stazione",
          "Descrizione misura",
          "Fattore 1",
          "Fattore 2",
          "Fattore 3",
          "Parziale",
          "UM",
          "Note",
        ]),
        ...input.lines.flatMap((line) => {
          const rows = line.measurementRows?.length
            ? line.measurementRows
            : [
                {
                  date: input.date,
                  description: "Misura corrente",
                  factor1: line.quantity,
                  factor2: 1,
                  factor3: 1,
                  notes: "",
                  partialQuantity: line.quantity,
                  station: "",
                  unit: line.voice.unit,
                },
              ];

          return rows.map((row) => [
            textCell(line.voice.code),
            textCell(row.date),
            textCell(row.station ?? ""),
            textCell(row.description),
            numberCell(row.factor1),
            numberCell(row.factor2),
            numberCell(row.factor3),
            numberCell(row.partialQuantity),
            textCell(row.unit),
            textCell(row.notes ?? ""),
          ]);
        }),
      ],
      sheet: "Libretto",
      stickyRowsCount: 4,
    },
  ];
}

export function buildProjectsReportWorkbook(input: ProjectsReportWorkbookInput): Sheet<Blob>[] {
  const contractsById = new Map(input.contracts.map((contract) => [contract.id, contract]));
  const salByProjectId = groupBy(input.salDocuments, (sal) => sal.projectId);
  const usedSheetNames = new Set<string>();

  return [
    buildProjectsIndexSheet(input.projects, contractsById, salByProjectId),
    ...input.projects.map((project) =>
      buildSingleProjectReportSheet(
        project,
        contractsById.get(project.id) ?? null,
        salByProjectId.get(project.id) ?? [],
        usedSheetNames,
      ),
    ),
  ];
}

export async function parseQuantaraMigrationWorkbook(
  input: ArrayBuffer | Uint8Array,
): Promise<QuantaraMigrationWorkbook> {
  const workbook = await readXlsxFile(
    input instanceof Uint8Array
      ? (input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer)
      : input,
  );

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

function buildJsonSheet<T extends Record<string, unknown>>(
  sheetName: string,
  columns: readonly (keyof T & string)[],
  rows: T[],
): Sheet<Blob> {
  return {
    data: [[...columns], ...rows.map((row) => columns.map((column) => row[column] ?? ""))],
    sheet: sheetName,
  };
}

function buildProjectsIndexSheet(
  projects: ProjectsReportProject[],
  contractsById: ReadonlyMap<string, ProjectsReportContract>,
  salByProjectId: ReadonlyMap<string, ProjectsReportSalDocument[]>,
): Sheet<Blob> {
  const totalBudget = projects.reduce((sum, project) => sum + project.budget.amount, 0);
  const totalApproved = projects.reduce(
    (sum, project) => sum + sumSal(salByProjectId.get(project.id) ?? [], isApprovedStatus),
    0,
  );
  const totalOpen = projects.reduce(
    (sum, project) =>
      sum + sumSal(salByProjectId.get(project.id) ?? [], (sal) => !isApprovedStatus(sal)),
    0,
  );
  const progress = totalBudget > 0 ? totalApproved / totalBudget : 0;

  const data = [
    titleRow("Export Progetti Quantara", 10),
    mutedRow(`Generato il ${formatDateTime(new Date())}`, 10),
    blankRow(10),
    sectionRow("Riepilogo portafoglio", 10),
    metricRow("Progetti", projects.length),
    metricRow("Budget totale", totalBudget, "currency"),
    metricRow("SAL approvate / chiuse", totalApproved, "currency"),
    metricRow("SAL aperte", totalOpen, "currency"),
    metricRow("Avanzamento approvato", progress, "percent"),
    blankRow(10),
    headerRow([
      "Progetto",
      "Appaltatore",
      "Codice contratto",
      "Accordo quadro",
      "Budget",
      "SAL approvate",
      "SAL aperte",
      "Residuo",
      "Avanzamento",
      "Stato",
    ]),
    ...projects.map((project) => {
      const contract = contractsById.get(project.id);
      const sals = salByProjectId.get(project.id) ?? [];
      const approvedAmount = sumSal(sals, isApprovedStatus);
      const openAmount = sumSal(sals, (sal) => !isApprovedStatus(sal));
      const residual = project.budget.amount - approvedAmount - openAmount;

      return [
        textCell(project.title),
        textCell(contract?.contractorName ?? project.contractor),
        textCell(contract?.applicationContractCode ?? ""),
        textCell(contract?.frameworkAgreementCode ?? ""),
        moneyCell(project.budget.amount),
        moneyCell(approvedAmount),
        moneyCell(openAmount),
        moneyCell(residual),
        percentCell(project.budget.amount > 0 ? approvedAmount / project.budget.amount : 0),
        textCell(project.healthLabel),
      ];
    }),
  ];

  return {
    columns: [
      { width: 34 },
      { width: 24 },
      { width: 18 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
      { width: 24 },
    ],
    data,
    sheet: "Indice",
    stickyRowsCount: 11,
  };
}

function buildSingleProjectReportSheet(
  project: ProjectsReportProject,
  contract: ProjectsReportContract | null,
  salDocuments: ProjectsReportSalDocument[],
  usedSheetNames: Set<string>,
): Sheet<Blob> {
  const sortedSals = [...salDocuments].sort((left, right) =>
    (right.closedAt ?? right.date).localeCompare(left.closedAt ?? left.date),
  );
  const approvedAmount = sumSal(sortedSals, isApprovedStatus);
  const openAmount = sumSal(sortedSals, (sal) => !isApprovedStatus(sal));
  const committedAmount = approvedAmount + openAmount;
  const residual = project.budget.amount - committedAmount;

  const data = [
    titleRow(project.title, 12),
    mutedRow(`${project.lot || "Dossier"}${project.location ? ` - ${project.location}` : ""}`, 12),
    blankRow(12),
    sectionRow("Riepilogo progetto", 12),
    metricRow("Appaltatore", contract?.contractorName ?? project.contractor),
    metricRow("Codice contratto applicativo", contract?.applicationContractCode ?? ""),
    metricRow("Accordo quadro", contract?.frameworkAgreementCode ?? ""),
    metricRow("Budget contrattuale", project.budget.amount, "currency"),
    metricRow("OS esclusi", contract?.osExcludedAmount ?? 0, "currency"),
    metricRow("Ribasso d'asta", (contract?.tenderDiscountPercent ?? 0) / 100, "percent"),
    metricRow("SAL approvate / chiuse", approvedAmount, "currency"),
    metricRow("SAL aperte", openAmount, "currency"),
    metricRow("Residuo budget", residual, "currency"),
    metricRow(
      "Avanzamento approvato",
      project.budget.amount > 0 ? approvedAmount / project.budget.amount : 0,
      "percent",
    ),
    blankRow(12),
    sectionRow("SAL", 12),
    headerRow(["Titolo", "Data", "Stato", "Descrizione", "Righe", "Importo", "Incidenza budget"]),
    ...sortedSals.map((sal) => [
      textCell(sal.title),
      textCell(sal.date),
      textCell(formatSalStatus(sal.status)),
      textCell(sal.description),
      numberCell(sal.lineCount ?? sal.lines.length),
      moneyCell(getSalTotal(sal)),
      percentCell(project.budget.amount > 0 ? getSalTotal(sal) / project.budget.amount : 0),
    ]),
    blankRow(12),
    sectionRow("Righe SAL", 12),
    headerRow([
      "SAL",
      "Data SAL",
      "Stato SAL",
      "Codice voce",
      "Descrizione voce",
      "Quantita",
      "UM",
      "Prezzo unitario",
      "Maggiorazione",
      "Lordo",
      "Ribasso",
      "Totale riga",
    ]),
    ...sortedSals.flatMap((sal) =>
      sal.lines.map((line) => [
        textCell(sal.title),
        textCell(sal.date),
        textCell(formatSalStatus(sal.status)),
        textCell(line.voice?.code ?? line.voiceId),
        textCell(line.voice?.description ?? ""),
        numberCell(line.quantity),
        textCell(line.voice?.unit ?? ""),
        moneyCell(line.voice?.unitPrice ?? 0),
        textCell(formatLineSurcharge(line)),
        moneyCell(line.grossAmount ?? 0),
        moneyCell(line.discountAmount ?? 0),
        moneyCell(line.totalAmount ?? line.lineTotal ?? 0),
      ]),
    ),
  ];

  return {
    columns: [
      { width: 30 },
      { width: 14 },
      { width: 14 },
      { width: 28 },
      { width: 42 },
      { width: 12 },
      { width: 10 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
    ],
    data,
    sheet: uniqueSheetName(project.title, usedSheetNames),
    stickyRowsCount: 17,
  };
}

function titleRow(title: string, span: number): WorkbookCell[] {
  return [
    {
      alignVertical: "center",
      backgroundColor: "#172033",
      fontSize: 16,
      fontWeight: "bold",
      height: 26,
      span,
      textColor: "#FFFFFF",
      value: title,
    },
    ...Array.from({ length: span - 1 }, () => null),
  ];
}

function mutedRow(value: string, span: number): WorkbookCell[] {
  return [
    {
      backgroundColor: "#EEF2F7",
      span,
      textColor: "#475569",
      value,
    },
    ...Array.from({ length: span - 1 }, () => null),
  ];
}

function sectionRow(title: string, span: number): WorkbookCell[] {
  return [
    {
      backgroundColor: "#DCE7F3",
      fontWeight: "bold",
      span,
      textColor: "#172033",
      value: title,
    },
    ...Array.from({ length: span - 1 }, () => null),
  ];
}

function blankRow(length: number): WorkbookCell[] {
  return Array.from({ length }, () => null);
}

function headerRow(labels: string[]): WorkbookCell[] {
  return labels.map((label) => ({
    align: "center",
    backgroundColor: "#334155",
    fontWeight: "bold",
    textColor: "#FFFFFF",
    value: label,
    wrap: true,
  }));
}

function metricRow(
  label: string,
  value: string | number,
  type?: "currency" | "percent",
): WorkbookCell[] {
  return [
    {
      backgroundColor: "#F8FAFC",
      fontWeight: "bold",
      textColor: "#334155",
      value: label,
    },
    type === "currency"
      ? moneyCell(Number(value))
      : type === "percent"
        ? percentCell(Number(value))
        : textCell(String(value)),
  ];
}

function textCell(value: string): WorkbookCell {
  return { type: String, value };
}

function numberCell(value: number): WorkbookCell {
  return { format: "#,##0.00", type: Number, value: normalizeFinite(value) };
}

function moneyCell(value: number): WorkbookCell {
  return { format: "#,##0.00 [$€-it-IT]", type: Number, value: normalizeFinite(value) };
}

function percentCell(value: number): WorkbookCell {
  return { format: "0.0%", type: Number, value: normalizeFinite(value) };
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }
  return grouped;
}

function getSalTotal(sal: ProjectsReportSalDocument): number {
  if (typeof sal.total === "number" && Number.isFinite(sal.total)) return sal.total;
  return sal.lines.reduce((sum, line) => sum + (line.totalAmount ?? line.lineTotal ?? 0), 0);
}

function sumSal(
  salDocuments: ProjectsReportSalDocument[],
  predicate: (sal: ProjectsReportSalDocument) => boolean,
): number {
  return salDocuments.reduce((sum, sal) => sum + (predicate(sal) ? getSalTotal(sal) : 0), 0);
}

function isApprovedStatus(sal: ProjectsReportSalDocument): boolean {
  return sal.status === "approved" || sal.status === "closed";
}

function formatSalStatus(status: string): string {
  if (status === "closed" || status === "approved") return "Approvata";
  if (status === "in-review") return "In revisione";
  if (status === "draft") return "Bozza";
  return status;
}

function formatLineSurcharge(line: ProjectsReportSalLine): string {
  if (line.surchargeLabel) return line.surchargeLabel;
  if (typeof line.surchargePercent === "number" && line.surchargePercent > 0) {
    return `${line.surchargePercent.toLocaleString("it-IT")}%`;
  }
  if (line.surcharge === "day") return "Diurna";
  if (line.surcharge === "night") return "Notturna";
  return "";
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function uniqueSheetName(name: string, usedSheetNames: Set<string>): string {
  const base = sanitizeSheetName(name) || "Progetto";
  let candidate = base;
  let index = 2;

  while (usedSheetNames.has(candidate.toLowerCase())) {
    const suffix = ` ${index}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index++;
  }

  usedSheetNames.add(candidate.toLowerCase());
  return candidate;
}

export function sanitizeSheetName(name: string): string {
  return name
    .replace(/[[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
}

function normalizeFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function readSheet<T extends Record<string, unknown>>(
  workbook: ReadSheet[],
  sheetName: string,
  header: readonly string[],
): T[] {
  const sheet = workbook.find((item) => item.sheet === sheetName);

  if (!sheet) {
    return [];
  }

  return sheet.data.slice(1).flatMap((values) => {
    const item = Object.fromEntries(
      header.map((column, index) => [column, getCellValue(values[index])]),
    ) as T;

    return Object.values(item).some((value) => toText(value).length > 0) ? [item] : [];
  });
}

function getCellValue(value: unknown): unknown {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
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
