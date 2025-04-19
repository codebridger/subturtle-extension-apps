<template>
  <SubtitleComponent
    :positionRect="position"
    :textList="text"
    :textStyle="style"
  />
  <marker-border />
  <ConsoleCrane />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { SUBTILE_CONTAINER_CLASS, SUBTITLE_CLASS } from "./static";
import { waitUntil } from "../../common/helper/promise";
import { SubtitleBondingBox } from "../../common/types/general.type";

import SubtitleComponent from "./components/Subtitle.vue";

import TextCleaner from "text-cleaner";

export default defineComponent({
  components: { SubtitleComponent: SubtitleComponent as any },

  data(): {
    active: boolean;
    position: SubtitleBondingBox;
    text: string[];
    style: CSSStyleDeclaration | {};
    observer: null | MutationObserver;
    subtitleContainer: null | HTMLElement;
  } {
    return {
      active: false,
      position: { width: 0, top: 0, left: 0, height: 0 },
      text: [],
      style: {},
      observer: null,
      subtitleContainer: null,
    };
  },

  mounted() {
    console.log("Activated for NETFLIX");

    this.addWatcherForSubtitleContainer();
    window.addEventListener("resize", this.addWatcherForSubtitleContainer);
  },

  deactivated() {
    this.observer?.disconnect();
  },

  methods: {
    onSubtileChange() {
      // Hide original Subtitle
      //
      let originalSubtitle = document.querySelector(
        SUBTILE_CONTAINER_CLASS
      ) as HTMLElement;

      if (originalSubtitle) originalSubtitle.style.opacity = "0";

      this.active = true;

      // Get first line Rect
      //
      let firstRect = this.subtitleContainer
        ?.querySelector(SUBTITLE_CLASS)
        ?.getBoundingClientRect();

      this.position = {
        width: firstRect?.width || 0,
        top: firstRect?.top || 0,
        left: firstRect?.left || 0,
        height: firstRect?.height || 0,
      };

      let minLeft = this.position.left;
      let minRight = firstRect?.right || 0;
      let minBottom = firstRect?.bottom || 0;

      // Get All lines
      //
      let linesWraper = this.subtitleContainer?.querySelectorAll(
        SUBTITLE_CLASS
      ) as unknown as HTMLElement[];

      this.text = [];
      linesWraper?.forEach((wrapper) => {
        // Extract text and <br>
        //
        let innerHtml = wrapper.innerHTML;

        if (!innerHtml.includes("<br")) {
          this.text.push(wrapper.textContent as string);
        } else {
          let innerLines = innerHtml.split("<br>");

          innerLines.forEach((line) => {
            let text = TextCleaner(line)
              .stripHtml()
              .condense()
              .toLowerCase()
              .valueOf();

            this.text.push(text);
          });
        }

        // Get line span
        //
        let span = wrapper.querySelector('[style*="font-size"]');

        // Extract styles
        //
        if (span) {
          let styleStr = span.getAttribute("style");

          let styleParts = styleStr?.split(";") as string[];

          for (let i = 0; i < styleParts.length; i++) {
            const stylePart = styleParts[i];
            if (!stylePart.length) return;

            let key = stylePart.split(":")[0];
            let value = stylePart.split(":")[1];

            this.style[key] = value;
          }
        }

        // Extract bondary
        //
        // Check if this span has bigger width
        // Then replace it width default Rect width
        let spanRect = wrapper.getBoundingClientRect();

        if (spanRect.left < minLeft) {
          minLeft = spanRect.left;
        }

        if (spanRect.right > minRight) {
          minRight = spanRect.right;
        }

        if (spanRect.bottom > minBottom) {
          minBottom = spanRect.bottom;
        }
      });

      // Caculate subtitle bunding box
      this.position.width = minRight - minLeft;
      this.position.height = minBottom - this.position.top;
      this.position.left = minLeft;

      this.text = JSON.parse(JSON.stringify(this.text));
    },

    async addWatcherForSubtitleContainer() {
      await this.findSubtitleContainer();

      if (this.observer) {
        this.observer.disconnect();
      } else {
        this.observer = new MutationObserver(this.onSubtileChange);
      }

      this.observer.observe(this.subtitleContainer as HTMLElement, {
        childList: true,
      });
    },

    async findSubtitleContainer() {
      await waitUntil(() => !!document.querySelector(SUBTITLE_CLASS));
      this.subtitleContainer = document.querySelector(SUBTITLE_CLASS)
        ?.parentNode as HTMLElement;
    },
  },
});
</script>

<style scoped></style>
