<template>
  <select-language
    v-model="lang"
    @update:modelValue="onChanged"
    label="Select target language"
  />
</template>

<script>
export default {
  data() {
    return {
      lang: "fa",
    };
  },

  mounted() {
    // Load target language
    //
    chrome.storage.local.get("target", (data) => {
      this.lang = data.target || "fa";
    });
  },

  methods: {
    onChanged() {
      chrome.storage.local.set({ target: this.lang });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { target: this.lang });
      });
    },
  },
};
</script>

<style></style>
