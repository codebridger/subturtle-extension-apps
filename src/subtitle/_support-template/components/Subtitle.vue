<template>
  <div>
    <!-- 
    TRANSLATE CONTENT
    -->
    <div
      class="translated-word flex justify-center"
      :style="translateStyle"
      :dir="dir"
    >
      <span v-if="activeTranslate.length" :style="textStyle">{{
        // $filters.cleanText(activeTranslate)
      }}</span>

      <SvgLoader v-else width="60px" asset="WORD_LOADING" />
    </div>

    <!-- SUBTITLE
    -->
    <transition name="fade">
      <div v-if="textList?.length" class="container" :style="subtitleWrapper">
        <!-- ICON 
        -->
        <translate-button
          class="-left-10 absolute"
          :style="iconContainerStyle"
          v-model="showTranslatedSentence"
        />

        <!-- TRANSLATED LINES 
        -->
        <template v-if="showTranslatedSentence">
          <div :dir="dir">
            <p :style="textStyle" v-for="(line, i) in translatedLines" :key="i">
              {{ line }}
            </p>
          </div>
        </template>

        <!-- TRANSLATE WORDS
        -->
        <template v-else :dir="sourceDir">
          <div v-for="(line, i) in textList" :key="i">
            <p class="inline whitespace-nowrap" :style="textStyle">
              <word
                v-for="(word, i2) in line.split(' ')"
                :key="i2"
                :modelValue="word + ' '"
                @mouseenter="hoveredWord = word"
                @mouseleave="hoveredWord = ''"
                @click="
                  showWordDetail = true;
                  activeWord = word;
                "
              />
            </p>
          </div>
        </template>
      </div>
    </transition>

    <modal v-model="showWordDetail">
      <word-detail
        :word="activeWord"
        :translatedWord="translatedWords[activeWord]"
      />
    </modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw, PropType, StyleValue } from "vue";
import { clamp } from "../../../common/helper/math";
import { getDir, rtls } from "../../../common/helper/text";
import { TranslateService } from "../../../common/services/translate.service";
import {
  createCaptionTranslationGate,
  type CaptionTranslationGate,
} from "../../helpers/caption-translation-gate";
import { Dictionary } from "../../../common/types/general.type";
import { analytic } from "../../../plugins/mixpanel";

interface DataModel {
  translatedWords: Dictionary;
  translatedLines: String[];
  hoveredWord: string;
  activeWord: string;
  sourceLanguage: string;
  showTranslatedSentence: boolean;
  showWordDetail: boolean;
  captionGate: CaptionTranslationGate | null;
}

export default defineComponent({
  props: {
    positionRect: Object,
    textList: { type: Object as PropType<string[]> },
    textStyle: Object,
  },

  data(): DataModel {
    return {
      translatedWords: {},
      translatedLines: [],
      hoveredWord: "",
      activeWord: "",
      sourceLanguage: "en",
      showTranslatedSentence: false,
      showWordDetail: false,
      captionGate: null,
    };
  },

  created() {
    // Not reactive state: the gate only holds a timer and the last caption.
    this.captionGate = markRaw(
      createCaptionTranslationGate((text) => this.translateWholeCaption(text))
    );
  },

  beforeUnmount() {
    this.captionGate?.cancel();
  },

  computed: {
    lines() {
      let lines = this.translatedLines.length
        ? this.translatedLines
        : this.textList;

      return lines as string[];
    },

    subtitleWrapper(): StyleValue {
      if (!this.positionRect) return {};

      return {
        position: "absolute",
        left: this.positionRect.left - 10 + "px",
        top: this.positionRect.top - 10 + "px",
        width: this.positionRect.width + "px",
      };
    },

    translateStyle(): StyleValue {
      if (!this.positionRect) return {};

      let top =
        this.positionRect.top - clamp(this.positionRect.height, 50, 100);

      return {
        position: "absolute",
        fontSize: this.textStyle?.fontSize || "22px",
        left: this.positionRect.left - 8 + "px",
        top: top + "px",
        width: this.positionRect.width + "px",
        textAlign: "center",
        opacity: this.hoveredWord.length ? 1 : 0,
        transition: "all ease 200ms",
      };
    },

    activeTranslate() {
      return this.translatedWords[this.hoveredWord] || "";
    },

    iconContainerStyle() {
      return {
        height: this.positionRect?.height + "px",
      };
    },

    dir() {
      return getDir();
    },

    sourceDir() {
      let dir = rtls.indexOf(this.sourceLanguage) != -1 ? "rtl" : "ltr";

      return dir;
    },
  },

  watch: {
    textList: {
      deep: true,
      handler(value: Array<string>, old: Array<string>) {
        if (JSON.stringify(value) == JSON.stringify(old)) return;

        this.hoveredWord = "";

        if (!this.showTranslatedSentence || !value || !value.length) return;

        // Wait for the caption to settle and send it once (E-06).
        if (this.captionGate!.request(value.join("\n"))) {
          this.translatedLines = [];
        }
      },
    },

    showTranslatedSentence(value) {
      if (!value) return this.captionGate!.cancel();
      if (this.translatedLines.length || !this.textList?.length) return;
      this.captionGate!.sendNow(this.textList.join("\n"));
    },

    hoveredWord(value) {
      if (value.length) {
        this.translateWord(value);
        analytic.track("phrase_hovered", { word: value });
      }
    },
  },

  methods: {
    getWordList() {
      let list: string[] = [];
      let lines = this.textList as unknown as Array<string>;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        list = [...list, ...line.split(" ")];
      }

      return list;
    },

    /** Called by the caption gate with the settled caption (E-06). */
    translateWholeCaption(caption: string) {
      let translatingList = [caption];

      this.translatedLines = [];

      TranslateService.instance
        .fetchSimpleTranslation(translatingList)
        .then((translatedText) => {
          this.sourceLanguage = "auto";

          translatingList.forEach((result, i) => {
            this.translatedLines.push(translatedText);
          });
        })
        .catch(() => this.captionGate?.forget(caption));
    },

    translateWord(word) {
      let translatingList = [word];

      TranslateService.instance
        .fetchSimpleTranslation(translatingList)
        .then((translatedText) => {
          this.sourceLanguage = "auto";

          translatingList.forEach((result, i) => {
            this.translatedWords[result] = translatedText;
          });
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  padding: 8px 10px;
  text-align: center;
}

.translated-word {
  span {
    background: rgba(0, 0, 0, 0.635);
    padding: 4px 10px;
    border-radius: 4px;
  }
}
</style>
