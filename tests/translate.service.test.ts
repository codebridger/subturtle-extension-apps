import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@modular-rest/client", () => ({
  functionProvider: {
    run: vi.fn(),
  },
  // translate.service reads authentication.user?.id to attach a userId for the
  // server-side translation_requested event.
  authentication: { user: { id: "test-user-id" } },
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

    // fetchSimpleTranslation logs to console.error on failure paths;
    // silence to keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
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
