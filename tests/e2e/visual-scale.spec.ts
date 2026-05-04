import { test, expect } from "./extension-fixture";
import type { Page, BrowserContext } from "@playwright/test";

// Regression net for the rem→px rewrite in postcss.config.js. Tailwind
// utilities ship as `rem`-based values; on a host with html { font-size: 24px }
// (common on news / WordPress templates), unrewritten rem would scale every
// Subturtle utility 1.5×, blowing out the modal. The rewrite pins rem to a
// fixed 14px base at build time so the rendered px is independent of host.
//
// We test the most direct vector: read the computed font-size of an element
// inside the rendered ConsoleCrane modal and assert it's identical on a
// 16px-html page vs a 24px-html page.
async function gotoConsoleCrane(context: BrowserContext, fixture: string) {
  const page = await context.newPage();
  await page.goto(fixture);

  await expect(page.locator("#subturtle-console-crane-root")).toBeAttached({
    timeout: 10_000,
  });

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

  return page;
}

async function readModalSampleFontSize(page: Page) {
  // The Dashboard button in the modal header carries `text-sm` plus
  // `px-2 py-1`, all of which were rem-based pre-rewrite. Its computed
  // font-size pins 0.875rem to 12.25px after the 14px-base rewrite.
  const sample = page
    .locator("#subturtle-console-crane button")
    .filter({ hasText: "Dashboard" });
  await expect(sample).toBeVisible({ timeout: 10_000 });

  return sample.evaluate(
    (el) => parseFloat(getComputedStyle(el as HTMLElement).fontSize)
  );
}

test.describe("postcss rem→px rewrite", () => {
  test("text-sm renders at the same px size on 16px-html and 24px-html hosts", async ({
    context,
  }) => {
    const tinyPage = await gotoConsoleCrane(context, "/index.html");
    const tinyPx = await readModalSampleFontSize(tinyPage);
    await tinyPage.close();

    const largePage = await gotoConsoleCrane(context, "/large-font.html");
    const largePx = await readModalSampleFontSize(largePage);
    await largePage.close();

    // Same rendered size, ±0.5px for sub-pixel rounding. If the rewrite ever
    // breaks, the 24px-html host renders text-sm at ~21px — way outside this.
    expect(Math.abs(tinyPx - largePx)).toBeLessThanOrEqual(0.5);

    // Sanity floor: a broken rewrite typically inflates px above 18.
    expect(tinyPx).toBeLessThan(18);
    expect(largePx).toBeLessThan(18);
  });
});
