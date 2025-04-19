<template>
  <span
    :id="id"
    @mousedown="markerStore.toggleMarking(true)"
    @mousemove="onMouseenter"
    @mouseout="onMouseout"
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

  analytic.track("Word hovered", { word: props.modelValue });

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

function OpenWordDetail() {
  if (markerStore.words.length > 1) {
    consoleCrane.toggleConsoleCrane("word-detail", {
      word: markerStore.selectedPhrase,
    });
  } else {
    consoleCrane.toggleConsoleCrane("word-detail", { word: props.modelValue });
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
