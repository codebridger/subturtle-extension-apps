import { test, expect } from "./extension-fixture";

// Regression net for the documented "modal lifecycle is decoupled from the
// Nibble per-host gate" contract (see CLAUDE.md verification checklist).
// Toggling Nibble OFF for the host while ConsoleCrane is open must not close
// the modal or release the body scroll lock.

test.describe("ConsoleCrane modal lifecycle vs Nibble per-host toggle", () => {
  test("modal stays open and body scroll remains locked when Nibble is disabled mid-session", async ({
    context,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    await page.goto("/index.html");

    // Wait for both content scripts to mount and the settings store to do
    // its initial fetch from background.
    await expect(page.locator("#subturtle-console-crane-root")).toBeAttached({
      timeout: 10_000,
    });
    await expect(page.locator("#subturtle-nibble-root")).toBeAttached({
      timeout: 10_000,
    });

    // Open the modal via the cross-bundle bridge (same path the Nibble icon
    // uses in production).
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("subturtle:console-crane:open", {
          detail: {
            page: "word-detail",
            params: { word: "hi" },
            active: true,
          },
        })
      );
    });

    const modalSection = page.locator(
      "#subturtle-console-crane section.absolute.rounded-xl"
    );
    await expect(modalSection).toBeVisible({ timeout: 5_000 });

    // The modal sets `document.body.style.overflowY = "hidden"` while open
    // (see src/console-crane/components/Modal.vue).
    await expect
      .poll(async () =>
        page.evaluate(() => document.body.style.overflowY)
      )
      .toBe("hidden");

    // Toggle Nibble OFF for localhost by writing to chrome.storage from the
    // service worker. Both content scripts listen on
    // `chrome.storage.onChanged` and update their settings stores reactively
    // — exactly the path the popup uses when the user flips the per-host
    // switch.
    await serviceWorker.evaluate(async () => {
      const existing = await chrome.storage.local.get("settings");
      const settings = (existing.settings as any) || {};
      await chrome.storage.local.set({
        settings: {
          theme: settings.theme ?? "dark",
          language: settings.language ?? "en",
          nibbleDisabledDomains: ["localhost"],
        },
      });
    });

    // Give the storage event a moment to propagate to the page's content
    // scripts and Vue to react.
    await page.waitForTimeout(300);

    // Modal must still be open.
    await expect(modalSection).toBeVisible();

    // Body scroll lock must still be held.
    expect(
      await page.evaluate(() => document.body.style.overflowY)
    ).toBe("hidden");
  });

  test("closing the modal afterwards still restores body scroll", async ({
    context,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    await page.goto("/index.html");

    await expect(page.locator("#subturtle-console-crane-root")).toBeAttached({
      timeout: 10_000,
    });

    // Capture the original overflow-y so we know what "restored" means.
    const originalOverflow = await page.evaluate(
      () => document.body.style.overflowY
    );

    // Open the modal.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("subturtle:console-crane:open", {
          detail: {
            page: "word-detail",
            params: { word: "hi" },
            active: true,
          },
        })
      );
    });

    const modalSection = page.locator(
      "#subturtle-console-crane section.absolute.rounded-xl"
    );
    await expect(modalSection).toBeVisible({ timeout: 5_000 });

    // Toggle Nibble off mid-session.
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          theme: "dark",
          language: "en",
          nibbleDisabledDomains: ["localhost"],
        },
      });
    });
    await page.waitForTimeout(150);

    // Now close the modal.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("subturtle:console-crane:open", {
          detail: {
            page: "word-detail",
            params: { word: "hi" },
            active: false,
          },
        })
      );
    });

    // Modal hides + body scroll restored (Modal.vue restores after a 100ms wait).
    await expect(modalSection).toBeHidden({ timeout: 5_000 });
    await expect
      .poll(async () =>
        page.evaluate(() => document.body.style.overflowY)
      )
      .toBe(originalOverflow);
  });
});
