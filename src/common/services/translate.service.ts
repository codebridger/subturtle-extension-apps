import {
  DefinitionStore,
  WordFromDictionaryApi,
} from "../types/dictionaryapi.type";

import proxy from "./proxy.service";
import { functionProvider, authentication } from "@modular-rest/client";
import {
  Chunk,
  LanguageLearningData,
  TranslationAdvice,
} from "../../console-crane/modules/word-detail/types";
import { LanguageDetector } from "../helper/language-detection";
import { useSettingsStore } from "../store/settings";
import { withAuthRetry } from "../helper/auth-recovery";
import { getInstallId } from "../helper/install-id";

/**
 * What asked for a translation (E-05). Sent as `trigger` so the server's
 * `translation_requested` event can split requests by source (B-03).
 */
export type TranslationTrigger =
  | "caption"
  | "word"
  | "selection"
  | "definition"
  | "detail";

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
  // Requests on their way, by cache key (E-04).
  private inFlight = new Map<string, Promise<any>>();

  get targetLanguage() {
    return useSettingsStore().language;
  }

  get languageTitle() {
    return LanguageDetector.getLanguageTitle(this.targetLanguage);
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

  /**
   * E-04: register a request as in flight, so an identical call made before
   * it answers waits for it instead of sending a second request. The entry is
   * removed when the request settles, so a failure is never reused or cached.
   */
  private startInFlight(cacheKey: string) {
    let resolve!: (value: any) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<any>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // Nobody may be waiting on it: a failure here must not be "unhandled".
    promise.catch(() => {});
    this.inFlight.set(cacheKey, promise);
    const settle = () => this.inFlight.delete(cacheKey);
    return {
      resolve: (value: any) => (settle(), resolve(value)),
      reject: (reason: unknown) => (settle(), reject(reason)),
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

  /**
   * Analytics args for calls that fire a server event (E-01, E-05).
   * `deviceId` is the install's analytics id, read from storage on each call
   * so it is never empty while the id loads and follows the new id after
   * logout.
   */
  private async analyticsArgs(trigger?: TranslationTrigger) {
    const deviceId = await getInstallId();
    return {
      ...(deviceId ? { deviceId } : {}),
      ...(trigger ? { trigger } : {}),
    };
  }

  /**
   * `userId` (kept for old servers). Read inside the call withAuthRetry runs,
   * i.e. after ensureSession and again on the retry, so it always matches the
   * token that call carries: the server answers 403 when they differ.
   */
  private callerArg() {
    const userId = authentication.user?.id;
    return userId ? { userId } : {};
  }

  async fetchSimpleTranslation(
    text: string | string[],
    context: string = "",
    trigger?: TranslationTrigger
  ) {
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

    // The same request is already on its way: share it (E-04).
    const pending = this.inFlight.get(cacheKey);
    if (pending) return pending;
    const inFlight = this.startInFlight(cacheKey);

    // If not cached, fetch from API
    try {
      const analytics = await this.analyticsArgs(trigger);
      const result = await withAuthRetry(() =>
        functionProvider.run<string>({
          name: "translateWithContext",
          args: {
            translationType: "simple",
            sourceLanguage: "auto",
            targetLanguage,
            phrase: text,
            context: context || "",
            // For the server-side translation_requested analytics event.
            ...analytics,
            ...this.callerArg(),
          },
        })
      );

      // Cache the result
      this.cacheResult(cacheKey, result);
      inFlight.resolve(result);

      return result;
    } catch (error) {
      // Log error but don't cache failed requests
      console.error("Translation error:", error);
      inFlight.reject(error);
      throw error;
    }
  }

  async fetchDetailedTranslation(
    text: string,
    context: string = "",
    trigger: TranslationTrigger = "detail"
  ) {
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

    // The same request is already on its way: share it (E-04).
    const pending = this.inFlight.get(cacheKey);
    if (pending) return pending;
    const inFlight = this.startInFlight(cacheKey);

    // If not cached, fetch from API
    try {
      const analytics = await this.analyticsArgs(trigger);
      const data = await withAuthRetry(() =>
        functionProvider.run<LanguageLearningData>({
          name: "translateWithContext",
          args: {
            translationType: "detailed",
            sourceLanguage: "auto",
            targetLanguage,
            phrase: text,
            context: context || "",
            // For the server-side translation_requested analytics event.
            ...analytics,
            ...this.callerArg(),
          },
        })
      );

      // Add context and phrase to the result
      data.context = context;
      data.phrase = text;
      if (!Array.isArray(data.chunks)) data.chunks = [];

      // Cache the result
      this.cacheResult(cacheKey, data);
      inFlight.resolve(data);

      return data;
    } catch (error) {
      // Log error but don't cache failed requests
      console.error("Detailed translation error:", error);
      inFlight.reject(error);
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
    const { deviceId } = await this.analyticsArgs();
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
          ...(deviceId ? { deviceId } : {}),
        },
      })
    );
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
