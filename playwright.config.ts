import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:1420",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm --filter @quantara/desktop dev",
    reuseExistingServer: true,
    timeout: 60_000,
    url: "http://127.0.0.1:1420",
  },
});
