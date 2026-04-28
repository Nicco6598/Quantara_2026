import type { DesktopContract, DesktopTariffVoice } from "@/lib/desktopData";

export type { DesktopContract, DesktopTariffVoice };

export type TariffMetrics = {
  activeCount: number;
  sourceCount: number;
  tariffCount: number;
  years: number[];
};

export type EditTariffBookForm = {
  name: string;
  sourceName: string;
  status: string;
  year: string;
};

export type ImportValidation = {
  duplicateCount: number;
  duplicateExamples: string[];
  duplicateRows: Array<{ field: "officialCode"; index: number; label: string }>;
  invalidCount: number;
  invalidExamples: string[];
  invalidRows: Array<{ field: keyof DesktopTariffVoice; index: number; label: string }>;
  validCount: number;
  warningCount: number;
};
