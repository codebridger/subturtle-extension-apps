import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<string>(localStorage.getItem("theme") || "auto");
  const language = ref<string>(localStorage.getItem("language") || "en");

  function setTheme(newTheme: string) {
    theme.value = newTheme;
    localStorage.setItem("theme", newTheme);
  }

  function setLanguage(newLang: string) {
    language.value = newLang;
    localStorage.setItem("language", newLang);
  }

  function initialize() {
    theme.value = localStorage.getItem("theme") || "auto";
    language.value = localStorage.getItem("language") || "en";
  }

  return {
    theme,
    language,
    setTheme,
    setLanguage,
    initialize,
  };
});
