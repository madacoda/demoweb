import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
if (existsSync(".env")) loadEnvFile(".env");
process.env.DEMO_NAMESPACE ||= `e2e-${randomUUID()}`;
if (!process.env.DEMO_NAMESPACE.startsWith("e2e-"))
  throw new Error("Browser tests require an e2e- namespace.");
export default defineConfig({
  globalSetup: "./tests/browser/global-setup.ts",
  globalTeardown: "./tests/browser/global-teardown.ts",
  webServer: {
    command: "bun run start",
    url: "http://127.0.0.1:3001/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
  testDir: "./tests/browser",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
