<template>
  <div
    class="freemium-counter-card border bg-gradient-to-r from-pink-100 via-purple-50 to-blue-100 dark:from-pink-900/20 dark:via-purple-900/30 dark:to-blue-900/20 flex flex-col gap-4 p-6 rounded-xl shadow-sm mb-4"
  >
    <!-- Top: Icon and Counter -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-purple-300 shadow-inner dark:from-pink-800 dark:to-purple-700"
      >
        <i class="pi pi-lock text-purple-700 dark:text-purple-200 text-lg" />
      </div>
      <div class="flex-1">
        <div
          class="bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-sm font-semibold text-transparent dark:from-purple-300 dark:to-blue-300"
        >
          {{ used }}/{{ total }} Words
        </div>
        <div class="text-xs text-purple-600 dark:text-purple-300">
          Free spots left to save phrases
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="h-2 w-12 rounded-full bg-purple-200/60 shadow-inner dark:bg-purple-800/60"
        >
          <div
            class="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-sm transition-all duration-500 ease-out"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
      </div>
    </div>
    <!-- Slot for word saver UI -->
    <div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { computed } from "vue";

const props = defineProps<{
  used: number;
  total: number;
  isAtLimit: boolean;
  isDisabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "action"): void;
  (e: "upgrade"): void;
}>();

const progressPercentage = computed(() => {
  if (!props.total) return 0;
  return Math.min((props.used / props.total) * 100, 100);
});

function handleAction() {
  if (props.isAtLimit) {
    emit("upgrade");
  } else {
    emit("action");
  }
}
</script>

<style scoped>
.freemium-counter-card {
  width: 100%;
}
</style>
