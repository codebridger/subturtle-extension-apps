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

      <!-- Close button in top-right corner (only visible when multiple words selected) -->
      <div
        v-if="closeButtonStyle && markerStore.markedWords.length > 1"
        class="selection-close-button"
        :style="closeButtonStyle"
        @click.stop="onCloseClick"
        title="Clear selection"
      >
        <span class="close-icon">×</span>
      </div>
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
  // Left anchor: align with rectangle left edge (accounting for leftPadding)
  // With translate(-50%, -50%), the left value becomes the center point
  const leftPadding = 4; // Match the rectangle's left padding
  const verticalOffset = 5; // Push anchors down
  return {
    position: "fixed",
    top:
      firstWordRect.value.top +
      firstWordRect.value.height / 2 +
      verticalOffset +
      "px",
    left: firstWordRect.value.left - leftPadding + "px",
    transform: "translate(-50%, -50%)",
  };
});

const lastWordAnchorStyle = computed(() => {
  if (!lastWordRect.value) return null;
  // Right anchor: align with rectangle right edge (accounting for padding)
  // With translate(-50%, -50%), the left value becomes the center point
  const rightPadding = 1; // Match the rectangle's right padding
  const verticalOffset = 5; // Push anchors down
  return {
    position: "fixed",
    top:
      lastWordRect.value.top +
      lastWordRect.value.height / 2 +
      verticalOffset +
      "px",
    left: lastWordRect.value.right + rightPadding + "px",
    transform: "translate(-50%, -50%)",
  };
});

// Calculate overall bounds from line rectangles for close button positioning
const overallBounds = computed(() => {
  if (lineRectangles.value.length === 0) return null;

  // Find the top-most and right-most points from all line rectangles
  let minTop = Infinity;
  let maxRight = -Infinity;

  lineRectangles.value.forEach((rect) => {
    const top = parseFloat(rect.top);
    const left = parseFloat(rect.left);
    const width = parseFloat(rect.width);
    const right = left + width;

    if (top < minTop) minTop = top;
    if (right > maxRight) maxRight = right;
  });

  return {
    top: minTop,
    right: maxRight,
  };
});

const closeButtonStyle = computed(() => {
  const bounds = overallBounds.value;
  if (!bounds) return null;

  // Position close button slightly outside the top-right corner of the selection rectangle
  const offset = 2; // Small offset to push button slightly outside

  return {
    position: "fixed" as const,
    top: bounds.top - offset + "px",
    left: bounds.right + offset + "px",
    transform: "translate(-50%, -50%)",
  };
});

function onCloseClick(e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
  markerStore.clear();
}

const isVisible = computed(() => {
  // When multiple words are marked (via anchors), always show rectangle
  // When 0 or 1 word is marked, show only when hovering
  if (markerStore.markedWords.length > 1) {
    return true;
  }
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

      // Expand rectangle with more padding on the left side
      const padding = 1;
      const leftPadding = 4; // Extra padding on the left side
      rectangles.push({
        top: minTop - padding + "px",
        left: minLeft - leftPadding + "px",
        width: maxRight - minLeft + padding + leftPadding + "px",
        height: maxBottom - minTop + padding * 2 + "px",
      });
    });

    lineRectangles.value = rectangles;
    isCalculating = false;

    // Trigger position update for other components (e.g., TranslatedPhrase)
    markerStore.triggerPositionUpdate();
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

// Continuous position update to handle dynamic subtitle movements (e.g., YouTube player adjustments)
let continuousUpdateInterval: number | null = null;
let scrollHandler: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;
let rafId: number | null = null;

function startContinuousUpdate() {
  // Stop any existing update interval
  if (continuousUpdateInterval !== null) {
    clearInterval(continuousUpdateInterval);
  }

  // Update rectangle positions periodically to track dynamic subtitle movements
  // Using 100ms interval (10 times per second) for balance between responsiveness and performance
  continuousUpdateInterval = window.setInterval(() => {
    if (!isVisible.value || markerStore.markedWords.length === 0) {
      stopContinuousUpdate();
      return;
    }

    // Check if all marked words still exist in the DOM
    const allWordsExist = markerStore.markedWords.every(
      (word) => document.getElementById(word.id) !== null
    );

    if (allWordsExist) {
      // Recalculate rectangles with fresh DOM positions
      calculateRectangles();
      // Trigger position update for other components (e.g., TranslatedPhrase)
      markerStore.triggerPositionUpdate();
    }
  }, 100); // Update every 100ms
}

function stopContinuousUpdate() {
  if (continuousUpdateInterval !== null) {
    clearInterval(continuousUpdateInterval);
    continuousUpdateInterval = null;
  }
}

// Watch visibility to start/stop continuous updates
watch(isVisible, (visible) => {
  if (visible) {
    // Start continuous position updates
    startContinuousUpdate();

    // Also listen to scroll/resize events as fallback
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
    // Stop continuous updates
    stopContinuousUpdate();

    // Remove event listeners
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
  // Stop continuous updates
  stopContinuousUpdate();

  if (calculationTimeout) {
    clearTimeout(calculationTimeout);
  }
  if (continuousUpdateInterval) {
    clearInterval(continuousUpdateInterval);
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
  border: 1px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  z-index: 999;
  box-sizing: border-box;
}

.word-selection-rectangle > * {
  pointer-events: all;
}

.selection-close-button {
  width: 16px;
  height: 16px;
  background: rgba(59, 130, 246, 0.9);
  border: 1.5px solid #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.selection-close-button:hover {
  background: rgba(239, 68, 68, 0.9);
  border-color: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.close-icon {
  color: white;
  font-size: 12px;
  line-height: 1;
  font-weight: bold;
  user-select: none;
}
</style>
