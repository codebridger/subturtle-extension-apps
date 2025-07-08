<template>
  <select-language v-model="lang" @update:modelValue="onChanged" label="" />
</template>

<script>
import { LanguageDetector } from "../../../common/helper/language-detection";
import SelectLanguage from "./SelectLanguage.vue";

export default {
  components: {
    SelectLanguage,
  },

  data() {
    return {
      lang: "", // Default fallback
    };
  },

  async mounted() {
    // Use the new language detection system
    try {
      const detectedLang = await LanguageDetector.getDefaultLanguage();
      this.lang = detectedLang;
    } catch (error) {
      console.warn("Failed to detect default language:", error);
      // Fallback to stored preference or default
      chrome.storage.local.get("target", (data) => {
        this.lang = data.target || "en";
      });
    }
  },

  methods: {
    onChanged() {
      LanguageDetector.setLanguage(this.lang);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { target: this.lang });
      });
    },
  },
};
</script>

<style></style>
