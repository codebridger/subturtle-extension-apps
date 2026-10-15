import { describe, it, expect, vi } from "vitest";
import {
  RTL_LANGUAGES,
  isRtlLanguage,
  languageChip,
  languageName,
  pickerLabel,
} from "../src/common/language/catalog";
import { rtls } from "../src/common/helper/text";
import { LanguageDetector } from "../src/common/helper/language-detection";
import { ensureRtlFont, fontFaceCss } from "../src/common/helper/rtl-font";
import type { LanguageCapabilities } from "../src/common/language/types";

describe("one right-to-left list (E-09)", () => {
  it("every RTL check reads the same list", () => {
    expect(rtls).toBe(RTL_LANGUAGES);
    for (const code of RTL_LANGUAGES) {
      expect(LanguageDetector.isRTLLanguage(code)).toBe(true);
      expect(isRtlLanguage(code)).toBe(true);
    }
  });

  it("covers the codes both old lists had", () => {
    for (const code of ["ar", "fa", "he", "ur", "ps", "sd", "yi", "dv", "ku", "ks"]) {
      expect(isRtlLanguage(code)).toBe(true);
    }
  });

  it("reads region tags and stays LTR for the learning languages", () => {
    expect(isRtlLanguage("fa-IR")).toBe(true);
    for (const code of ["en", "es", "de", "fr", "it", "sv", "lt"]) {
      expect(isRtlLanguage(code)).toBe(false);
    }
  });
});

describe("language names (Q13)", () => {
  const caps: LanguageCapabilities = {
    learning: [
      {
        code: "de",
        name: "German",
        nativeName: "Deutsch",
        rtl: false,
        ttsVoice: "",
        enabled: true,
        features: { save: true, review: true, cloze: true, coachText: true, coachVoice: true, levelTest: true, starterPack: true, map: false },
      },
    ],
    own: [{ code: "fa", name: "Persian", nativeName: "فارسی", rtl: true, explanationReviewed: "teacher" }],
  };

  it("shows English and native names in pickers", () => {
    expect(pickerLabel("de", caps)).toBe("German · Deutsch");
    expect(pickerLabel("es")).toBe("Spanish · Español");
  });

  it("shows one name when they are the same", () => {
    expect(pickerLabel("en")).toBe("English");
  });

  it("names own languages from the register, then the translate list", () => {
    expect(languageName("fa", caps)).toBe("Persian");
    expect(languageName("tr")).toBe("Turkish");
    expect(languageName("xx")).toBe("XX");
  });

  it("builds the chip", () => {
    expect(languageChip("de")).toBe("DE");
    expect(languageChip("zh-CN")).toBe("ZH");
  });
});

describe("bundled Vazirmatn (E-09)", () => {
  it("points the font at the extension's own assets, Arabic script only", () => {
    const css = fontFaceCss((p) => `chrome-extension://abc${p}`);
    expect(css).toContain('font-family:"Subturtle Vazirmatn"');
    expect(css).toContain("chrome-extension://abc/assets/fonts/Vazirmatn-Regular.ttf");
    expect(css).toContain("chrome-extension://abc/assets/fonts/Vazirmatn-SemiBold.ttf");
    expect(css).toContain("unicode-range:U+0600-06FF");
    expect(css).not.toContain("googleapis");
  });

  it("adds the @font-face once per document", () => {
    document.head.innerHTML = "";
    ensureRtlFont();
    ensureRtlFont();
    const styles = document.head.querySelectorAll("#subturtle-rtl-font");
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain("chrome-extension://test/assets/fonts/");
  });

  it("does nothing without an extension context", () => {
    document.head.innerHTML = "";
    const getURL = (globalThis as any).chrome.runtime.getURL;
    (globalThis as any).chrome.runtime.getURL = undefined;
    try {
      ensureRtlFont();
      expect(document.getElementById("subturtle-rtl-font")).toBeNull();
    } finally {
      (globalThis as any).chrome.runtime.getURL = getURL;
    }
  });
});

vi.mock("@modular-rest/client", () => ({
  authentication: { user: null },
  functionProvider: { run: vi.fn() },
}));
