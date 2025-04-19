<template>
  <div
    v-if="activeTranslate"
    class="relative flex-row-reverse flex items-center justify-center space-x-2"
  >
    <div class="flex">
      <Button
        class="mx-1"
        severity="secondary"
        v-for="item in items"
        :key="item.label"
        :icon="item.icon"
        :onClick="item.command"
      />
    </div>

    <div class="p-2 rounded-md" :style="props.textStyle">
      <span>{{ cleanText(activeTranslate) }}</span>
    </div>
  </div>

  <SvgLoader v-else width="40px" asset="WORD_LOADING" />
</template>

<script lang="ts" setup>
import { cleanText } from "../../../common/helper/text";
import { computed, defineProps, ref } from "vue";
import { useMarkerStore } from "../../../stores/marker";
import { useConsoleCraneStore } from "../../../console-crane/stores/console-crane";

import Button from "primevue/button";

const markerStore = useMarkerStore();
const consoleCraneStore = useConsoleCraneStore();

const props = defineProps<{
  textStyle: any;
}>();

const items = ref([
  {
    label: "Info",
    icon: "i-solar-info-square-linear text-2xl",
    command: () => {
      consoleCraneStore.toggleConsoleCrane("word-detail", {
        word: markerStore.selectedPhrase,
      });
    },
  },
  // {
  //   label: "Save",
  //   icon: "i-solar-bookmark-line-duotone text-2xl",
  //   command: () => {
  //     // toast.add({ severity: 'success', summary: 'Update', detail: 'Data Updated' });
  //   },
  // },
]);

const activeTranslate = computed(() => {
  return markerStore.translatedWords[markerStore.selectedPhrase];
});
</script>

<style lang="scss">
.word-options {
  .p-speeddial {
    button {
      scale: 0.5;
    }
  }
}
</style>
