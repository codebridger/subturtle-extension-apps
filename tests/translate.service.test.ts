import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Controllable @modular-rest/client mock. translate.service reads
// authentication.user?.id for analytics; withAuthRetry's recovery path (in
// helper/auth-recovery) calls authentication.loginAsAnonymous and reads
// isLogin/getToken. Exposing those lets the self-heal integration tests drive
// a successful recovery without the network — and, because withAuthRetry now
// calls reauthAnonymously intra-module, mocking at this boundary is the only
// way to control recovery from a consumer test.
// vi.hoisted so `auth` exists before the hoisted vi.mock factory runs (a
// top-level import of translate.service pulls @modular-rest/client in eagerly).
const auth = vi.hoisted(() => ({
  user: { id: "test-user-id" } as { id: string } | null,
  isLogin: true,
  getToken: "anon-token" as string | null,
  loginAsAnonymous: vi.fn(),
}));

vi.mock("@modular-rest/client", () => ({
  functionProvider: { run: vi.fn() },
  authentication: auth,
}));

import { TranslateService } from "../src/common/services/translate.service";
import { useSettingsStore } from "../src/common/store/settings";
import { functionProvider } from "@modular-rest/client";

const runMock = functionProvider.run as unknown as ReturnType<typeof vi.fn>;

// The cache key is `${type}_${languageTitle}_${text}_${context}` so all four
// dimensions are exercised. Eviction is tested with vi fake timers because
// CACHE_DURATION is 24h and there is no public clear() on the singleton.
describe("TranslateService cache", () => {
  let svc: TranslateService;

  beforeEach(() => {
    setActivePinia(createPinia());
    useSettingsStore().language = "en";

    // The singleton is shared across imports; reset the private cache so
    // tests don't leak state into each other.
    (TranslateService.instance as any).translationCache = {};
    svc = TranslateService.instance;

    runMock.mockReset();
    runMock.mockResolvedValue("translated");

    auth.loginAsAnonymous.mockClear();
    auth.isLogin = true;
    auth.getToken = "anon-token";

    // fetchSimpleTranslation logs to console.error on failure paths;
    // silence to keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the cached result for identical (text, context, type, lang)", async () => {
    const a = await svc.fetchSimpleTranslation("hello", "ctx");
    const b = await svc.fetchSimpleTranslation("hello", "ctx");

    expect(a).toBe("translated");
    expect(b).toBe("translated");
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it("misses cache when context differs", async () => {
    await svc.fetchSimpleTranslation("hello", "ctxA");
    await svc.fetchSimpleTranslation("hello", "ctxB");
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it("misses cache when target language changes", async () => {
    await svc.fetchSimpleTranslation("hello", "ctx");
    useSettingsStore().language = "fa";
    await svc.fetchSimpleTranslation("hello", "ctx");
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it("keys simple and detailed translations separately", async () => {
    runMock.mockResolvedValue({ phrase: "", context: "" });
    await svc.fetchSimpleTranslation("hello", "ctx");
    await svc.fetchDetailedTranslation("hello", "ctx");
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it("evicts entries older than the 24h CACHE_DURATION", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await svc.fetchSimpleTranslation("hello", "ctx");
    expect(runMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-01-01T23:59:00Z"));
    await svc.fetchSimpleTranslation("hello", "ctx");
    expect(runMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-01-02T00:01:00Z"));
    await svc.fetchSimpleTranslation("hello", "ctx");
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed requests", async () => {
    runMock.mockRejectedValueOnce(new Error("network"));
    await expect(svc.fetchSimpleTranslation("hello", "ctx")).rejects.toThrow(
      "network"
    );

    runMock.mockResolvedValue("ok");
    const result = await svc.fetchSimpleTranslation("hello", "ctx");
    expect(result).toBe("ok");
    expect(runMock).toHaveBeenCalledTimes(2);
  });
});

// Regression net for the "Translation failed / User not found" report: a stale
// anonymous token in chrome.storage.sync must self-heal — translation wraps its
// calls in withAuthRetry, which recovers an anonymous session and retries once.
// The retry POLICY itself is covered in tests/auth-recovery.test.ts; here we
// only assert translation is wired to it and the recovered result still caches.
describe("TranslateService auth recovery (integration)", () => {
  let svc: TranslateService;

  beforeEach(() => {
    setActivePinia(createPinia());
    useSettingsStore().language = "en";
    (TranslateService.instance as any).translationCache = {};
    svc = TranslateService.instance;

    runMock.mockReset();
    auth.loginAsAnonymous.mockClear();
    auth.loginAsAnonymous.mockImplementation(async () => {
      auth.isLogin = true;
    });
    auth.isLogin = true;
    auth.getToken = "anon-token";

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("self-heals on 'User not found' and caches the retried result", async () => {
    runMock.mockRejectedValueOnce("User not found").mockResolvedValueOnce("ok");

    const first = await svc.fetchSimpleTranslation("hello", "ctx");
    const second = await svc.fetchSimpleTranslation("hello", "ctx");

    expect(first).toBe("ok");
    expect(second).toBe("ok");
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    // 2 from the recover+retry of the first call, none from the cached second.
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it("self-heals on the detailed translation path too", async () => {
    runMock
      .mockRejectedValueOnce({ hasError: true, error: "User not found" })
      .mockResolvedValueOnce({ phrase: "", context: "" });

    const result = await svc.fetchDetailedTranslation("hello", "ctx");

    expect(result).toBeTruthy();
    expect(auth.loginAsAnonymous).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledTimes(2);
  });
});
