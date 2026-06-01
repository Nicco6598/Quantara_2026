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
  linkedCharges: Array<{
    baseAmount: number;
    code: string;
    description: string;
    id: string;
    percent: number;
    total: number;
  }>;
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
    /** Explicit flag from the app: true if this line is acting as a % surcharge/MG in this SAL
     *  (either a real MG voice with unit="%" or a normalized voice with surchargePercent > 0).
     *  These must be excluded from the main productive "Voci SAL" table in fiscal reports. */
    isSurchargeVoice: boolean;
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
const MARGIN_X = 36;
const PAGE_HEADER_H = 52;
const MARGIN_TOP_CONTENT = PAGE_HEADER_H + 28;
const BOTTOM_Y = 40;
/** Lowest Y for content bottom edge — keeps body above footer line and page number. */
const CONTENT_BOTTOM_Y = BOTTOM_Y + 24;
const FLOW_GAP = 6;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const PAGE_RIGHT_X = PAGE_WIDTH - MARGIN_X;

/** Helvetica-ish width estimate; conservative so wrapped lines stay inside the page. */
const TEXT_WIDTH_EM = 0.58;
const WRAP_WIDTH_SAFETY = 0.88;

/** Compact table typography — keeps multi-line rows readable without excess height. */
const TABLE_FONT = 8;
const TABLE_LINE_STEP = TABLE_FONT + 2;
const TABLE_CELL_PAD_X = 5;
const TABLE_ROW_PAD_Y = 4;
const TABLE_MIN_ROW_H = TABLE_ROW_PAD_Y * 2 + TABLE_LINE_STEP;
const TABLE_HEADER_H = 16;

/** Report SAL — colonne tabella (voci produttive e dettaglio MG allineati). */
const SAL_COL_VOCE_W = 298;
const SAL_COL_QTY_W = 62;
const SAL_COL_PU_W = 78;
const SAL_COL_IMP_W = 85;

/** Libretto misure — compact stacked layout (measure = draw, no overlap). */
const LIBRETTO_PAD = 3;
const LIBRETTO_GAP = 1;
const LIBRETTO_BODY = 7;
const LIBRETTO_LABEL = 5.5;
const LIBRETTO_LINE_LEAD = 1.35;
const LIBRETTO_CARD_INSET = 2;
/** Space between the blue accent bar and voice text (voice header box only). */
const LIBRETTO_ACCENT_BAR_W = 3;
const LIBRETTO_ACCENT_TEXT_GAP = 11;

type LibrettoMetricItem = { label: string; value: string };

type LibrettoRow =
  | { kind: "title"; text: string }
  | { kind: "field"; label: string; value: string; valueColor?: Color }
  | { kind: "text"; value: string; valueColor?: Color }
  | { kind: "metrics"; section?: string; items: LibrettoMetricItem[] };

type Align = "left" | "right";
type Color = [number, number, number];
type TableColumn<T> = {
  align?: Align;
  mono?: boolean;
  /** Keep cell on one line (truncate with … if needed). */
  singleLine?: boolean;
  render: (row: T, index: number) => string;
  title: string;
  width: number;
};

type MgFiscalDetailRow = {
  baseAmount: number;
  baseCode: string;
  baseDescription: string;
  amountAfterMg: number;
  mgAmount: number;
  percent: number;
  quantity: number;
  unit: string;
};

/** Una voce MG/soprattassa del SAL e le voci base che maggiora (report fiscale). */
type MgFiscalGroup = {
  code: string;
  description: string;
  percent: number;
  rows: MgFiscalDetailRow[];
  totalMg: number;
};

const COLORS = {
  accent: [0.06, 0.28, 0.48] as Color,
  accentMid: [0.12, 0.38, 0.58] as Color,
  accentSoft: [0.93, 0.96, 0.99] as Color,
  border: [0.82, 0.86, 0.9] as Color,
  borderStrong: [0.62, 0.68, 0.74] as Color,
  headerText: [0.07, 0.1, 0.14] as Color,
  muted: [0.38, 0.44, 0.5] as Color,
  panel: [0.97, 0.98, 0.99] as Color,
  rowAlt: [0.96, 0.97, 0.98] as Color,
  text: [0.1, 0.14, 0.18] as Color,
  warning: [1, 0.98, 0.92] as Color,
  warningBorder: [0.82, 0.72, 0.48] as Color,
  white: [1, 1, 1] as Color,
};

function sortLinesByCode<T extends { voice: { code: string } }>(lines: readonly T[]): T[] {
  return [...lines].sort((a, b) =>
    a.voice.code.localeCompare(b.voice.code, "it-IT", { numeric: true }),
  );
}

/**
 * Identifies lines that are themselves Maggiorazione / surcharge tariff items.
 * These must be excluded from the main "Voci SAL" productive table
 * and must never appear in the "voci interessate" lists under each MG.
 */
function formatSalVoiceName(line: PdfSalLine): string {
  const code = line.voice.code.trim();
  const desc = line.voice.description.trim();
  if (!code) return desc || "—";
  if (!desc) return code;
  return `${code} — ${desc}`;
}

function formatSalQuantity(line: PdfSalLine): string {
  return `${formatNumber(line.quantity)} ${line.voice.unit}`.trim();
}

function formatMgBaseVoice(voice: { code: string; description: string }): string {
  const code = voice.code.trim();
  const desc = voice.description.trim();
  if (!code) return desc || "—";
  if (!desc) return code;
  return `${code} — ${desc}`;
}

type PdfLinkedCharge = PdfSalLine["linkedCharges"][number];

type ProductiveTableEntry =
  | { kind: "main"; line: PdfSalLine }
  | { kind: "charge"; line: PdfSalLine; charge: PdfLinkedCharge }
  | { kind: "voiceTotal"; line: PdfSalLine };

function lineHasMgCharges(line: PdfSalLine): boolean {
  return line.linkedCharges.some((charge) => charge.total > 0);
}

/** Oneri sicurezza (OS): esclusi dal ribasso quando discountAmount = 0. */
function isVoiceExcludedFromDiscount(line: PdfSalLine): boolean {
  return line.voice.isSafetyCost && line.discountAmount === 0 && line.netAmount > 0;
}

function productiveVoiceLabel(line: PdfSalLine): string {
  const base = formatSalVoiceName(line);
  if (isVoiceExcludedFromDiscount(line)) {
    return `${base} · escl. ribasso`;
  }
  return base;
}

function formatMgChargeSubLabel(
  charge: PdfLinkedCharge,
  mgById: ReadonlyMap<string, PdfSalLine>,
): string {
  const mgMatch = /^(.+)-mg-/.exec(charge.id);
  if (mgMatch) {
    const mgLine = mgById.get(mgMatch[1] ?? "");
    if (mgLine) {
      const code = mgLine.voice.code.trim();
      const pct = formatNumber(charge.percent);
      return code ? `${code} (${pct} %)` : `${pct} %`;
    }
  }
  const code = charge.code.trim();
  if (code) {
    return `${code} (${formatNumber(charge.percent)} %)`;
  }
  return charge.description.trim() || "Maggiorazione";
}

function flattenProductiveTableEntries(baseLines: readonly PdfSalLine[]): ProductiveTableEntry[] {
  const entries: ProductiveTableEntry[] = [];
  for (const line of baseLines) {
    entries.push({ kind: "main", line });
    const charges = line.linkedCharges.filter((c) => c.total > 0);
    for (const charge of charges) {
      entries.push({ kind: "charge", line, charge });
    }
    if (charges.length > 0) {
      entries.push({ kind: "voiceTotal", line });
    }
  }
  return entries;
}

function salProductiveTableColumns(
  mgById: ReadonlyMap<string, PdfSalLine>,
): Array<TableColumn<ProductiveTableEntry>> {
  return [
    {
      title: "Voce",
      width: SAL_COL_VOCE_W,
      singleLine: true,
      render: (entry) => {
        if (entry.kind === "main") {
          return productiveVoiceLabel(entry.line);
        }
        if (entry.kind === "charge") {
          return `  ↳ ${formatMgChargeSubLabel(entry.charge, mgById)}`;
        }
        if (entry.kind === "voiceTotal") {
          return "  Netto voce";
        }
        return "—";
      },
    },
    {
      align: "right",
      title: "Quantità",
      width: SAL_COL_QTY_W,
      singleLine: true,
      render: (entry) => (entry.kind === "main" ? formatSalQuantity(entry.line) : "—"),
    },
    {
      align: "right",
      mono: true,
      singleLine: true,
      title: "Prezzo unitario",
      width: SAL_COL_PU_W,
      render: (entry) => {
        if (entry.kind === "main") {
          return formatEuro(entry.line.voice.unitPrice);
        }
        if (entry.kind === "charge") {
          return `${formatNumber(entry.charge.percent)} %`;
        }
        return "—";
      },
    },
    {
      align: "right",
      mono: true,
      singleLine: true,
      title: "Importo",
      width: SAL_COL_IMP_W,
      render: (entry) => {
        if (entry.kind === "main") {
          return formatEuro(
            lineHasMgCharges(entry.line) ? entry.line.grossAmount : entry.line.totalAmount,
          );
        }
        if (entry.kind === "charge") {
          return formatEuro(entry.charge.total);
        }
        if (entry.kind === "voiceTotal") {
          return formatEuro(entry.line.netAmount);
        }
        return "—";
      },
    },
  ];
}

function mgPercentFromLine(line: PdfSalLine): number {
  if (line.voice.unit === "%") {
    return line.voice.unitPrice;
  }
  if (line.surchargePercent > 0) {
    return line.surchargePercent;
  }
  const first = line.linkedCharges.find((c) => c.percent > 0);
  return first?.percent ?? 0;
}

function buildMgFiscalGroups(allLines: PdfSalLine[]): MgFiscalGroup[] {
  const baseLines = allLines.filter((l) => !isMaggiorazioneLine(l));
  const mgLines = allLines.filter((l) => isMaggiorazioneLine(l));
  const usedChargeIds = new Set<string>();
  const groups: MgFiscalGroup[] = [];

  const pushRow = (group: MgFiscalGroup, row: MgFiscalDetailRow, chargeId: string) => {
    if (usedChargeIds.has(chargeId)) {
      return;
    }
    usedChargeIds.add(chargeId);
    group.rows.push(row);
    group.totalMg += row.mgAmount;
  };

  for (const mgLine of mgLines) {
    const group: MgFiscalGroup = {
      code: mgLine.voice.code,
      description: mgLine.voice.description,
      percent: mgPercentFromLine(mgLine),
      rows: [],
      totalMg: 0,
    };

    for (const base of baseLines) {
      for (const ch of base.linkedCharges) {
        if (ch.total <= 0) {
          continue;
        }
        const linkedToMg =
          ch.id === `${mgLine.id}-mg-${base.id}` ||
          (ch.id.startsWith(`${mgLine.id}-mg-`) && ch.id.endsWith(base.id));
        if (!linkedToMg) {
          continue;
        }
        pushRow(
          group,
          {
            baseAmount: ch.baseAmount,
            baseCode: base.voice.code,
            baseDescription: base.voice.description,
            amountAfterMg: ch.baseAmount + ch.total,
            mgAmount: ch.total,
            percent: ch.percent,
            quantity: base.quantity,
            unit: base.voice.unit,
          },
          ch.id,
        );
      }
    }

    for (const ch of mgLine.linkedCharges) {
      if (ch.total <= 0) {
        continue;
      }
      if (ch.id === `${mgLine.id}-surcharge` || ch.id.endsWith("-surcharge")) {
        pushRow(
          group,
          {
            baseAmount: ch.baseAmount,
            baseCode: mgLine.voice.code,
            baseDescription: mgLine.voice.description,
            amountAfterMg: ch.baseAmount + ch.total,
            mgAmount: ch.total,
            percent: ch.percent,
            quantity: mgLine.quantity,
            unit: mgLine.voice.unit,
          },
          ch.id,
        );
      }
    }

    if (group.rows.length === 0) {
      const summary = mgLine.linkedCharges.find((c) => c.code.startsWith("MG.") && c.total > 0);
      if (summary) {
        for (const base of baseLines) {
          for (const ch of base.linkedCharges) {
            if (ch.code !== summary.code || ch.total <= 0) {
              continue;
            }
            pushRow(
              group,
              {
                baseAmount: ch.baseAmount,
                baseCode: base.voice.code,
                baseDescription: base.voice.description,
                amountAfterMg: ch.baseAmount + ch.total,
                mgAmount: ch.total,
                percent: ch.percent,
                quantity: base.quantity,
                unit: base.voice.unit,
              },
              ch.id,
            );
          }
        }
      }
    }

    if (group.rows.length > 0) {
      group.rows.sort((a, b) => a.baseCode.localeCompare(b.baseCode, "it-IT", { numeric: true }));
      groups.push(group);
    }
  }

  const orphanByCode = new Map<string, MgFiscalGroup>();
  for (const base of baseLines) {
    for (const ch of base.linkedCharges) {
      if (ch.total <= 0 || usedChargeIds.has(ch.id)) {
        continue;
      }
      if (!ch.code.startsWith("MG.") && !ch.code.endsWith(".MAG")) {
        continue;
      }
      let group = orphanByCode.get(ch.code);
      if (!group) {
        group = {
          code: ch.code,
          description: ch.description,
          percent: ch.percent,
          rows: [],
          totalMg: 0,
        };
        orphanByCode.set(ch.code, group);
      }
      pushRow(
        group,
        {
          baseAmount: ch.baseAmount,
          baseCode: base.voice.code,
          baseDescription: base.voice.description,
          amountAfterMg: ch.baseAmount + ch.total,
          mgAmount: ch.total,
          percent: ch.percent,
          quantity: base.quantity,
          unit: base.voice.unit,
        },
        ch.id,
      );
    }
  }

  for (const group of orphanByCode.values()) {
    if (group.rows.length > 0) {
      group.rows.sort((a, b) => a.baseCode.localeCompare(b.baseCode, "it-IT", { numeric: true }));
      groups.push(group);
    }
  }

  groups.sort((a, b) => a.code.localeCompare(b.code, "it-IT", { numeric: true }));
  return groups;
}

type MgRecapRow = {
  baseLabel: string;
  mgAmount: number;
  mgCode: string;
  percent: number;
};

function buildMgRecapRows(groups: readonly MgFiscalGroup[]): MgRecapRow[] {
  const rows: MgRecapRow[] = [];
  for (const group of groups) {
    for (const row of group.rows) {
      rows.push({
        mgCode: group.code,
        percent: row.percent,
        baseLabel: formatMgBaseVoice({ code: row.baseCode, description: row.baseDescription }),
        mgAmount: row.mgAmount,
      });
    }
  }
  rows.sort(
    (a, b) =>
      a.mgCode.localeCompare(b.mgCode, "it-IT", { numeric: true }) ||
      a.baseLabel.localeCompare(b.baseLabel, "it-IT", { numeric: true }),
  );
  return rows;
}

const MG_RECAP_MG_W = 108;
const MG_RECAP_PCT_W = 44;
const MG_RECAP_BASE_W = 286;
const MG_RECAP_IMP_W = 85;

function mgRecapColumns(): Array<TableColumn<MgRecapRow>> {
  return [
    {
      title: "Voce MG",
      width: MG_RECAP_MG_W,
      singleLine: true,
      render: (r) => r.mgCode,
    },
    {
      align: "right",
      mono: true,
      singleLine: true,
      title: "%",
      width: MG_RECAP_PCT_W,
      render: (r) => formatNumber(r.percent),
    },
    {
      title: "Voce base",
      width: MG_RECAP_BASE_W,
      singleLine: true,
      render: (r) => r.baseLabel,
    },
    {
      align: "right",
      mono: true,
      singleLine: true,
      title: "Imp. MG",
      width: MG_RECAP_IMP_W,
      render: (r) => formatEuro(r.mgAmount),
    },
  ];
}

function isMaggiorazioneLine(line: PdfSalLine): boolean {
  // The authoritative decision is made on the app side when building the PDF input.
  // This flag correctly handles:
  // - Real .MG. voices (unit "%")
  // - Normalized voices (OS, BA, etc.) that the user is treating as MG/surcharge for this SAL
  // - Excludes voices that were "de-normalized" back to normal productive lines
  return line.voice.isSurchargeVoice === true;
}

export function serializeSalPdfReport(input: PdfSalReportInput): Uint8Array {
  const allLines = sortLinesByCode(input.lines);

  // Separate productive base voices from pure MG / surcharge lines.
  // This is critical for a clean fiscal & progress report.
  const baseLines = allLines.filter((l) => !isMaggiorazioneLine(l));

  const progressive = input.summary.previousProgressiveAmount + input.summary.total;
  const baseTotal = baseLines.reduce((s, l) => s + l.totalAmount, 0);

  const pdf = new PdfLayout("Report SAL — Avanzamento lavori", input.title, [
    input.project.title,
    `SAL del ${formatDate(input.date)}`,
  ]);

  pdf.fiscalHero({
    contractAmount: input.project.contractAmount,
    progressive,
    salTotal: input.summary.total,
    voiceCount: baseLines.length,
  });

  addProjectBlock(pdf, input);
  addEconomicCards(pdf, input);

  pdf.gap(4);
  pdf.section("Elenco voci produttive");
  pdf.mutedLine(
    `${baseLines.length} voci in ordine alfabetico. Importo = netto voce; ribasso applicato sul totale in chiusura. Voci OS/oneri sicurezza segnate come escluse dal ribasso.`,
  );
  pdf.gap(3);

  const mgById = new Map(allLines.filter(isMaggiorazioneLine).map((line) => [line.id, line]));
  pdf.productiveVoicesTable(baseLines, mgById);
  pdf.productiveDiscountFooter(baseLines, input.summary, baseTotal);

  // Note: overlap protection between the big Voci SAL table and the following
  // "Maggiorazioni" section is handled by:
  //  - extra y breathing room at the end of table()
  //  - significantly larger ensureSpace reservation inside section()
  // This avoids touching private members from outside the class.

  const mgGroups = buildMgFiscalGroups(allLines);

  if (mgGroups.length > 0) {
    pdf.gap(5);
    pdf.section("Recap maggiorazioni");
    pdf.mgRecapLegend(mgGroups);
  }

  pdf.gap(3);
  pdf.metricsBlock("Sintesi fiscale SAL", [
    { label: "Lordo voci", value: formatEuro(input.summary.grossAmount) },
    { label: "Ribassi", value: formatEuro(input.summary.discountAmount) },
    { label: "Maggiorazioni", value: formatEuro(input.summary.linkedChargeAmount) },
    { label: "Netto SAL", value: formatEuro(input.summary.total) },
  ]);

  return pdf.serialize("Quantara - PDF SAL");
}

export function serializeMeasurementBookPdf(input: PdfSalReportInput): Uint8Array {
  const allLines = sortLinesByCode(input.lines);
  // In the measurement book we only want productive voices.
  // Pure MG lines do not have independent measurement rows in a fiscal sense.
  const lines = allLines.filter((l) => !isMaggiorazioneLine(l));
  const linesTotal = lines.reduce((s, l) => s + l.totalAmount, 0);
  const progressive = input.summary.previousProgressiveAmount + input.summary.total;

  const pdf = new PdfLayout("Libretto misure", input.title, [
    input.project.title,
    `Data SAL ${formatDate(input.date)}`,
  ]);

  pdf.fiscalHero({
    amountCaption: "Totale voci in libretto",
    contractAmount: input.project.contractAmount,
    kicker: "Libretto misure",
    progressive,
    salTotal: linesTotal,
    voiceCount: lines.length,
  });

  addProjectBlock(pdf, input);
  pdf.gap(2);
  pdf.mutedLine("Voci in capitoli; sottorighe in schede compatte.");
  pdf.gap(2);

  for (const [index, line] of lines.entries()) {
    pdf.measurementBookVoice(line, index + 1);
  }

  return pdf.serialize("Quantara - Libretto misure");
}

export function serializeAccountingPdf(input: PdfSalReportInput): Uint8Array {
  const allLines = sortLinesByCode(input.lines);
  // Fiscal accounting detail should only list productive base voices.
  // Maggiorazioni are already summarized in the economic cards and (for the full report) in their dedicated section.
  const lines = allLines.filter((l) => !isMaggiorazioneLine(l));

  const progressive = input.summary.previousProgressiveAmount + input.summary.total;

  const pdf = new PdfLayout("Situazione contabile", input.title, [
    input.project.title,
    `Data SAL ${formatDate(input.date)}`,
  ]);

  pdf.fiscalHero({
    contractAmount: input.project.contractAmount,
    progressive,
    salTotal: input.summary.total,
    voiceCount: lines.length,
  });

  addProjectBlock(pdf, input);

  pdf.section("Quadro importi");
  pdf.metricsBlock("SAL e progressivi", [
    { label: "SAL corrente", value: formatEuro(input.summary.total) },
    { label: "Progressivo prec.", value: formatEuro(input.summary.previousProgressiveAmount) },
    { label: "Progressivo agg.", value: formatEuro(progressive) },
    { label: "Residuo contratto", value: formatEuro(input.summary.budgetResidual) },
  ]);
  pdf.gap(2);
  pdf.metricsBlock("Riepilogo", [
    { label: "Oneri sicurezza", value: formatEuro(input.summary.safetyAmount) },
    { label: "Ribassi totali", value: formatEuro(input.summary.discountAmount) },
    { label: "Maggiorazioni", value: formatEuro(input.summary.linkedChargeAmount) },
    { label: "Lordo voci", value: formatEuro(input.summary.grossAmount) },
  ]);

  pdf.gap(4);
  pdf.section("Dettaglio contabile");
  pdf.mutedLine(`${lines.length} voci produttive in ordine alfabetico per codice.`);
  pdf.gap(3);

  pdf.table(lines, [
    {
      render: (line) => formatSalVoiceName(line),
      singleLine: true,
      title: "Voce",
      width: 228,
    },
    {
      align: "right",
      render: (line) => formatSalQuantity(line),
      title: "Quantità",
      width: 58,
    },
    {
      align: "right",
      mono: true,
      render: (line) => formatEuro(line.voice.unitPrice),
      title: "Prezzo unitario",
      width: 72,
    },
    {
      align: "right",
      render: (line) => formatEuro(line.discountAmount),
      title: "Ribasso",
      width: 58,
    },
    {
      align: "right",
      render: (line) => formatEuro(line.totalAmount),
      title: "Importo netto",
      width: 107,
    },
  ]);

  const linesTotal = lines.reduce((s, l) => s + l.totalAmount, 0);
  pdf.tableTotalRow("Totale voci produttive", formatEuro(linesTotal));

  pdf.fiscalClosingStrip({
    gross: input.summary.grossAmount,
    discounts: input.summary.discountAmount,
    surcharges: input.summary.linkedChargeAmount,
    netSal: input.summary.total,
    residual: input.summary.budgetResidual,
  });

  return pdf.serialize("Quantara - Situazione contabile");
}

function addProjectBlock(pdf: PdfLayout, input: PdfSalReportInput) {
  pdf.section("Commessa e contratto");
  pdf.infoPanel([
    ["Progetto", input.project.title],
    ["Appaltatore", input.project.contractor],
    ["Contratto applicativo", input.project.applicationContractCode],
    ["Contratto quadro", input.project.frameworkAgreementCode],
    ["Importo contratto", formatEuro(input.project.contractAmount)],
    ["Data documento", formatDate(input.date)],
  ]);
}

function addEconomicCards(pdf: PdfLayout, input: PdfSalReportInput) {
  const progressive = input.summary.previousProgressiveAmount + input.summary.total;

  pdf.section("Quadro economico SAL");
  pdf.metricsBlock("Avanzamento e SAL", [
    { label: "SAL corrente", value: formatEuro(input.summary.total) },
    { label: "Progressivo prec.", value: formatEuro(input.summary.previousProgressiveAmount) },
    { label: "Progressivo agg.", value: formatEuro(progressive) },
    { label: "Residuo contratto", value: formatEuro(input.summary.budgetResidual) },
  ]);
  pdf.gap(2);
  pdf.metricsBlock("Composizione importi", [
    { label: "Lordo voci", value: formatEuro(input.summary.grossAmount) },
    { label: "Ribassi", value: formatEuro(input.summary.discountAmount) },
    { label: "Maggiorazioni", value: formatEuro(input.summary.linkedChargeAmount) },
    { label: "Oneri sicurezza", value: formatEuro(input.summary.safetyAmount) },
  ]);
}

class PdfLayout {
  private readonly headerLines: string[];
  private readonly pages: string[][] = [];
  private pageNumber = 0;
  private y = PAGE_HEIGHT - MARGIN_TOP_CONTENT;

  constructor(
    private readonly title: string,
    private readonly documentName: string,
    headerLines: string[],
  ) {
    this.headerLines = headerLines.filter(Boolean);
    this.addPage();
  }

  gap(px: number) {
    if (px <= 0) return;
    this.ensureSpace(px);
    this.y -= px;
  }

  mutedLine(text: string) {
    const lines = this.countWrappedLines(text, CONTENT_WIDTH, 7);
    const h = lines * 9 + 4;
    this.ensureSpace(h + FLOW_GAP);
    this.wrappedText(text, MARGIN_X, this.y - 9, CONTENT_WIDTH, 7, COLORS.muted, lines);
    this.flowDown(h + FLOW_GAP);
  }

  fiscalHero(opts: {
    salTotal: number;
    progressive: number;
    contractAmount: number;
    voiceCount: number;
    /** Override hero kicker (defaults to SAL progress report). */
    kicker?: string;
    amountCaption?: string;
  }) {
    const h = 46;
    this.ensureSpace(h + 6);
    this.rect(MARGIN_X, this.y - h, CONTENT_WIDTH, h, COLORS.accent);
    this.text(
      (opts.kicker ?? "STATO AVANZAMENTO LAVORI").toUpperCase(),
      MARGIN_X + 12,
      this.y - 14,
      7,
      COLORS.white,
    );
    this.textRight(
      formatEuro(opts.salTotal),
      MARGIN_X + CONTENT_WIDTH - 12,
      this.y - 18,
      14,
      COLORS.white,
    );
    this.text(
      opts.amountCaption ?? "Importo SAL corrente",
      MARGIN_X + CONTENT_WIDTH - 12,
      this.y - 30,
      6,
      [0.85, 0.92, 0.98] as Color,
    );
    this.text(`Progressivo ${formatEuro(opts.progressive)}`, MARGIN_X + 12, this.y - 28, 7, [
      0.9, 0.94, 0.98,
    ] as Color);
    this.text(
      `Contratto ${formatEuro(opts.contractAmount)} · ${opts.voiceCount} voci`,
      MARGIN_X + 12,
      this.y - 38,
      7,
      [0.85, 0.92, 0.98] as Color,
    );
    this.flowDown(h + FLOW_GAP);
  }

  /** Labeled metric grid (same visual language as libretto misure). */
  metricsBlock(section: string, items: LibrettoMetricItem[]) {
    const row: Extract<LibrettoRow, { kind: "metrics" }> = { kind: "metrics", items, section };
    const h = this.librettoMetricsHeight(row) + 2;
    this.ensureSpace(h + FLOW_GAP);
    const top = this.y;
    this.librettoDrawMetrics(MARGIN_X, top, CONTENT_WIDTH, items, section);
    this.y = top - h - FLOW_GAP;
  }

  fiscalClosingStrip(opts: {
    gross: number;
    discounts: number;
    surcharges: number;
    netSal: number;
    residual: number;
  }) {
    this.metricsBlock("Sintesi fiscale SAL", [
      { label: "Lordo voci", value: formatEuro(opts.gross) },
      { label: "Ribassi", value: formatEuro(opts.discounts) },
      { label: "Maggiorazioni", value: formatEuro(opts.surcharges) },
      { label: "Netto SAL", value: formatEuro(opts.netSal) },
      { label: "Residuo", value: formatEuro(opts.residual) },
    ]);
  }

  infoPanel(items: Array<[string, string]>) {
    const cols = 3;
    const colW = CONTENT_WIDTH / cols;
    const panelRows: Array<Array<[string, string]>> = [];
    for (let i = 0; i < items.length; i += cols) {
      panelRows.push(items.slice(i, i + cols));
    }

    let totalH = 8;
    const rowHeights = panelRows.map((rowItems) => {
      let maxLines = 1;
      rowItems.forEach(([, value]) => {
        maxLines = Math.max(maxLines, this.countWrappedLines(value || "-", colW - 14, 7));
      });
      const rowH = 10 + maxLines * 9;
      totalH += rowH;
      return rowH;
    });

    this.ensureSpace(totalH + FLOW_GAP);
    this.rect(MARGIN_X, this.y - totalH, CONTENT_WIDTH, totalH, COLORS.panel);
    this.strokeRect(MARGIN_X, this.y - totalH, CONTENT_WIDTH, totalH, COLORS.border);

    let yCursor = this.y - 6;
    panelRows.forEach((rowItems, rowIndex) => {
      const rowH = rowHeights[rowIndex] ?? 17;
      rowItems.forEach(([label, value], col) => {
        const x = MARGIN_X + col * colW;
        const lineCount = this.countWrappedLines(value || "-", colW - 14, 7);
        this.text(label.toUpperCase(), x + 8, yCursor - 7, 5.5, COLORS.muted);
        this.wrappedText(value || "-", x + 8, yCursor - 15, colW - 14, 7, COLORS.text, lineCount);
      });
      yCursor -= rowH;
    });
    this.flowDown(totalH + FLOW_GAP);
  }

  economicGrid(items: Array<{ label: string; value: string; highlight?: boolean }>) {
    const cols = 4;
    const gap = 4;
    const colW = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
    const rowH = 26;
    for (let i = 0; i < items.length; i += cols) {
      this.ensureSpace(rowH + gap);
      const row = items.slice(i, i + cols);
      row.forEach((item, col) => {
        const x = MARGIN_X + col * (colW + gap);
        const bg = item.highlight ? COLORS.accentSoft : COLORS.panel;
        const border = item.highlight ? COLORS.accent : COLORS.border;
        this.rect(x, this.y - rowH, colW, rowH, bg);
        this.strokeRect(x, this.y - rowH, colW, rowH, border);
        if (item.highlight) {
          this.rect(x, this.y - rowH, 2, rowH, COLORS.accent);
        }
        this.text(item.label.toUpperCase(), x + 6, this.y - 10, 5.5, COLORS.muted);
        this.text(item.value, x + 6, this.y - 21, item.highlight ? 9 : 8, COLORS.headerText);
      });
      this.y -= rowH + gap;
    }
    this.y -= 2;
  }

  /** Legenda tecnica consultativa (dettaglio operativo nel prospetto voci). */
  mgRecapLegend(groups: readonly MgFiscalGroup[]) {
    const recapRows = buildMgRecapRows(groups);
    const total = groups.reduce((sum, g) => sum + g.totalMg, 0);
    this.mutedLine(
      `Legenda · ${groups.length} voci MG · ${recapRows.length} collegamenti base→MG · totale ${formatEuro(total)}. Prospetto operativo: elenco voci produttive (sottorighe ↳).`,
    );
    this.gap(2);

    if (recapRows.length === 0) {
      this.mutedLine("Nessun collegamento maggiorazione registrato.");
      return;
    }

    this.table(recapRows, mgRecapColumns());
    this.gap(2);
    this.mgRecapTotal(total);
  }

  private mgRecapTotal(total: number) {
    this.ensureSpace(12 + FLOW_GAP);
    this.line(MARGIN_X, this.y - 1, PAGE_WIDTH - MARGIN_X, this.y - 1, COLORS.borderStrong);
    this.textRight(
      `Totale maggiorazioni · ${formatEuro(total)}`,
      PAGE_WIDTH - MARGIN_X,
      this.y - 9,
      8,
      COLORS.accent,
    );
    this.flowDown(12 + FLOW_GAP);
  }

  tableTotalRow(label: string, value: string) {
    const h = 20;
    this.ensureSpace(h + FLOW_GAP);
    this.rect(MARGIN_X, this.y - h, CONTENT_WIDTH, h, COLORS.accentSoft);
    this.strokeRect(MARGIN_X, this.y - h, CONTENT_WIDTH, h, COLORS.accent);
    this.text(label.toUpperCase(), MARGIN_X + 10, this.y - 13, 7, COLORS.accent);
    this.textRight(value, MARGIN_X + CONTENT_WIDTH - 10, this.y - 13, 9, COLORS.headerText);
    this.flowDown(h + FLOW_GAP);
  }

  private productiveDiscountSummaryRow(label: string, value: string) {
    const h = 14;
    this.ensureSpace(h + FLOW_GAP);
    this.text(label, MARGIN_X + 10, this.y - 10, 6.5, COLORS.muted);
    this.textRight(value, MARGIN_X + CONTENT_WIDTH - 10, this.y - 10, 7.5, COLORS.headerText);
    this.flowDown(h + FLOW_GAP);
  }

  /** Chiusura prospetto voci: esclusioni OS, subtotale lordo+MG, ribasso globale, totale netto. */
  productiveDiscountFooter(
    baseLines: readonly PdfSalLine[],
    summary: PdfSalSummary,
    totalNet: number,
  ) {
    const excluded = baseLines.filter(isVoiceExcludedFromDiscount);
    if (excluded.length > 0) {
      const excludedNet = excluded.reduce((sum, line) => sum + line.totalAmount, 0);
      this.mutedLine(
        `Esclusi dal ribasso (oneri sicurezza / OS): ${excluded.length} ${
          excluded.length === 1 ? "voce" : "voci"
        } · netto ${formatEuro(excludedNet)}`,
      );
      this.gap(2);
    }

    const discountTotal = summary.discountAmount;
    if (discountTotal > 0) {
      const subtotalLordoMg = baseLines.reduce((sum, line) => sum + line.netAmount, 0);
      const imponibileRibasso = baseLines.reduce((sum, line) => sum + line.discountableAmount, 0);
      this.productiveDiscountSummaryRow("Subtotale (lordo + MG)", formatEuro(subtotalLordoMg));
      this.productiveDiscountSummaryRow("Imponibile ribasso", formatEuro(imponibileRibasso));
      this.productiveDiscountSummaryRow("Ribasso applicato", `− ${formatEuro(discountTotal)}`);
      this.gap(2);
    }

    this.tableTotalRow("Totale netto voci produttive", formatEuro(totalNet));
  }

  /** Voci produttive con sottorighe ↳ per ogni maggiorazione sulla voce. */
  productiveVoicesTable(baseLines: readonly PdfSalLine[], mgById: ReadonlyMap<string, PdfSalLine>) {
    const columns = salProductiveTableColumns(mgById);
    const entries = flattenProductiveTableEntries(baseLines);
    this.assertTableColumnsWidth(columns);
    this.ensureSpace(TABLE_HEADER_H + TABLE_MIN_ROW_H + FLOW_GAP);
    this.drawTableHeader(columns);

    if (entries.length === 0) {
      this.ensureSpace(TABLE_MIN_ROW_H);
      this.text(
        "Nessun dato disponibile",
        MARGIN_X + TABLE_CELL_PAD_X,
        this.y - 12,
        8,
        COLORS.muted,
      );
      this.flowDown(TABLE_MIN_ROW_H + FLOW_GAP);
      return;
    }

    let mainVoiceIndex = 0;
    entries.forEach((entry, rowIndex) => {
      const rowHeight = this.rowHeightFor(entry, columns, rowIndex) + 2;
      if (this.y - rowHeight < CONTENT_BOTTOM_Y) {
        this.addPage();
        this.drawTableHeader(columns);
      }
      this.ensureSpace(rowHeight + FLOW_GAP);
      const rowTop = this.y - rowHeight;
      const isMain = entry.kind === "main";
      const isSub = entry.kind === "charge";
      const isVoiceTotal = entry.kind === "voiceTotal";
      const emphasizeImporto =
        (entry.kind === "main" && !lineHasMgCharges(entry.line)) || entry.kind === "voiceTotal";

      if (isMain && mainVoiceIndex % 2 === 1) {
        this.rect(MARGIN_X, rowTop, CONTENT_WIDTH, rowHeight, COLORS.rowAlt);
      }
      if (isSub) {
        this.rect(MARGIN_X, rowTop, CONTENT_WIDTH, rowHeight, COLORS.panel);
      }

      this.line(MARGIN_X, rowTop, PAGE_WIDTH - MARGIN_X, rowTop, COLORS.border);
      this.drawTableColumnDividers(columns, this.y, rowTop);

      const firstBaseline = this.tableCellFirstBaseline();
      let columnX = MARGIN_X;
      columns.forEach((column) => {
        const value = column.render(entry, rowIndex);
        let textColor = column.mono ? COLORS.accent : COLORS.text;
        if (isSub) {
          textColor = column.mono ? COLORS.accent : COLORS.muted;
        }
        if (isVoiceTotal && column.title === "Voce") {
          textColor = COLORS.muted;
        } else if (isVoiceTotal || emphasizeImporto) {
          textColor = COLORS.accent;
        }
        if (entry.kind === "main" && isVoiceExcludedFromDiscount(entry.line)) {
          textColor = COLORS.muted;
        }
        const fontSize =
          emphasizeImporto && column.title === "Importo" ? TABLE_FONT + 1.5 : TABLE_FONT;
        const lineCount = this.columnLineCount(column, entry, rowIndex);
        const innerW = this.columnInnerWidth(column);
        const rightEdge = columnX + column.width - TABLE_CELL_PAD_X;
        if (column.singleLine) {
          if (column.align === "right") {
            if (emphasizeImporto && column.title === "Importo") {
              this.drawEmphasizedAmountRight(value, rightEdge, firstBaseline, fontSize);
            } else if (isVoiceTotal) {
              const textWidth = estimateTextWidth(value, fontSize);
              const drawX = Math.max(columnX + TABLE_CELL_PAD_X, rightEdge - textWidth);
              this.text(value, drawX, firstBaseline, fontSize, textColor);
            } else {
              this.textRight(value, rightEdge, firstBaseline, fontSize, textColor, innerW);
            }
          } else if (isVoiceTotal) {
            this.text(value, columnX + TABLE_CELL_PAD_X, firstBaseline, TABLE_FONT, textColor);
          } else {
            const fitted = fitText(value, innerW, fontSize);
            this.text(fitted, columnX + TABLE_CELL_PAD_X, firstBaseline, fontSize, textColor);
          }
        } else if (column.align === "right") {
          this.wrappedTextRight(
            value,
            rightEdge,
            firstBaseline,
            innerW,
            fontSize,
            textColor,
            lineCount,
          );
        } else {
          this.wrappedText(
            value,
            columnX + TABLE_CELL_PAD_X,
            firstBaseline,
            innerW,
            fontSize,
            textColor,
            lineCount,
          );
        }
        columnX += column.width;
      });

      this.flowDown(rowHeight);

      if (isMain) {
        mainVoiceIndex += 1;
      }
    });

    this.line(MARGIN_X, this.y - 1, PAGE_WIDTH - MARGIN_X, this.y - 1, COLORS.borderStrong);
    this.flowDown(8);
  }

  /** Full wrap line count (no truncation). */
  private countWrappedLines(value: string, maxWidth: number, size: number): number {
    const lines = wrapText(value, maxWidth, size);
    return Math.max(1, lines.length);
  }

  private columnInnerWidth(column: { width: number }): number {
    return Math.max(24, column.width - TABLE_CELL_PAD_X * 2);
  }

  private columnLineCount<T>(
    column: TableColumn<T>,
    row: T,
    rowIndex: number,
    fontSize = TABLE_FONT,
  ): number {
    if (column.singleLine) return 1;
    return this.countWrappedLines(
      column.render(row, rowIndex),
      this.columnInnerWidth(column),
      fontSize,
    );
  }

  /** First text baseline: top-aligned inside the row (same for every column). */
  private tableCellFirstBaseline(): number {
    return this.y - TABLE_ROW_PAD_Y - TABLE_FONT;
  }

  private rowHeightFor<T>(row: T, columns: Array<TableColumn<T>>, rowIndex: number): number {
    let maxLines = 1;
    for (const col of columns) {
      maxLines = Math.max(maxLines, this.columnLineCount(col, row, rowIndex));
    }
    return Math.max(TABLE_MIN_ROW_H, TABLE_ROW_PAD_Y * 2 + maxLines * TABLE_LINE_STEP);
  }

  private drawTableColumnDividers<T>(
    columns: Array<TableColumn<T>>,
    yTop: number,
    yBottom: number,
  ) {
    let x = MARGIN_X;
    for (let i = 0; i < columns.length - 1; i++) {
      const col = columns[i];
      if (!col) continue;
      x += col.width;
      this.line(x, yBottom, x, yTop, COLORS.border);
    }
  }

  cards(items: Array<[string, string]>) {
    const gap = 8;
    const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
    const cardHeight = 47;

    for (let index = 0; index < items.length; index += 3) {
      this.ensureSpace(cardHeight + FLOW_GAP);
      const row = items.slice(index, index + 3);
      row.forEach(([label, value], cardIndex) => {
        const x = MARGIN_X + cardIndex * (cardWidth + gap);
        this.rect(x, this.y - cardHeight, cardWidth, cardHeight, COLORS.accentSoft);
        this.strokeRect(x, this.y - cardHeight, cardWidth, cardHeight, COLORS.border);
        this.text(label.toUpperCase(), x + 10, this.y - 15, 7, COLORS.muted);
        this.text(value, x + 10, this.y - 33, 12, COLORS.headerText);
      });
      this.flowDown(cardHeight + FLOW_GAP);
    }
  }

  metaRow(items: Array<[string, string]>) {
    const rowHeight = 30;
    const colWidth = CONTENT_WIDTH / 2;

    for (let index = 0; index < items.length; index += 2) {
      this.ensureSpace(rowHeight + FLOW_GAP);
      const row = items.slice(index, index + 2);
      row.forEach(([label, value], colIndex) => {
        const x = MARGIN_X + colIndex * colWidth;
        this.text(label.toUpperCase(), x, this.y - 10, 7, COLORS.muted);
        this.wrappedText(value || "-", x, this.y - 24, colWidth - 14, 9, COLORS.text, 1);
      });
      this.flowDown(rowHeight + FLOW_GAP);
    }
  }

  note(text: string) {
    this.labeledNote("Note", text);
  }

  labeledNote(label: string, text: string) {
    this.librettoStackBox({
      panel: "warning",
      rows: [{ kind: "field", label, value: text.trim() }],
      width: CONTENT_WIDTH,
      x: MARGIN_X,
    });
  }

  voiceSubtotal(quantity: number, unit: string, totalAmount: number, unitPrice: number) {
    const height = 16;
    this.ensureSpace(height + FLOW_GAP);
    this.rect(MARGIN_X, this.y - height, CONTENT_WIDTH, height, COLORS.accentSoft);
    this.strokeRect(MARGIN_X, this.y - height, CONTENT_WIDTH, height, COLORS.accent);
    this.text("TOTALE VOCE", MARGIN_X + 8, this.y - 11, 6.5, COLORS.accent);
    this.textRight(
      `P.U. ${formatEuro(unitPrice)}  ·  Q.tà ${formatNumber(quantity)} ${unit}  ·  ${formatEuro(totalAmount)}`,
      MARGIN_X + CONTENT_WIDTH - 8,
      this.y - 11,
      7,
      COLORS.headerText,
      CONTENT_WIDTH * 0.72,
    );
    this.flowDown(height + FLOW_GAP);
  }

  private librettoStackBoxContentHeight(
    rows: LibrettoRow[],
    innerX: number,
    innerW: number,
  ): number {
    let contentH = LIBRETTO_PAD * 2;
    for (const row of rows) {
      contentH += this.librettoRowHeight(row, innerX, innerW);
    }
    return contentH + 4;
  }

  /** Start a new page when the voice block would not fit (avoid orphan header at page bottom). */
  private ensureVoiceChapterFits(line: PdfSalLine, voiceIndex: number) {
    const accentInset = LIBRETTO_ACCENT_BAR_W + LIBRETTO_ACCENT_TEXT_GAP;
    const innerX = MARGIN_X + LIBRETTO_PAD + accentInset;
    const innerW = CONTENT_WIDTH - LIBRETTO_PAD * 2 - accentInset;
    const desc = line.voice.description.trim() || "—";
    const headerRows: LibrettoRow[] = [
      { kind: "title", text: `${voiceIndex}. ${line.voice.code}` },
      { kind: "field", label: "Descrizione voce", value: desc },
      {
        kind: "metrics",
        section: "Dati economici voce",
        items: [
          { label: "Unità", value: line.voice.unit || "—" },
          { label: "Prezzo unit.", value: formatEuro(line.voice.unitPrice) },
          { label: "Q.tà totale", value: formatNumber(line.quantity) },
          { label: "Importo", value: formatEuro(line.totalAmount) },
        ],
      },
    ];
    let reserve = this.librettoStackBoxContentHeight(headerRows, innerX, innerW) + FLOW_GAP;
    reserve += 16 + FLOW_GAP * 2;
    if (line.notes.trim()) {
      reserve +=
        this.librettoStackBoxContentHeight(
          [{ kind: "field", label: "Note voce", value: line.notes.trim() }],
          MARGIN_X + LIBRETTO_PAD,
          CONTENT_WIDTH - LIBRETTO_PAD * 2,
        ) + FLOW_GAP;
    }
    if (line.measurementRows.length > 0) {
      const cardX = MARGIN_X + LIBRETTO_CARD_INSET;
      const cardInnerX = cardX + LIBRETTO_PAD;
      const cardInnerW = CONTENT_WIDTH - LIBRETTO_CARD_INSET * 2 - LIBRETTO_PAD * 2;
      const first = line.measurementRows[0];
      if (first) {
        const miniRows: LibrettoRow[] = [
          { kind: "title", text: `Sottoriga 1 · ${formatDate(first.date)}` },
          { kind: "field", label: "Descrizione", value: first.description.trim() || "—" },
          {
            kind: "metrics",
            section: "Fattori e quantità",
            items: [
              { label: "Fattore 1", value: formatNumber(first.factor1) },
              { label: "Fattore 2", value: formatNumber(first.factor2) },
              { label: "Fattore 3", value: formatNumber(first.factor3) },
              {
                label: "Qtà parziale",
                value: `${formatNumber(first.partialQuantity)} ${first.unit}`,
              },
            ],
          },
        ];
        if (first.notes.trim()) {
          miniRows.push({ kind: "field", label: "Note sottoriga", value: first.notes.trim() });
        }
        reserve += this.librettoStackBoxContentHeight(miniRows, cardInnerX, cardInnerW) + FLOW_GAP;
      }
    }
    if (this.y - reserve < CONTENT_BOTTOM_Y) {
      this.addPage();
    }
  }

  /** Libretto misure — one voice chapter (header + measurement cards + notes + total). */
  measurementBookVoice(line: PdfSalLine, voiceIndex: number) {
    this.ensureVoiceChapterFits(line, voiceIndex);
    this.measurementBookVoiceHeader(line, voiceIndex);

    if (line.measurementRows.length === 0) {
      this.mutedLine("Nessuna sottoriga di misura registrata.");
    } else {
      for (const [rowIndex, row] of line.measurementRows.entries()) {
        this.measurementRowCard(row, rowIndex);
      }
    }

    if (line.notes.trim()) {
      this.labeledNote("Note voce", line.notes);
    }

    this.voiceSubtotal(line.quantity, line.voice.unit, line.totalAmount, line.voice.unitPrice);
    this.gap(2);
  }

  /** Max text width from x to the right margin (descrizione and other fields). */
  private librettoEffectiveWidth(x: number, width: number): number {
    const pageBand = PAGE_RIGHT_X - x - 8;
    return Math.max(32, Math.min(width, pageBand) * WRAP_WIDTH_SAFETY);
  }

  private librettoMetricsHeight(row: Extract<LibrettoRow, { kind: "metrics" }>): number {
    const section = row.section ? LIBRETTO_LABEL + 3 : 0;
    return section + LIBRETTO_LABEL + 3 + LIBRETTO_BODY + 6 + LIBRETTO_GAP;
  }

  private librettoRowHeight(row: LibrettoRow, innerX: number, innerW: number): number {
    if (row.kind === "title") {
      return this.librettoTextHeight(row.text, innerX, innerW, 8) + LIBRETTO_GAP;
    }
    if (row.kind === "field") {
      return this.librettoFieldHeight(row.value, innerX, innerW);
    }
    if (row.kind === "metrics") {
      return this.librettoMetricsHeight(row);
    }
    return this.librettoTextHeight(row.value, innerX, innerW) + LIBRETTO_GAP;
  }

  private librettoDrawMetrics(
    x: number,
    yTop: number,
    width: number,
    items: LibrettoMetricItem[],
    section?: string,
  ): number {
    const cols = Math.max(1, items.length);
    const colW = width / cols;
    const stripH = LIBRETTO_LABEL + 3 + LIBRETTO_BODY + 5;
    let y = yTop;

    if (section) {
      y -= LIBRETTO_LABEL + 1;
      this.safeText(section.toUpperCase(), x, y, LIBRETTO_LABEL, COLORS.muted, width);
      y -= 3;
    }

    const stripBottom = y - stripH;
    this.rect(x, stripBottom, width, stripH, COLORS.rowAlt);
    this.strokeRect(x, stripBottom, width, stripH, COLORS.border);

    const labelY = y - 8;
    const valueY = labelY - LIBRETTO_LABEL - 4;
    items.forEach((item, index) => {
      const cx = x + index * colW + 5;
      const cellW = colW - 10;
      this.safeText(item.label.toUpperCase(), cx, labelY, LIBRETTO_LABEL, COLORS.muted, cellW);
      this.safeText(item.value, cx, valueY, LIBRETTO_BODY + 0.5, COLORS.accent, cellW);
      if (index > 0) {
        const dividerX = x + index * colW;
        this.line(dividerX, stripBottom, dividerX, stripBottom + stripH, COLORS.border);
      }
    });

    return stripBottom - LIBRETTO_GAP;
  }

  private librettoTextHeight(text: string, x: number, width: number, size = LIBRETTO_BODY): number {
    const safeW = this.librettoEffectiveWidth(x, width);
    return Math.max(1, wrapText(text, safeW, size).length) * (size + LIBRETTO_LINE_LEAD);
  }

  private librettoFieldHeight(value: string, x: number, width: number): number {
    return LIBRETTO_LABEL + 1 + 1 + this.librettoTextHeight(value, x, width) + LIBRETTO_GAP;
  }

  /** Draw wrapped lines downward from yTop; returns new cursor Y (lower on page). */
  private librettoDrawLines(
    x: number,
    yTop: number,
    width: number,
    text: string,
    size: number,
    color: Color,
  ): number {
    const safeW = this.librettoEffectiveWidth(x, width);
    let y = yTop;
    for (const line of wrapText(text, safeW, size)) {
      y -= size + LIBRETTO_LINE_LEAD;
      this.safeText(line, x, y, size, color, safeW);
    }
    return y;
  }

  private librettoDrawField(
    x: number,
    yTop: number,
    width: number,
    label: string,
    value: string,
    valueColor: Color = COLORS.text,
  ): number {
    const band = this.librettoEffectiveWidth(x, width);
    let y = yTop - LIBRETTO_LABEL - 1;
    this.safeText(label.toUpperCase(), x, y, LIBRETTO_LABEL, COLORS.muted, band);
    y -= 1;
    y = this.librettoDrawLines(x, y, width, value || "—", LIBRETTO_BODY, valueColor);
    return y - LIBRETTO_GAP;
  }

  /** Hard-clamp a single line inside the page band (no horizontal bleed). */
  private safeText(
    value: string,
    x: number,
    y: number,
    size: number,
    color: Color,
    maxWidth?: number,
  ) {
    const band = Math.max(24, Math.min(maxWidth ?? PAGE_RIGHT_X - x - 8, PAGE_RIGHT_X - x - 8));
    let display = normalizePdfText(value);
    while (display.length > 0 && estimateTextWidth(display, size) > band) {
      display = display.slice(0, -1);
    }
    const textWidth = estimateTextWidth(display, size);
    const drawX = Math.max(MARGIN_X + 2, Math.min(x, PAGE_RIGHT_X - textWidth - 2));
    this.text(display, drawX, y, size, color);
  }

  private librettoStackBox(opts: {
    x: number;
    width: number;
    accentBar?: boolean;
    panel?: "default" | "warning";
    rows: LibrettoRow[];
  }) {
    const accentTextInset = opts.accentBar ? LIBRETTO_ACCENT_BAR_W + LIBRETTO_ACCENT_TEXT_GAP : 0;
    const innerX = opts.x + LIBRETTO_PAD + accentTextInset;
    const innerW = opts.width - LIBRETTO_PAD * 2 - accentTextInset;
    const rowGroups = this.librettoSplitRowsAcrossPages(opts.rows, innerX, innerW);

    for (const group of rowGroups) {
      this.librettoDrawStackBoxGroup({ ...opts, innerX, innerW, rows: group });
    }
  }

  /** Like block flow in HTML: break before the box if it does not fit the current page. */
  private librettoSplitRowsAcrossPages(rows: LibrettoRow[], innerX: number, innerW: number) {
    type Row = LibrettoRow;
    const groups: Row[][] = [];
    let batch: Row[] = [];
    let batchH = LIBRETTO_PAD * 2;

    const flush = () => {
      if (batch.length > 0) {
        groups.push(batch);
        batch = [];
        batchH = LIBRETTO_PAD * 2;
      }
    };

    for (const row of rows) {
      const rowH = this.librettoRowHeight(row, innerX, innerW);
      const needed = batchH + rowH;
      if (this.y - needed < CONTENT_BOTTOM_Y) {
        if (batch.length > 0) {
          flush();
        } else {
          this.addPage();
        }
      }
      batch.push(row);
      batchH += rowH;
    }
    flush();
    return groups;
  }

  private librettoDrawStackBoxGroup(opts: {
    x: number;
    width: number;
    innerX: number;
    innerW: number;
    accentBar?: boolean;
    panel?: "default" | "warning";
    rows: LibrettoRow[];
  }) {
    const fill = opts.panel === "warning" ? COLORS.warning : COLORS.panel;
    const stroke = opts.panel === "warning" ? COLORS.warningBorder : COLORS.border;

    let contentH = LIBRETTO_PAD * 2;
    for (const row of opts.rows) {
      contentH += this.librettoRowHeight(row, opts.innerX, opts.innerW);
    }
    contentH += 4;

    this.ensureSpace(contentH + FLOW_GAP);
    const boxTop = this.y;
    const boxBottom = boxTop - contentH;

    if (opts.accentBar) {
      this.rect(opts.x, boxBottom, opts.width, contentH, COLORS.accentSoft);
      this.rect(opts.x, boxBottom, LIBRETTO_ACCENT_BAR_W, contentH, COLORS.accent);
    } else {
      this.rect(opts.x, boxBottom, opts.width, contentH, fill);
    }
    this.strokeRect(opts.x, boxBottom, opts.width, contentH, stroke);

    let y = boxTop - LIBRETTO_PAD;
    for (const row of opts.rows) {
      if (row.kind === "title") {
        y = this.librettoDrawLines(opts.innerX, y, opts.innerW, row.text, 8, COLORS.accent);
        y -= LIBRETTO_GAP;
      } else if (row.kind === "field") {
        y = this.librettoDrawField(
          opts.innerX,
          y,
          opts.innerW,
          row.label,
          row.value,
          row.valueColor ?? COLORS.text,
        );
      } else if (row.kind === "metrics") {
        y = this.librettoDrawMetrics(opts.innerX, y, opts.innerW, row.items, row.section);
      } else {
        y = this.librettoDrawLines(
          opts.innerX,
          y,
          opts.innerW,
          row.value,
          LIBRETTO_BODY,
          row.valueColor ?? COLORS.text,
        );
        y -= LIBRETTO_GAP;
      }
    }

    this.y = boxBottom - FLOW_GAP;
  }

  private measurementBookVoiceHeader(line: PdfSalLine, voiceIndex: number) {
    const desc = line.voice.description.trim() || "—";

    this.librettoStackBox({
      accentBar: true,
      rows: [
        { kind: "title", text: `${voiceIndex}. ${line.voice.code}` },
        { kind: "field", label: "Descrizione voce", value: desc },
        {
          kind: "metrics",
          section: "Dati economici voce",
          items: [
            { label: "Unità", value: line.voice.unit || "—" },
            { label: "Prezzo unit.", value: formatEuro(line.voice.unitPrice) },
            { label: "Q.tà totale", value: formatNumber(line.quantity) },
            { label: "Importo", value: formatEuro(line.totalAmount) },
          ],
        },
      ],
      width: CONTENT_WIDTH,
      x: MARGIN_X,
    });
  }

  private measurementRowCard(row: PdfSalMeasurementRow, rowIndex: number) {
    const cardX = MARGIN_X + LIBRETTO_CARD_INSET;
    const cardW = CONTENT_WIDTH - LIBRETTO_CARD_INSET * 2;

    const header = [
      `Sottoriga ${rowIndex + 1}`,
      formatDate(row.date),
      row.station ? `Staz. ${row.station}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const description = row.description.trim() || "—";
    const notes = row.notes.trim();

    const rows: LibrettoRow[] = [
      { kind: "title", text: header },
      { kind: "field", label: "Descrizione", value: description },
      {
        kind: "metrics",
        section: "Fattori e quantità",
        items: [
          { label: "Fattore 1", value: formatNumber(row.factor1) },
          { label: "Fattore 2", value: formatNumber(row.factor2) },
          { label: "Fattore 3", value: formatNumber(row.factor3) },
          {
            label: "Qtà parziale",
            value: `${formatNumber(row.partialQuantity)} ${row.unit}`,
          },
        ],
      },
    ];

    if (notes) {
      rows.push({ kind: "field", label: "Note sottoriga", value: notes });
    }

    this.librettoStackBox({ rows, width: cardW, x: cardX });
  }

  section(title: string, _subtitle?: string) {
    const titleH = 22;
    this.ensureSpace(titleH + FLOW_GAP);
    this.rect(MARGIN_X, this.y - titleH + 3, 3, titleH - 6, COLORS.accent);
    this.text(title.toUpperCase(), MARGIN_X + 10, this.y - 14, 9.5, COLORS.accent);
    this.line(MARGIN_X, this.y - titleH, PAGE_WIDTH - MARGIN_X, this.y - titleH, COLORS.border);
    this.flowDown(titleH + FLOW_GAP);
  }

  private drawTableHeader<T>(columns: Array<TableColumn<T>>) {
    const headerTop = this.y;
    this.rect(MARGIN_X, this.y - TABLE_HEADER_H, CONTENT_WIDTH, TABLE_HEADER_H, COLORS.accentMid);

    let headerX = MARGIN_X;
    columns.forEach((column) => {
      const innerW = this.columnInnerWidth(column);
      const title = column.title.toUpperCase();
      if (column.align === "right") {
        this.textRight(
          title,
          headerX + column.width - TABLE_CELL_PAD_X,
          this.y - 11,
          6.5,
          COLORS.white,
          innerW,
        );
      } else {
        this.text(title, headerX + TABLE_CELL_PAD_X, this.y - 11, 6.5, COLORS.white);
      }
      headerX += column.width;
    });
    this.drawTableColumnDividers(columns, headerTop, this.y - TABLE_HEADER_H);
    this.y -= TABLE_HEADER_H;
  }

  table<T>(rows: readonly T[], columns: Array<TableColumn<T>>) {
    this.assertTableColumnsWidth(columns);
    this.ensureSpace(TABLE_HEADER_H + TABLE_MIN_ROW_H + FLOW_GAP);
    this.drawTableHeader(columns);

    if (rows.length === 0) {
      this.ensureSpace(TABLE_MIN_ROW_H);
      this.text(
        "Nessun dato disponibile",
        MARGIN_X + TABLE_CELL_PAD_X,
        this.y - 12,
        8,
        COLORS.muted,
      );
      this.flowDown(TABLE_MIN_ROW_H + FLOW_GAP);
      return;
    }

    rows.forEach((row, rowIndex) => {
      const rowHeight = this.rowHeightFor(row, columns, rowIndex) + 2;
      if (this.y - rowHeight < CONTENT_BOTTOM_Y) {
        this.addPage();
        this.drawTableHeader(columns);
      }
      this.ensureSpace(rowHeight + FLOW_GAP);
      const rowTop = this.y - rowHeight;
      const rowBottom = rowTop;

      if (rowIndex % 2 === 1) {
        this.rect(MARGIN_X, rowTop, CONTENT_WIDTH, rowHeight, COLORS.rowAlt);
      }
      this.line(MARGIN_X, rowTop, PAGE_WIDTH - MARGIN_X, rowTop, COLORS.border);
      this.drawTableColumnDividers(columns, this.y, rowBottom);

      const firstBaseline = this.tableCellFirstBaseline();
      let columnX = MARGIN_X;
      columns.forEach((column) => {
        const value = column.render(row, rowIndex);
        const textColor = column.mono ? COLORS.accent : COLORS.text;
        const lineCount = this.columnLineCount(column, row, rowIndex);
        const innerW = this.columnInnerWidth(column);
        const rightEdge = columnX + column.width - TABLE_CELL_PAD_X;
        if (column.singleLine) {
          if (column.align === "right") {
            this.textRight(value, rightEdge, firstBaseline, TABLE_FONT, textColor, innerW);
          } else {
            const fitted = fitText(value, innerW, TABLE_FONT);
            this.text(fitted, columnX + TABLE_CELL_PAD_X, firstBaseline, TABLE_FONT, textColor);
          }
        } else if (column.align === "right") {
          this.wrappedTextRight(
            value,
            rightEdge,
            firstBaseline,
            innerW,
            TABLE_FONT,
            textColor,
            lineCount,
          );
        } else {
          this.wrappedText(
            value,
            columnX + TABLE_CELL_PAD_X,
            firstBaseline,
            innerW,
            TABLE_FONT,
            textColor,
            lineCount,
          );
        }
        columnX += column.width;
      });
      this.flowDown(rowHeight);
    });

    this.line(MARGIN_X, this.y - 1, PAGE_WIDTH - MARGIN_X, this.y - 1, COLORS.borderStrong);
    this.flowDown(8);
  }

  private assertTableColumnsWidth<T>(columns: Array<TableColumn<T>>) {
    const total = columns.reduce((sum, col) => sum + col.width, 0);
    if (total !== CONTENT_WIDTH) {
      throw new Error(`PDF table columns width ${total} must equal CONTENT_WIDTH ${CONTENT_WIDTH}`);
    }
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
    this.rect(0, PAGE_HEIGHT - PAGE_HEADER_H, PAGE_WIDTH, PAGE_HEADER_H, COLORS.accent);
    this.text("QUANTARA", MARGIN_X, PAGE_HEIGHT - 16, 6.5, COLORS.white);
    this.text(this.title, MARGIN_X, PAGE_HEIGHT - 30, 12, COLORS.white);
    this.textRight(this.documentName, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 18, 8, COLORS.white);
    this.headerLines.slice(0, 2).forEach((line, index) => {
      this.textRight(line, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 30 - index * 10, 7, [
        0.88, 0.92, 0.98,
      ] as Color);
    });
    this.line(MARGIN_X, BOTTOM_Y + 14, PAGE_WIDTH - MARGIN_X, BOTTOM_Y + 14, COLORS.border);
    this.text(`Pag. ${this.pageNumber}`, MARGIN_X, BOTTOM_Y + 4, 7, COLORS.muted);
    this.textRight("Quantara", PAGE_WIDTH - MARGIN_X, BOTTOM_Y + 4, 7, COLORS.muted);
    this.y = PAGE_HEIGHT - MARGIN_TOP_CONTENT;
  }

  private currentPage() {
    return this.pages[this.pages.length - 1] ?? [];
  }

  private ensureSpace(height: number) {
    if (height <= 0) return;
    if (this.y - height < CONTENT_BOTTOM_Y) {
      this.addPage();
    }
  }

  /** Move cursor down after reserving vertical space (pagination-safe). */
  private flowDown(height: number) {
    this.ensureSpace(height);
    this.y -= height;
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

  /** Importo finale in evidenza (Helvetica senza bold nativo: doppio traccia + tono scuro). */
  private drawEmphasizedAmountRight(value: string, rightX: number, y: number, size: number) {
    const textWidth = estimateTextWidth(value, size);
    const drawX = Math.max(MARGIN_X, rightX - textWidth);
    const x = Math.min(drawX, PAGE_RIGHT_X - textWidth);
    this.text(value, x, y, size, COLORS.headerText);
    this.text(value, x + 0.35, y, size, COLORS.headerText);
  }

  private textRight(
    value: string,
    rightX: number,
    y: number,
    size: number,
    color: Color,
    maxWidth?: number,
  ) {
    const width = maxWidth ?? Math.max(24, rightX - MARGIN_X);
    const fitted = fitText(value, width, size);
    const textWidth = estimateTextWidth(fitted, size);
    const drawX = Math.max(MARGIN_X, rightX - textWidth);
    this.text(fitted, Math.min(drawX, PAGE_RIGHT_X - textWidth), y, size, color);
  }

  private wrappedTextRight(
    value: string,
    rightX: number,
    y: number,
    maxWidth: number,
    size: number,
    color: Color,
    maxLines: number,
  ) {
    const lines = wrapText(value, maxWidth, size).slice(0, maxLines);
    const lineStep = size + 2;
    lines.forEach((line, index) => {
      this.textRight(line, rightX, y - index * lineStep, size, color, maxWidth);
    });
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
    const wrapped = wrapText(value, maxWidth, size);
    const lines = maxLines > 0 ? wrapped.slice(0, maxLines) : wrapped;
    const lineStep = size + 2;
    let lineIndex = 0;
    for (const line of lines) {
      this.text(line, x, y - lineIndex * lineStep, size, color);
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

function splitLongWord(word: string, maxWidth: number, size: number): string[] {
  if (estimateTextWidth(word, size) <= maxWidth) return [word];
  const chunks: string[] = [];
  let part = "";
  for (const char of word) {
    const candidate = part + char;
    if (estimateTextWidth(candidate, size) > maxWidth && part) {
      chunks.push(part);
      part = char;
    } else {
      part = candidate;
    }
  }
  if (part) chunks.push(part);
  return chunks.length > 0 ? chunks : [word];
}

function wrapText(value: string, maxWidth: number, size: number): string[] {
  const normalized = normalizePdfText(value).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  maxWidth = Math.max(32, maxWidth);
  const words = normalized.split(" ");
  const result: string[] = [];
  let current = "";

  for (const word of words) {
    const pieces = splitLongWord(word, maxWidth, size);
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;
      if (estimateTextWidth(next, size) > maxWidth && current) {
        result.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }

  if (current) result.push(current);

  const safeLines: string[] = [];
  for (const line of result) {
    if (estimateTextWidth(line, size) <= maxWidth) {
      safeLines.push(line);
      continue;
    }
    let part = "";
    for (const char of line) {
      const next = part + char;
      if (estimateTextWidth(next, size) > maxWidth && part) {
        safeLines.push(part);
        part = char;
      } else {
        part = next;
      }
    }
    if (part) safeLines.push(part);
  }
  return safeLines;
}

function estimateTextWidth(value: string, size: number): number {
  return normalizePdfText(value).length * size * TEXT_WIDTH_EM;
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
