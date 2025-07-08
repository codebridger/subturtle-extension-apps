<template>
  <div class="flex flex-col space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-lg dark:text-gray-100">Theme Mode</span>
      <div class="flex space-x-2">
        <Button
          v-for="theme in themes"
          :key="theme.value"
          :severity="currentTheme === theme.value ? 'primary' : 'secondary'"
          :label="theme.label"
          @click="setTheme(theme.value as Theme)"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import { useSettingsStore } from "../../store/settings";
import { Theme } from "../../types/general.type";

const settingsStore = useSettingsStore();

const themes = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "auto" },
];

const currentTheme = computed(() => settingsStore.theme);

function setTheme(theme: Theme) {
  settingsStore.setTheme(theme);
}
</script>

<style scoped></style>
