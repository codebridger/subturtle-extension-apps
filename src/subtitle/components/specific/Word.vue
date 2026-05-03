<template>
  <span
    :id="id"
    @mouseenter="onMouseEnter"
    @mouseleave.stop="onMouseLeave"
    @click.stop="OpenWordDetail"
    :class="{
      selected: markerStore.checkedSelected(id),
      pointer: markerStore.checkedSelected(id),
    }"
    >{{ modelValue }}</span
  >
</template>

<script lang="ts" setup>
import { emitOpen } from "../../../common/services/console-crane-bridge";
import { useMarkerStore } from "../../../stores/marker";
import { ref, getCurrentInstance, onMounted, onUnmounted } from "vue";
import { analytic } from "../../../plugins/mixpanel";

const markerStore = useMarkerStore();
const props = defineProps<{
  id: string;
  modelValue: string;
}>();

const elRef = ref<HTMLElement | null>(null);
const mouseLeaveTimeout = ref<number | null>(null);

onMounted(() => {
  elRef.value = getCurrentInstance()?.proxy?.$el;
});

onUnmounted(() => {
  if (mouseLeaveTimeout.value) {
    clearTimeout(mouseLeaveTimeout.value);
  }
});

function onMouseEnter() {
  const boundingRect = elRef.value?.getBoundingClientRect();

  if (!boundingRect) {
    return;
  }

  // If multiple words are already marked (via anchors), disable hover marking
  // Selection should persist until cleared by the Clear button
  if (markerStore.markedWords.length > 1) {
    // Only update hoveredWordId if the word is part of the current selection
    // This keeps the rectangle visible when hovering marked words
    if (markerStore.checkedSelected(props.id)) {
      markerStore.setHoveredWordId(props.id);
    }
    // Don't clear or mark new words when multiple words are selected
    return;
  }

  // Normal hover behavior when 0 or 1 word is marked
  // Set hovered word ID (for rectangle display)
  markerStore.setHoveredWordId(props.id);

  // Mark the word if not already marked
  // This ensures rectangle appears around the hovered word
  if (!markerStore.checkedSelected(props.id)) {
    // Clear previous selection and mark this word
    markerStore.clear();
    markerStore.markWord(props.id, props.modelValue?.trim(), boundingRect);
  }
}

function onMouseLeave(e: MouseEvent) {
  // Add a small delay to prevent flickering when moving to anchors
  if (mouseLeaveTimeout.value) {
    clearTimeout(mouseLeaveTimeout.value);
  }
  mouseLeaveTimeout.value = window.setTimeout(() => {
    // Check if we're hovering over an anchor or rectangle
    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);

    const isOverAnchor = elementUnderCursor?.closest(".selection-anchor");
    const isOverRectangle = elementUnderCursor?.closest(
      ".word-selection-rectangle"
    );

    // Don't clear hover if moving to anchor or rectangle
    if (
      !isOverAnchor &&
      !isOverRectangle &&
      markerStore.hoveredWordId === props.id
    ) {
      markerStore.setHoveredWordId(null);
    }
    mouseLeaveTimeout.value = null;
  }, 150);
}

function OpenWordDetail() {
  if (markerStore.words.length > 1) {
    emitOpen({
      page: "word-detail",
      params: {
        word: markerStore.selectedPhrase,
        context: markerStore.context,
      },
    });
  } else {
    emitOpen({
      page: "word-detail",
      params: {
        word: props.modelValue,
        context: markerStore.context,
      },
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
