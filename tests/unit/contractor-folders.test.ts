import { eur } from "@quantara/domain-utils";
import { describe, expect, it } from "vitest";
import type { PortfolioProject } from "../../apps/desktop/src/features/projects/types";
import { buildContractorFolders } from "../../apps/desktop/src/features/projects/utils/buildContractorFolders";

function project(overrides: Partial<PortfolioProject> = {}): PortfolioProject {
  return {
    budget: eur(1_000_000),
    contractor: "Senza appaltatore",
    forecastDeltaDays: 0,
    healthLabel: "Da pianificare",
    id: "contract-1",
    location: "AQ-001",
    lot: "CA-001",
    manager: "Da assegnare",
    materialRisk: "Materiali da collegare",
    nextMilestone: "Configurare SAL e tariffari",
    phase: "Contratto locale",
    progress: 0,
    salDays: 14,
    salState: "SAL da creare",
    salValue: eur(0),
    title: "Progetto reale",
    tone: "success",
    variance: "0,0%",
    ...overrides,
  };
}

describe("contractor folders", () => {
  it("does not create visible folders for placeholder contractors", () => {
    const folders = buildContractorFolders([], [project()], [], new Map());

    expect(folders).toEqual([]);
  });

  it("merges project totals into existing registry folders", () => {
    const folders = buildContractorFolders(
      ["Impresa Alfa"],
      [project({ contractor: "Impresa Alfa", salDays: 3, salValue: eur(25_000) })],
      [],
      new Map(),
    );

    expect(folders[0]).toMatchObject({
      budget: 1_000_000,
      contractor: "Impresa Alfa",
      projectCount: 1,
      salExposure: 25_000,
      salWindowCount: 1,
    });
  });

  it("creates a visible folder for SAL-only local records without registry entries", () => {
    const folders = buildContractorFolders(
      [],
      [],
      [{ projectId: "sal-project-1", status: "closed" }],
      new Map([["sal-project-1", { client: "Impresa SAL" }]]),
    );

    expect(folders).toEqual([
      expect.objectContaining({
        contractor: "Impresa SAL",
        projectCount: 0,
        salCount: 1,
      }),
    ]);
  });
});
