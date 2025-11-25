<template>
  <div
    :class="['selection-anchor', `anchor-${direction}`]"
    :style="anchorStyle"
    @click.prevent.stop="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="anchor-handle">
      <span class="anchor-icon">+</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useMarkerStore } from "../../../stores/marker";

const props = defineProps<{
  direction: "left" | "right";
  style?: Record<string, string> | null;
}>();

const markerStore = useMarkerStore();

const anchorStyle = computed(() => {
  if (props.style) {
    return props.style;
  }
  return {};
});

function onMouseEnter() {
  // Keep rectangle visible when hovering anchors
  if (
    markerStore.markedWords.length > 0 &&
    markerStore.hoveredWordId === null
  ) {
    markerStore.setHoveredWordId(markerStore.markedWords[0].id);
  }
}

function onMouseLeave() {
  // Don't clear hover immediately - let it persist for a bit
  // This prevents rectangle from disappearing when moving between anchors
}

function onClick(e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();

  // Mark adjacent word
  const adjacentId = markerStore.getAdjacentWordId(props.direction);
  if (adjacentId) {
    markerStore.markWordById(adjacentId);
  }
}
</script>

<style scoped>
.selection-anchor {
  width: 20px;
  height: 20px;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Default positioning if no style prop is provided (fallback) */
.selection-anchor:not([style]) {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.selection-anchor:not([style]).anchor-left {
  left: -10px;
}

.selection-anchor:not([style]).anchor-right {
  right: -10px;
}

.anchor-handle {
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #3b82f6;
  border-radius: 50%;
  transition: all 0.2s ease;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.anchor-icon {
  font-size: 10px;
  font-weight: bold;
  color: #3b82f6;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.selection-anchor:hover .anchor-handle {
  background: #3b82f6;
  transform: scale(1.2);
}

.selection-anchor:hover .anchor-icon {
  color: white;
}

.selection-anchor:active .anchor-handle {
  transform: scale(1.1);
  background: #2563eb;
}

.selection-anchor:active .anchor-icon {
  color: white;
}
</style>
