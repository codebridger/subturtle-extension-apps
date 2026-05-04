import { test, expect } from "./extension-fixture";
import type { Route, Page } from "@playwright/test";

// Regression for the "translate fails after language change" bug. Before the
// fix, an anonymous Subturtle session lost its token whenever the popup
// re-ran loginWithLastSession (which it does on every fresh popup open):
//   1. authentication.loginAsAnonymous() never persisted its token, so
//      chrome.storage.sync was empty even though the user *had* a working
//      anon session in memory.
//   2. updateIsLogin() returns false for `user.type !== "user"`, so
//      loginWithLastSession's `.then` treated a perfectly good anon login
//      as "login failed" and called the wrapper logout(), which broadcast
//      StoreUserTokenMessage(null) to every tab — instantly invalidating
//      the session that was in flight.
//   3. The next translate had no Authorization header, the modular-rest
//      auth middleware returned 412 Precondition Failed, and the user
//      saw "Translation failed."
//
// This test pins both halves of the fix:
//   * After an anonymous login, chrome.storage.sync is populated and the
//     in-page localStorage cache holds the same token.
//   * Mutating chrome.storage.local.settings to simulate a popup language
//     change does NOT clear chrome.storage.sync.token, and a fresh
//     /function/run still goes out with a non-empty Authorization header.

const ANON_TOKEN = "test-anon-token-abc123";

async function stubBackend(page: Page, observed: { authHeaders: string[] }) {
  await page.route("**/user/loginAnonymous", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: ANON_TOKEN }),
    })
  );

  // /verify/token is hit by authentication.loginWithToken on every mount.
  // Always return success so the persisted anon token is treated as valid.
  await page.route("**/verify/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "anon-user-1",
          type: "anonymous",
          email: null,
          phone: null,
          permissionGroup: "anonymous",
        },
      }),
    })
  );

  // Capture the Authorization header on every translate so we can assert
  // it remains non-empty across language switches.
  await page.route("**/function/run", async (route: Route) => {
    const headers = route.request().headers();
    observed.authHeaders.push(headers["authorization"] ?? "");
    const body = route.request().postDataJSON();
    if (body?.name === "translateWithContext") {
      const phrase: string = body.args?.phrase ?? "";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: `[stub:${body.args?.targetLanguage}] ${phrase}` }),
      });
    }
    // Other modular-rest function calls (subscription, etc.) — succeed empty.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });

  // Anything else under /user/** that the bundles might hit on mount.
  await page.route("**/user/**", (route) => {
    if (route.request().url().includes("/user/loginAnonymous")) {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });
}

test.describe("auth survives language switch (anonymous user)", () => {
  test("anon login persists token and language change preserves it", async ({
    context,
    serviceWorker,
  }) => {
    const page = await context.newPage();
    const observed = { authHeaders: [] as string[] };
    await stubBackend(page, observed);

    await page.goto("/index.html");
    await expect(page.locator("#subturtle-nibble-root")).toBeAttached({
      timeout: 10_000,
    });

    // Anon login is fire-and-forget after page load; wait for the wrapper
    // to persist the token to chrome.storage.sync (the .finally chain
    // sends StoreUserTokenMessage to background).
    await expect
      .poll(
        async () => {
          const { token } = (await serviceWorker.evaluate(async () => {
            return chrome.storage.sync.get("token");
          })) as { token?: string };
          return token ?? null;
        },
        { timeout: 5_000 }
      )
      .toBe(ANON_TOKEN);

    // Same token in the page's localStorage (modular-rest's per-origin cache).
    expect(
      await page.evaluate(() => localStorage.getItem("token"))
    ).toBe(ANON_TOKEN);

    // First translate — works, Authorization header carries the anon token.
    await page.locator("#test-word").click({ clickCount: 2 });
    await expect(page.locator(".nibble-icon-btn")).toBeVisible({
      timeout: 5_000,
    });
    await page.locator(".nibble-icon-btn").click();
    await expect(page.locator(".nibble-translation")).toBeVisible({
      timeout: 5_000,
    });
    expect(observed.authHeaders.at(-1)).toBe(ANON_TOKEN);
    const beforeSwitchCount = observed.authHeaders.length;

    // Simulate the popup's "user changed target language" broadcast by
    // writing settings to chrome.storage.local. Both content scripts'
    // settings stores listen on chrome.storage.onChanged and update their
    // `language` ref reactively — same path the popup uses end-to-end.
    await serviceWorker.evaluate(async () => {
      const existing = await chrome.storage.local.get("settings");
      const settings = (existing.settings as any) || {};
      await chrome.storage.local.set({
        settings: {
          theme: settings.theme ?? "dark",
          language: "es",
          nibbleDisabledDomains: settings.nibbleDisabledDomains ?? [],
        },
      });
    });
    await page.waitForTimeout(300);

    // chrome.storage.sync.token must NOT be cleared. Before the fix, the
    // popup's loginWithLastSession path called the wrapper logout() because
    // it confused "anon user" with "login failed", and that broadcast
    // StoreUserTokenMessage(null) -> background cleared the token. We
    // assert it's still there.
    const tokenAfterSwitch = (await serviceWorker.evaluate(async () => {
      const { token } = await chrome.storage.sync.get("token");
      return token ?? null;
    })) as string | null;
    expect(tokenAfterSwitch).toBe(ANON_TOKEN);

    // Second translate after the language change — must succeed, must
    // carry the same Authorization header. Before the fix, this was the
    // 412 case.
    await page.locator("body").click(); // dismiss any leftover icon
    await page.locator("#test-word").click({ clickCount: 2 });
    await expect(page.locator(".nibble-icon-btn")).toBeVisible({
      timeout: 5_000,
    });
    await page.locator(".nibble-icon-btn").click();
    await expect(page.locator(".nibble-translation")).toBeVisible({
      timeout: 5_000,
    });
    expect(observed.authHeaders.length).toBeGreaterThan(beforeSwitchCount);
    expect(observed.authHeaders.at(-1)).toBe(ANON_TOKEN);

    // Sanity: the new request was made with the new targetLanguage. The
    // stub echoes it into the response body so the rendered translation
    // string carries the language tag.
    await expect(page.locator(".nibble-translation")).toContainText("[stub:Spanish]");

    await page.close();
  });
});
