import { test, expect } from "./extension-fixture";
import type { Route, Page } from "@playwright/test";

// Regression test for ClickUp 86exu5xd7 — "Bring the ConsoleCrane into popup app".
//
// The popup reuses WordDetailModule, whose "Practice with AI" / "Preview
// flashcard" buttons open the practice-config / flashcard-preview console pages.
// On the popup page (no console-crane.js content script) these are hosted in the
// popup's OWN router and render as full popup pages — no modal. This drives the
// real popup.html end-to-end:
//
//   open popup.html → translate stub → WordDetail renders + action buttons →
//   click → popup router navigates to the console page (no modal) → Back →
//   Home is restored (kept-alive) with the translation still shown.

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

      // detailed — a truthy translation.phrase is what makes the action buttons show.
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            translation: { phrase: `[translated] ${phrase}`, context: "" },
            direction: { source: "ltr", target: "ltr" },
            language_info: { source: "English", target: "Spanish" },
            linguistic_data: {
              isValid: true,
              type: "noun",
              definition: "a container with a flat base and sides",
              phonetic: { transliteration: "bɒks" },
              formality_level: "neutral",
            },
            chunks: [],
            context,
          },
        }),
      });
    }
    return route.fallback();
  });

  // Auth + saved-phrase lookups offline so the anonymous-login chain doesn't
  // reach the network or stall the flow.
  await page.route("**/user/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    })
  );
  await page.route("**/data-provider/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: null }),
    })
  );
}

/**
 * Open the popup page and translate a phrase. Asserts there is NO ConsoleCrane
 * modal app on the popup page (the old approach), then returns once WordDetail
 * has rendered its action buttons.
 */
async function openPopupAndTranslate(page: Page, extensionId: string) {
  await stubTranslate(page);
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // No modal ConsoleCrane app is mounted on the popup page anymore.
  await expect(page.locator("#subturtle-console-crane-root")).toHaveCount(0);

  const input = page.getByPlaceholder("Type or paste any text");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill("box");
  await input.press("Enter");

  await expect(
    page.locator('#subturtle-popup button:has-text("Practice with AI")')
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Popup: ConsoleCrane phrase actions (router pages, no modal)", () => {
  test('"Practice with AI" navigates to the practice page; Back restores Home', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await openPopupAndTranslate(page, extensionId);

    await page
      .locator('#subturtle-popup button:has-text("Practice with AI")')
      .click();

    // Popup router navigated to the console page — full popup page, no modal.
    await expect(page.locator("#subturtle-popup")).toContainText(
      "Choose a coach voice",
      { timeout: 15_000 }
    );
    expect(page.url()).toContain("#/practice-config/");
    await expect(page.locator("#subturtle-console-crane-root")).toHaveCount(0);

    // Back returns to the kept-alive Home with the translation still rendered.
    await page.locator('#subturtle-popup button:has-text("Back")').click();
    await expect(page.getByPlaceholder("Type or paste any text")).toBeVisible();
    await expect(
      page.locator('#subturtle-popup button:has-text("Practice with AI")')
    ).toBeVisible();

    await page.close();
  });

  test('"Preview flashcard" navigates to the flashcard page', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await openPopupAndTranslate(page, extensionId);

    await page
      .locator('#subturtle-popup button:has-text("Preview flashcard")')
      .click();

    await expect(page.locator("#subturtle-popup")).toContainText(
      "Flashcard preview",
      { timeout: 15_000 }
    );
    expect(page.url()).toContain("#/flashcard-preview/");
    await expect(page.locator("#subturtle-console-crane-root")).toHaveCount(0);

    await page.close();
  });
});
