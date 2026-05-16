import { expect, test } from "@playwright/test";

test.describe("Quantara desktop web shell", () => {
  test.setTimeout(60_000);

  test("loads the dashboard shell", async ({ page }) => {
    await page.goto("/", { timeout: 45_000, waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Panoramica operativa" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portafoglio lavori" })).toBeVisible();
    await expect(page.getByRole("button", { exact: true, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Budget portafoglio")).toBeVisible();
    await expect(page.getByText("Distribuzione stato")).toBeVisible();
    await expect(page.getByText("Azioni rapide")).toBeVisible();
  });

  test("opens phase C operational screens", async ({ page }) => {
    await page.goto("/", { timeout: 45_000, waitUntil: "domcontentloaded" });
    const sidebar = page.getByRole("complementary");

    await sidebar.getByRole("button", { name: /Appaltatori/ }).click();
    await expect(page.getByRole("heading", { name: "Progetti" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cockpit appaltatori" })).toBeVisible();

    await sidebar.getByRole("button", { name: /Tariffario/ }).click();
    await expect(page.getByRole("heading", { name: "Tariffario" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catalogo tariffari" })).toBeVisible();

    await sidebar.getByRole("button", { name: "Materiali" }).click();
    await expect(page.getByRole("heading", { name: "Materiali" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Materiali e coperture" })).toBeVisible();

    await sidebar.getByRole("button", { name: /Contabilità/ }).click();
    await expect(page.getByRole("heading", { name: "Contabilità" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Report contabile" })).toBeVisible();
  });
});
