import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const target = process.env.E2E_TARGET === "node" ? "node" : "worker";
const port = Number(process.env.E2E_PORT ?? 8796);
const token = "e2e-token";
const work = mkdtempSync(join(tmpdir(), "jalco-drop-e2e-"));
const config = existsSync("wrangler.local.jsonc") ? "wrangler.local.jsonc" : "wrangler.jsonc";

const servers = {
  worker: `npx wrangler dev --config ${config} --test-scheduled --port ${port} --host localhost:${port} --var ADMIN_TOKEN:${token} --var HOME_URL:https://example.com/ --var RATE_LIMIT:off --persist-to ${work}`,
  node: "node dist/server.mjs",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: servers[target],
    url: `http://localhost:${port}/style.css`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ADMIN_TOKEN: token, PORT: String(port), DATA_DIR: join(work, "data"), HOME_URL: "https://example.com/", TEST_SCHEDULED: "on", CARDS: "off", RATE_LIMIT: "off" },
  },
});
