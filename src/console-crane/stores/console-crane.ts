import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ConsolePage } from "../types";

import { router } from "../router";

interface PageEntry {
  name: ConsolePage;
  params?: Record<string, any>;
}

// Unicode-safe base64. `btoa` only accepts Latin1 — any non-Latin1 character
// (e.g. accented Latin, Persian, Chinese, emoji) throws InvalidCharacterError.
// We encode via TextEncoder so route params can carry any text.
export function encodeRouteParams(params: any): string {
  const bytes = new TextEncoder().encode(JSON.stringify(params));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeRouteParams<T = any>(data: string): T {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
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
      params: { data: encodeRouteParams(params) },
    });
  }

  function goBack() {
    if (history.value.length > 1) {
      history.value.pop(); // Remove current
      const prev = history.value[history.value.length - 1];
      router.push({
        name: prev.name,
        params: { data: encodeRouteParams(prev.params) },
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
