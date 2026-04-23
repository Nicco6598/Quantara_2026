export type ExcelImportStage = "queued" | "parsed" | "validated" | "committed";

export type ExcelImportPlan = {
  sourceName: string;
  stage: ExcelImportStage;
  rowCount: number;
};
