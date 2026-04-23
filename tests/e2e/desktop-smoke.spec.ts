import { test, expect } from "@playwright/test";

test.describe("Quantara desktop web shell", () => {
  test("loads the dashboard shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Panoramica generale del progetto")).toBeVisible();
    await expect(page.getByText("Linea AV/AC Milano-Verona").first()).toBeVisible();
    await expect(page.getByText("Alert attivi")).toBeVisible();
    await expect(page.getByText("Distribuzione budget")).toBeVisible();
    await expect(page.getByText("Mappa cantiere")).toBeVisible();
    await expect(page.getByText("Timeline di progetto")).toBeVisible();
  });
});
