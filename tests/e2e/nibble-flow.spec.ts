import { test, expect } from "./extension-fixture";

// Tests below load fixture pages served by the local static server in
// playwright.config.ts. The extension's nibble + console-crane content
// scripts both match `<all_urls>` so they run on these URLs.

async function gotoAndWait(
  page: Awaited<ReturnType<typeof Promise.resolve>> extends never ? never : any,
  url: string
) {
  await page.goto(url);
  // Both content scripts mount their root after Pinia init + a settings
  // round-trip to background — give them a moment.
  await expect(page.locator("#subturtle-nibble-root")).toBeAttached({
    timeout: 10_000,
  });
  await expect(page.locator("#subturtle-console-crane-root")).toBeAttached({
    timeout: 10_000,
  });
}

test.describe("content script mounting", () => {
  test("nibble + console-crane roots mount on a generic page", async ({
    context,
  }) => {
    const page = await context.newPage();
    await gotoAndWait(page, "/index.html");

    // The verification checklist requires exactly one ConsoleCrane root.
    expect(
      await page.locator("#subturtle-console-crane-root").count()
    ).toBe(1);
    expect(await page.locator("#subturtle-nibble-root").count()).toBe(1);
  });
});

test.describe("ConsoleCrane bridge — Unicode params", () => {
  test("emitOpen with Persian + emoji params does not throw InvalidCharacterError", async ({
    context,
  }) => {
    const page = await context.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await gotoAndWait(page, "/persian.html");

    // Drive the bridge directly with Persian + emoji so we test the
    // encodeRouteParams path that previously crashed under btoa.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("subturtle:console-crane:open", {
          detail: {
            page: "word-detail",
            params: { word: "سلام", context: "این یک متن است 🐢 café 你好" },
            active: true,
          },
        })
      );
    });

    // Give Vue + the router a tick to react.
    await page.waitForTimeout(250);

    const unicodeErrors = errors.filter(
      (e) => /InvalidCharacterError|Latin1/i.test(e)
    );
    expect(unicodeErrors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Nibble selection popup", () => {
  test("double-clicking a word shows the Subturtle icon", async ({
    context,
  }) => {
    const page = await context.newPage();
    await gotoAndWait(page, "/index.html");

    await page.locator("#test-word").click({ clickCount: 2 });

    await expect(page.locator(".nibble-icon-btn")).toBeVisible({
      timeout: 5_000,
    });
  });
});
