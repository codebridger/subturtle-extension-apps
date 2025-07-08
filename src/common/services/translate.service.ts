import {
  DefinitionStore,
  WordFromDictionaryApi,
} from "../types/dictionaryapi.type";

import { Dictionary } from "../types/general.type";

import proxy from "./proxy.service";
import { functionProvider } from "@modular-rest/client";
import { LanguageLearningData } from "../../console-crane/modules/word-detail/types";
import { LanguageDetector } from "../helper/language-detection";
import { useSettingsStore } from "../store/settings";

// Cache interface for translation results
interface TranslationCache {
  [key: string]: {
    result: any;
    timestamp: number;
  };
}

export class TranslateService {
  static instance = new TranslateService();

  // Cache for translation results
  private translationCache: TranslationCache = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  get targetLanguage() {
    return useSettingsStore().language;
  }

  get languageTitle() {
    return LanguageDetector.getLanguageTitle(this.targetLanguage);
  }

  constructor() {
    // No watcher or local state needed; use store directly
  }

  // Generate cache key for translation requests
  private generateCacheKey(
    text: string | string[],
    context: string,
    translationType: "simple" | "detailed"
  ): string {
    const textStr = Array.isArray(text) ? text.join("|") : text;
    return `${translationType}_${this.languageTitle}_${textStr}_${context}`;
  }

  // Check if cached result exists and is still valid
  private getCachedResult(cacheKey: string): any | null {
    const cached = this.translationCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    return null;
  }

  // Store result in cache
  private cacheResult(cacheKey: string, result: any): void {
    this.translationCache[cacheKey] = {
      result,
      timestamp: Date.now(),
    };
  }

  // Clean expired cache entries
  private cleanExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.translationCache).forEach((key) => {
      if (now - this.translationCache[key].timestamp > this.CACHE_DURATION) {
        delete this.translationCache[key];
      }
    });
  }

  async translateByGoogleTranslate(text: string | string[]) {
    let key = process.env.GOOGLE_TRANSLATE_KEY;
    let url = {
      url: `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      proxyUrl: process.env.GOOGLE_TRANSLATE_PROXY_URL,
    };

    let body = {
      q: text,
      target: this.targetLanguage,
    };

    return proxy
      .post(url, body)
      .then((body: Dictionary) => body.data.translations)
      .then((list) => {
        let lang = "en";

        let newList = list.map(
          (item: { translatedText: string; detectedSourceLanguage: string }) =>
            item.translatedText
        ) as string[];

        return {
          lang,
          list: newList,
        };
      });
  }

  async fetchSimpleTranslation(text: string | string[], context: string = "") {
    // Clean expired cache entries
    this.cleanExpiredCache();

    // Generate cache key
    const cacheKey = this.generateCacheKey(text, context, "simple");

    // Check if we have a cached result
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // If not cached, fetch from API
    try {
      const result = await functionProvider.run<string>({
        name: "translateWithContext",
        args: {
          translationType: "simple",
          sourceLanguage: "auto",
          targetLanguage: this.languageTitle,
          phrase: text,
          context: context || "",
        },
      });

      // Cache the result
      this.cacheResult(cacheKey, result);

      return result;
    } catch (error) {
      // Log error but don't cache failed requests
      console.error("Translation error:", error);
      throw error;
    }
  }

  async fetchDetailedTranslation(text: string, context: string = "") {
    // Clean expired cache entries
    this.cleanExpiredCache();

    // Generate cache key
    const cacheKey = this.generateCacheKey(text, context, "detailed");

    // Check if we have a cached result
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // If not cached, fetch from API
    try {
      const data = await functionProvider.run<LanguageLearningData>({
        name: "translateWithContext",
        args: {
          translationType: "detailed",
          sourceLanguage: "auto",
          targetLanguage: this.languageTitle,
          phrase: text,
          context: context || "",
        },
      });

      // Add context and phrase to the result
      data.context = context;
      data.phrase = text;

      // Cache the result
      this.cacheResult(cacheKey, data);

      return data;
    } catch (error) {
      // Log error but don't cache failed requests
      console.error("Detailed translation error:", error);
      throw error;
    }
  }

  async translateByDictionaryapi(word: string) {
    let url = {
      url: "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURI(word),
      proxyUrl: null,
    };

    return proxy
      .get(url)
      .then((body) => {
        if (body.title) throw body;
        else return body as WordFromDictionaryApi[];
      })
      .then((list) => {
        let store = new DefinitionStore(list);
        return store;
      });
  }
}
