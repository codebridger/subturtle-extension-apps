<template>
  <select-language
    v-model="store.language"
    @update:modelValue="onChanged"
    label=""
  />
</template>

<script setup>
import { useSettingsStore } from "../../store/settings";
import SelectLanguage from "./SelectLanguage.vue";
import { log } from "../../helper/log";
import { onMounted, watch } from "vue";

const store = useSettingsStore();

function onChanged(lang) {
  store.setLanguage(lang);
}

onMounted(() => {
  log("onMounted: " + store.language);
  store.fetchSettingsFromBackground();
});

watch(
  () => store.language,
  (newLang) => {
    log("Language updated:", newLang);
  },
  { immediate: true }
);
</script>

<style></style>
