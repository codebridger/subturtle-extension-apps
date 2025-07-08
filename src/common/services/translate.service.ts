import {
  DefinitionStore,
  WordFromDictionaryApi,
} from "../types/dictionaryapi.type";

import { Dictionary } from "../types/general.type";
import { TinyEmitter } from "tiny-emitter";
import { SUPPORTED_LANGUES } from "../static/langueges.static";

import proxy from "./proxy.service";
import { functionProvider } from "@modular-rest/client";
import { LanguageLearningData } from "../../console-crane/modules/word-detail/types";
import { LanguageDetector } from "../helper/language-detection";
import { useSettingsStore } from "../store/settings";

export class TranslateService {
  static instance = new TranslateService();
  _eventBus = new TinyEmitter();

  get targetLanguage() {
    return useSettingsStore().language;
  }

  get languageTitle() {
    return LanguageDetector.getLanguageTitle(this.targetLanguage);
  }

  constructor() {
    // No watcher or local state needed; use store directly
  }

  get targetLanguageTitle() {
    return (
      SUPPORTED_LANGUES.find((l) => l.code == this.targetLanguage)?.title || ""
    );
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
    return functionProvider.run<string>({
      name: "translateWithContext",
      args: {
        translationType: "simple",
        sourceLanguage: "auto",
        targetLanguage: this.languageTitle,
        phrase: text,
        context: context || "",
      },
    });
  }

  async fetchDetailedTranslation(text: string, context: string = "") {
    return functionProvider
      .run<LanguageLearningData>({
        name: "translateWithContext",
        args: {
          translationType: "detailed",
          sourceLanguage: "auto",
          targetLanguage: this.languageTitle,
          phrase: text,
          context: context || "",
        },
      })
      .then((data) => {
        data.context = context;
        data.phrase = text;

        return data;
      });
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

  addTargetChangeListerner(callback: (lang: string) => void) {
    this._eventBus.on("target-changed", callback);
  }

  removeTargetChangeListerner(callback: (lang: string) => void) {
    this._eventBus.off("target-changed", callback);
  }
}
