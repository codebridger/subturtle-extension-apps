<template>
  <section>
    <div
      :class="['border-2 border-dotted', 'z-[999] border-red-500 fixed']"
      v-for="(marker, index) in markers"
      :key="index"
      :style="getBorderRectFromMarkerArray(marker)"
    >
      <!-- <div
        v-if="index == 0"
        class="absolute -top-[100px] bg-red-600 flex"
      ></div> -->
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapActions } from "pinia";
import { useMarkerStore, MarkedWord } from "../../../stores/marker";

export default defineComponent({
  computed: {
    ...mapState(useMarkerStore, ["words"]),

    markers() {
      let markers = <MarkedWord[][]>[[]];
      let counter = 0;

      if (this.words.length <= 1) return [];

      // categorise words in a sequence based their id, start a new category if squential id has a gap
      for (let i = 0; i < this.words.length; i++) {
        const id = this.getSequentialId(this.words[i].id);

        // Add the first word to the first category
        if (i == 0) {
          markers[counter].push(this.words[i]);
          continue;
        }

        // Add to previous category if sequential with previous
        let isSequentialWithPrevious =
          id - 1 === this.getSequentialId(this.words[i - 1].id);

        if (isSequentialWithPrevious) {
          markers[counter].push(this.words[i]);
          continue;
        }

        // if not sequential, start a new category
        markers.push([this.words[i]]);
        counter++;
      }

      return markers;
    },
  },

  methods: {
    ...mapActions(useMarkerStore, ["getSequentialId"]),

    getBorderRectFromMarkerArray(marker: MarkedWord[]) {
      if (marker.length == 0) return {};

      const firstWord = marker[0];
      let lastWord = marker.length > 1 ? marker[marker.length - 1] : firstWord;

      const firstWordRect = firstWord.domeRect;
      const lastWordRect = lastWord.domeRect;

      const top = firstWordRect.top;
      const left = firstWordRect.left;
      const width = lastWordRect.right - firstWordRect.left;
      const height = firstWordRect.height;

      return {
        top: top + "px",
        left: left + "px",
        width: width + "px",
        height: height + "px",
      };
    },
  },
});
</script>
