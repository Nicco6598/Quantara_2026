import { test, expect } from "@playwright/test";

test.describe("Quantara desktop web shell", () => {
  test("loads the dashboard shell", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Visione unica su cantieri, SAL e presidio operativo.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Linea AV/AC Milano-Verona").first()).toBeVisible();
    await expect(page.getByText("Segnali giornata")).toBeVisible();
    await expect(page.getByText("Registro portfolio")).toBeVisible();
    await expect(page.getByText("Distribuzione stato")).toBeVisible();
    await expect(page.getByText("Feed operativo")).toBeVisible();
  });

  test("opens phase C operational screens", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("complementary");

    await sidebar.getByRole("button", { name: /^Progetti/ }).click();
    await expect(
      page.getByRole("heading", { name: "Portafoglio lavori sotto presidio operativo." }),
    ).toBeVisible();
    await expect(page.getByText("Workbench dei progetti")).toBeVisible();

    await sidebar.getByRole("button", { exact: true, name: "SAL" }).click();
    await expect(
      page.getByRole("heading", { name: "Stati avanzamento lavori sotto presidio operativo." }),
    ).toBeVisible();
    await expect(page.getByText("Panoramica pratica")).toBeVisible();

    await sidebar.getByRole("button", { name: "Tariffari" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Catalogo tariffari per ente, anno e progetto.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Nuovo tariffario")).toBeVisible();
    await expect(page.getByText("Fornitura e posa binario tipo 60E1").first()).toBeVisible();

    await sidebar.getByRole("button", { name: "Materiali" }).click();
    await expect(
      page.getByRole("heading", { name: "Materiali e coperture letti come flusso operativo." }),
    ).toBeVisible();
    await expect(page.getByText("BIN-60E1").first()).toBeVisible();

    await sidebar.getByRole("button", { name: "Contabilita" }).click();
    await expect(page.getByRole("heading", { name: "Pacchetto documentale" })).toBeVisible();
  });
});
