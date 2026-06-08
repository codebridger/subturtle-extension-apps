import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MESSAGE_TYPE } from "../src/common/types/messaging";

// Controllable @modular-rest/client mock — the recovery primitive calls
// authentication.loginAsAnonymous and reads isLogin/getToken. Mocking at this
// boundary (rather than mocking reauthAnonymously) lets us exercise the REAL
// withAuthRetry + reauthAnonymously together, which matters now that both live
// in one module and call each other intra-module.
// vi.hoisted so `auth` exists before the hoisted vi.mock factory runs (a
// top-level import of auth-recovery pulls @modular-rest/client in eagerly).
const auth = vi.hoisted(() => ({
  isLogin: false,
  getToken: null as string | null,
  loginAsAnonymous: vi.fn(),
}));

vi.mock("@modular-rest/client", () => ({ authentication: auth }));

import {
  isAuthError,
  reauthAnonymously,
  withAuthRetry,
  setSessionRecovery,
} from "../src/common/helper/auth-recovery";

function sendMessageMock() {
  return (globalThis as any).chrome.runtime.sendMessage as ReturnType<
    typeof vi.fn
  >;
}

function storeTokenCalls() {
  return sendMessageMock().mock.calls.filter(
    ([m]) => m && (m as any).type === MESSAGE_TYPE.STORE_USER_TOKEN
  );
}

// ---------------------------------------------------------------------------

describe("isAuthError", () => {
  it("matches the raw string body functionProvider.run re-throws", () => {
    // The exact body the server returned in the reported bug screenshot.
    expect(isAuthError("User not found")).toBe(true);
  });

  it("matches the { hasError, error } wrapper dataProvider lets through", () => {
    expect(isAuthError({ hasError: true, error: "User not found" })).toBe(true);
  });

  it("matches a nested error object", () => {
    expect(isAuthError({ error: { message: "Unauthorized" } })).toBe(true);
  });

  it("matches the verify/token error shape { status, e }", () => {
    // /verify/token surfaces the jwt reason under `e` as a real string.
    expect(isAuthError({ status: "error", e: "jwt expired" })).toBe(true);
  });

  // The literal bodies the modular-rest server actually emits on auth-gated
  // routes — verified against server-ts source. See AUTH_ERROR_PATTERNS.
  it.each([
    "User not found", // 412 — token valid but user purged
    "authentication is required", // 401 — missing/empty Authorization header
    "access denied", // 403 — lacks permission
    "Precondition Failed", // 412 — invalid/expired/wrong-sig token (reason swallowed)
    "jwt expired",
    "invalid signature",
    "jwt malformed",
    "invalid token",
    "Unauthorized", // defensive (proxies/gateways)
    "Forbidden", // defensive
  ])("matches real auth body: %s", (msg) => {
    expect(isAuthError(msg)).toBe(true);
  });

  // Real NON-auth bodies the same server emits — must not trigger a needless
  // anonymous re-auth (which would silently downgrade a registered user).
  it.each([
    "network error",
    "Request failed with status code 500",
    "Internal Server Error", // data-provider 500 (db/collection error)
    "Freemium limit reached",
    "not enough credit",
    "timeout of 10000ms exceeded",
  ])("does NOT match non-auth error: %s", (msg) => {
    expect(isAuthError(msg)).toBe(false);
  });

  it("does NOT match a field-validation 412 body (auth already passed)", () => {
    // data-provider/function validation failure: a JSON STRING under `error`.
    expect(isAuthError('{"status":"error","error":["query"]}')).toBe(false);
  });

  it("does NOT match a login failure whose message was lost to {e:{}}", () => {
    // /user/login wraps a bare Error → JSON.stringify drops it to {}. We must
    // NOT silently retry an explicit login as anonymous.
    expect(isAuthError({ status: "error", e: {} })).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isAuthError("USER NOT FOUND")).toBe(true);
    expect(isAuthError("PRECONDITION FAILED")).toBe(true);
  });

  it("returns false for empty / nullish input", () => {
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError("")).toBe(false);
    expect(isAuthError({})).toBe(false);
  });

  it("does not throw on a self-referential object", () => {
    const circular: Record<string, unknown> = {};
    circular.error = circular;
    expect(() => isAuthError(circular)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe("reauthAnonymously", () => {
  beforeEach(() => {
    auth.isLogin = false;
    auth.getToken = null;
    auth.loginAsAnonymous.mockReset();
    sendMessageMock().mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs in anonymously, persists the fresh token, and returns true", async () => {
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.getToken = "anon-token";
    });

    await expect(reauthAnonymously()).resolves.toBe(true);

    const calls = storeTokenCalls();
    expect(calls.length).toBe(1);
    expect((calls.at(-1)![0] as any).token).toBe("anon-token");
  });

  it("returns false and logs (does not throw) when anonymous login rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    auth.loginAsAnonymous.mockRejectedValue(new Error("network down"));

    await expect(reauthAnonymously()).resolves.toBe(false);
    expect(errSpy).toHaveBeenCalledWith(
      "Subturtle anonymous login failed",
      expect.any(Error)
    );
    expect(storeTokenCalls().length).toBe(0);
  });

  it("coalesces concurrent re-auths into a single loginAnonymous", async () => {
    // Hold loginAnonymous pending so all three calls overlap before it settles.
    let resolveLogin!: (v: unknown) => void;
    auth.loginAsAnonymous.mockImplementation(
      () => new Promise((r) => (resolveLogin = r))
    );

    const calls = [reauthAnonymously(), reauthAnonymously(), reauthAnonymously()];
    // All three joined the same in-flight login — no thundering herd.
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);

    auth.isLogin = true;
    auth.getToken = "anon-token";
    resolveLogin({ token: "anon-token" });

    expect(await Promise.all(calls)).toEqual([true, true, true]);
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    // Only ONE anon user minted → only one token persisted.
    expect(storeTokenCalls().length).toBe(1);
  });

  it("starts a fresh login for a re-auth after the previous one settled", async () => {
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
      auth.getToken = "anon-token";
    });

    await reauthAnonymously();
    await reauthAnonymously();

    // The in-flight guard reset between the two sequential calls.
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------

describe("withAuthRetry", () => {
  beforeEach(() => {
    // Default recovery is reauthAnonymously (modular-rest is not loaded here, so
    // its setSessionRecovery override never ran). Pin it defensively in case an
    // earlier test injected a custom recovery.
    setSessionRecovery(reauthAnonymously);

    auth.isLogin = false;
    auth.getToken = "anon-token";
    auth.loginAsAnonymous.mockReset();
    // Default: recovery succeeds (produces a usable session).
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
    });
    sendMessageMock().mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSessionRecovery(reauthAnonymously);
  });

  it("returns the result and never recovers when the call succeeds", async () => {
    const run = vi.fn().mockResolvedValue("ok");

    await expect(withAuthRetry(run)).resolves.toBe("ok");

    expect(run).toHaveBeenCalledTimes(1);
    expect(auth.loginAsAnonymous).not.toHaveBeenCalled();
  });

  it("recovers an anonymous session and retries once on an auth error", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce("User not found")
      .mockResolvedValueOnce("ok");

    await expect(withAuthRetry(run)).resolves.toBe("ok");

    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("recognizes the { hasError, error } wrapper dataProvider lets through", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce({ hasError: true, error: "Unauthorized" })
      .mockResolvedValueOnce(42);

    await expect(withAuthRetry(run)).resolves.toBe(42);
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry non-auth errors", async () => {
    const run = vi.fn().mockRejectedValue(new Error("network"));

    await expect(withAuthRetry(run)).rejects.toThrow("network");

    expect(auth.loginAsAnonymous).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("surfaces the original error when recovery produces no session", async () => {
    // loginAsAnonymous resolves but leaves isLogin false → recovery failed.
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = false;
    });
    const run = vi.fn().mockRejectedValue("User not found");

    await expect(withAuthRetry(run)).rejects.toBe("User not found");

    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries at most once — a still-failing token surfaces the error", async () => {
    const run = vi.fn().mockRejectedValue("User not found");

    await expect(withAuthRetry(run)).rejects.toBe("User not found");

    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    // Initial attempt + exactly one retry, then it gives up (no loop).
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("is generic over the thunk's return type", async () => {
    const obj = { phrase: "x", chunks: [] };
    const run = vi.fn().mockResolvedValue(obj);

    await expect(withAuthRetry(run)).resolves.toBe(obj);
  });

  it("delegates recovery to the injected strategy (setSessionRecovery)", async () => {
    // In production modular-rest installs the system-wide recoverSession
    // (logout + reauth). Verify withAuthRetry uses whatever was injected,
    // not the bare reauthAnonymously default.
    const customRecover = vi.fn().mockResolvedValue(true);
    setSessionRecovery(customRecover);

    const run = vi
      .fn()
      .mockRejectedValueOnce("User not found")
      .mockResolvedValueOnce("ok");

    await expect(withAuthRetry(run)).resolves.toBe("ok");

    expect(customRecover).toHaveBeenCalledTimes(1);
    expect(auth.loginAsAnonymous).not.toHaveBeenCalled(); // default bypassed
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("coalesces recovery across concurrent failing calls — one loginAnonymous", async () => {
    // The reported bug: a burst of failing requests each spawning its own
    // /user/loginAnonymous. Three independent calls fail with an auth error at
    // once; they must share ONE recovery, then each retry its own call.
    const mkRun = (ok: string) =>
      vi.fn().mockRejectedValueOnce("User not found").mockResolvedValueOnce(ok);
    const runA = mkRun("a");
    const runB = mkRun("b");
    const runC = mkRun("c");

    const results = await Promise.all([
      withAuthRetry(runA),
      withAuthRetry(runB),
      withAuthRetry(runC),
    ]);

    expect(results).toEqual(["a", "b", "c"]);
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1); // not 3
    expect(runA).toHaveBeenCalledTimes(2);
    expect(runB).toHaveBeenCalledTimes(2);
    expect(runC).toHaveBeenCalledTimes(2);
  });

  it("recovers again for a failure that arrives after the burst settled", async () => {
    const run1 = vi
      .fn()
      .mockRejectedValueOnce("User not found")
      .mockResolvedValueOnce("first");
    await expect(withAuthRetry(run1)).resolves.toBe("first");
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);

    // A later, separate failure must be able to trigger a fresh recovery.
    const run2 = vi
      .fn()
      .mockRejectedValueOnce("User not found")
      .mockResolvedValueOnce("second");
    await expect(withAuthRetry(run2)).resolves.toBe("second");
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(2);
  });
});
