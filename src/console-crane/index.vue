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
import { watch, onMounted, onUnmounted, ref } from "vue";
import { useSystemTheme } from "./useSystemTheme";

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
  <teleport to="body">
    <div ref="rootRef">
      <modal v-model="store.isActive" v-slot="{ height, width }">
        <div
          class="flex flex-col py-6"
          :style="{ width: width + 'px', height: height + 'px' }"
        >
          <section class="flex flex-row-reverse justify-between mx-12 mt-6">
            <Button
              severity="info"
              rounded
              label="Go to Dashboard"
              @click="goToDashboard"
            />
          </section>

          <router-view class="w-full flex-1" />
        </div>
      </modal>
    </div>
  </teleport>
</template>
