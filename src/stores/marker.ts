import { defineStore } from "pinia";
import { TranslateService } from "../common/services/translate.service";

export interface MarkedWord {
  id: string;
  word: string;
  domeRect: DOMRect;
}

interface State {
  mode: "mark" | "select";
  marking: boolean;
  markedWords: MarkedWord[];
  sourceLanguage: string;
  translatedWords: Record<string, string>;
}

export const useMarkerStore = defineStore("marker", {
  state: (): State => ({
    mode: "select",
    marking: false,
    markedWords: [],
    sourceLanguage: "",
    translatedWords: {},
  }),

  getters: {
    // To distinguish between marking mode and selecting mode
    isMarkingMode: (state) => state.mode === "mark",
    // For handling mouse events to mark words
    isMarking: (state) => state.marking,
    words: (state) => state.markedWords,
    selectedPhrase: (state) => {
      return state.markedWords.map((item) => item.word).join(" ");
    },
  },

  actions: {
    translate() {
      let translatingList = [this.selectedPhrase];

      const _this = this;

      TranslateService.instance
        .translateByGoogle(translatingList)
        .then(({ list, lang }) => {
          _this.sourceLanguage = lang;

          translatingList.forEach((result, i) => {
            _this.translatedWords[result] = list[i];
          });
        });
    },

    toggleMarkingMode(value: boolean) {
      this.mode = value ? "mark" : "select";
    },

    toggleMarking(value: boolean) {
      this.marking = value;

      if (value == true) {
        const _this = this;
        document.addEventListener(
          "mouseup",
          () => {
            _this.toggleMarking(false);
          },
          { once: true }
        );
      }
    },

    markWord(id: string, word: string, domeRect: DOMRect) {
      const isExist = this.markedWords.find((item) => item.id === id);
      if (isExist) return;

      this.markedWords.push({ id, word, domeRect });
      // Sort base id
      this.markedWords = this.markedWords.sort((a, b) => {
        // id format is [line]-[wordIndex]-[line * wordIndex]
        // So, we can split the id by "-" and get the last element
        const aid = a.id.split("-").map(Number)[2];
        const bid = b.id.split("-").map(Number)[2];

        return aid - bid;
      });

      // Translate the selected phrase
      this.translate();
    },

    clear() {
      this.markedWords = [];
    },

    checkedSelected(id: string) {
      return !!this.markedWords.find((item) => item.id === id);
    },

    getWordId(line: number, wordIndex: number) {
      return line + "-" + wordIndex + "-" + line * wordIndex;
    },

    getSequentialId(id: string) {
      return id.split("-").map(Number)[2];
    },
  },
});

export const startMarking = (e: KeyboardEvent) => {
  if (e.key !== "Control" && e.key !== "Meta") return;

  useMarkerStore().toggleMarkingMode(true);
  document.body.style.cursor = "text";

  document.addEventListener("keyup", stopMarking);
};

export const stopMarking = (e: KeyboardEvent) => {
  if (e.key !== "Control" && e.key !== "Meta") return;

  useMarkerStore().toggleMarkingMode(false);

  document.body.style.cursor = "default";
  document.removeEventListener("keyup", stopMarking);
};
