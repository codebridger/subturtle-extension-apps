import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import mixpanel from "mixpanel-browser";

import {
  useDefaultBundleStore,
  STORAGE_KEY,
  MAX_PAGES,
} from "../src/stores/default-bundle";
import { ANON_ID_KEY, resetAnalyticsIdentity } from "../src/plugins/mixpanel";

// In a content script `localStorage` and `document.cookie` belong to the HOST
// site. These pin that the default-bundle map and mixpanel's state live in
// chrome.storage instead (see CLAUDE.md § Gotchas).

/** An in-memory chrome.storage.local, since the shared shim stores nothing. */
function memoryChromeStorage() {
  const mem: Record<string, any> = {};
  (chrome.storage.local.get as any).mockImplementation(
    (key: string, cb: (d: any) => void) => cb(key in mem ? { [key]: mem[key] } : {})
  );
  (chrome.storage.local.set as any).mockImplementation(
    (obj: Record<string, any>, cb?: () => void) => {
      Object.assign(mem, structuredClone(obj));
      cb?.();
    }
  );
  return mem;
}

describe("default bundles: chrome.storage, not the host's localStorage", () => {
  let mem: Record<string, any>;
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    mem = memoryChromeStorage();
  });

  it("round-trips per page without touching localStorage", async () => {
    const store = useDefaultBundleStore();
    await store.setDefaultBundles(["b1", "b2"]);

    expect(await store.getDefaultBundles()).toEqual(["b1", "b2"]);
    expect(mem[STORAGE_KEY][window.location.href]).toEqual(["b1", "b2"]);
    expect(localStorage.length).toBe(0);
  });

  it("moves a copy older builds left in the host's localStorage, then removes it", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ [window.location.href]: ["old"], "https://x.test/a": ["a"] })
    );
    localStorage.setItem("theme", "light"); // the site's own key: untouched

    expect(await useDefaultBundleStore().getDefaultBundles()).toEqual(["old"]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("theme")).toBe("light");
    expect(mem[STORAGE_KEY]["https://x.test/a"]).toEqual(["a"]);
  });

  it("prefers chrome.storage over the legacy host copy for the same page", async () => {
    mem[STORAGE_KEY] = { [window.location.href]: ["new"] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [window.location.href]: ["old"] }));

    expect(await useDefaultBundleStore().getDefaultBundles()).toEqual(["new"]);
  });

  it(`keeps only the ${MAX_PAGES} most recently used pages`, async () => {
    const map: Record<string, string[]> = {};
    for (let i = 0; i < MAX_PAGES; i++) map[`https://x.test/${i}`] = [`b${i}`];
    mem[STORAGE_KEY] = map;

    await useDefaultBundleStore().setDefaultBundles(["here"]);

    const urls = Object.keys(mem[STORAGE_KEY]);
    expect(urls).toHaveLength(MAX_PAGES);
    expect(urls).not.toContain("https://x.test/0");
    expect(urls.at(-1)).toBe(window.location.href);
  });
});

describe("analytics: no cookie or localStorage on the host page", () => {
  it("initializes mixpanel with persistence and the request queue off", () => {
    const config = (mixpanel.init as any).mock.calls[0][1];
    expect(config).toMatchObject({ disable_persistence: true, batch_requests: false });
  });

  it("logout without an identified user keeps the device's anonymous id", () => {
    const mem = memoryChromeStorage();
    mem[ANON_ID_KEY] = "device-id";
    (mixpanel.get_property as any).mockReturnValue(undefined);

    resetAnalyticsIdentity();

    expect(mixpanel.reset).toHaveBeenCalled();
    expect(mem[ANON_ID_KEY]).toBe("device-id");
    expect(mixpanel.register).toHaveBeenLastCalledWith({
      distinct_id: "device-id",
      $device_id: "device-id",
    });
  });

  it("logout of an identified user rotates the stored anonymous id", () => {
    const mem = memoryChromeStorage();
    mem[ANON_ID_KEY] = "before";
    // $user_id is present before reset(), as after identify(user.id).
    (mixpanel.get_property as any).mockReturnValueOnce("user-123");

    resetAnalyticsIdentity();

    expect(mixpanel.reset).toHaveBeenCalled();
    expect(mem[ANON_ID_KEY]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(mixpanel.register).toHaveBeenCalledWith({
      distinct_id: mem[ANON_ID_KEY],
      $device_id: mem[ANON_ID_KEY],
    });
  });
});
