import { eur } from "@quantara/domain-utils";
import type { DesktopContract, DesktopTariffVoice } from "@/lib/desktopData";
import type { PortfolioProject } from "../types";
import { normalizeContractorName } from "./projects-helpers";

export function mapContractToProject(
  contract: DesktopContract,
  contractorName?: unknown,
): PortfolioProject {
  const normalizedContractor =
    typeof contractorName === "string" ? normalizeContractorName(contractorName) : "";

  return {
    budget: contract.contractualAmount,
    contractor: normalizedContractor || "Senza appaltatore",
    forecastDeltaDays: 0,
    healthLabel: "Da pianificare",
    id: contract.id,
    location: contract.frameworkAgreementCode,
    lot: contract.applicationContractCode,
    manager: "Da assegnare",
    materialRisk: "Materiali da collegare",
    nextMilestone: "Configurare SAL e tariffari",
    phase: "Contratto locale",
    progress: 0,
    salDays: 14,
    salState: "SAL da creare",
    salValue: eur(0),
    title: contract.title,
    tone: "success",
    variance: "0,0%",
  };
}

export function mapDesktopVoiceToSalVoice(voice: DesktopTariffVoice, projectYear: number) {
  return {
    category: voice.category,
    code: voice.officialCode,
    description: voice.description,
    id: `desktop_${voice.tariffBookId}_${voice.id}`,
    projectYear,
    unit: voice.unitOfMeasure,
    unitPrice: voice.unitPrice,
  };
}
