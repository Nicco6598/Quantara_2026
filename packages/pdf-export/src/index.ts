export type PdfReportKind = "accounting" | "measurement-book" | "summary-situation";

export type PdfExportRequest = {
  kind: PdfReportKind;
  appliedFilters: readonly string[];
  title: string;
};
