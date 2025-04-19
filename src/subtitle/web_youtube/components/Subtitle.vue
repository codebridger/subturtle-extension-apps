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
    ...mapState(useMarkerStore, ["selectedPhrase", "sourceLanguage"]),

    translateStyle(): StyleValue {
      let bottom = 20;

      if (this.$refs.subturtleSubtitle) {
        // @ts-ignore
        bottom = this.$refs.subturtleSubtitle.clientHeight * 1.5;
      }

      return {
        position: "absolute",
        fontSize: this.textStyle?.fontSize || "22px",
        width: "100%",
        textAlign: "center",
        opacity: this.selectedPhrase.length ? 1 : 0,
        bottom: bottom + "px",
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
