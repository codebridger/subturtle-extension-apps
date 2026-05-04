<template>
  <SelectionPopup
    v-if="selection.isVisible.value && !isModalActive"
    :text="selection.text.value"
    :rect="selection.rect.value"
    :context="selection.contextText.value"
    @dismiss="selection.clear"
  />
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useTextSelection } from "../composables/useTextSelection";
import SelectionPopup from "./SelectionPopup.vue";
import { onState, requestState } from "../../common/services/console-crane-bridge";

const selection = useTextSelection();
const isModalActive = ref(false);

let unsubscribe: (() => void) | undefined;

onMounted(() => {
  unsubscribe = onState(({ isActive }) => {
    isModalActive.value = isActive;
  });
  requestState();
});

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>
