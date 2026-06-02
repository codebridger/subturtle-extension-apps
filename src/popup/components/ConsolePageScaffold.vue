<template>
  <!-- Frame for a console page rendered inside the popup router: a sticky back
       header over the page body. The popup is a real page, so Back is plain
       router navigation (returns to the kept-alive Home with its translation). -->
  <div class="min-h-[600px] w-full bg-white dark:bg-gray-950 overflow-y-auto">
    <div
      class="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur"
    >
      <button
        type="button"
        class="inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        @click="goBack"
      >
        <i class="i-mdi-arrow-left text-lg" />
        Back
      </button>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goBack() {
  // Prefer real history back so we land on the kept-alive Home; fall back to a
  // Home push if this page was somehow entered without a prior entry.
  const hasBack = !!(window.history.state && window.history.state.back != null);
  if (hasBack) router.back();
  else router.push({ name: "home" });
}
</script>
