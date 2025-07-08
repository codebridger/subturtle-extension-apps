<script setup lang="ts">
/**
 * This is a modal that represents an small app for the user to interact with the subtitles
 * inside websites like Youtube, Netflix, etc. except extension popup app.
 *
 * Use Case to present
 * - Word details
 * - Settings
 */

import { useConsoleCraneStore } from "./stores/console-crane";
import { RouterView, useRouter } from "vue-router";
import Modal from "./components/Modal.vue";
import { getSubturtleDashboardUrlWithToken } from "../common/static/global";
import Button from "primevue/button";
import { watch, onMounted, onUnmounted, ref, computed } from "vue";

const store = useConsoleCraneStore();
const router = useRouter();

watch(
  () => store.isActive,
  (isActive) => {
    if (isActive == false) {
      router.push({ name: "empty" });
    }
  }
);

function goToDashboard() {
  window.open(getSubturtleDashboardUrlWithToken(), "_blank");
}

function openSettings() {
  store.toggleConsoleCrane("settings", {}, true);
}

const rootRef = ref<HTMLElement | null>(null);
let cleanupThemeListener: (() => void) | undefined;

const isOnSettingsPage = computed(() => {
  return (
    store.history.length > 0 &&
    store.history[store.history.length - 1].name === "settings"
  );
});

onMounted(() => {
  if (rootRef.value) {
    // cleanupThemeListener = useSystemTheme(rootRef.value);
  }
});

onUnmounted(() => {
  if (cleanupThemeListener) cleanupThemeListener();
});
</script>

<template>
  <teleport to="body">
    <div ref="rootRef">
      <modal v-model="store.isActive" v-slot="{ height, width }">
        <div
          class="flex flex-col py-6"
          :style="{ width: width + 'px', height: height + 'px' }"
        >
          <!-- Header: always visible -->
          <section
            class="flex flex-row-reverse justify-between mx-12 mt-6 shrink-0"
          >
            <div class="flex space-x-2 items-center w-full">
              <template v-if="isOnSettingsPage">
                <Button
                  severity="secondary"
                  rounded
                  @click="store.goBack"
                  size="small"
                  class="!bg-white !border-gray-300 dark:!bg-blue-900 dark:!border-gray-600"
                >
                  <template #icon>
                    <span
                      class="i-mdi-arrow-left text-gray-700 dark:text-white scale-[1.5]"
                    />
                  </template>
                </Button>
              </template>
              <template v-else>
                <Button
                  severity="secondary"
                  rounded
                  @click="openSettings"
                  size="small"
                  class="!bg-white !border-gray-300 dark:!bg-blue-900 dark:!border-gray-600"
                >
                  <template #icon>
                    <span
                      class="i-mdi-cog text-gray-700 dark:text-white scale-[1.5]"
                    />
                  </template>
                </Button>
              </template>
              <div class="flex-1"></div>
              <Button
                severity="info"
                rounded
                label="Go to Dashboard"
                @click="goToDashboard"
              />
            </div>
          </section>

          <!-- Body: scrollable -->
          <div class="flex-1 overflow-y-auto w-full">
            <router-view class="w-full flex-1" />
          </div>
        </div>
      </modal>
    </div>
  </teleport>
</template>
