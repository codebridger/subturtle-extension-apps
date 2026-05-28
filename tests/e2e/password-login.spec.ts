import { test, expect } from "./extension-fixture";
import type { Route, Page } from "@playwright/test";

// End-to-end coverage of the dev/agent-only password login form in the popup.
//
// The verify-job .env.production heredoc sets ENABLE_PASSWORD_AUTH=true so
// the form renders. modular-rest's authentication.login POSTs to
// /user/login (verified in @modular-rest/client@1.12); we stub that route
// here so the test is offline-deterministic.
//
// We navigate to #/login directly so the popup router's beforeEach skips
// the silent re-auth chain (router.ts:42) — without this, the popup spins
// indefinitely on /user/loginAnonymous against the stubbed backend host.

const POPUP_PATH = "/popup.html#/login";

// modular-rest's authentication.login chains POST /user/login (token issue)
// → POST /verify/token (user lookup). Both must return success-shaped JSON
// for the flow to land in the "user logged in" state. We provide a default
// stub user that per-test login routes can override before this runs.
async function stubBackend(page: Page, userOverride?: Record<string, any>) {
  const defaultUser = {
    id: "u-stub",
    email: "stub@example.com",
    type: "user",
    permissionGroup: "user",
    ...userOverride,
  };

  // verify/token — modular-rest validates after login + on every saved session.
  await page.route("**/verify/token", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true, user: defaultUser }),
    })
  );

  // Catch-all: any /user/** call returns a benign success so the SDK's
  // internal http flows don't 404 / dangle. /user/login is stubbed per-test.
  await page.route("**/user/**", (route: Route) => {
    const url = route.request().url();
    if (
      url.includes("/user/login") &&
      !url.includes("/user/loginAnonymous") &&
      !url.includes("/user/loginWithToken")
    ) {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true, token: "anon", user: defaultUser }),
    });
  });
}

test.describe("Password login UI (popup, ENABLE_PASSWORD_AUTH=true)", () => {
  test("renders the Email & Password button and opens the form on click", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await stubBackend(page);
    await page.goto(`chrome-extension://${extensionId}${POPUP_PATH}`);

    await expect(
      page.locator('[data-testid="open-password-form"]')
    ).toBeVisible({ timeout: 5_000 });

    await page.locator('[data-testid="open-password-form"]').click();
    await expect(page.locator('[data-testid="password-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-value"]')).toBeVisible();

    await page.close();
  });

  test("blocks submit on invalid email and does not fire the login request", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();

    let loginCalled = false;
    await page.route("**/user/login", (route: Route) => {
      loginCalled = true;
      return route.fulfill({ status: 200, body: "{}" });
    });
    await stubBackend(page);

    await page.goto(`chrome-extension://${extensionId}${POPUP_PATH}`);
    await page.locator('[data-testid="open-password-form"]').click();

    await page.locator('[data-testid="password-email"]').fill("not-an-email");
    await page.locator('[data-testid="password-value"]').fill("password123");

    await expect(
      page.locator('[data-testid="password-submit"]')
    ).toBeDisabled();

    expect(loginCalled).toBe(false);

    await page.close();
  });

  test("success: token lands in chrome.storage.sync", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    const FAKE_TOKEN = "FAKE_JWT.PAYLOAD.SIG";

    await page.route("**/user/login", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: true,
          token: FAKE_TOKEN,
          user: { id: "u-1", email: "agent@example.com", type: "user" },
        }),
      })
    );
    await stubBackend(page);

    // Start the storage slot empty so we can detect the write deterministically.
    await serviceWorker.evaluate(
      () =>
        new Promise<void>((resolve) =>
          chrome.storage.sync.remove("token", () => resolve())
        )
    );

    await page.goto(`chrome-extension://${extensionId}${POPUP_PATH}`);
    await page.locator('[data-testid="open-password-form"]').click();

    await page
      .locator('[data-testid="password-email"]')
      .fill("agent@example.com");
    await page.locator('[data-testid="password-value"]').fill("password123");
    await page.locator('[data-testid="password-submit"]').click();

    // background.ts persists the token via chrome.storage.sync — verify it
    // lands in the slot the OAuth path uses, asserting the slot equivalence
    // we documented in CLAUDE.md.
    await expect
      .poll(
        async () =>
          await serviceWorker.evaluate(async () => {
            return new Promise<string | null>((resolve) => {
              chrome.storage.sync.get("token", (r) =>
                resolve((r as any)?.token ?? null)
              );
            });
          }),
        { timeout: 10_000 }
      )
      .toBe(FAKE_TOKEN);

    await page.close();
  });

  test("failure: 401 surfaces inline error and keeps token slot empty", async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const page = await context.newPage();

    await serviceWorker.evaluate(
      () =>
        new Promise<void>((resolve) =>
          chrome.storage.sync.remove("token", () => resolve())
        )
    );

    await page.route("**/user/login", (route: Route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ status: false, error: "Invalid credentials" }),
      })
    );
    await stubBackend(page);

    await page.goto(`chrome-extension://${extensionId}${POPUP_PATH}`);
    await page.locator('[data-testid="open-password-form"]').click();

    await page
      .locator('[data-testid="password-email"]')
      .fill("agent@example.com");
    await page.locator('[data-testid="password-value"]').fill("wrong-password");
    await page.locator('[data-testid="password-submit"]').click();

    await expect(page.locator('[data-testid="password-error"]')).toHaveText(
      "Invalid email or password.",
      { timeout: 5_000 }
    );

    const token = await serviceWorker.evaluate(
      () =>
        new Promise<string | null>((resolve) =>
          chrome.storage.sync.get("token", (r) =>
            resolve((r as any)?.token ?? null)
          )
        )
    );
    expect(token).toBeNull();

    await page.close();
  });
});
