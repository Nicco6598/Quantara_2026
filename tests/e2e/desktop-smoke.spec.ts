import { test, expect } from "@playwright/test";

test.describe("Quantara desktop web shell", () => {
  test("loads the dashboard shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Panoramica generale del progetto")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Linea AV/AC Milano-Verona").first()).toBeVisible();
    await expect(page.getByText("Alert attivi")).toBeVisible();
    await expect(page.getByText("Distribuzione budget")).toBeVisible();
    await expect(page.getByText("Mappa cantiere")).toBeVisible();
    await expect(page.getByText("Timeline di progetto")).toBeVisible();
  });

  test("opens phase C operational screens", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Progetti" }).click();
    await expect(page.getByText("Centro di Controllo Progetti")).toBeVisible();
    await expect(page.getByText("Progetti che richiedono attenzione")).toBeVisible();

    await page.getByRole("button", { exact: true, name: "SAL" }).click();
    await expect(page.getByRole("heading", { name: "Stati Avanzamento Lavori" })).toBeVisible();
    await expect(page.getByText("Panoramica SAL")).toBeVisible();

    await page.getByRole("button", { name: "Tariffari" }).click();
    await expect(page.getByRole("heading", { name: "Tariffario Lombardia 2025" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Fornitura e posa binario tipo 60E1" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Materiali" }).click();
    await expect(page.getByRole("heading", { name: "Gestione Materiali" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "BIN-60E1" })).toBeVisible();

    await page.getByRole("button", { name: "Contabilita" }).click();
    await expect(page.getByText("Pacchetto documentale")).toBeVisible();
  });
});
