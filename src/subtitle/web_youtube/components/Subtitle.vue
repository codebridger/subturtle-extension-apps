<template>
  <div :style="wrapperStyle">
    <!-- 
    TRANSLATED WORD OR CONTENT
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
      <div v-if="textList?.length" class="w-full">
        <div ref="subturtleSubtitle" :dir="sourceDir" class="text-left">
          <div v-for="(line, i) in textList" :key="i">
            <p class="pl-2 pr-2 pb-0" :style="textStyle">
              <word
                v-for="(word, i2) in line.split(' ')"
                :key="i2"
                :id="getWordId(i, i2)"
                :modelValue="word + ' '"
              />
            </p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Word Selection Rectangle with Anchors -->
    <WordSelectionRectangle />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, StyleValue } from "vue";
import { mapState, mapActions } from "pinia";
import { useMarkerStore } from "../../../stores/marker";
import { getDir, rtls, cleanText } from "../../../common/helper/text";

interface DataModel {
  translatedLines: String[];
  showTranslatedSentence: boolean;
  showWordDetail: boolean;
}

export default defineComponent({
  props: {
    textList: { type: Object as PropType<string[]> },
    textStyle: Object,
    wrapperStyle: Object,
  },

  data(): DataModel {
    return {
      translatedLines: [],
      showTranslatedSentence: false,
      showWordDetail: false,
    };
  },

  computed: {
    ...mapState(useMarkerStore, [
      "selectedPhrase",
      "sourceLanguage",
      "rectangleBounds",
    ]),

    translateStyle(): StyleValue {
      const bounds = this.rectangleBounds;
      const hasSelection = this.selectedPhrase.length > 0;

      // Get subtitle container bounds
      let subtitleTop = 0;
      let subtitleLeft = 0;
      let subtitleWidth = 0;

      if (this.$refs.subturtleSubtitle) {
        // @ts-ignore
        const subtitleEl = this.$refs.subturtleSubtitle as HTMLElement;
        const subtitleRect = subtitleEl.getBoundingClientRect();
        subtitleTop = subtitleRect.top;
        subtitleLeft = subtitleRect.left;
        subtitleWidth = subtitleRect.width;
      }

      // Fixed offset: 6rem
      const offset = "6rem";

      // If we have rectangle bounds and selection, center translation on the marked rectangle
      // but position it above the whole caption area
      // Width is 3x rectangle width to prevent wrapping
      if (bounds && hasSelection && subtitleTop > 0) {
        const translationWidth = bounds.width * 3;
        // Center translation box on rectangle center
        // Rectangle center: bounds.left + bounds.width / 2
        // Translation left: rectangle center - translation width / 2
        const translationLeft =
          bounds.left + bounds.width / 2 - translationWidth / 2;

        return {
          position: "fixed",
          fontSize: this.textStyle?.fontSize || "22px",
          left: translationLeft + "px",
          width: translationWidth + "px",
          textAlign: "center",
          opacity: hasSelection ? 1 : 0,
          top: `calc(${subtitleTop}px - ${offset})`,
          transition: "all ease 200ms",
        };
      }

      // Fallback: position above subtitle container
      if (subtitleTop > 0) {
        return {
          position: "fixed",
          fontSize: this.textStyle?.fontSize || "22px",
          left: subtitleLeft + "px",
          width: subtitleWidth + "px",
          textAlign: "center",
          opacity: hasSelection ? 1 : 0,
          top: `calc(${subtitleTop}px - ${offset})`,
          transition: "all ease 200ms",
        };
      }

      // Last resort fallback
      return {
        position: "absolute",
        fontSize: this.textStyle?.fontSize || "22px",
        width: "100%",
        textAlign: "center",
        opacity: hasSelection ? 1 : 0,
        bottom: "20px",
      };
    },

    iconContainerStyle() {
      return {
        height: "20px",
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

        if (!value || !value.length) {
          this.translatedLines = [];
          return;
        }
      },
    },
  },

  methods: {
    ...mapActions(useMarkerStore, ["clear", "getWordId"]),

    cleanText(text: string) {
      return cleanText(text);
    },
  },
});
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  text-align: center;
}

.icon {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  left: -32px;
  opacity: 0.5;
  transition: all ease-in 200ms;

  &:hover {
    opacity: 1;
  }

  img {
    cursor: pointer;
    width: 24px;
  }
}

.translated-word {
  span {
    background: rgba(0, 0, 0, 0.635);
    border-radius: 4px;
  }
}
</style>
