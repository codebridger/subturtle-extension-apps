import { defineStore } from "pinia";
import { ref } from "vue";

export const useDefaultBundleStore = defineStore("default-bundle", () => {
  const defaultBundleOfEachPage = ref<Record<string, string[]>>({});

  function readFromLocalStorage() {
    const data = localStorage.getItem("defaultBundleOfEachPage");
    if (data) {
      defaultBundleOfEachPage.value = JSON.parse(data);
    }
  }

  function writeToLocalStorage() {
    localStorage.setItem(
      "defaultBundleOfEachPage",
      JSON.stringify(defaultBundleOfEachPage.value)
    );
  }

  function getDefaultBundles() {
    readFromLocalStorage();
    return defaultBundleOfEachPage.value[window.location.href] || [];
  }

  function setDefaultBundles(ids: string[]) {
    readFromLocalStorage();
    defaultBundleOfEachPage.value[window.location.href] = ids;
    writeToLocalStorage();
  }

  return {
    getDefaultBundles,
    setDefaultBundles,
  };
});
