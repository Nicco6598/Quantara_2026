import { parseEuroAmount } from "@quantara/domain-utils";
import type { DesktopContract, DesktopTariffBook, DesktopTariffVoice } from "@/lib/desktopData";

export const fallbackTariffBook: DesktopTariffBook = {
  id: "tariff_lombardia_2025",
  name: "Tariffario Lombardia 2025",
  sourceName: "Regione Lombardia",
  status: "validated",
  year: 2025,
};

export const fallbackTariffBooks: DesktopTariffBook[] = [fallbackTariffBook];

export const fallbackContracts: DesktopContract[] = [
  {
    applicationContractCode: "CA-MV-001",
    contractualAmount: { amount: 26_150_000, currency: "EUR" },
    frameworkAgreementCode: "AQ-RFI-2026",
    id: "contract_demo_milano_verona",
    tenderDiscountPercent: 18.25,
    tariffPriorities: [
      {
        priority: 1,
        reason: "Tariffario contrattuale",
        tariffBookId: fallbackTariffBook.id,
      },
    ],
    title: "Linea AV/AC Milano-Verona",
  },
];

const tariffRows = [
  {
    category: "01 - Opere di scavo",
    code: "01.A01.A10.005",
    delta: "+4,2%",
    description: "Scavo di sbancamento in trincea",
    price: "€ 18,50",
    unit: "m3",
  },
  {
    category: "02 - Opere in cls",
    code: "02.B02.B20.025",
    delta: "+7,9%",
    description: "Calcestruzzo strutturale C25/30",
    price: "€ 154,90",
    unit: "m3",
  },
  {
    category: "03 - Armamento",
    code: "03.C01.C10.035",
    delta: "+5,3%",
    description: "Fornitura e posa binario tipo 60E1",
    price: "€ 1.250,00",
    unit: "m",
  },
] as const;

export const fallbackTariffVoices: DesktopTariffVoice[] = tariffRows.map((row) => ({
  category: row.category,
  description: row.description,
  id: `voice_${row.code.replaceAll(".", "_").toLowerCase()}`,
  laborPercentage: null,
  officialCode: row.code,
  tariffBookId: fallbackTariffBook.id,
  unitOfMeasure: row.unit,
  unitPrice: parseEuroAmount(row.price),
}));
