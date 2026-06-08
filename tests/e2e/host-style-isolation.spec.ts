import { test, expect } from "./extension-fixture";

// Regression net for ClickUp 86exw6kme — the ConsoleCrane header rendered
// broken on dark host pages (studio.youtube.com). Two host-CSS leaks were the
// cause; scoping confines OUR selectors but does not stop the host's
// element/universal rules from cascading INTO our elements:
//
//   1. Inherited text color — the host sets `html { color: #fff }`. With no
//      base color of our own, the header IconButtons (pilotui only colors them
//      in dark mode) inherited white and vanished on the white light-theme
//      modal.
//   2. Inherited flex-grow — the host (a Polymer app) sets `flex: 1 0 1e-9px`
//      on generic elements, which leaked onto our header <section> and grew it
//      to fill half the modal, pushing content down.
//
// src/tailwind.css pins a per-theme base color and restores the default
// `flex: 0 1 auto` on our scoped flow elements. This test reproduces the host
// conditions and asserts both leaks are neutralized.

test.describe("host-page style isolation (ConsoleCrane header)", () => {
  test("dark host page does not wash out or inflate the header", async ({
    context,
    serviceWorker,
  }) => {
    // Light theme is the failing case: white modal + inherited light text.
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        settings: { theme: "light", language: "en", nibbleDisabledDomains: [] },
      });
    });

    const page = await context.newPage();
    await page.goto("/index.html");

    // Simulate a dark Polymer host: light text + a broad flex-grow leak,
    // exactly the two rules that broke the header on studio.youtube.com.
    await page.addStyleTag({
      content: `
        html, body { background:#0f0f0f !important; color:#ffffff !important; }
        div, section, header, footer, main, article, aside, nav,
        ul, ol, li, p, span, a, button, label { flex: 1 0 1e-9px; }
      `,
    });

    await expect(page.locator("#subturtle-console-crane-root")).toBeAttached({
      timeout: 10_000,
    });

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("subturtle:console-crane:open", {
          detail: {
            page: "word-detail",
            params: { word: "Channel analytics" },
            active: true,
          },
        })
      );
    });

    const modalSection = page.locator(
      "#subturtle-console-crane section.absolute.rounded-xl"
    );
    await expect(modalSection).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(300);

    const probe = await page.evaluate(() => {
      const sec = document.querySelector(
        "#subturtle-console-crane section.absolute.rounded-xl"
      ) as HTMLElement;
      const flexCol = sec.querySelector(":scope > div > div") as HTMLElement;
      const header = flexCol.children[0] as HTMLElement;
      // First IconButton (the cog) renders as a <div>; the mask icon inside it
      // paints via `color` (currentColor). Read the button's resolved color.
      const cog = header.querySelector(":scope > div") as HTMLElement;
      const parseRgb = (s: string) =>
        (s.match(/\d+/g) || []).slice(0, 3).map(Number);
      return {
        headerHeight: Math.round(header.getBoundingClientRect().height),
        cogColor: getComputedStyle(cog).color,
        cogRgb: parseRgb(getComputedStyle(cog).color),
      };
    });

    // Leak 2: the header must size to its content, not grow to fill the modal.
    expect(probe.headerHeight).toBeLessThan(80);

    // Leak 1: the cog icon must use our dark base color, not the inherited
    // host white. Assert it's a dark color (every channel well below 128).
    const [r, g, b] = probe.cogRgb;
    expect(
      Math.max(r, g, b),
      `cog icon color should be dark, got ${probe.cogColor}`
    ).toBeLessThan(100);
  });
});
