<template>
  <div v-if="activeTranslate" class="relative flex-row-reverse flex items-center justify-center space-x-2">
    <div class="flex justify-end">
      <IconButton v-for="item in items" size="sm" class="mx-1" :icon="item.icon" :key="item.label"
        :color="(item.color as any) || 'info'" @click="item.command" />
    </div>

    <div class="p-2 rounded-md" :style="props.textStyle">
      <span>{{ cleanText(activeTranslate) }}</span>
    </div>
  </div>

  <SvgLoader v-else width="40px" asset="WORD_LOADING" />
</template>

<script lang="ts" setup>
import { cleanText } from "../../../common/helper/text";
import { computed, defineProps, onMounted, ref, watch } from "vue";
import { useMarkerStore } from "../../../stores/marker";

import { IconButton } from "pilotui/elements";

const markerStore = useMarkerStore();

const props = defineProps<{
  textStyle: any;
}>();

onMounted(() => {
  console.log("TranslatedPhrase mounted");
});

// watch both markerStore.translatedWords[markerStore.selectedPhrase] and markerStore.selectedPhrase
watch(
  () => [markerStore.translatedWords, markerStore.selectedPhrase],
  ([value, phrase]) => {
    console.log("translatedWords", value);
    console.log("selectedPhrase", phrase);
  }
);

const items = ref([
  // {
  //   label: "Info",
  //   color: "info",
  //   icon: "i-solar-info-square-linear text-2xl",
  //   command: () => {
  //     consoleCraneStore.toggleConsoleCrane("word-detail", {
  //       word: markerStore.selectedPhrase,
  //       context: markerStore.context,
  //     });
  //   },
  // },
  // Clear button removed - now handled by close button on WordSelectionRectangle
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
