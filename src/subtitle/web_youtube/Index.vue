<template>
  <div>
    <teleport to="#movie_player">
      <div class="ytp-caption-window-container">
        <SubtitleComponent
          id="subturtle-caption"
          class="caption-window ytp-caption-window-bottom ytp-caption-window-rollup"
          :wrapperStyle="wrapperStyle"
          :textList="text"
          :textStyle="style"
        />

        <marker-border />
      </div>
    </teleport>
  </div>

  <ConsoleCrane />
</template>

<script lang="ts">
import { defineComponent } from "vue";

import {
  SUBTILE_CONTAINER_CLASS,
  SUBTITLE_CLASS,
  SUBTITLE_LINE_CLASS,
} from "./static";

import { Interval } from "../../common/helper/promise";
import SubtitleComponent from "./components/Subtitle.vue";
import { getComputedStyles, mapStyleString } from "../../common/helper/object";
import { log } from "../../common/helper/log";

export default defineComponent({
  components: { SubtitleComponent: SubtitleComponent as any },

  data(): {
    active: boolean;
    oldText: string;
    text: string[];
    style: CSSStyleDeclaration | { [key: string]: string };
    wrapperStyle: {};
    subtitleContainer: null | HTMLElement;
    interval?: Interval;
  } {
    return {
      active: false,
      oldText: "",
      text: [],
      wrapperStyle: {},
      style: {},
      subtitleContainer: null,
    };
  },

  mounted() {
    log("Activated for Youtube");

    this.interval = new Interval(200, this.onSeekForSubtitle);
    this.interval.start();
  },

  beforeMount() {
    this.active = false;
    this.interval?.stop();
  },

  methods: {
    onSubtileChange() {
      let wholeTextContent = this.subtitleContainer?.textContent;

      if (this.oldText == wholeTextContent) return;
      else this.oldText = wholeTextContent || "";

      // Get All lines
      //
      let linesElements = this.subtitleContainer?.querySelectorAll(
        SUBTITLE_LINE_CLASS
      ) as unknown as HTMLElement[];

      this.text = [];

      // Extract text and styles
      // from incomming lines
      //
      linesElements?.forEach((wrapper) => {
        // Extract text
        //
        this.text.push(wrapper.textContent?.toString()!);

        // Extract styles
        //
        let styleStr = wrapper.getAttribute("style");
        this.style = mapStyleString(styleStr || "");
      });

      let linesWrapper = this.subtitleContainer?.querySelector(SUBTITLE_CLASS);
      let wrapperStyleString = linesWrapper?.getAttribute("style");

      let captionsTextElement = this.subtitleContainer
        ?.querySelector(SUBTITLE_CLASS)
        ?.querySelector(".captions-text");

      let innerWrapperStyle = mapStyleString(
        captionsTextElement?.getAttribute("style") || ""
      );

      this.wrapperStyle = {
        ...mapStyleString(wrapperStyleString || ""),
        ...getComputedStyles(["font-size"], captionsTextElement!),
        ...getComputedStyles(["margin-bottom"], linesWrapper!),
        transform: innerWrapperStyle["transform"],
        zIndex: "50",
        overflow: "unset",
      };
    },

    onSeekForSubtitle(interval: Interval) {
      let exists = !!document.querySelector(SUBTILE_CONTAINER_CLASS);

      // When subtitle dosent exist
      //
      if (!exists) {
        this.active = false;
      }

      // When subtitle exists but is off
      //
      else if (exists) {
        this.active = true;

        this.subtitleContainer = document.querySelector(
          SUBTILE_CONTAINER_CLASS
        );

        this.onSubtileChange();
      }

      interval.next();
    },
  },
});
</script>

<style>
.subturtle-container {
  width: 100%;
  position: absolute;
  z-index: 40;
}

.caption-window {
  cursor: unset !important;
}
</style>
