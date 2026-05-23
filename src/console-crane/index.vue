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
import { Button, IconButton, App } from "pilotui";
import { watch, onMounted, onUnmounted, ref } from "vue";
import { analytic } from "../plugins/mixpanel";

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

  analytic.track("go-to-dashboard_clicked");
}

function openSettings() {
  store.toggleConsoleCrane("settings", {}, true);
}

const rootRef = ref<HTMLElement | null>(null);
let cleanupThemeListener: (() => void) | undefined;

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
  <div id="subturtle-console-crane" ref="rootRef">
    <App>
      <modal v-model="store.isActive" v-slot="{ height, width, close }">
        <div class="flex flex-col" :style="{ width: width + 'px', height: height + 'px' }">
          <!-- Header: always visible -->
          <section class="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-white/[0.08] shrink-0">
            <template v-if="!store.isOnMainPage">
              <IconButton size="sm" rounded="full" icon="i-mdi-arrow-left" @click="store.goBack" />
            </template>
            <template v-else>
              <IconButton size="sm" rounded="full" icon="i-mdi-cog" @click="openSettings" />
            </template>
            <div class="flex-1"></div>
            <button
              type="button"
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
              @click="goToDashboard"
            >
              Dashboard <i class="i-mdi-open-in-new align-middle ml-0.5" />
            </button>
            <IconButton size="sm" rounded="full" icon="i-mdi-close" @click="close" />
          </section>

          <!-- Body: scrollable -->
          <div class="flex-1 overflow-y-auto w-full">
            <router-view class="w-full flex-1" />
          </div>
        </div>
      </modal>
    </App>
  </div>
</template>
