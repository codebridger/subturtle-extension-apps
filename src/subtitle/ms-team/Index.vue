<template>
  <div>
    <teleport
      v-for="dialogue in dialogues"
      :key="dialogue.id"
      :to="'#' + dialogue.id"
    >
      <div class="subturtle-ms-team-container">
        <SubtitleComponent
          :id="'subturtle-caption-' + dialogue.id"
          class="caption-window"
          :wrapperStyle="wrapperStyle"
          :textList="dialogue.text"
          :textStyle="style"
          :dialogueIndex="dialogue.index"
        />
      </div>
    </teleport>

    <!-- Word Selection Rectangle with Anchors -->
    <WordSelectionRectangle />

    <!-- Translated Phrase -->
    <div
      class="translated-word flex justify-center"
      :style="translateStyle"
      :dir="dir"
    >
      <TranslatedPhrase :textStyle="style" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive, computed, StyleValue } from "vue";
import { useMarkerStore } from "../../stores/marker";
import {
  SUBTILE_CONTAINER_CLASS,
  SUBTITLE_LINE_CLASS,
} from "./static";
import { Interval } from "../../common/helper/promise";
import SubtitleComponent from "./components/Subtitle.vue";
import TranslatedPhrase from "../components/specific/TranslatedPhrase.vue";
import WordSelectionRectangle from "../components/specific/WordSelectionRectangle.vue";
import { mapStyleString, getComputedStyles } from "../../common/helper/object";
import { log } from "../../common/helper/log";
import { getDir, rtls } from "../../common/helper/text";

const markerStore = useMarkerStore();

interface Dialogue {
  id: string;
  index: number;
  element: HTMLElement;
  textElement: HTMLElement;
  text: string[];
}

const active = ref(false);
const dialogues = ref<Dialogue[]>([]);
const style = ref<CSSStyleDeclaration | { [key: string]: string }>({});
const wrapperStyle = ref({});
const subtitleContainer = ref<HTMLElement | null>(null);
let interval: Interval | undefined;
let dialogueCounter = 0;

// Translation Logic
const dir = computed(() => getDir());

const translateStyle = computed((): StyleValue => {
  const bounds = markerStore.rectangleBounds;
  const hasSelection = markerStore.selectedPhrase.length > 0;

  if (bounds && hasSelection) {
    const translationWidth = bounds.width * 3; // Or a fixed width/max-width
    const translationLeft = bounds.left + bounds.width / 2 - translationWidth / 2;
    
    // Position above the selection
    // We use fixed positioning relative to the viewport, similar to WordSelectionRectangle
    return {
      position: "fixed",
      fontSize: style.value?.fontSize || "22px",
      left: translationLeft + "px",
      width: translationWidth + "px",
      textAlign: "center",
      opacity: 1,
      top: `calc(${bounds.top}px - 4rem)`, // Position above the word
      transition: "all ease 200ms",
      pointerEvents: "auto",
      zIndex: 9999, // Ensure it's on top
    };
  }

  return {
    display: "none",
  };
});

// Helper to generate unique IDs
const generateId = () => "subturtle-dialogue-" + Math.random().toString(36).substr(2, 9);

const updateDialogues = () => {
  if (!subtitleContainer.value) return;

  // Find all dialogue bubbles
  const captionTexts = subtitleContainer.value.querySelectorAll(SUBTITLE_LINE_CLASS);

  captionTexts.forEach((textEl) => {
    const el = textEl as HTMLElement;
    const targetParent = el.parentElement; 
    
    if (!targetParent) return;

    let dialogueId = targetParent.id;
    let dialogue = dialogues.value.find(d => d.id === dialogueId);

    if (!dialogue) {
      if (!dialogueId) {
        dialogueId = generateId();
        targetParent.id = dialogueId;
        targetParent.style.position = "relative"; 
      }

      dialogue = {
        id: dialogueId,
        index: dialogueCounter++,
        element: targetParent,
        textElement: el,
        text: [el.textContent || ""],
      };
      dialogues.value.push(dialogue);
      
      if (Object.keys(style.value).length === 0) {
         let styleStr = el.getAttribute("style");
         style.value = mapStyleString(styleStr || "");
         if (!style.value.fontSize) {
             style.value = { 
                 ...style.value, 
                 ...getComputedStyles(["font-size", "color", "font-family", "line-height"], el) 
             };
         }
      }

      el.style.opacity = "0";

    } else {
      const newText = el.textContent || "";
      if (dialogue.text[0] !== newText) {
         dialogue.text = [newText];
      }
    }
  });

  if (dialogues.value.length > 0) {
    const lastDialogue = dialogues.value[dialogues.value.length - 1];
    try {
      markerStore.setContext(lastDialogue.text.join(" "));
    } catch (error) {
      console.error(error);
    }
  }

  wrapperStyle.value = {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "50",
    pointerEvents: "none",
  };
};

const onSeekForSubtitle = (int: Interval) => {
  let exists = !!document.querySelector(SUBTILE_CONTAINER_CLASS);

  if (!exists) {
    active.value = false;
    dialogues.value = []; 
  } else if (exists) {
    active.value = true;
    subtitleContainer.value = document.querySelector(
      SUBTILE_CONTAINER_CLASS
    ) as HTMLElement;
    updateDialogues();
  }

  int.next();
};

onMounted(() => {
  log("Activated for MS Teams");

  interval = new Interval(200, onSeekForSubtitle);
  interval.start();
});

onBeforeUnmount(() => {
  active.value = false;
  interval?.stop();
});
</script>

<style>
.subturtle-ms-team-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 40;
}

.caption-window {
  cursor: unset !important;
}

.translated-word span {
  background: rgba(0, 0, 0, 0.635);
  border-radius: 4px;
  padding: 4px 8px;
  color: white;
}
</style>
