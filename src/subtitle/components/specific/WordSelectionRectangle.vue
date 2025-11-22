<template>
  <Teleport to="body">
    <template v-if="isVisible">
      <!-- Multiple rectangles, one per line -->
      <div
        v-for="(lineRect, index) in lineRectangles"
        :key="index"
        class="word-selection-rectangle"
        :style="lineRect"
      ></div>

      <!-- Left anchor only on first word -->
      <SelectionAnchor
        v-if="firstWordRect"
        key="anchor-left"
        direction="left"
        :style="firstWordAnchorStyle"
      />

      <!-- Right anchor only on last word -->
      <SelectionAnchor
        v-if="lastWordRect"
        key="anchor-right"
        direction="right"
        :style="lastWordAnchorStyle"
      />
    </template>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, watch, ref, onUnmounted, nextTick } from "vue";
import { useMarkerStore } from "../../../stores/marker";
import { Teleport } from "vue";
import SelectionAnchor from "./SelectionAnchor.vue";

const markerStore = useMarkerStore();

interface LineRectangle {
  top: string;
  left: string;
  width: string;
  height: string;
}

const lineRectangles = ref<LineRectangle[]>([]);
const firstWordRect = ref<DOMRect | null>(null);
const lastWordRect = ref<DOMRect | null>(null);
const anchorOffset = 0; // 10px

const firstWordAnchorStyle = computed(() => {
  if (!firstWordRect.value) return null;
  // Left anchor: positioned at left edge, then translated -50% to center it 10px to the left
  // With translate(-50%, -50%), the left value becomes the center point
  // Setting left to firstWordRect.value.left means center is there, so right edge touches left edge
  // We want it 10px to the left, so we set left to firstWordRect.value.left - 10
  return {
    position: "fixed",
    top: firstWordRect.value.top + firstWordRect.value.height / 2 + "px",
    left: firstWordRect.value.left - anchorOffset + "px",
    transform: "translate(-50%, -50%)",
  };
});

const lastWordAnchorStyle = computed(() => {
  if (!lastWordRect.value) return null;
  // Right anchor: positioned at right edge, then translated -50% to center it 10px to the right
  // With translate(-50%, -50%), the left value becomes the center point
  // Setting left to lastWordRect.value.right + 10 means center is 10px to the right
  // So the anchor's left edge will be at lastWordRect.value.right
  return {
    position: "fixed",
    top: lastWordRect.value.top + lastWordRect.value.height / 2 + "px",
    left: lastWordRect.value.right + anchorOffset + "px",
    transform: "translate(-50%, -50%)",
  };
});

const isVisible = computed(() => {
  return (
    markerStore.markedWords.length > 0 && markerStore.hoveredWordId !== null
  );
});

// Throttle calculation to prevent excessive updates
let calculationTimeout: number | null = null;
let isCalculating = false;

function calculateRectangles() {
  if (isCalculating) return;

  if (markerStore.markedWords.length === 0) {
    lineRectangles.value = [];
    firstWordRect.value = null;
    lastWordRect.value = null;
    return;
  }

  isCalculating = true;

  // Use requestAnimationFrame for smooth updates
  requestAnimationFrame(() => {
    const words = markerStore.markedWords;

    // Get all word elements with their rects, sorted by reading order
    const wordsWithRects: Array<{
      word: (typeof words)[0];
      rect: DOMRect;
      line: number;
      wordIndex: number;
    }> = [];

    for (const word of words) {
      const element = document.getElementById(word.id);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const parts = word.id.split("-").map(Number);
      const line = parts[0] ?? 0;
      const wordIndex = parts[1] ?? 0;

      wordsWithRects.push({
        word,
        rect,
        line,
        wordIndex,
      });
    }

    if (wordsWithRects.length === 0) {
      lineRectangles.value = [];
      firstWordRect.value = null;
      lastWordRect.value = null;
      isCalculating = false;
      return;
    }

    // Sort by reading order (line, then wordIndex)
    wordsWithRects.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.wordIndex - b.wordIndex;
    });

    // Store first and last word rects for anchors
    firstWordRect.value = wordsWithRects[0].rect;
    lastWordRect.value = wordsWithRects[wordsWithRects.length - 1].rect;

    // Group words by line (top position)
    const lineGroups = new Map<number, typeof wordsWithRects>();

    wordsWithRects.forEach((item) => {
      // Round top position to group words on the same visual line
      const lineKey = Math.round(item.rect.top / 5) * 5; // 5px tolerance for same line

      if (!lineGroups.has(lineKey)) {
        lineGroups.set(lineKey, []);
      }
      lineGroups.get(lineKey)!.push(item);
    });

    // Calculate rectangle for each line
    const rectangles: LineRectangle[] = [];

    // Sort line groups by top position
    const sortedLineKeys = Array.from(lineGroups.keys()).sort((a, b) => a - b);

    sortedLineKeys.forEach((lineKey) => {
      const lineWords = lineGroups.get(lineKey)!;

      // Calculate bounding box for this line
      let minLeft = lineWords[0].rect.left;
      let maxRight = lineWords[0].rect.right;
      let minTop = lineWords[0].rect.top;
      let maxBottom = lineWords[0].rect.bottom;

      lineWords.forEach((item) => {
        if (item.rect.left < minLeft) minLeft = item.rect.left;
        if (item.rect.right > maxRight) maxRight = item.rect.right;
        if (item.rect.top < minTop) minTop = item.rect.top;
        if (item.rect.bottom > maxBottom) maxBottom = item.rect.bottom;
      });

      rectangles.push({
        top: minTop + "px",
        left: minLeft + "px",
        width: maxRight - minLeft + "px",
        height: maxBottom - minTop + "px",
      });
    });

    lineRectangles.value = rectangles;
    isCalculating = false;
  });
}

function throttledCalculate() {
  if (calculationTimeout) {
    clearTimeout(calculationTimeout);
  }
  calculationTimeout = window.setTimeout(() => {
    calculateRectangles();
    calculationTimeout = null;
  }, 16); // ~60fps
}

// Watch for changes in marked words (only when visible)
watch(
  () => markerStore.markedWords,
  () => {
    if (isVisible.value) {
      throttledCalculate();
    }
  },
  { deep: true }
);

// Watch for visibility changes
watch(
  isVisible,
  (visible) => {
    if (visible) {
      // Small delay to ensure DOM is ready
      nextTick(() => {
        calculateRectangles();
      });
    } else {
      lineRectangles.value = [];
      firstWordRect.value = null;
      lastWordRect.value = null;
    }
  },
  { immediate: true }
);

// Update rectangles on scroll/resize (throttled)
let scrollHandler: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;
let rafId: number | null = null;

watch(isVisible, (visible) => {
  if (visible) {
    scrollHandler = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        calculateRectangles();
        rafId = null;
      });
    };
    resizeHandler = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        calculateRectangles();
        rafId = null;
      });
    };
    window.addEventListener("scroll", scrollHandler, true);
    window.addEventListener("resize", resizeHandler);
  } else {
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler, true);
      scrollHandler = null;
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
});

onUnmounted(() => {
  if (calculationTimeout) {
    clearTimeout(calculationTimeout);
  }
  if (scrollHandler) {
    window.removeEventListener("scroll", scrollHandler, true);
  }
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
});
</script>

<style scoped>
.word-selection-rectangle {
  position: fixed;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  z-index: 999;
  box-sizing: border-box;
}

.word-selection-rectangle > * {
  pointer-events: all;
}
</style>
