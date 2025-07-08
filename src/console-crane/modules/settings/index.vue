<template>
  <div
    class="flex flex-col items-center justify-start overflow-y-auto min-h-full dark:bg-blue-900"
  >
    <div
      class="select-text flex flex-col px-20 justify-start items-center text-gray-900 dark:text-gray-100"
      :style="{
        height: '100%',
        width: `${Math.min(780, frameSize?.width!)}px`,
      }"
    >
      <!-- Settings Header -->
      <section class="px-[40px] my-14 flex flex-col w-full">
        <div class="p-5 flex flex-col justify-center items-center">
          <h1 class="text-4xl mb-8 dark:text-gray-100">Settings</h1>
        </div>
      </section>

      <!-- Settings Content -->
      <section class="w-full mt-10 px-[40px]">
        <!-- Theme Settings -->
        <Fieldset class="mb-6 dark:bg-blue-900" legend="Theme">
          <div class="flex flex-col space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-lg dark:text-gray-100">Theme Mode</span>
              <div class="flex space-x-2">
                <Button
                  v-for="theme in themes"
                  :key="theme.value"
                  :severity="
                    currentTheme === theme.value ? 'primary' : 'secondary'
                  "
                  :label="theme.label"
                  @click="setTheme(theme.value)"
                  size="small"
                />
              </div>
            </div>
          </div>
        </Fieldset>

        <!-- Language Settings -->
        <Fieldset class="mb-6 dark:bg-blue-900" legend="Language">
          <div class="flex flex-col space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-lg dark:text-gray-100">Interface Language</span>
              <SelectLanguage
                v-model="selectedLanguage"
                @update:modelValue="updateLanguage"
                class="w-48"
              />
            </div>
          </div>
        </Fieldset>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from "vue";
import Fieldset from "primevue/fieldset";
import Button from "primevue/button";
import SelectLanguage from "../../../popup/components/inputs/SelectLanguage.vue";

// Inject frame size from modal
const frameSize = inject<{ width: number; height: number }>("frameSize");

// Theme management
const themes = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "auto" },
];

const currentTheme = ref("auto");
const selectedLanguage = ref("en");

// Theme switcher function
function setTheme(theme: string) {
  currentTheme.value = theme;

  // Apply theme to document
  document.documentElement.classList.remove("light", "dark");

  if (theme === "auto") {
    // Auto theme - use system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    document.documentElement.classList.add(prefersDark ? "dark" : "light");
  } else {
    document.documentElement.classList.add(theme);
  }

  // Store theme preference
  localStorage.setItem("theme", theme);
}

// Language update function
function updateLanguage(lang: string) {
  selectedLanguage.value = lang;
  // Store language preference
  localStorage.setItem("language", lang);
  // You can add additional logic here like i18n locale change
}

// Initialize settings from localStorage
onMounted(() => {
  const savedTheme = localStorage.getItem("theme") || "auto";
  const savedLanguage = localStorage.getItem("language") || "en";

  currentTheme.value = savedTheme;
  selectedLanguage.value = savedLanguage;

  // Apply saved theme
  setTheme(savedTheme);
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
