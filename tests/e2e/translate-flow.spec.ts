import { test, expect } from "./extension-fixture";
import type { Route, Page } from "@playwright/test";

// End-to-end translate-and-save regression test for Persian / non-Latin1
// content. The translation backend (`POST /function/run` via modular-rest)
// is stubbed at the network layer so the test runs offline and pins the
// Persian payload through the entire pipeline:
//
//   selection → Subturtle icon → simple translate stub → translated card →
//   Save → ConsoleCrane opens (encodeRouteParams round-trips Persian) →
//   detailed translate stub → WordDetail renders Persian content.
//
// The encode/decode + bridge integration tests cover the same regression
// in isolation; this one cements the contract end-to-end.

async function stubTranslate(page: Page) {
  await page.route("**/function/run", async (route: Route) => {
    const body = route.request().postDataJSON();
    if (body?.name === "translateWithContext") {
      const phrase: string = body.args?.phrase ?? "";
      const context: string = body.args?.context ?? "";

      if (body.args?.translationType === "simple") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: `[stub] ${phrase}` }),
        });
      }

      // detailed
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            phrase,
            context,
            phonetic: "/səˈlɑːm/",
            definition: "hello / peace",
            translation: "[detailed] " + phrase,
            examples: [],
            related: [],
          },
        }),
      });
    }
    return route.fallback();
  });

  // Anonymous login + bootstrap calls aren't relevant to this flow but their
  // failures pollute console.error noise that the test asserts against.
  await page.route("**/user/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    })
  );
}

test.describe("Persian translate-and-save flow", () => {
  test("simple translate renders the stubbed result without InvalidCharacterError", async ({
    context,
  }) => {
    const page = await context.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await stubTranslate(page);

    await page.goto("/persian.html");
    await expect(page.locator("#subturtle-nibble-root")).toBeAttached({
      timeout: 10_000,
    });

    // Double-click the Persian word to select it; the Subturtle icon
    // appears next to the selection rect.
    await page.locator("#salam").click({ clickCount: 2 });
    await expect(page.locator(".nibble-icon-btn")).toBeVisible({
      timeout: 5_000,
    });

    // Click the icon → loading → translated card.
    await page.locator(".nibble-icon-btn").click();

    const translation = page.locator(".nibble-translation");
    await expect(translation).toBeVisible({ timeout: 5_000 });
    await expect(translation).toContainText("سلام");

    expect(
      errors.filter((e) => /InvalidCharacterError|Latin1/i.test(e)),
      errors.join("\n")
    ).toEqual([]);

    await page.close();
  });

  test("Save click opens ConsoleCrane with Persian params surviving encodeRouteParams", async ({
    context,
  }) => {
    const page = await context.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await stubTranslate(page);

    await page.goto("/persian.html");
    await expect(page.locator("#subturtle-console-crane-root")).toBeAttached({
      timeout: 10_000,
    });

    // Drive selection → icon → translated card.
    await page.locator("#salam").click({ clickCount: 2 });
    await expect(page.locator(".nibble-icon-btn")).toBeVisible({
      timeout: 5_000,
    });
    await page.locator(".nibble-icon-btn").click();
    await expect(page.locator(".nibble-translation")).toBeVisible({
      timeout: 5_000,
    });

    // Click Save & view → emitOpen({ word: 'سلام', context: '...' }) →
    // ConsoleCrane bridge → toggleConsoleCrane → encodeRouteParams →
    // router.push. This is the path the original btoa Unicode bug crashed.
    await page.locator(".nibble-save-btn").click();

    const modalSection = page.locator(
      "#subturtle-console-crane section.absolute.rounded-xl"
    );
    await expect(modalSection).toBeVisible({ timeout: 5_000 });

    // Wait for the detailed translate stub to resolve and WordDetail to
    // render the Persian content end-to-end.
    await expect(page.locator("#subturtle-console-crane")).toContainText(
      "سلام",
      { timeout: 5_000 }
    );

    expect(
      errors.filter((e) => /InvalidCharacterError|Latin1/i.test(e)),
      errors.join("\n")
    ).toEqual([]);

    await page.close();
  });
});
