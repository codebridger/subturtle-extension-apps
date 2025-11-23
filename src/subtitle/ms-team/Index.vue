<template>
  <div>
    <teleport to='[data-tid="closed-caption-v2-window-wrapper"]'>
      <div class="subturtle-ms-team-container">
        <SubtitleComponent
          id="subturtle-caption"
          class="caption-window"
          :wrapperStyle="wrapperStyle"
          :textList="text"
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

const active = ref(false);
const oldText = ref("");
const text = ref<string[]>([]);
const style = ref<CSSStyleDeclaration | { [key: string]: string }>({});
const wrapperStyle = ref({});
const subtitleContainer = ref<HTMLElement | null>(null);
let interval: Interval | undefined;

const onSubtileChange = () => {
  let wholeTextContent = subtitleContainer.value?.textContent;

  if (oldText.value == wholeTextContent) return;
  else oldText.value = wholeTextContent || "";

  // Get All lines
  let linesElements = subtitleContainer.value?.querySelectorAll(
    SUBTITLE_LINE_CLASS
  ) as unknown as HTMLElement[];

  text.value = [];

  // Extract text and styles
  linesElements?.forEach((wrapper) => {
    text.value.push(wrapper.textContent?.toString()!);

    // Extract styles from the first element or merge
    if (Object.keys(style.value).length === 0) {
        let styleStr = wrapper.getAttribute("style");
        style.value = mapStyleString(styleStr || "");
        // Fallback to computed styles if inline is empty
        if (!style.value.fontSize) {
            style.value = { 
                ...style.value, 
                ...getComputedStyles(["font-size", "color", "font-family", "line-height"], wrapper) 
            };
        }
    }
  });

  // update marker context
  try {
    markerStore.setContext(text.value.join(" "));
  } catch (error) {
    console.error(error);
  }

  wrapperStyle.value = {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "50",
    pointerEvents: "none", // Allow clicks to pass through container
  };
};

const onSeekForSubtitle = (int: Interval) => {
  let exists = !!document.querySelector(SUBTILE_CONTAINER_CLASS);

  if (!exists) {
    active.value = false;
  } else if (exists) {
    active.value = true;
    subtitleContainer.value = document.querySelector(
      SUBTILE_CONTAINER_CLASS
    ) as HTMLElement;
    onSubtileChange();
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
