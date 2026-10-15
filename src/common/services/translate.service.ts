import { functionProvider, authentication } from "@modular-rest/client";
import {
  Chunk,
  LanguageLearningData,
  TranslationAdvice,
} from "../../console-crane/modules/word-detail/types";
import { LanguageDetector } from "../helper/language-detection";
import { useSettingsStore } from "../store/settings";
import { withAuthRetry } from "../helper/auth-recovery";
import { useProfileStore } from "../../stores/profile";
import { resolveTranslationLanguage } from "../language/state";
import { languageName } from "../language/catalog";
import type { LanguageState } from "../language/types";
import { toSupportedLanguageCode } from "../helper/default-language";

// Cache interface for translation results
interface TranslationCache {
  [key: string]: {
    result: any;
    timestamp: number;
  };
}

export class MissingTargetLanguageError extends Error {
  constructor() {
    super(
      "Choose your language first: open the Subturtle popup and pick it under \"My language\"."
    );
    this.name = "MissingTargetLanguageError";
  }
}

export class TranslateService {
  static instance = new TranslateService();

  // Cache for translation results
  private translationCache: TranslationCache = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * The learner's own language code, the one translations are written in.
   * Signed in on a server with language profiles, it is the profile's
   * `translationLanguage` (E-01); otherwise the local setting (E-02).
   */
  get targetLanguage(): string {
    let state: LanguageState | null = null;
    try {
      state = useProfileStore().languageState;
    } catch (_e) {
      // No active Pinia (a bare unit test): use the local setting.
    }
    return resolveTranslationLanguage({
      signedIn: !!state,
      state,
      localLanguage: useSettingsStore().language,
    });
  }

  /** True when the own language came from the server profile. */
  private get targetFromServer(): boolean {
    try {
      return !!useProfileStore().languageState?.translationLanguage;
    } catch (_e) {
      return false;
    }
  }

  get languageTitle() {
    const code = this.targetLanguage;
    if (!code) return null;
    const title =
      LanguageDetector.getLanguageTitle(code) ||
      LanguageDetector.getLanguageTitle(toSupportedLanguageCode(code) || "");
    if (title) return title;
    // A server code the translate list does not have: use the register name.
    return this.targetFromServer ? languageName(code) : null;
  }

  /**
   * Round-1 argument for translateWithContext (B-14, B-17): the own language
   * as a code. Sent only when it came from the server, so an old server sees
   * exactly today's request.
   */
  private translationLanguageArg(): { translationLanguage?: string } {
    return this.targetFromServer
      ? { translationLanguage: this.targetLanguage }
      : {};
  }

  /**
   * The target language title to send to the server — never null.
   *
   * Content scripts don't always await settings before the first hover (the
   * subtitle bundle starts `initialize()` without awaiting it), so on a miss
   * we re-read settings from the background once; it resolves and persists a
   * first-run default there (default-language.ts). If there's still nothing,
   * fail loudly with a message the word card can show instead of sending
   * `targetLanguage: null` and getting an answer in a random language.
   */
  async requireLanguageTitle(): Promise<string> {
    if (this.languageTitle) return this.languageTitle;
    await useSettingsStore().fetchSettingsFromBackground();
    if (this.languageTitle) return this.languageTitle;
    throw new MissingTargetLanguageError();
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

  async fetchSimpleTranslation(text: string | string[], context: string = "") {
    // Clean expired cache entries
    this.cleanExpiredCache();

    const targetLanguage = await this.requireLanguageTitle();

    // Generate cache key
    const cacheKey = this.generateCacheKey(text, context, "simple");

    // Check if we have a cached result
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // If not cached, fetch from API
    try {
      const result = await withAuthRetry(() =>
        functionProvider.run<string>({
          name: "translateWithContext",
          args: {
            translationType: "simple",
            sourceLanguage: "auto",
            targetLanguage,
            ...this.translationLanguageArg(),
            phrase: text,
            context: context || "",
            // For the server-side translation_requested analytics event.
            userId: authentication.user?.id,
          },
        })
      );

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

    const targetLanguage = await this.requireLanguageTitle();

    // Generate cache key
    const cacheKey = this.generateCacheKey(text, context, "detailed");

    // Check if we have a cached result
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // If not cached, fetch from API
    try {
      const data = await withAuthRetry(() =>
        functionProvider.run<LanguageLearningData>({
          name: "translateWithContext",
          args: {
            translationType: "detailed",
            sourceLanguage: "auto",
            targetLanguage,
            ...this.translationLanguageArg(),
            phrase: text,
            context: context || "",
            // For the server-side translation_requested analytics event.
            userId: authentication.user?.id,
          },
        })
      );

      // Add context and phrase to the result
      data.context = context;
      data.phrase = text;
      if (!Array.isArray(data.chunks)) data.chunks = [];

      // Cache the result
      this.cacheResult(cacheKey, data);

      return data;
    } catch (error) {
      // Log error but don't cache failed requests
      console.error("Detailed translation error:", error);
      throw error;
    }
  }

  /**
   * Conversational advisor for the save modal's "fix this?" chat.
   * Returns either a plain-text reply or an updated chunks list.
   */
  async fetchTranslationAdvice(params: {
    phrase: string;
    context: string;
    message: string;
    currentChunks?: Chunk[];
    history?: { role: "user" | "assistant"; text: string }[];
  }): Promise<TranslationAdvice> {
    const targetLanguage = await this.requireLanguageTitle();
    return withAuthRetry(() =>
      functionProvider.run<TranslationAdvice>({
        name: "translationAdvice",
        args: {
          phrase: params.phrase,
          context: params.context || "",
          message: params.message,
          currentChunks: params.currentChunks || [],
          history: params.history || [],
          sourceLanguage: "auto",
          targetLanguage,
          ...this.translationLanguageArg(),
        },
      })
    );
  }
}
