import { SUPPORTED_LANGUES } from "../static/langueges.static";

export class LanguageDetector {
  /**
   * Get default language with priority order:
   * 1. User's previously selected language (stored preference)
   * 2. IP-based location detection
   * 3. Browser language detection
   * 4. Chrome extension API detection
   * 5. Fallback to English
   */
  static async getDefaultLanguage(): Promise<string> {
    // 1. Check if user has already set a preference (highest priority)
    const stored = await this.getStoredLanguage();
    if (stored) return stored;

    // 2. Try IP-based location detection (second priority)
    const locationLang = await this.detectLanguageByLocation();
    if (locationLang) return locationLang;

    // 3. Try browser language detection
    const browserLang = this.detectBrowserLanguage();
    if (browserLang) return browserLang;

    // 4. Try Chrome extension API
    const chromeLang = this.detectChromeLanguage();
    if (chromeLang) return chromeLang;

    // 5. Fallback to English
    return "en";
  }

  /**
   * Get user's stored language preference
   */
  private static async getStoredLanguage(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get("target", (data) => {
        resolve(data.target || null);
      });
    });
  }

  /**
   * Detect language based on user's IP location
   */
  private static async detectLanguageByLocation(): Promise<string | null> {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      const countryCode = data.country_code;

      if (!countryCode) return null;

      // Map country codes to language codes
      const countryToLanguage: Record<string, string> = {
        // North America
        US: "en",
        CA: "en",
        MX: "es",

        // Europe
        GB: "en",
        IE: "en",
        FR: "fr",
        BE: "fr",
        CH: "fr",
        LU: "fr",
        MC: "fr",
        DE: "de",
        AT: "de",
        LI: "de",
        ES: "es",
        AD: "es",
        IT: "it",
        SM: "it",
        VA: "it",
        PT: "pt",
        BR: "pt",
        AO: "pt",
        MZ: "pt",
        CV: "pt",
        GW: "pt",
        ST: "pt",
        TL: "pt",
        RU: "ru",
        BY: "ru",
        KZ: "ru",
        KG: "ru",
        TJ: "ru",
        TM: "ru",
        UZ: "ru",
        PL: "pl",
        NL: "nl",
        SE: "sv",
        NO: "no",
        DK: "da",
        FI: "fi",
        CZ: "cs",
        SK: "sk",
        HU: "hu",
        RO: "ro",
        MD: "ro",
        BG: "bg",
        HR: "hr",
        SI: "sl",
        EE: "et",
        LV: "lv",
        LT: "lt",
        GR: "el",
        CY: "el",
        MT: "mt",
        IS: "is",
        FO: "fo",
        UA: "uk",
        GE: "ka",
        AM: "hy",
        AZ: "az",
        TR: "tr",
        AL: "sq",
        MK: "mk",
        RS: "sr",
        ME: "sr",
        BA: "bs",
        XK: "sq",

        // Asia
        JP: "ja",
        KR: "ko",
        KP: "ko",
        CN: "zh-CN",
        HK: "zh-TW",
        TW: "zh-TW",
        MO: "zh-TW",
        SG: "en",
        TH: "th",
        VN: "vi",
        LA: "lo",
        KH: "km",
        MM: "my",
        MY: "ms",
        BN: "ms",
        ID: "id",
        PH: "tl",
        BD: "bn",
        NP: "ne",
        LK: "si",
        MV: "dv",
        PK: "ur",
        IN: "hi",
        BT: "dz",
        MN: "mn",
        AF: "ps",
        IR: "fa",
        IQ: "ar",
        SA: "ar",
        EG: "ar",
        LY: "ar",
        TN: "ar",
        DZ: "ar",
        MA: "ar",
        SD: "ar",
        YE: "ar",
        OM: "ar",
        AE: "ar",
        QA: "ar",
        KW: "ar",
        BH: "ar",
        JO: "ar",
        LB: "ar",
        SY: "ar",
        PS: "ar",
        IL: "he",

        // Africa
        ZA: "en",
        ZW: "en",
        BW: "en",
        ZM: "en",
        MW: "en",
        SZ: "en",
        LS: "en",
        NA: "en",
        NG: "en",
        GH: "en",
        KE: "en",
        UG: "en",
        TZ: "en",
        RW: "en",
        BI: "en",
        SS: "en",
        ET: "am",
        SO: "so",
        DJ: "so",
        ER: "ti",

        // Oceania
        AU: "en",
        NZ: "en",
        FJ: "en",
        PG: "en",
        SB: "en",
        VU: "en",
        NC: "en",
        PF: "en",
        WS: "sm",
        TO: "to",
        KI: "en",
        TV: "en",
        NR: "en",
        PW: "en",
        MH: "en",
        FM: "en",
        CK: "en",
        NU: "en",
        TK: "en",
        WF: "fr",
        AS: "en",
        GU: "en",
        MP: "en",

        // South America
        AR: "es",
        CL: "es",
        CO: "es",
        PE: "es",
        VE: "es",
        EC: "es",
        BO: "es",
        PY: "es",
        UY: "es",
        GY: "en",
        SR: "nl",
        GF: "fr",
        FK: "en",

        // Central America
        GT: "es",
        BZ: "en",
        SV: "es",
        HN: "es",
        NI: "es",
        CR: "es",
        PA: "es",

        // Caribbean
        CU: "es",
        JM: "en",
        HT: "ht",
        DO: "es",
        PR: "es",
        TT: "en",
        BB: "en",
        GD: "en",
        LC: "en",
        VC: "en",
        AG: "en",
        KN: "en",
        DM: "en",
        MQ: "fr",
        GP: "fr",
        BL: "fr",
        MF: "fr",
        SX: "nl",
        CW: "nl",
        AW: "nl",
        BQ: "nl",
      };

      const detectedLang = countryToLanguage[countryCode];
      if (detectedLang) {
        // Verify the detected language is in our supported languages
        const supportedLang = SUPPORTED_LANGUES.find(
          (l) => l.code === detectedLang
        );
        if (supportedLang) {
          return detectedLang;
        }
      }

      return null;
    } catch (error) {
      console.warn("Failed to detect language by location:", error);
      return null;
    }
  }

  /**
   * Detect language from browser's navigator.language
   */
  private static detectBrowserLanguage(): string | null {
    try {
      const browserLanguages = navigator.languages || [navigator.language];

      for (const lang of browserLanguages) {
        const langCode = lang.split("-")[0]; // Get primary language code
        const supportedLang = SUPPORTED_LANGUES.find(
          (l) => l.code === langCode
        );
        if (supportedLang) {
          return langCode;
        }
      }

      return null;
    } catch (error) {
      console.warn("Failed to detect browser language:", error);
      return null;
    }
  }

  /**
   * Detect language using Chrome extension API
   */
  private static detectChromeLanguage(): string | null {
    try {
      const chromeLang = chrome.i18n.getUILanguage();
      const langCode = chromeLang.split("-")[0];
      const supportedLang = SUPPORTED_LANGUES.find((l) => l.code === langCode);
      return supportedLang ? langCode : null;
    } catch (error) {
      console.warn("Failed to detect Chrome language:", error);
      return null;
    }
  }

  /**
   * Get all supported language codes from SUPPORTED_LANGUES
   */
  static getSupportedLanguageCodes(): string[] {
    return SUPPORTED_LANGUES.map((lang) => lang.code);
  }

  /**
   * Check if a language code is supported
   */
  static isLanguageSupported(langCode: string): boolean {
    return SUPPORTED_LANGUES.some((lang) => lang.code === langCode);
  }

  /**
   * Get language title by code
   */
  static getLanguageTitle(langCode: string): string | null {
    const lang = SUPPORTED_LANGUES.find((l) => l.code === langCode);
    return lang ? lang.title : null;
  }

  /**
   * Check if a language is RTL (Right-to-Left)
   */
  static isRTLLanguage(langCode: string): boolean {
    const rtlLanguages = ["ar", "he", "fa", "ur", "ps", "sd", "yi", "dv"];
    return rtlLanguages.includes(langCode);
  }

  /**
   * Get text direction for a language
   */
  static getTextDirection(langCode: string): "ltr" | "rtl" {
    return this.isRTLLanguage(langCode) ? "rtl" : "ltr";
  }

  static setLanguage(langCode: string) {
    chrome.storage.local.set({ target: langCode });
  }
}
