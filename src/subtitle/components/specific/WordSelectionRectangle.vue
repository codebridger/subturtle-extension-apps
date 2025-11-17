<template>
  <Teleport to="body">
    <div
      v-if="isVisible && rectangleStyle"
      class="word-selection-rectangle"
      :style="rectangleStyle"
    >
      <SelectionAnchor key="anchor-left" direction="left" />
      <SelectionAnchor key="anchor-right" direction="right" />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, watch, ref, onUnmounted, nextTick } from "vue";
import { useMarkerStore } from "../../../stores/marker";
import { Teleport } from "vue";
import SelectionAnchor from "./SelectionAnchor.vue";

const markerStore = useMarkerStore();

const rectangleStyle = ref<{
  top: string;
  left: string;
  width: string;
  height: string;
} | null>(null);

const isVisible = computed(() => {
  return (
    markerStore.markedWords.length > 0 && markerStore.hoveredWordId !== null
  );
});

// Throttle calculation to prevent excessive updates
let calculationTimeout: number | null = null;
let isCalculating = false;

function calculateRectangle() {
  if (isCalculating) return;

  if (markerStore.markedWords.length === 0) {
    rectangleStyle.value = null;
    return;
  }

  isCalculating = true;

  // Use requestAnimationFrame for smooth updates
  requestAnimationFrame(() => {
    const words = markerStore.markedWords;

    // Recalculate DOM rects for all marked words (in case of scroll/resize)
    const updatedRects: DOMRect[] = [];
    for (const word of words) {
      const element = document.getElementById(word.id);
      if (element) {
        updatedRects.push(element.getBoundingClientRect());
      } else {
        // Fallback to stored rect if element not found
        updatedRects.push(word.domeRect);
      }
    }

    if (updatedRects.length === 0) {
      rectangleStyle.value = null;
      isCalculating = false;
      return;
    }

    // Calculate bounding box
    let minLeft = updatedRects[0].left;
    let maxRight = updatedRects[0].right;
    let minTop = updatedRects[0].top;
    let maxBottom = updatedRects[0].bottom;

    // Find actual min/max across all words
    updatedRects.forEach((rect) => {
      if (rect.left < minLeft) minLeft = rect.left;
      if (rect.right > maxRight) maxRight = rect.right;
      if (rect.top < minTop) minTop = rect.top;
      if (rect.bottom > maxBottom) maxBottom = rect.bottom;
    });

    rectangleStyle.value = {
      top: minTop + "px",
      left: minLeft + "px",
      width: maxRight - minLeft + "px",
      height: maxBottom - minTop + "px",
    };

    isCalculating = false;
  });
}

function throttledCalculate() {
  if (calculationTimeout) {
    clearTimeout(calculationTimeout);
  }
  calculationTimeout = window.setTimeout(() => {
    calculateRectangle();
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
        calculateRectangle();
      });
    } else {
      rectangleStyle.value = null;
    }
  },
  { immediate: true }
);

// Update rectangle on scroll/resize (throttled)
let scrollHandler: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;
let rafId: number | null = null;

watch(isVisible, (visible) => {
  if (visible) {
    scrollHandler = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        calculateRectangle();
        rafId = null;
      });
    };
    resizeHandler = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        calculateRectangle();
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
