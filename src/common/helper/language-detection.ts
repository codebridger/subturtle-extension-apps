import { SUPPORTED_LANGUES } from "../static/langueges.static";
import { isRtlLanguage, textDirection } from "../language/catalog";

/**
 * Lookups on the translate-language list.
 *
 * The old first-run guess (IP lookup through ipapi.co, then the browser and
 * Chrome UI languages) was removed in round 1 (E-10): nothing called it, and the
 * manifest asked for an `ipapi.co` permission only for it. The first-run guess
 * now lives in default-language.ts and runs only for signed-out learners; a
 * signed-in learner's own language comes from the server profile.
 */
export class LanguageDetector {
  /** All supported language codes from SUPPORTED_LANGUES. */
  static getSupportedLanguageCodes(): string[] {
    return SUPPORTED_LANGUES.map((lang) => lang.code);
  }

  static isLanguageSupported(langCode: string): boolean {
    return SUPPORTED_LANGUES.some((lang) => lang.code === langCode);
  }

  /** Language title by code ("fa" -> "Persian"), or null. */
  static getLanguageTitle(langCode: string): string | null {
    const lang = SUPPORTED_LANGUES.find((l) => l.code === langCode);
    return lang ? lang.title : null;
  }

  /** Right-to-left? Reads the one RTL list (common/language/catalog.ts, E-09). */
  static isRTLLanguage(langCode: string): boolean {
    return isRtlLanguage(langCode);
  }

  static getTextDirection(langCode: string): "ltr" | "rtl" {
    return textDirection(langCode);
  }

  /** Legacy `target` key, read by default-language.ts as a first-run hint. */
  static setLanguage(langCode: string) {
    chrome.storage.local.set({ target: langCode });
  }
}
