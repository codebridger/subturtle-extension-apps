import {
  DefinitionStore,
  WordFromDictionaryApi,
} from "../types/dictionaryapi.type";

import { Dictionary } from "../types/general.type";
import { TinyEmitter } from "tiny-emitter";
import { SUPPORTED_LANGUES } from "../static/langueges.static";
import { analytic } from "../../plugins/mixpanel";
import { log } from "../helper/log";
import proxy from "./proxy.service";
import { functionProvider } from "@modular-rest/client";
import { LanguageLearningData } from "../../console-crane/modules/word-detail/types";

export class TranslateService {
  static instance = new TranslateService();
  _eventBus = new TinyEmitter();
  targetLanguage = "fa";

  constructor() {
    // Load target language
    //
    chrome.storage.local.get("target", (data) => {
      this.targetLanguage = data.target || "fa";

      analytic.register({ target: this.targetLanguage });
    });

    // Listen for change on target language
    //
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.target) {
        log("Target languege changed", message.target);

        analytic.track("Target changed", {
          to: message.target,
        });

        analytic.register({ target: message.target });

        this.targetLanguage = message.target;
        localStorage.setItem("target", this.targetLanguage);

        this._eventBus.emit("target-changed", this.targetLanguage);
      }
    });
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
    return functionProvider.run<{ data: string }>({
      name: "translateWithContext",
      args: {
        translationType: "simple",
        sourceLanguage: "auto",
        targetLanguage: this.targetLanguage,
        phrase: text,
        context: context || "",
      },
    });
  }

  async fetchDetailedTranslation(
    text: string | string[],
    context: string = ""
  ) {
    return functionProvider.run<LanguageLearningData>({
      name: "translateWithContext",
      args: {
        translationType: "detailed",
        sourceLanguage: "auto",
        targetLanguage: this.targetLanguage,
        phrase: text,
        context: context || "",
      },
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
