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

    // Why these flags:
    // - `--headless=new` forces the *full* Chromium binary in new-headless
    //   mode. Without it, Playwright defers to `chrome-headless-shell`,
    //   which is smaller and faster but does NOT load extensions — every
    //   content-script root assertion times out on Linux CI as a result.
    // - `--no-sandbox` + `--disable-setuid-sandbox` + `--disable-dev-shm-usage`
    //   are standard CI hygiene for Chromium under containerised runners.
    //   Harmless on macOS, required on some Linux setups.
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
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
