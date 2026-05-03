import {
  test as base,
  chromium,
  type BrowserContext,
  type Worker,
} from "@playwright/test";
import path from "node:path";

// Loads the unpacked extension from `dist/` into a persistent context.
// Each test gets its own user-data-dir (empty string = ephemeral) so
// extension state doesn't leak between tests. The serviceWorker fixture
// resolves the MV3 background worker once it registers.
type ExtensionFixtures = {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve(process.cwd(), "dist");
    // Playwright 1.40+ + Chromium 121+ run extensions cleanly under
    // managed headless. The previous `--headless=new` arg worked on
    // macOS but fails on Ubuntu CI runners with the bundled Chromium
    // 147, so we let Playwright pick the headless mode itself.
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent("serviceworker");
    }
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    // SW URL: chrome-extension://<id>/background.js
    const id = new URL(serviceWorker.url()).host;
    await use(id);
  },
});

export const expect = test.expect;
