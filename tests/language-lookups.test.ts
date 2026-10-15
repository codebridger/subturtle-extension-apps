import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/** Per-language lookups and storage (E-07). */

const h = vi.hoisted(() => ({ findOne: vi.fn(), run: vi.fn() }));

vi.mock("@modular-rest/client", () => ({
  dataProvider: { findOne: h.findOne },
  functionProvider: { run: h.run },
  authentication: { user: { id: "u1" } },
}));

import { findSavedPhrase } from "../src/common/services/phrase.service";
import { BundleSuggestionService } from "../src/common/services/bundle-suggestion.service";
import { useDefaultBundleStore, STORAGE_KEY } from "../src/stores/default-bundle";

describe("findSavedPhrase per language", () => {
  beforeEach(() => {
    h.findOne.mockReset();
    h.findOne.mockResolvedValue({ _id: "p1" });
  });

  it("matches the phrase in that language only, never a kept phrase", async () => {
    await findSavedPhrase(" Gift ", "de");
    expect(h.findOne.mock.calls[0][0].query).toEqual({
      refId: "u1",
      phrase: "Gift",
      language: "de",
      status: { $ne: "pending" },
    });
  });

  it("English also matches phrases stored without a language", async () => {
    await findSavedPhrase("Gift", "en");
    expect(h.findOne.mock.calls[0][0].query.language).toEqual({ $in: ["en", null] });
  });

  it("without a language it is the old lookup", async () => {
    await findSavedPhrase("Gift");
    expect(h.findOne.mock.calls[0][0].query).toEqual({ refId: "u1", phrase: "Gift" });
  });
});

describe("bundle suggestion per language", () => {
  beforeEach(() => {
    h.run.mockReset();
    h.run.mockResolvedValue({ matchedBundle: null, suggestedName: "Dark S1" });
    BundleSuggestionService.instance.clear();
  });

  it("sends the language and caches per language", async () => {
    await BundleSuggestionService.instance.getForCurrentPage("de");
    await BundleSuggestionService.instance.getForCurrentPage("de");
    await BundleSuggestionService.instance.getForCurrentPage("en");
    expect(h.run).toHaveBeenCalledTimes(2);
    expect(h.run.mock.calls[0][0].args.language).toBe("de");
    expect(h.run.mock.calls[1][0].args.language).toBe("en");
  });

  it("sends no language on old servers", async () => {
    await BundleSuggestionService.instance.getForCurrentPage();
    expect(h.run.mock.calls[0][0].args).not.toHaveProperty("language");
  });

  it("clearing a page drops every language for it", async () => {
    await BundleSuggestionService.instance.getForCurrentPage("de");
    await BundleSuggestionService.instance.getForCurrentPage();
    BundleSuggestionService.instance.clear(location.href);
    await BundleSuggestionService.instance.getForCurrentPage("de");
    await BundleSuggestionService.instance.getForCurrentPage();
    expect(h.run).toHaveBeenCalledTimes(4);
  });
});

describe("last-used bundles per language", () => {
  let stored: Record<string, any>;

  beforeEach(() => {
    setActivePinia(createPinia());
    stored = {};
    const local = (globalThis as any).chrome.storage.local;
    local.get = vi.fn((key: string, cb: (d: any) => void) => cb({ [key]: stored[key] }));
    local.set = vi.fn((obj: any, cb?: () => void) => {
      Object.assign(stored, obj);
      cb && cb();
    });
  });

  it("keeps German and English bundles apart on the same page", async () => {
    const store = useDefaultBundleStore();
    await store.setDefaultBundles(["en-b"], "en");
    await store.setDefaultBundles(["de-b"], "de");
    expect(await store.getDefaultBundles("en")).toEqual(["en-b"]);
    expect(await store.getDefaultBundles("de")).toEqual(["de-b"]);
  });

  it("English uses the old key, so remembered bundles still preselect", async () => {
    const store = useDefaultBundleStore();
    await store.setDefaultBundles(["old"]);
    expect(await store.getDefaultBundles("en")).toEqual(["old"]);
    expect(Object.keys(stored[STORAGE_KEY])).toEqual([location.href]);
  });
});
