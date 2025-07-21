<template>
  <span
    :id="id"
    @mousedown="markerStore.toggleMarking(true)"
    @mousemove="onMouseenter"
    @mouseout="onMouseout"
    @mouseup="onMouseup"
    @click="OpenWordDetail"
    :class="{
      selected: markerStore.checkedSelected(id),
      pointer: !markerStore.isMarkingMode && markerStore.checkedSelected(id),
    }"
    >{{ modelValue }}</span
  >
</template>

<script lang="ts" setup>
import { useConsoleCraneStore } from "../../../console-crane/stores/console-crane";
import { useMarkerStore } from "../../../stores/marker";
import { ref, getCurrentInstance, onMounted } from "vue";
import { analytic } from "../../../plugins/mixpanel";

const consoleCrane = useConsoleCraneStore();
const markerStore = useMarkerStore();
const props = defineProps<{
  id: string;
  modelValue: string;
}>();

const elRef = ref<HTMLElement | null>(null);

onMounted(() => {
  elRef.value = getCurrentInstance()?.proxy?.$el;
});

function onMouseenter() {
  const boundingRect = elRef.value?.getBoundingClientRect();

  if (!boundingRect) {
    return;
  }

  // Mark single word
  if (
    !markerStore.isMarkingMode &&
    // refuse to mark if the word is already marked
    !markerStore.checkedSelected(props.id)
  ) {
    markerStore.clear();

    markerStore.markWord(props.id, props.modelValue?.trim(), boundingRect);
  }

  // Mark multiple words
  if (markerStore.isMarkingMode && markerStore.isMarking) {
    markerStore.markWord(props.id, props.modelValue, boundingRect);
  }
}

function onMouseout() {
  return;

  if (!markerStore.isMarkingMode) {
    markerStore.clear();
  }
}

function onMouseup() {
  analytic.track("multi_phrase_hovered");
}

function OpenWordDetail() {
  if (markerStore.words.length > 1) {
    consoleCrane.toggleConsoleCrane("word-detail", {
      word: markerStore.selectedPhrase,
      context: markerStore.context,
    });
  } else {
    consoleCrane.toggleConsoleCrane("word-detail", {
      word: props.modelValue,
      context: markerStore.context,
    });
  }
}
</script>

<style scoped>
span {
  transition: all ease 200ms;
}

.selected {
  color: yellow !important;
}

.pointer {
  cursor: pointer;
}
</style>
