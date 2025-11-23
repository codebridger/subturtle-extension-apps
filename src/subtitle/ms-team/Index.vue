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
        />
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive } from "vue";
import { useMarkerStore } from "../../stores/marker";
import {
  SUBTILE_CONTAINER_CLASS,
  SUBTITLE_LINE_CLASS,
} from "./static";
import { Interval } from "../../common/helper/promise";
import SubtitleComponent from "./components/Subtitle.vue";
import { mapStyleString, getComputedStyles } from "../../common/helper/object";
import { log } from "../../common/helper/log";

const markerStore = useMarkerStore();

interface Dialogue {
  id: string;
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

// Helper to generate unique IDs
const generateId = () => "subturtle-dialogue-" + Math.random().toString(36).substr(2, 9);

const updateDialogues = () => {
  if (!subtitleContainer.value) return;

  // Find all dialogue bubbles
  // The user mentioned tracking `fui-ChatMessageCompact`
  // But we need to find the parent of [data-tid="closed-caption-text"]
  // Let's iterate over all caption text elements and find their relevant container
  const captionTexts = subtitleContainer.value.querySelectorAll(SUBTITLE_LINE_CLASS);

  captionTexts.forEach((textEl) => {
    const el = textEl as HTMLElement;
    
    // Find the parent that should be the teleport target
    // User said: "find the [data-tid="closed-caption-text"] parent ... find its parent from itw own level only"
    // Assuming immediate parent or close ancestor. Let's use the immediate parent for now as a safe bet for teleport target
    // or we can look for a specific wrapper if needed.
    // Based on the snippet: <div ...><span ... data-tid="closed-caption-text">...</span></div>
    // The immediate parent seems to be a flex container.
    const targetParent = el.parentElement; 
    
    if (!targetParent) return;

    // Check if we already track this dialogue
    // We can check if the targetParent has an ID we assigned
    let dialogueId = targetParent.id;
    let dialogue = dialogues.value.find(d => d.id === dialogueId);

    if (!dialogue) {
      // New dialogue found
      if (!dialogueId) {
        dialogueId = generateId();
        targetParent.id = dialogueId;
        targetParent.style.position = "relative"; // Ensure positioning context
      }

      

      dialogue = {
        id: dialogueId,
        element: targetParent,
        textElement: el,
        text: [el.textContent || ""],
      };
      dialogues.value.push(dialogue);
      
      // Extract styles from the first found element
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

      // Hide original text
      el.style.opacity = "0";
      // el.style.display = "none"; // Display none might break layout or detection

    } else {
      // Update existing dialogue text
      const newText = el.textContent || "";
      // We treat the text content as a single line for now, or split if needed
      // The store expects an array of strings (lines)
      if (dialogue.text[0] !== newText) {
         dialogue.text = [newText];
      }
    }
  });

  // Update marker context with the text of the LAST dialogue (streaming)
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
    dialogues.value = []; // Clear dialogues if container is gone
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
</style>
