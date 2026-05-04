import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

import { useSettingsStore } from "../src/common/store/settings";

// Per-host Nibble toggle. The store hashes hosts via a private normalizeHost
// (lowercase + leading-`www.` strip) so equivalent hosts collapse to a single
// entry. setNibbleDisabledForHost also fires syncSettingsToBackground -> the
// chrome.runtime.sendMessage shim from tests/setup.ts swallows the call.
describe("settings store: per-host Nibble toggle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("normalizes case when checking", () => {
    const store = useSettingsStore();
    store.setNibbleDisabledForHost("Example.COM", true);

    expect(store.isNibbleDisabledForHost("example.com")).toBe(true);
    expect(store.isNibbleDisabledForHost("EXAMPLE.com")).toBe(true);
  });

  it("strips a leading www.", () => {
    const store = useSettingsStore();
    store.setNibbleDisabledForHost("www.example.com", true);

    expect(store.isNibbleDisabledForHost("example.com")).toBe(true);
    expect(store.isNibbleDisabledForHost("www.example.com")).toBe(true);
    expect(store.nibbleDisabledDomains).toEqual(["example.com"]);
  });

  it("does not duplicate an already-disabled host", () => {
    const store = useSettingsStore();
    store.setNibbleDisabledForHost("example.com", true);
    store.setNibbleDisabledForHost("www.example.com", true);
    store.setNibbleDisabledForHost("EXAMPLE.com", true);

    expect(store.nibbleDisabledDomains).toEqual(["example.com"]);
  });

  it("removes a host when disabled is set to false", () => {
    const store = useSettingsStore();
    store.setNibbleDisabledForHost("example.com", true);
    store.setNibbleDisabledForHost("other.com", true);
    expect(store.nibbleDisabledDomains).toEqual(["example.com", "other.com"]);

    store.setNibbleDisabledForHost("www.example.com", false);
    expect(store.nibbleDisabledDomains).toEqual(["other.com"]);
    expect(store.isNibbleDisabledForHost("example.com")).toBe(false);
  });

  it("ignores a re-enable of an already-enabled host", () => {
    const store = useSettingsStore();
    expect(store.nibbleDisabledDomains).toEqual([]);
    store.setNibbleDisabledForHost("example.com", false);
    expect(store.nibbleDisabledDomains).toEqual([]);
  });

  it("treats subdomains as distinct hosts", () => {
    const store = useSettingsStore();
    store.setNibbleDisabledForHost("blog.example.com", true);
    expect(store.isNibbleDisabledForHost("example.com")).toBe(false);
    expect(store.isNibbleDisabledForHost("blog.example.com")).toBe(true);
  });

  it("invokes chrome.runtime.sendMessage when a host is toggled", () => {
    const store = useSettingsStore();
    const sendMessage = (globalThis as any).chrome.runtime
      .sendMessage as ReturnType<typeof vi.fn>;
    sendMessage.mockClear();

    store.setNibbleDisabledForHost("example.com", true);

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
