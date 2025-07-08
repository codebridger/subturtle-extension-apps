<template>
  <select-language v-model="lang" @update:modelValue="onChanged" label="" />
</template>

<script setup>
import { useSettingsStore } from "../../store/settings";
import SelectLanguage from "./SelectLanguage.vue";
import { onMounted, ref, watch, nextTick } from "vue";

const store = useSettingsStore();

const lang = ref("");

watch(store.language, (newVal) => {
  nextTick(() => {
    lang.value = newVal;
  });
});

function onChanged(lang) {
  store.setLanguage(lang);
}

onMounted(() => {
  store.fetchSettingsFromBackground();
});
</script>

<style></style>
