import { defineConfig, devices } from "playwright/test";

const usesExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  ...(usesExternalServer
    ? {}
    : {
        webServer: {
          command: "node scripts/start-dev-server.mjs",
          reuseExistingServer: true,
          timeout: 120_000,
          url: "http://127.0.0.1:3000",
        },
      }),
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
