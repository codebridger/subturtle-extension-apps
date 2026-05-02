<template>
  <NibbleSurface v-if="isEnabled" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import NibbleSurface from "./components/NibbleSurface.vue";
import { useSettingsStore } from "../common/store/settings";

const settings = useSettingsStore();
const isEnabled = computed(
  () => !settings.isNibbleDisabledForHost(location.hostname)
);
</script>
