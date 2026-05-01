<template>
  <SelectionPopup
    v-if="selection.isVisible.value && !consoleCrane.isActive"
    :text="selection.text.value"
    :rect="selection.rect.value"
    :context="selection.contextText.value"
    @dismiss="selection.clear"
  />
  <ConsoleCrane />
</template>

<script lang="ts" setup>
import { useTextSelection } from "./composables/useTextSelection";
import SelectionPopup from "./components/SelectionPopup.vue";
import ConsoleCrane from "../console-crane/index.vue";
import { useConsoleCraneStore } from "../console-crane/stores/console-crane";

const selection = useTextSelection();
const consoleCrane = useConsoleCraneStore();
</script>
