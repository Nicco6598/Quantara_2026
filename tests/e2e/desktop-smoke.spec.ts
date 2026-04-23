import { test, expect } from "@playwright/test";

test.describe("Quantara desktop web shell", () => {
  test("loads the dashboard shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Panoramica generale del progetto")).toBeVisible();
    await expect(page.getByText("Linea AV/AC Milano-Verona").first()).toBeVisible();
  });
});
