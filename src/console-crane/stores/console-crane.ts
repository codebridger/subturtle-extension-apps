import { defineStore } from "pinia";
import { ref } from "vue";
import { ConsolePage } from "../types";

import { router } from "../router";

export const useConsoleCraneStore = defineStore("console-crane", () => {
  const isActive = ref(false);

  function toggleConsoleCrane(
    page: ConsolePage,
    params?: Record<string, any>,
    active?: boolean
  ) {
    isActive.value = Boolean(active) || !isActive.value;

    router.push({
      name: page,
      params: { data: window.btoa(JSON.stringify(params)) },
    });
  }

  return {
    isActive,
    toggleConsoleCrane,
  };
});
