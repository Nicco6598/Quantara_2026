export type PdfReportKind = "accounting" | "measurement-book" | "summary-situation";

export type PdfExportRequest = {
  appliedFilters: readonly string[];
  kind: PdfReportKind;
  title: string;
};

export type PdfSalProject = {
  applicationContractCode: string;
  contractAmount: number;
  contractor: string;
  frameworkAgreementCode: string;
  title: string;
};

export type PdfSalMeasurementRow = {
  date: string;
  description: string;
  factor1: number;
  factor2: number;
  factor3: number;
  notes: string;
  partialQuantity: number;
  station?: string;
  unit: string;
};

export type PdfSalLine = {
  discountAmount: number;
  discountableAmount: number;
  grossAmount: number;
  id: string;
  linkedCharges: Array<{ code: string; description: string; percent: number; total: number }>;
  measurementRows: PdfSalMeasurementRow[];
  netAmount: number;
  notes: string;
  quantity: number;
  surchargePercent: number;
  totalAmount: number;
  voice: {
    category: string;
    code: string;
    description: string;
    isSafetyCost: boolean;
    unit: string;
    unitPrice: number;
  };
};

export type PdfSalSummary = {
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

export type PdfSalReportInput = {
  date: string;
  lines: PdfSalLine[];
  project: PdfSalProject;
  summary: PdfSalSummary;
  title: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 38;
const TOP_Y = 800;
const BOTTOM_Y = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type Align = "left" | "right";
type Color = [number, number, number];
type TableColumn<T> = {
  align?: Align;
  render: (row: T, index: number) => string;
  title: string;
  width: number;
};

const COLORS = {
  accent: [0.08, 0.33, 0.52] as Color,
  accentSoft: [0.9, 0.95, 0.97] as Color,
  border: [0.78, 0.83, 0.87] as Color,
  headerText: [0.09, 0.13, 0.18] as Color,
  muted: [0.42, 0.48, 0.55] as Color,
  rowAlt: [0.97, 0.98, 0.99] as Color,
  text: [0.12, 0.16, 0.2] as Color,
  warning: [1, 0.98, 0.9] as Color,
  warningBorder: [0.86, 0.73, 0.45] as Color,
  white: [1, 1, 1] as Color,
};

export function serializeSalPdfReport(input: PdfSalReportInput): Uint8Array {
  const pdf = new PdfLayout("Report SAL", input.title, [
    input.project.title,
    `Data SAL ${formatDate(input.date)}`,
  ]);

  addProjectBlock(pdf, input);
  addEconomicCards(pdf, input);

  pdf.section("Voci SAL");
  pdf.table(input.lines, [
    { render: (line) => line.voice.code, title: "Codice", width: 62 },
    { render: (line) => line.voice.description, title: "Descrizione", width: 212 },
    {
      align: "right",
      render: (line) => `${formatNumber(line.quantity)} ${line.voice.unit}`,
      title: "Quantita",
      width: 70,
    },
    {
      align: "right",
      render: (line) => formatEuro(line.voice.unitPrice),
      title: "Prezzo",
      width: 76,
    },
    {
      align: "right",
      render: (line) => formatEuro(line.totalAmount),
      title: "Totale",
      width: 88,
    },
  ]);

  const surchargeRows = input.lines.flatMap((line) =>
    line.linkedCharges.map((charge) => ({
      base: line.voice.code,
      code: charge.code,
      description: charge.description,
      percent: charge.percent,
      total: charge.total,
    })),
  );

  if (surchargeRows.length > 0) {
    pdf.section("Maggiorazioni applicate");
    pdf.table(surchargeRows, [
      { render: (row) => row.code, title: "MG", width: 74 },
      { render: (row) => row.base, title: "Voce base", width: 74 },
      { render: (row) => row.description, title: "Descrizione", width: 248 },
      {
        align: "right",
        render: (row) => `${formatNumber(row.percent)}%`,
        title: "%",
        width: 48,
      },
      { align: "right", render: (row) => formatEuro(row.total), title: "Totale", width: 64 },
    ]);
  }

  return pdf.serialize("Quantara - PDF SAL");
}

export function serializeMeasurementBookPdf(input: PdfSalReportInput): Uint8Array {
  const pdf = new PdfLayout("Libretto misure", input.title, [
    input.project.title,
    `Data SAL ${formatDate(input.date)}`,
  ]);
  addProjectBlock(pdf, input);

  for (const [index, line] of input.lines.entries()) {
    pdf.section(`${index + 1}. ${line.voice.code}`, line.voice.description);
    pdf.metaRow([
      ["Unita", line.voice.unit],
      ["Quantita", formatNumber(line.quantity)],
      ["Importo", formatEuro(line.totalAmount)],
    ]);

    pdf.table(line.measurementRows, [
      {
        render: (row, rowIndex) =>
          `${rowIndex + 1}. ${formatDate(row.date)}${row.station ? ` - ${row.station}` : ""}`,
        title: "Rif.",
        width: 92,
      },
      { render: (row) => row.description || "Misura", title: "Descrizione", width: 202 },
      {
        align: "right",
        render: (row) =>
          `${formatNumber(row.factor1)} x ${formatNumber(row.factor2)} x ${formatNumber(row.factor3)}`,
        title: "Fattori",
        width: 126,
      },
      {
        align: "right",
        render: (row) => `${formatNumber(row.partialQuantity)} ${row.unit}`,
        title: "Parziale",
        width: 88,
      },
    ]);

    const notes = line.measurementRows.filter((row) => row.notes.trim().length > 0);
    if (notes.length > 0) {
      pdf.note(notes.map((row) => row.notes).join(" | "));
    }
  }

  return pdf.serialize("Quantara - Libretto misure");
}

export function serializeAccountingPdf(input: PdfSalReportInput): Uint8Array {
  const pdf = new PdfLayout("Situazione contabile", input.title, [
    input.project.title,
    `Data SAL ${formatDate(input.date)}`,
  ]);
  addProjectBlock(pdf, input);

  pdf.section("Quadro importi");
  pdf.cards([
    ["Contratto", formatEuro(input.project.contractAmount)],
    ["Progressivo precedente", formatEuro(input.summary.previousProgressiveAmount)],
    ["SAL corrente", formatEuro(input.summary.total)],
    [
      "Progressivo aggiornato",
      formatEuro(input.summary.previousProgressiveAmount + input.summary.total),
    ],
    ["Residuo", formatEuro(input.summary.budgetResidual)],
    ["Oneri sicurezza", formatEuro(input.summary.safetyAmount)],
  ]);

  pdf.section("Dettaglio contabile");
  pdf.table(input.lines, [
    { render: (line) => line.voice.code, title: "Codice", width: 70 },
    { render: (line) => line.voice.description, title: "Descrizione", width: 222 },
    {
      align: "right",
      render: (line) => `${formatNumber(line.quantity)} ${line.voice.unit}`,
      title: "Quantita",
      width: 78,
    },
    {
      align: "right",
      render: (line) => formatEuro(line.discountAmount),
      title: "Ribasso",
      width: 66,
    },
    {
      align: "right",
      render: (line) => formatEuro(line.totalAmount),
      title: "Netto",
      width: 72,
    },
  ]);

  return pdf.serialize("Quantara - Situazione contabile");
}

function addProjectBlock(pdf: PdfLayout, input: PdfSalReportInput) {
  pdf.section("Dati documento");
  pdf.metaRow([
    ["Progetto", input.project.title],
    ["Appaltatore", input.project.contractor],
    ["Contratto applicativo", input.project.applicationContractCode],
    ["Contratto quadro", input.project.frameworkAgreementCode],
  ]);
}

function addEconomicCards(pdf: PdfLayout, input: PdfSalReportInput) {
  pdf.section("Riepilogo economico");
  pdf.cards([
    ["Totale SAL", formatEuro(input.summary.total)],
    ["Importo lordo", formatEuro(input.summary.grossAmount)],
    ["Ribassi", formatEuro(input.summary.discountAmount)],
    ["Maggiorazioni", formatEuro(input.summary.linkedChargeAmount)],
    ["Oneri sicurezza", formatEuro(input.summary.safetyAmount)],
    ["Residuo contratto", formatEuro(input.summary.budgetResidual)],
  ]);
}

class PdfLayout {
  private readonly headerLines: string[];
  private readonly pages: string[][] = [];
  private pageNumber = 0;
  private y = TOP_Y;

  constructor(
    private readonly title: string,
    private readonly documentName: string,
    headerLines: string[],
  ) {
    this.headerLines = headerLines.filter(Boolean);
    this.addPage();
  }

  cards(items: Array<[string, string]>) {
    const gap = 8;
    const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
    const cardHeight = 47;

    for (let index = 0; index < items.length; index += 3) {
      this.ensureSpace(cardHeight + 14);
      const row = items.slice(index, index + 3);
      row.forEach(([label, value], cardIndex) => {
        const x = MARGIN_X + cardIndex * (cardWidth + gap);
        this.rect(x, this.y - cardHeight, cardWidth, cardHeight, COLORS.accentSoft);
        this.strokeRect(x, this.y - cardHeight, cardWidth, cardHeight, COLORS.border);
        this.text(label.toUpperCase(), x + 10, this.y - 15, 7, COLORS.muted);
        this.text(value, x + 10, this.y - 33, 12, COLORS.headerText);
      });
      this.y -= cardHeight + 14;
    }
  }

  metaRow(items: Array<[string, string]>) {
    const rowHeight = 30;
    const colWidth = CONTENT_WIDTH / 2;

    for (let index = 0; index < items.length; index += 2) {
      this.ensureSpace(rowHeight + 8);
      const row = items.slice(index, index + 2);
      row.forEach(([label, value], colIndex) => {
        const x = MARGIN_X + colIndex * colWidth;
        this.text(label.toUpperCase(), x, this.y - 10, 7, COLORS.muted);
        this.wrappedText(value || "-", x, this.y - 24, colWidth - 14, 9, COLORS.text, 1);
      });
      this.y -= rowHeight;
    }
    this.y -= 6;
  }

  note(text: string) {
    this.ensureSpace(40);
    this.rect(MARGIN_X, this.y - 32, CONTENT_WIDTH, 32, COLORS.warning);
    this.strokeRect(MARGIN_X, this.y - 32, CONTENT_WIDTH, 32, COLORS.warningBorder);
    this.wrappedText(
      `Note: ${text}`,
      MARGIN_X + 10,
      this.y - 13,
      CONTENT_WIDTH - 20,
      8,
      COLORS.text,
      2,
    );
    this.y -= 42;
  }

  section(title: string, subtitle?: string) {
    this.ensureSpace(subtitle ? 44 : 30);
    this.line(MARGIN_X, this.y - 5, PAGE_WIDTH - MARGIN_X, this.y - 5, COLORS.border);
    this.text(title, MARGIN_X, this.y - 22, 12, COLORS.accent);
    if (subtitle) {
      this.wrappedText(
        subtitle,
        MARGIN_X + 82,
        this.y - 22,
        CONTENT_WIDTH - 82,
        8,
        COLORS.muted,
        2,
      );
      this.y -= 44;
      return;
    }
    this.y -= 34;
  }

  table<T>(rows: readonly T[], columns: Array<TableColumn<T>>) {
    const rowHeight = 31;
    const headerHeight = 22;
    this.ensureSpace(headerHeight + rowHeight + 8);
    this.rect(MARGIN_X, this.y - headerHeight, CONTENT_WIDTH, headerHeight, COLORS.accent);

    let x = MARGIN_X;
    columns.forEach((column) => {
      this.text(column.title.toUpperCase(), x + 6, this.y - 14, 7, COLORS.white);
      x += column.width;
    });
    this.y -= headerHeight;

    if (rows.length === 0) {
      this.ensureSpace(rowHeight);
      this.text("Nessun dato disponibile", MARGIN_X + 6, this.y - 19, 9, COLORS.muted);
      this.y -= rowHeight + 8;
      return;
    }

    rows.forEach((row, rowIndex) => {
      this.ensureSpace(rowHeight + 8);
      if (rowIndex % 2 === 1) {
        this.rect(MARGIN_X, this.y - rowHeight, CONTENT_WIDTH, rowHeight, COLORS.rowAlt);
      }
      this.line(
        MARGIN_X,
        this.y - rowHeight,
        PAGE_WIDTH - MARGIN_X,
        this.y - rowHeight,
        COLORS.border,
      );

      let columnX = MARGIN_X;
      columns.forEach((column) => {
        const value = column.render(row, rowIndex);
        if (column.align === "right") {
          this.textRight(value, columnX + column.width - 6, this.y - 19, 8, COLORS.text);
        } else {
          this.wrappedText(value, columnX + 6, this.y - 12, column.width - 12, 8, COLORS.text, 2);
        }
        columnX += column.width;
      });
      this.y -= rowHeight;
    });
    this.y -= 12;
  }

  serialize(documentTitle: string): Uint8Array {
    const objects: string[] = [];
    const pageObjectNumbers: number[] = [];
    const encoder = new TextEncoder();

    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("__PAGES__");
    objects.push(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    );

    for (const pageCommands of this.pages) {
      const content = pageCommands.join("\n");
      const contentObjectNumber = objects.length + 1;
      objects.push(
        `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
      );
      const pageObjectNumber = objects.length + 1;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
      );
      pageObjectNumbers.push(pageObjectNumber);
    }

    objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((page) => `${page} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

    const infoObjectNumber = objects.length + 1;
    objects.push(
      `<< /Title ${pdfString(documentTitle)} /Creator ${pdfString("Quantara")} /Producer ${pdfString("Quantara PDF Export")} >>`,
    );

    return finalizePdf(objects, infoObjectNumber);
  }

  private addPage() {
    this.pageNumber += 1;
    this.pages.push([]);
    this.y = TOP_Y;
    this.rect(0, PAGE_HEIGHT - 76, PAGE_WIDTH, 76, COLORS.accent);
    this.text("QUANTARA", MARGIN_X, PAGE_HEIGHT - 28, 8, COLORS.white);
    this.text(this.title, MARGIN_X, PAGE_HEIGHT - 50, 20, COLORS.white);
    this.textRight(this.documentName, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 31, 10, COLORS.white);
    this.headerLines.slice(0, 2).forEach((line, index) => {
      this.textRight(line, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 49 - index * 12, 8, COLORS.white);
    });
    this.line(MARGIN_X, BOTTOM_Y - 12, PAGE_WIDTH - MARGIN_X, BOTTOM_Y - 12, COLORS.border);
    this.text(`Pagina ${this.pageNumber}`, MARGIN_X, BOTTOM_Y - 28, 8, COLORS.muted);
    this.textRight("Quantara PDF Export", PAGE_WIDTH - MARGIN_X, BOTTOM_Y - 28, 8, COLORS.muted);
    this.y = PAGE_HEIGHT - 103;
  }

  private currentPage() {
    return this.pages[this.pages.length - 1] ?? [];
  }

  private ensureSpace(height: number) {
    if (this.y - height < BOTTOM_Y) {
      this.addPage();
    }
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: Color) {
    const [r, g, b] = color;
    this.currentPage().push(`q ${r} ${g} ${b} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  private rect(x: number, y: number, width: number, height: number, color: Color) {
    const [r, g, b] = color;
    this.currentPage().push(`q ${r} ${g} ${b} rg ${x} ${y} ${width} ${height} re f Q`);
  }

  private strokeRect(x: number, y: number, width: number, height: number, color: Color) {
    const [r, g, b] = color;
    this.currentPage().push(`q ${r} ${g} ${b} RG 0.6 w ${x} ${y} ${width} ${height} re S Q`);
  }

  private text(value: string, x: number, y: number, size: number, color: Color) {
    const [r, g, b] = color;
    this.currentPage().push(
      `q ${r} ${g} ${b} rg BT /F1 ${size} Tf ${x} ${y} Td ${pdfString(value)} Tj ET Q`,
    );
  }

  private textRight(value: string, rightX: number, y: number, size: number, color: Color) {
    const fitted = fitText(value, rightX - MARGIN_X, size);
    const width = estimateTextWidth(fitted, size);
    this.text(fitted, Math.max(MARGIN_X, rightX - width), y, size, color);
  }

  private wrappedText(
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    color: Color,
    maxLines: number,
  ) {
    const lines = wrapText(value, maxWidth, size).slice(0, maxLines);
    let lineIndex = 0;
    for (const line of lines) {
      this.text(line, x, y - lineIndex * (size + 3), size, color);
      lineIndex++;
    }
  }
}

function finalizePdf(objects: string[], infoObjectNumber: number): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  let length = encoder.encode(chunks[0]).length;

  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
    chunks.push(chunk);
    length += encoder.encode(chunk).length;
  });

  const xrefOffset = length;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoObjectNumber} 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");
  chunks.push(xref);

  return encoder.encode(chunks.join(""));
}

function pdfString(value: string): string {
  return `(${normalizePdfText(value)
    .replace(/[\\()]/g, "\\$&")
    .replace(/\r?\n/g, " ")})`;
}

function normalizePdfText(value: string): string {
  return value
    .replace(/€/g, "EUR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ");
}

function wrapText(value: string, maxWidth: number, size: number): string[] {
  const normalized = normalizePdfText(value).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const result: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (estimateTextWidth(next, size) > maxWidth && current) {
      result.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) result.push(current);
  return result;
}

function estimateTextWidth(value: string, size: number): number {
  return normalizePdfText(value).length * size * 0.48;
}

function fitText(value: string, maxWidth: number, size: number): string {
  const normalized = normalizePdfText(value);
  if (estimateTextWidth(normalized, size) <= maxWidth) return normalized;
  const ellipsis = "...";
  let result = normalized;
  while (result.length > 0 && estimateTextWidth(`${result}${ellipsis}`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}${ellipsis}`;
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT");
}

function formatEuro(value: number): string {
  return `EUR ${value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}
