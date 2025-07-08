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
          @click="setTheme(theme.value)"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import Button from "primevue/button";

const themes = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "auto" },
];

const currentTheme = ref("auto");

function setTheme(theme: string) {
  currentTheme.value = theme;
  document.documentElement.classList.remove("light", "dark");
  if (theme === "auto") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.documentElement.classList.add(prefersDark ? "dark" : "light");
  } else {
    document.documentElement.classList.add(theme);
  }
  localStorage.setItem("theme", theme);
}

onMounted(() => {
  const savedTheme = localStorage.getItem("theme") || "auto";
  currentTheme.value = savedTheme;
  setTheme(savedTheme);
});
</script>

<style scoped></style>
