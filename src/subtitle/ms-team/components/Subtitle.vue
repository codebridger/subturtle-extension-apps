<template>
  <div :style="wrapperStyle" class="ms-team-subtitle-wrapper">
    <!-- SUBTITLE
    -->
    <transition name="fade">
      <div v-if="textList?.length" class="w-full">
        <div ref="subturtleSubtitle" :dir="sourceDir" class="text-left">
          <div v-for="(line, i) in textList" :key="i">
            <p class="pb-0 subtitle-line" :style="textStyle">
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
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed, ref, watch, StyleValue } from "vue";
import { useMarkerStore } from "../../../stores/marker";
import { getDir, rtls, cleanText as cleanTextHelper } from "../../../common/helper/text";
import Word from "../../components/specific/Word.vue";

const props = defineProps<{
  textList?: string[];
  textStyle?: any;
  wrapperStyle?: any;
}>();

const markerStore = useMarkerStore();
const subturtleSubtitle = ref<HTMLElement | null>(null);

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
</style>
