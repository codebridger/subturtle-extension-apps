import { describe, it, expect, vi, beforeEach } from "vitest";
import { LanguageDetector } from "../src/common/helper/language-detection";

describe("LanguageDetector pure helpers", () => {
  describe("isRTLLanguage", () => {
    it.each(["ar", "he", "fa", "ur", "ps", "sd", "yi", "dv"])(
      "returns true for RTL language %s",
      (code) => {
        expect(LanguageDetector.isRTLLanguage(code)).toBe(true);
      }
    );

    it.each(["en", "es", "fr", "zh-CN", "ja"])(
      "returns false for LTR language %s",
      (code) => {
        expect(LanguageDetector.isRTLLanguage(code)).toBe(false);
      }
    );
  });

  describe("getTextDirection", () => {
    it("returns rtl for Persian", () => {
      expect(LanguageDetector.getTextDirection("fa")).toBe("rtl");
    });

    it("returns ltr for English", () => {
      expect(LanguageDetector.getTextDirection("en")).toBe("ltr");
    });
  });

  describe("getLanguageTitle", () => {
    it("looks up known codes", () => {
      expect(LanguageDetector.getLanguageTitle("en")).toBe("English");
      expect(LanguageDetector.getLanguageTitle("fa")).toBe("Persian");
      expect(LanguageDetector.getLanguageTitle("zh-CN")).toBe(
        "Chinese (Simplified)"
      );
    });

    it("returns null for unknown codes", () => {
      expect(LanguageDetector.getLanguageTitle("xx")).toBeNull();
      expect(LanguageDetector.getLanguageTitle("")).toBeNull();
    });
  });

  describe("isLanguageSupported", () => {
    it("returns true for codes present in the registry", () => {
      expect(LanguageDetector.isLanguageSupported("en")).toBe(true);
      expect(LanguageDetector.isLanguageSupported("fa")).toBe(true);
    });

    it("returns false for unknown codes", () => {
      expect(LanguageDetector.isLanguageSupported("xx")).toBe(false);
    });
  });

  describe("getSupportedLanguageCodes", () => {
    it("includes the common codes", () => {
      const codes = LanguageDetector.getSupportedLanguageCodes();
      expect(codes).toContain("en");
      expect(codes).toContain("fa");
      expect(codes).toContain("zh-CN");
      expect(codes).toContain("zh-TW");
    });
  });
});

describe("LanguageDetector chrome.* integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("setLanguage writes the code to chrome.storage.local", () => {
    const set = (globalThis as any).chrome.storage.local.set as ReturnType<
      typeof vi.fn
    >;
    set.mockClear();

    LanguageDetector.setLanguage("fa");

    expect(set).toHaveBeenCalledWith({ target: "fa" });
  });
});
