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
      <TranslatedPhrase :textStyle="textStyle" />
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
          <div :dir="dir" class="min-w-[150px]">
            <p
              v-if="translatedLines.length"
              v-for="(line, i) in translatedLines"
              :key="line.toString() + i"
              :style="textStyle"
            >
              {{ line }}
            </p>
            <p
              v-else-if="isTranslatingWholeCaption"
              :style="textStyle"
              class="text-center animate-bounce"
            >
              ...
            </p>
            <p v-else :style="textStyle" class="text-center">
              Translation is not available
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
                :id="getWordId(i, i2)"
                :modelValue="word + ' '"
              />
            </p>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, StyleValue } from "vue";
import { mapState, mapActions } from "pinia";
import { useMarkerStore } from "../../../stores/marker";
import { clamp } from "../../../common/helper/math";
import { getDir, rtls, cleanText } from "../../../common/helper/text";
import { TranslateService } from "../../../common/services/translate.service";
import { log } from "../../../common/helper/log";
import { LOADING_ICON } from "../../../common/icons/icons";

interface DataModel {
  translatedLines: String[];

  showTranslatedSentence: boolean;
  showWordDetail: boolean;
  isTranslatingWholeCaption: boolean;
}

export default defineComponent({
  props: {
    positionRect: Object,
    textList: { type: Object as PropType<string[]> },
    textStyle: Object,
  },

  data(): DataModel {
    return {
      translatedLines: [],
      showTranslatedSentence: false,
      showWordDetail: false,
      isTranslatingWholeCaption: false,
    };
  },

  computed: {
    ...mapState(useMarkerStore, ["selectedPhrase", "sourceLanguage"]),

    loadingIcon() {
      return LOADING_ICON;
    },

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
        opacity: this.selectedPhrase.length ? 1 : 0,
        transition: "all ease 200ms",
      };
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

        this.clear();

        if (!this.showTranslatedSentence || !value || !value.length) return;

        this.translateWholeCaption();
      },
    },

    showTranslatedSentence(value) {
      log("showTranslatedSentence", value);

      if (value == true) {
        this.translateWholeCaption();
      } else {
        this.translatedLines = [];
        this.clear();
      }
    },
  },

  methods: {
    ...mapActions(useMarkerStore, ["clear", "getWordId"]),

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

      this.isTranslatingWholeCaption = true;

      TranslateService.instance
        .fetchSimpleTranslation(translatingList)
        .then((translationResult) => {
          translatingList.forEach((result, i) => {
            this.translatedLines.push(translationResult);
          });
        })
        .finally(() => {
          this.isTranslatingWholeCaption = false;
        });
    },

    cleanText(text: string) {
      return cleanText(text);
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
