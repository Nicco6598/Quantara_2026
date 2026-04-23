import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("sqlite migrations", () => {
  it("defines the first local-first accounting schema", () => {
    const migration = readFileSync(
      resolve("apps/desktop/src-tauri/migrations/0001_initial.sql"),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS contracts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS tariff_priorities");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS sal_documents");
  });
});
