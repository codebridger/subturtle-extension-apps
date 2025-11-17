<template>
  <div
    :class="['selection-anchor', `anchor-${direction}`]"
    @mousedown.prevent.stop="onMouseDown"
    @click.prevent.stop="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="anchor-handle"></div>
  </div>
</template>

<script lang="ts" setup>
import { useMarkerStore } from "../../../stores/marker";
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  direction: "left" | "right";
}>();

const markerStore = useMarkerStore();
const isDragging = ref(false);
const hasDragged = ref(false);
const dragStartPos = ref<{ x: number; y: number } | null>(null);
const mouseDownTime = ref<number>(0);

function onMouseEnter() {
  // Keep rectangle visible when hovering anchors
  if (markerStore.markedWords.length > 0 && markerStore.hoveredWordId === null) {
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
  
  // Only handle click if we didn't drag
  // The actual marking will be handled in handleMouseUp to avoid double-marking
  console.log('Anchor clicked:', props.direction, 'hasDragged:', hasDragged.value);
}


function onMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  console.log('Anchor mousedown:', props.direction);
  
  isDragging.value = true;
  hasDragged.value = false;
  dragStartPos.value = { x: e.clientX, y: e.clientY };
  mouseDownTime.value = Date.now();
  
  // Set dragging state in store to prevent rectangle recalculation
  markerStore.setAnchorDragging(true);
  
  // Prevent text selection during drag
  document.body.style.userSelect = "none";
  
  // Keep hovered word ID when interacting with anchors
  if (markerStore.markedWords.length > 0 && markerStore.hoveredWordId === null) {
    markerStore.setHoveredWordId(markerStore.markedWords[0].id);
  }

  const handleMouseMove = (moveEvent: MouseEvent) => {
    // Check if mouse has moved significantly (more than 3px)
    if (dragStartPos.value) {
      const deltaX = Math.abs(moveEvent.clientX - dragStartPos.value.x);
      const deltaY = Math.abs(moveEvent.clientY - dragStartPos.value.y);
      if (deltaX > 3 || deltaY > 3) {
        hasDragged.value = true;
      }
    }
    
    // Only mark words if we've actually dragged (not just a click)
    if (!hasDragged.value) {
      return;
    }
    // Find word element under cursor
    const elementUnderCursor = document.elementFromPoint(
      moveEvent.clientX,
      moveEvent.clientY
    );

    if (!elementUnderCursor) return;

    // Find the word span element (might be nested)
    let wordElement: HTMLElement | null = null;
    let current: HTMLElement | null =
      elementUnderCursor as HTMLElement;

    // Traverse up to find span with ID
    while (current && current !== document.body) {
      if (current.tagName === "SPAN" && current.id) {
        // Check if it's a valid word ID format
        const parts = current.id.split("-").map(Number);
        if (parts.length >= 3 && !isNaN(parts[2])) {
          wordElement = current;
          break;
        }
      }
      current = current.parentElement;
    }

    if (!wordElement || !wordElement.id) return;

    const wordId = wordElement.id;
    const wordRect = wordElement.getBoundingClientRect();

    // Check if word is adjacent to current selection based on DOM position
    if (markerStore.markedWords.length === 0) return;

    // Get all marked word rects
    const markedRects = markerStore.markedWords.map((w) => {
      const el = document.getElementById(w.id);
      return el ? el.getBoundingClientRect() : null;
    }).filter((r): r is DOMRect => r !== null);

    if (markedRects.length === 0) return;

    // Find edge of selection based on direction
    let edgeRect: DOMRect | null = null;
    if (props.direction === "left") {
      const minLeft = Math.min(...markedRects.map((r) => r.left));
      edgeRect = markedRects.find((r) => Math.abs(r.left - minLeft) < 1) || null;
    } else {
      const maxRight = Math.max(...markedRects.map((r) => r.right));
      edgeRect = markedRects.find((r) => Math.abs(r.right - maxRight) < 1) || null;
    }

    if (!edgeRect) return;

    // Check if word is visually adjacent
    const edgeCenterY = edgeRect.top + edgeRect.height / 2;
    const wordCenterY = wordRect.top + wordRect.height / 2;
    const verticalOverlap = Math.abs(wordCenterY - edgeCenterY) < edgeRect.height * 0.8;

    if (!verticalOverlap) return;

    let isAdjacent = false;
    if (props.direction === "left") {
      // Word should be to the left, close to edge
      isAdjacent = wordRect.right <= edgeRect.left && 
                   (edgeRect.left - wordRect.right) < 50;
    } else {
      // Word should be to the right, close to edge
      isAdjacent = wordRect.left >= edgeRect.right && 
                   (wordRect.left - edgeRect.right) < 50;
    }

    if (isAdjacent && !markerStore.checkedSelected(wordId)) {
      const wordText = wordElement.textContent?.trim() || "";
      if (wordText) {
        markerStore.markWord(wordId, wordText, wordRect);
      }
    }
  };

  const handleMouseUp = (e?: MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const wasDragging = hasDragged.value;
    const clickDuration = Date.now() - mouseDownTime.value;
    const deltaX = dragStartPos.value 
      ? Math.abs((e?.clientX || 0) - dragStartPos.value.x) 
      : 0;
    const deltaY = dragStartPos.value 
      ? Math.abs((e?.clientY || 0) - dragStartPos.value.y) 
      : 0;
    
    isDragging.value = false;
    dragStartPos.value = null;
    document.body.style.userSelect = "";
    
    // Clear dragging state in store
    markerStore.setAnchorDragging(false);
    
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    
    // Handle click if it was a quick click (not a drag)
    // Only mark here to avoid double-marking with onClick
    if (!wasDragging && clickDuration < 300 && deltaX < 5 && deltaY < 5) {
      console.log('Quick click detected, marking adjacent word');
      const adjacentId = markerStore.getAdjacentWordId(props.direction);
      if (adjacentId) {
        markerStore.markWordById(adjacentId);
        console.log('Marked word:', adjacentId);
      }
    }
    
    // Reset drag flag after a delay
    setTimeout(() => {
      hasDragged.value = false;
    }, 100);
  };

  document.addEventListener("mousemove", handleMouseMove, { passive: false });
  document.addEventListener("mouseup", handleMouseUp, { passive: false });
}

onUnmounted(() => {
  // Cleanup any remaining listeners
  isDragging.value = false;
});
</script>

<style scoped>
.selection-anchor {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  cursor: ew-resize;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.anchor-left {
  left: -10px;
}

.anchor-right {
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
}

.selection-anchor:hover .anchor-handle {
  background: #3b82f6;
  transform: scale(1.2);
}

.selection-anchor:active .anchor-handle {
  transform: scale(1.1);
  background: #2563eb;
}
</style>

