<template>
  <div :style="wrapperStyle" class="ms-team-subtitle-wrapper">
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
            <p class="pl-2 pr-2 pb-0 subtitle-line" :style="textStyle">
              <word
                v-for="(word, i2) in line.split(' ')"
                :key="i2"
                :id="getWordId(i, i2)"
                :modelValue="word + ' '"
                class="interactive-word"
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

<script setup lang="ts">
import { defineProps, computed, ref, watch, StyleValue } from "vue";
import { useMarkerStore } from "../../../stores/marker";
import { getDir, rtls, cleanText as cleanTextHelper } from "../../../common/helper/text";
import TranslatedPhrase from "../../components/specific/TranslatedPhrase.vue";
import WordSelectionRectangle from "../../components/specific/WordSelectionRectangle.vue";
import Word from "../../components/specific/Word.vue";

const props = defineProps<{
  textList?: string[];
  textStyle?: any;
  wrapperStyle?: any;
}>();

const markerStore = useMarkerStore();
const subturtleSubtitle = ref<HTMLElement | null>(null);

const translatedLines = ref<String[]>([]);
const showTranslatedSentence = ref(false);
const showWordDetail = ref(false);

const translateStyle = computed((): StyleValue => {
  const bounds = markerStore.rectangleBounds;
  const hasSelection = markerStore.selectedPhrase.length > 0;

  // Get subtitle container bounds
  let subtitleTop = 0;
  let subtitleLeft = 0;
  let subtitleWidth = 0;

  if (subturtleSubtitle.value) {
    const subtitleRect = subturtleSubtitle.value.getBoundingClientRect();
    subtitleTop = subtitleRect.top;
    subtitleLeft = subtitleRect.left;
    subtitleWidth = subtitleRect.width;
  }

  // Fixed offset: 6rem
  const offset = "6rem";

  if (bounds && hasSelection && subtitleTop > 0) {
    const translationWidth = bounds.width * 3;
    const translationLeft =
      bounds.left + bounds.width / 2 - translationWidth / 2;

    return {
      position: "fixed",
      fontSize: props.textStyle?.fontSize || "22px",
      left: translationLeft + "px",
      width: translationWidth + "px",
      textAlign: "center",
      opacity: hasSelection ? 1 : 0,
      top: `calc(${subtitleTop}px - ${offset})`,
      transition: "all ease 200ms",
      pointerEvents: "auto", 
    };
  }

  // Fallback: position above subtitle container
  if (subtitleTop > 0) {
    return {
      position: "fixed",
      fontSize: props.textStyle?.fontSize || "22px",
      left: subtitleLeft + "px",
      width: subtitleWidth + "px",
      textAlign: "center",
      opacity: hasSelection ? 1 : 0,
      top: `calc(${subtitleTop}px - ${offset})`,
      transition: "all ease 200ms",
      pointerEvents: "auto",
    };
  }

  // Last resort fallback
  return {
    position: "absolute",
    fontSize: props.textStyle?.fontSize || "22px",
    width: "100%",
    textAlign: "center",
    opacity: hasSelection ? 1 : 0,
    bottom: "20px",
    pointerEvents: "auto",
  };
});

const iconContainerStyle = computed(() => {
  return {
    height: "20px",
  };
});

const dir = computed(() => {
  return getDir();
});

const sourceDir = computed(() => {
  let dir = rtls.indexOf(markerStore.sourceLanguage) != -1 ? "rtl" : "ltr";
  return dir;
});

watch(
  () => props.textList,
  (value, old) => {
    if (JSON.stringify(value) == JSON.stringify(old)) return;

    markerStore.clear();

    if (!value || !value.length) {
      translatedLines.value = [];
      return;
    }
  },
  { deep: true }
);

const getWordId = (i: number, i2: number) => {
    return markerStore.getWordId(i, i2);
}

const cleanText = (text: string) => {
  return cleanTextHelper(text);
};
</script>

<style lang="scss" scoped>
.ms-team-subtitle-wrapper {
    pointer-events: none;
}

.subtitle-line {
    pointer-events: auto;
}

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
