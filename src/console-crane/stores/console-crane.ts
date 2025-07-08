import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ConsolePage } from "../types";

import { router } from "../router";

interface PageEntry {
  name: ConsolePage;
  params?: Record<string, any>;
}

export const useConsoleCraneStore = defineStore("console-crane", () => {
  const isActive = ref(false);
  const history = ref<PageEntry[]>([]);

  const mainPages: ConsolePage[] = ["empty", "word-detail"];

  const isOnMainPage = computed(() => {
    if (history.value.length === 0) return true;
    const current = history.value[history.value.length - 1];
    return mainPages.includes(current.name);
  });

  function toggleConsoleCrane(
    page: ConsolePage,
    params?: Record<string, any>,
    active?: boolean
  ) {
    isActive.value = Boolean(active) || !isActive.value;
    // Push to history if new page or params
    if (
      history.value.length === 0 ||
      history.value[history.value.length - 1].name !== page ||
      JSON.stringify(history.value[history.value.length - 1].params) !==
        JSON.stringify(params)
    ) {
      history.value.push({ name: page, params });
    }
    router.push({
      name: page,
      params: { data: window.btoa(JSON.stringify(params)) },
    });
  }

  function goBack() {
    if (history.value.length > 1) {
      history.value.pop(); // Remove current
      const prev = history.value[history.value.length - 1];
      router.push({
        name: prev.name,
        params: { data: window.btoa(JSON.stringify(prev.params)) },
      });
    }
  }

  const canGoBack = computed(() => history.value.length > 1);

  function resetHistory() {
    history.value = [];
  }

  return {
    isActive,
    toggleConsoleCrane,
    goBack,
    canGoBack,
    resetHistory,
    history,
    isOnMainPage,
  };
});
