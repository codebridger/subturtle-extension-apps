import { defineConfig } from "@playwright/test";

// E2E config — runs only against the Playwright specs in tests/e2e/.
// Vitest is configured to exclude this directory so the two suites don't
// fight over file ownership.
//
// `dist/` must be present before tests run; the e2e suite asserts artifacts
// and loads the extension into Chromium. CI runs `yarn build` before
// `yarn test:e2e` (see CLAUDE.md release pipeline notes).
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },

  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 30_000,
  },
});
