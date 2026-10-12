import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import {
  ensureStoredTargetLanguage,
  pickDefaultTargetLanguage,
  toSupportedLanguageCode,
} from "../src/common/helper/default-language";
import SelectLanguage from "../src/common/components/inputs/SelectLanguage.vue";

describe("toSupportedLanguageCode", () => {
  it.each([
    ["fa-IR", "fa"],
    ["pt-BR", "pt"],
    ["zh-TW", "zh-TW"],
    ["zh-Hant-HK", "zh-TW"],
    ["zh", "zh-CN"],
    ["iw", "he"],
    ["he or iw", "he"],
    ["DE", "de"],
  ])("maps %s → %s", (tag, code) => {
    expect(toSupportedLanguageCode(tag)).toBe(code);
  });

  it.each([null, undefined, "", "xx-YY"])("returns null for %s", (tag) => {
    expect(toSupportedLanguageCode(tag as any)).toBeNull();
  });
});

describe("pickDefaultTargetLanguage", () => {
  it("never picks English — this is an English-learning product", () => {
    expect(pickDefaultTargetLanguage(["en-US", "en-GB", "en"])).toBeNull();
  });

  it("skips English and unsupported tags to the first usable one", () => {
    expect(pickDefaultTargetLanguage(["en-US", "xx", "fa-IR", "de"])).toBe(
      "fa"
    );
  });
});

describe("ensureStoredTargetLanguage (background)", () => {
  let store: Record<string, any>;

  beforeEach(() => {
    store = {};
    (chrome.storage.local as any).get = vi.fn(async (keys: string[]) => {
      const out: Record<string, any> = {};
      for (const k of [].concat(keys as any)) if (k in store) out[k] = store[k];
      return out;
    });
    (chrome.storage.local as any).set = vi.fn(async (obj: any) => {
      Object.assign(store, obj);
    });
  });

  it("persists the browser UI language on a fresh install", async () => {
    const settings = await ensureStoredTargetLanguage(["fa-IR", "en-US"]);
    expect(settings?.language).toBe("fa");
    expect(store.settings).toMatchObject({ language: "fa", theme: "dark" });
  });

  it("leaves the language unset when the browser is English-only", async () => {
    const settings = await ensureStoredTargetLanguage(["en-US", "en"]);
    expect(settings).toBeUndefined();
    expect(store.settings).toBeUndefined();
  });

  it("never overrides a language the user already picked", async () => {
    store.settings = { theme: "light", language: "de" };
    const settings = await ensureStoredTargetLanguage(["fa-IR"]);
    expect(settings?.language).toBe("de");
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it("migrates the legacy `target` key before looking at the UI", async () => {
    store.target = "tr";
    const settings = await ensureStoredTargetLanguage(["fa-IR"]);
    expect(settings?.language).toBe("tr");
  });

  it("repairs the old Hebrew code", async () => {
    store.settings = { theme: "dark", language: "he or iw" };
    const settings = await ensureStoredTargetLanguage([]);
    expect(settings?.language).toBe("he");
  });
});

describe("SelectLanguage", () => {
  it("shows the placeholder, not English, when nothing is stored", () => {
    const wrapper = mount(SelectLanguage, { props: { modelValue: "" } });
    const select = wrapper.find("select").element as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(select.selectedOptions[0].textContent).toContain(
      "Choose your language"
    );
  });

  it("shows the stored value", () => {
    const wrapper = mount(SelectLanguage, { props: { modelValue: "fa" } });
    expect((wrapper.find("select").element as HTMLSelectElement).value).toBe(
      "fa"
    );
  });
});
