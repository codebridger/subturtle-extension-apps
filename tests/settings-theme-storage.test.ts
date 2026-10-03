import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

import { useSettingsStore } from "../src/common/store/settings";

// In a content script `localStorage` is the HOST PAGE's storage. The store
// used to persist the theme as `localStorage.theme` — the key next-themes
// sites such as Product Hunt keep their own theme in — so switching the
// Subturtle theme on a site flipped the site's own theme on its next load.
// Only the extension's own pages (popup.html) may cache the theme there.
describe("settings store: theme never touches a host page's localStorage", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("on a website, setTheme leaves the site's own `theme` key alone", () => {
    vi.stubGlobal("location", new URL("https://www.producthunt.com/"));
    localStorage.setItem("theme", "light"); // the site's own preference

    const store = useSettingsStore();
    store.setTheme("dark");

    expect(localStorage.getItem("theme")).toBe("light");
    expect(Object.keys(localStorage)).toEqual(["theme"]);
  });

  it("on a website, initializeTheme ignores the site's `theme` key", () => {
    vi.stubGlobal("location", new URL("https://www.producthunt.com/"));
    localStorage.setItem("theme", "light");

    const store = useSettingsStore();
    store.initializeTheme();

    // The default until the background answers — not the site's value.
    expect(store.theme).toBe("dark");
  });

  it("on the popup, the theme is cached under a namespaced key", () => {
    vi.stubGlobal("location", new URL("chrome-extension://abc/popup.html"));

    useSettingsStore().setTheme("light");
    setActivePinia(createPinia());
    const store = useSettingsStore();
    store.initializeTheme();

    expect(localStorage.getItem("theme")).toBeNull();
    expect(store.theme).toBe("light");
  });
});
