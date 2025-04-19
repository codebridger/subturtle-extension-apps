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
import { defineComponent, PropType, StyleValue } from "vue";
import { clamp } from "../../../common/helper/math";
import { getDir, rtls } from "../../../common/helper/text";
import { TranslateService } from "../../../common/services/translate.service";
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
    };
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

        this.translateWholeCaption();
      },
    },

    showTranslatedSentence(value) {
      if (!value || this.translatedLines.length) return;
      this.translateWholeCaption();
    },

    hoveredWord(value) {
      if (value.length) {
        this.translateWord(value);
        analytic.track("Word hovered", { word: value });
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

    translateWholeCaption() {
      // let words = this.getWordList();
      let lines = this.textList as unknown as Array<string>;
      let translatingList = [lines.join("\n")];

      this.translatedLines = [];

      TranslateService.instance
        .translateByGoogle(translatingList)
        .then(({ list, lang }) => {
          this.sourceLanguage = lang;

          translatingList.forEach((result, i) => {
            this.translatedLines.push(list[i]);
          });
        });
    },

    translateWord(word) {
      let translatingList = [word];

      TranslateService.instance
        .translateByGoogle(translatingList)
        .then(({ list, lang }) => {
          this.sourceLanguage = lang;

          translatingList.forEach((result, i) => {
            this.translatedWords[result] = list[i];
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
